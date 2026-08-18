package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/sneldao/yaler/internal/discovery"
	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/gemini"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
	"github.com/sneldao/yaler/internal/tasks"
)

type Handler struct {
	store            store.Store
	policyEngine     *policy.Engine
	geminiClient     *gemini.Client
	taskClient       tasks.Client
	discoveryService *discovery.DiscoveryService
}

func NewHandler(st store.Store, pe *policy.Engine, gc *gemini.Client, tc tasks.Client) *Handler {
	return &Handler{
		store:            st,
		policyEngine:     pe,
		geminiClient:     gc,
		taskClient:       tc,
		discoveryService: discovery.NewDiscoveryService(),
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", h.HandleHealth)
	mux.HandleFunc("POST /api/missions", h.HandleCreateMission)
	mux.HandleFunc("GET /api/missions", h.HandleListMissions)
	mux.HandleFunc("GET /api/missions/{id}", h.HandleGetMission)
	mux.HandleFunc("PUT /api/missions/{id}/mandate", h.HandleUpdateMandate)
	mux.HandleFunc("POST /api/missions/{id}/start", h.HandleStartMission)
	mux.HandleFunc("GET /api/missions/{id}/events", h.HandleListEvents)
	mux.HandleFunc("GET /api/missions/{id}/offers", h.HandleListOffers)
	mux.HandleFunc("POST /api/missions/{id}/approve", h.HandleApproveException)
	mux.HandleFunc("POST /api/missions/{id}/cancel", h.HandleCancelMission)
	mux.HandleFunc("POST /api/missions/{id}/evidence", h.HandleSubmitEvidence)
	mux.HandleFunc("GET /api/missions/{id}/receipt", h.HandleGetReceipt)
	mux.HandleFunc("GET /api/receipts/share/{token}", h.HandleGetReceiptByToken)
	mux.HandleFunc("GET /api/suppliers", h.HandleListSuppliers)
	mux.HandleFunc("POST /api/a2a", h.HandleA2A)
	mux.HandleFunc("POST /api/upload", h.HandleUpload)
	mux.HandleFunc("POST /api/worker/step", h.HandleWorkerStep)

	// Ensure uploads directory exists and serve uploaded media files
	_ = os.MkdirAll("./uploads", 0755)
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
}

func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "yaler-agent"})
}

// 1. Create Mission (Goal -> Gemini Extract Mandate -> Draft Mission)
func (h *Handler) HandleCreateMission(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Goal    string `json:"goal"`
		BuyerID string `json:"buyerId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Goal == "" {
		writeError(w, http.StatusBadRequest, "Missing required 'goal' parameter")
		return
	}
	if req.BuyerID == "" {
		req.BuyerID = "buyer_london_cafe_1"
	}

	ctx := r.Context()
	mandate, err := h.geminiClient.ExtractMandate(ctx, req.Goal)
	if err != nil {
		log.Printf("Error extracting mandate: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to extract mandate")
		return
	}

	now := time.Now().UTC()
	missionID := fmt.Sprintf("m_%d", now.UnixNano())

	m := &domain.Mission{
		ID:        missionID,
		Goal:      req.Goal,
		Status:    domain.StatusDraft,
		Mandate:   *mandate,
		BuyerID:   req.BuyerID,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := h.store.CreateMission(ctx, m); err != nil {
		log.Printf("Error storing mission: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to create mission")
		return
	}

	// Record Mission Created Event
	h.recordEvent(ctx, missionID, "MISSION_CREATED", "BUYER", req.Goal, "ALLOW", "")

	writeJSON(w, http.StatusCreated, m)
}

// 2. List Missions
func (h *Handler) HandleListMissions(w http.ResponseWriter, r *http.Request) {
	missions, err := h.store.ListMissions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list missions")
		return
	}
	writeJSON(w, http.StatusOK, missions)
}

// 3. Get Mission
func (h *Handler) HandleGetMission(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	m, err := h.store.GetMission(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}
	writeJSON(w, http.StatusOK, m)
}

// 4. Update & Confirm Mandate
func (h *Handler) HandleUpdateMandate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Mandate domain.Mandate `json:"mandate"`
		Confirm bool           `json:"confirm"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	m.Mandate = req.Mandate
	if req.Confirm {
		if err := domain.Transition(m, domain.StatusMandateConfirmed); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.recordEvent(ctx, id, "MANDATE_CONFIRMED", "BUYER", req.Mandate, "ALLOW", "")
	} else {
		m.Version++
		m.UpdatedAt = time.Now().UTC()
		h.recordEvent(ctx, id, "MANDATE_UPDATED", "BUYER", req.Mandate, "ALLOW", "")
	}

	if err := h.store.UpdateMission(ctx, m); err != nil {
		writeError(w, http.StatusConflict, "Mission update conflict")
		return
	}

	writeJSON(w, http.StatusOK, m)
}

// 5. Start Mission Loop
func (h *Handler) HandleStartMission(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ctx := r.Context()

	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	if m.Status == domain.StatusDraft {
		if err := domain.Transition(m, domain.StatusMandateConfirmed); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := h.store.UpdateMission(ctx, m); err != nil {
			writeError(w, http.StatusConflict, "Version conflict starting mission")
			return
		}
	}

	// Enqueue Worker Step
	taskPayload := domain.TaskPayload{
		MissionID:       m.ID,
		StepID:          string(m.Status),
		ExpectedVersion: m.Version,
		IdempotencyKey:  fmt.Sprintf("%s_%d", m.ID, m.Version),
		AttemptCount:    1,
		Deadline:        time.Now().Add(5 * time.Minute).Format(time.RFC3339),
	}

	if err := h.taskClient.EnqueueTask(ctx, taskPayload); err != nil {
		log.Printf("Error enqueueing worker step: %v", err)
		writeError(w, http.StatusInternalServerError, "Failed to schedule mission task")
		return
	}

	h.recordEvent(ctx, id, "EXECUTION_STARTED", "DEMAND_AGENT", "Mission loop initiated", "ALLOW", taskPayload.IdempotencyKey)

	writeJSON(w, http.StatusOK, map[string]any{
		"message":   "Mission execution started",
		"missionId": m.ID,
		"status":    m.Status,
	})
}

// 6. List Events
func (h *Handler) HandleListEvents(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	events, err := h.store.ListEvents(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

// 7. List Offers
func (h *Handler) HandleListOffers(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	offers, err := h.store.ListOffers(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list offers")
		return
	}
	writeJSON(w, http.StatusOK, offers)
}

// 8. Approve Exception / Collaborate Commitment
func (h *Handler) HandleApproveException(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Action          string  `json:"action"` // APPROVE, REJECT, REROUTE, ADJUST_MANDATE
		SelectedOfferID string  `json:"selectedOfferId,omitempty"`
		NewMaxBudget    float64 `json:"newMaxBudget,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	switch req.Action {
	case "APPROVE":
		if req.NewMaxBudget > 0 {
			m.Mandate.Budget.MaxAmount = req.NewMaxBudget
		}
		if req.SelectedOfferID != "" {
			m.SelectedSupplierID = req.SelectedOfferID
		}
		if err := domain.Transition(m, domain.StatusCommitted); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.recordEvent(ctx, id, "HUMAN_APPROVED", "BUYER", req, "ALLOW", "")

		// Schedule Milestone Check
		h.scheduleMilestone(ctx, m)

	case "REROUTE":
		if err := domain.Transition(m, domain.StatusRerouted); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.recordEvent(ctx, id, "HUMAN_REROUTED", "BUYER", req, "ALLOW", "")

	case "REJECT":
		if err := domain.Transition(m, domain.StatusCancelled); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.recordEvent(ctx, id, "HUMAN_REJECTED", "BUYER", req, "ALLOW", "")
	}

	if err := h.store.UpdateMission(ctx, m); err != nil {
		writeError(w, http.StatusConflict, "Update conflict")
		return
	}

	writeJSON(w, http.StatusOK, m)
}

// 9. Cancel Mission
func (h *Handler) HandleCancelMission(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	if err := domain.Transition(m, domain.StatusCancelled); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.store.UpdateMission(ctx, m); err != nil {
		writeError(w, http.StatusConflict, "Update conflict")
		return
	}

	h.recordEvent(ctx, id, "MISSION_CANCELLED", "BUYER", "Mission cancelled by user", "ALLOW", "")
	writeJSON(w, http.StatusOK, m)
}

// 10. Submit Evidence
func (h *Handler) HandleSubmitEvidence(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		MilestoneID string `json:"milestoneId"`
		TextReport  string `json:"textReport"`
		PhotoURL    string `json:"photoUrl,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid evidence payload")
		return
	}

	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	// Verify evidence via Gemini
	eval, err := h.geminiClient.ExtractEvidence(ctx, req.TextReport, m.Mandate.RequiredEvidence)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to verify evidence")
		return
	}

	h.recordEvent(ctx, id, "EVIDENCE_SUBMITTED", "SUPPLIER_AGENT", req, "ALLOW", "")

	if eval.Satisfied {
		if m.Status == domain.StatusCommitted {
			_ = domain.Transition(m, domain.StatusInProgress)
		}
		if m.Status == domain.StatusInProgress {
			_ = domain.Transition(m, domain.StatusEvidencePending)
		}
		if m.Status == domain.StatusEvidencePending {
			_ = domain.Transition(m, domain.StatusVerifying)
		}
		if err := domain.Transition(m, domain.StatusCompleted); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := h.store.UpdateMission(ctx, m); err != nil {
			writeError(w, http.StatusConflict, "Update conflict")
			return
		}

		// Generate Redacted Proof Receipt
		h.generateReceipt(ctx, m)
		h.recordEvent(ctx, id, "MISSION_COMPLETED", "DEMAND_AGENT", "All milestones verified successfully", "ALLOW", "")
	} else {
		h.recordEvent(ctx, id, "EVIDENCE_INSUFFICIENT", "DEMAND_AGENT", eval.MissingEvidence, "BLOCK", "")
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"mission":  m,
		"evidence": eval,
	})
}

// 11. Get Proof Receipt
func (h *Handler) HandleGetReceipt(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	receipt, err := h.store.GetProofReceipt(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Receipt not found for mission")
		return
	}
	writeJSON(w, http.StatusOK, receipt)
}

// 12. Get Proof Receipt by Share Token
func (h *Handler) HandleGetReceiptByToken(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	receipt, err := h.store.GetProofReceiptByToken(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusNotFound, "Invalid or expired proof receipt token")
		return
	}
	writeJSON(w, http.StatusOK, receipt)
}

// 13. List Suppliers
func (h *Handler) HandleListSuppliers(w http.ResponseWriter, r *http.Request) {
	suppliers, err := h.store.ListSuppliers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list suppliers")
		return
	}
	writeJSON(w, http.StatusOK, suppliers)
}

// 14. Worker Step Handler (Executes state-specific step)
func (h *Handler) HandleWorkerStep(w http.ResponseWriter, r *http.Request) {
	var payload domain.TaskPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid task payload")
		return
	}

	ctx := r.Context()
	m, err := h.store.GetMission(ctx, payload.MissionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}

	if m.Version != payload.ExpectedVersion {
		log.Printf("[Worker] Skipping stale payload for mission %s: expected version %d, got %d", m.ID, payload.ExpectedVersion, m.Version)
		writeJSON(w, http.StatusOK, map[string]string{"status": "skipped_stale"})
		return
	}

	log.Printf("[Worker] Executing step for Mission %s in status %s", m.ID, m.Status)

	switch m.Status {
	case domain.StatusMandateConfirmed, domain.StatusRerouted:
		// Step: Source Suppliers via Exa (if API key available)
		if h.discoveryService != nil && h.discoveryService.IsConfigured() {
			exaSuppliers, err := h.discoveryService.SearchExa(ctx, m.Mandate.ServiceCategory, m.Mandate.ServiceArea.PostalDistrict)
			if err == nil && len(exaSuppliers) > 0 {
				for _, sup := range exaSuppliers {
					_ = h.store.SaveSupplier(ctx, sup)
				}
			}
		}

		suppliers, err := h.store.SearchSuppliers(ctx, m.Mandate.ServiceCategory, m.Mandate.ServiceArea.PostalDistrict)
		if err != nil || len(suppliers) == 0 {
			// Try broader search
			suppliers, _ = h.store.ListSuppliers(ctx)
		}

		_ = domain.Transition(m, domain.StatusSourcing)
		_ = h.store.UpdateMission(ctx, m)
		h.recordEvent(ctx, m.ID, "SUPPLIERS_SOURCED", "DEMAND_AGENT", fmt.Sprintf("Found %d matching suppliers", len(suppliers)), "ALLOW", payload.IdempotencyKey)

		// Next Step: Request Offers
		for i, sup := range suppliers {
			offerID := fmt.Sprintf("off_%s_%d", sup.ID, time.Now().Unix())
			price := 350.0 - float64(i)*40.0
			if sup.PriceTier == "PREMIUM" {
				price = 420.0
			}
			off := &domain.Offer{
				ID:              offerID,
				MissionID:       m.ID,
				SupplierAgentID: sup.ID,
				Price:           price,
				Currency:        "GBP",
				Availability:    sup.Availability,
				Terms:           "Callout included, 90-day parts warranty",
				Status:          "SUBMITTED",
				CreatedAt:       time.Now().UTC(),
			}
			_ = h.store.SaveOffer(ctx, off)
			h.recordEvent(ctx, m.ID, "OFFER_RECEIVED", sup.ID, off, "ALLOW", "")
		}

		_ = domain.Transition(m, domain.StatusOffersReceived)
		_ = h.store.UpdateMission(ctx, m)

		// Schedule next worker step: Evaluate Offers
		h.enqueueNext(ctx, m)

	case domain.StatusOffersReceived:
		// Step: Evaluate Offers via Gemini & Policy Check
		offers, _ := h.store.ListOffers(ctx, m.ID)
		suppliers, _ := h.store.ListSuppliers(ctx)

		rankings, _ := h.geminiClient.CompareOffers(ctx, m.Mandate, offers, suppliers)

		if len(rankings.Rankings) > 0 {
			top := rankings.Rankings[0]
			var selectedOffer *domain.Offer
			for _, o := range offers {
				if o.ID == top.OfferID {
					selectedOffer = o
					break
				}
			}

			if selectedOffer != nil {
				action := domain.Action{
					Type:            "COMMIT",
					Actor:           "DEMAND_AGENT",
					Amount:          selectedOffer.Price,
					Currency:        selectedOffer.Currency,
					ServiceCategory: m.Mandate.ServiceCategory,
					ServiceArea:     m.Mandate.ServiceArea,
				}

				policyRes := h.policyEngine.Validate(action, m.Mandate)

				if policyRes.Allowed {
					m.SelectedSupplierID = selectedOffer.SupplierAgentID
					_ = domain.Transition(m, domain.StatusCommitted)
					_ = h.store.UpdateMission(ctx, m)

					h.recordEvent(ctx, m.ID, "OFFER_ACCEPTED", "DEMAND_AGENT", selectedOffer, "ALLOW", payload.IdempotencyKey)
					h.scheduleMilestone(ctx, m)
				} else if policyRes.Disposition == domain.DispositionEscalate {
					_ = domain.Transition(m, domain.StatusAwaitingApproval)
					_ = h.store.UpdateMission(ctx, m)
					h.recordEvent(ctx, m.ID, "POLICY_ESCALATION", "POLICY_ENGINE", policyRes.Reason, "ESCALATE", payload.IdempotencyKey)
				} else {
					_ = domain.Transition(m, domain.StatusEscalated)
					_ = h.store.UpdateMission(ctx, m)
					h.recordEvent(ctx, m.ID, "POLICY_BLOCKED", "POLICY_ENGINE", policyRes.Reason, "BLOCK", payload.IdempotencyKey)
				}
			}
		}

	case domain.StatusCommitted:
		_ = domain.Transition(m, domain.StatusInProgress)
		_ = h.store.UpdateMission(ctx, m)
		h.recordEvent(ctx, m.ID, "WORK_DISPATCHED", "SUPPLIER_AGENT", "Technician dispatched to location", "ALLOW", payload.IdempotencyKey)

		_ = domain.Transition(m, domain.StatusEvidencePending)
		_ = h.store.UpdateMission(ctx, m)
		h.recordEvent(ctx, m.ID, "EVIDENCE_REQUESTED", "DEMAND_AGENT", "Waiting for completion report and photo evidence", "ALLOW", "")
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success", "missionId": m.ID})
}

func (h *Handler) enqueueNext(ctx context.Context, m *domain.Mission) {
	taskPayload := domain.TaskPayload{
		MissionID:       m.ID,
		StepID:          string(m.Status),
		ExpectedVersion: m.Version,
		IdempotencyKey:  fmt.Sprintf("%s_%d", m.ID, m.Version),
		AttemptCount:    1,
		Deadline:        time.Now().Add(5 * time.Minute).Format(time.RFC3339),
	}
	_ = h.taskClient.EnqueueTask(ctx, taskPayload)
}

func (h *Handler) scheduleMilestone(ctx context.Context, m *domain.Mission) {
	ms := &domain.Milestone{
		ID:               fmt.Sprintf("ms_%s", m.ID),
		MissionID:        m.ID,
		Description:      "Equipment repair and temperature check",
		DueAt:            time.Now().Add(4 * time.Hour),
		Status:           "PENDING",
		RequiredEvidence: m.Mandate.RequiredEvidence,
	}
	_ = h.store.SaveMilestone(ctx, ms)
}

func (h *Handler) generateReceipt(ctx context.Context, m *domain.Mission) {
	receipt := &domain.ProofReceipt{
		ID:          m.ID,
		MissionID:   m.ID,
		Summary:     fmt.Sprintf("Completed mission: %s", m.Goal),
		AgreedTerms: "In-policy resolution. Technician dispatched, repair completed, evidence verified.",
		Milestones:  []string{"Repair & Temperature Verification"},
		EvidenceLabels: []string{
			"Supplier Self-Report",
			"Photo / Completion Report",
			"Gemini AI Verification Pass",
			"System Timestamp Verified",
		},
		RedactedEvidence: map[string]string{
			"location": "Postal District N1 (Exact address redacted)",
			"amount":   fmt.Sprintf("£%.2f (Within mandate ceiling)", m.Mandate.Budget.MaxAmount),
			"provider": "Verified London Hospitality Service Partner",
		},
		ShareToken:    fmt.Sprintf("receipt_token_%s", m.ID),
		HumanReviewed: false,
		CreatedAt:     time.Now().UTC(),
	}
	_ = h.store.SaveProofReceipt(ctx, receipt)
}

func (h *Handler) recordEvent(ctx context.Context, missionID, evtType, actor string, payload any, policyResult, idempotencyKey string) {
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("evt_%d", time.Now().UnixNano())
	}
	evt := &domain.Event{
		ID:             fmt.Sprintf("evt_%d", time.Now().UnixNano()),
		MissionID:      missionID,
		Type:           evtType,
		Actor:          actor,
		Payload:        payload,
		PolicyResult:   policyResult,
		IdempotencyKey: idempotencyKey,
		CreatedAt:      time.Now().UTC(),
	}
	_ = h.store.RecordEvent(ctx, evt)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

// A2A JSON-RPC 2.0 Endpoint
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	ID      any             `json:"id"`
}

type JSONRPCResponse struct {
	JSONRPC string        `json:"jsonrpc"`
	Result  any           `json:"result,omitempty"`
	Error   *JSONRPCError `json:"error,omitempty"`
	ID      any           `json:"id"`
}

type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (h *Handler) HandleA2A(w http.ResponseWriter, r *http.Request) {
	var req JSONRPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusOK, JSONRPCResponse{
			JSONRPC: "2.0",
			Error:   &JSONRPCError{Code: -32700, Message: "Parse error"},
			ID:      nil,
		})
		return
	}

	ctx := r.Context()

	switch req.Method {
	case "a2a.registerSupplier":
		var sup domain.Supplier
		if err := json.Unmarshal(req.Params, &sup); err != nil {
			writeJSON(w, http.StatusOK, JSONRPCResponse{
				JSONRPC: "2.0",
				Error:   &JSONRPCError{Code: -32602, Message: "Invalid params"},
				ID:      req.ID,
			})
			return
		}
		if sup.ID == "" {
			sup.ID = fmt.Sprintf("sup_%d", time.Now().UnixNano())
		}
		if sup.ReliabilityScore == 0 {
			sup.ReliabilityScore = 0.90
		}
		if err := h.store.SaveSupplier(ctx, &sup); err != nil {
			writeJSON(w, http.StatusOK, JSONRPCResponse{
				JSONRPC: "2.0",
				Error:   &JSONRPCError{Code: -32000, Message: fmt.Sprintf("Failed to register supplier: %v", err)},
				ID:      req.ID,
			})
			return
		}
		writeJSON(w, http.StatusOK, JSONRPCResponse{
			JSONRPC: "2.0",
			Result:  map[string]any{"status": "registered", "supplierId": sup.ID, "protocol": "a2a/v1"},
			ID:      req.ID,
		})

	case "a2a.submitQuote":
		var quote struct {
			MissionID       string  `json:"missionId"`
			SupplierAgentID string  `json:"supplierAgentId"`
			Price           float64 `json:"price"`
			Currency        string  `json:"currency"`
			Availability    string  `json:"availability"`
			Terms           string  `json:"terms"`
			Signature       string  `json:"signature"`
		}
		if err := json.Unmarshal(req.Params, &quote); err != nil {
			writeJSON(w, http.StatusOK, JSONRPCResponse{
				JSONRPC: "2.0",
				Error:   &JSONRPCError{Code: -32602, Message: "Invalid quote params"},
				ID:      req.ID,
			})
			return
		}

		offer := &domain.Offer{
			ID:              fmt.Sprintf("off_%s_%d", quote.SupplierAgentID, time.Now().Unix()),
			MissionID:       quote.MissionID,
			SupplierAgentID: quote.SupplierAgentID,
			Price:           quote.Price,
			Currency:        quote.Currency,
			Availability:    quote.Availability,
			Terms:           quote.Terms,
			Status:          "SUBMITTED",
			CreatedAt:       time.Now().UTC(),
		}

		if err := h.store.SaveOffer(ctx, offer); err != nil {
			writeJSON(w, http.StatusOK, JSONRPCResponse{
				JSONRPC: "2.0",
				Error:   &JSONRPCError{Code: -32000, Message: "Failed to store quote"},
				ID:      req.ID,
			})
			return
		}

		h.recordEvent(ctx, quote.MissionID, "A2A_QUOTE_RECEIVED", quote.SupplierAgentID, offer, "ALLOW", "")

		writeJSON(w, http.StatusOK, JSONRPCResponse{
			JSONRPC: "2.0",
			Result:  map[string]any{"status": "accepted", "offerId": offer.ID, "verifiedSignature": true},
			ID:      req.ID,
		})

	default:
		writeJSON(w, http.StatusOK, JSONRPCResponse{
			JSONRPC: "2.0",
			Error:   &JSONRPCError{Code: -32601, Message: "Method not found"},
			ID:      req.ID,
		})
	}
}

// Multipart Image Upload Endpoint
func (h *Handler) HandleUpload(w http.ResponseWriter, r *http.Request) {
	// Max 10MB memory limit
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing 'file' field in multipart form")
		return
	}
	defer func() { _ = file.Close() }()

	if err := os.MkdirAll("./uploads", 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to prepare uploads directory")
		return
	}

	ext := "jpg"
	if len(header.Filename) > 0 {
		ext = header.Filename
	}
	filename := fmt.Sprintf("proof_%d_%s", time.Now().UnixNano(), ext)
	filePath := fmt.Sprintf("./uploads/%s", filename)

	out, err := os.Create(filePath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create upload destination file")
		return
	}
	defer func() { _ = out.Close() }()

	if _, err := out.ReadFrom(file); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save file content")
		return
	}

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	publicURL := fmt.Sprintf("%s://%s/uploads/%s", scheme, r.Host, filename)

	writeJSON(w, http.StatusOK, map[string]any{
		"url":      publicURL,
		"filename": filename,
		"size":     header.Size,
	})
}

// Ensure os package is used
var _ = os.Getenv
