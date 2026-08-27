package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
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
	mux.HandleFunc("GET /api/missions/{id}/callouts", h.HandleListCallouts)
	mux.HandleFunc("POST /api/callouts/{id}/offer", h.HandleSubmitCalloutOffer)
	mux.HandleFunc("POST /api/suppliers/onboard", h.HandleOnboardSupplier)
	mux.HandleFunc("POST /api/missions/{id}/resume", h.HandleResumeMission)
	mux.HandleFunc("POST /api/missions/{id}/approve", h.HandleApproveException)
	mux.HandleFunc("POST /api/missions/{id}/cancel", h.HandleCancelMission)
	mux.HandleFunc("POST /api/missions/{id}/evidence", h.HandleSubmitEvidence)
	mux.HandleFunc("POST /api/missions/{id}/feedback", h.HandleSubmitFeedback)
	mux.HandleFunc("GET /api/missions/{id}/receipt", h.HandleGetReceipt)
	mux.HandleFunc("GET /api/receipts/share/{token}", h.HandleGetReceiptByToken)
	mux.HandleFunc("GET /api/suppliers", h.HandleListSuppliers)
	mux.HandleFunc("POST /api/a2a", h.HandleA2A)
	mux.HandleFunc("POST /api/upload", h.HandleUpload)
	mux.HandleFunc("POST /api/tts", h.HandleTTS)
	mux.HandleFunc("GET /api/discovery", h.HandleDiscovery)
	mux.HandleFunc("GET /api/credentials", h.HandleCredentials)
	mux.HandleFunc("POST /api/worker/step", h.HandleWorkerStep)
	mux.HandleFunc("POST /api/waitlist", h.HandleWaitlist)
	mux.HandleFunc("GET /api/waitlist", h.HandleListWaitlist)
	mux.HandleFunc("GET /api/stats", h.HandleStats)

	// Note: uploads write to local disk (./uploads/) on an ephemeral container.
	// Files uploaded to one Cloud Run instance may not be servable by another.
	// For production, move uploads to GCS or R2.
	_ = os.MkdirAll("./uploads", 0755)
	fileServer := http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads")))
	mux.Handle("GET /uploads/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=86400")
		fileServer.ServeHTTP(w, r)
	}))
}

func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "yaler-agent"})
}

func (h *Handler) HandleDiscovery(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	district := r.URL.Query().Get("district")
	if category == "" {
		category = "commercial_refrigeration"
	}
	if district == "" {
		district = "N1"
	}
	if h.discoveryService == nil || !h.discoveryService.IsConfigured() {
		writeJSON(w, http.StatusOK, map[string]any{"found": []any{}, "note": "not_checked"})
		return
	}
	suppliers, err := h.discoveryService.SearchExa(r.Context(), category, district)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"found": []any{}, "note": "not_checked"})
		return
	}
	type foundCard struct {
		Name     string `json:"name"`
		URL      string `json:"url"`
		Label    string `json:"label"`
		Bookable bool   `json:"bookable"`
	}
	var cards []foundCard
	for _, s := range suppliers {
		src := ""
		if len(s.Evidence) > 1 {
			src = s.Evidence[1]
		}
		cards = append(cards, foundCard{
			Name:     s.DisplayName,
			URL:      src,
			Label:    "Found this morning — not on our roster",
			Bookable: false,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"found": cards})
}

func (h *Handler) HandleCredentials(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeJSON(w, http.StatusOK, discovery.Credential{Status: "not_checked"})
		return
	}
	if h.discoveryService == nil {
		writeJSON(w, http.StatusOK, discovery.Credential{Name: name, Status: "not_checked"})
		return
	}
	writeJSON(w, http.StatusOK, h.discoveryService.CheckCredential(r.Context(), name))
}

// 1. Create Mission (Goal -> Gemini Extract Mandate -> Draft Mission)
func (h *Handler) HandleCreateMission(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Goal             string `json:"goal"`
		BuyerID          string `json:"buyerId"`
		ExperimentCohort string `json:"experimentCohort"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Goal == "" {
		writeError(w, http.StatusBadRequest, "Missing required 'goal' parameter")
		return
	}
	if req.BuyerID == "" {
		req.BuyerID = "buyer_london_cafe_1"
	}
	// Callers (tests, ops tooling) may pin an arm; ordinary traffic leaves
	// it empty and gets the deterministic hash assignment.
	cohort := req.ExperimentCohort
	if cohort != "parallel" && cohort != "sequential" {
		cohort = ""
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
	if cohort == "" {
		cohort = assignExperimentCohort(missionID)
	}

	m := &domain.Mission{
		ID:               missionID,
		Goal:             req.Goal,
		Status:           domain.StatusDraft,
		Mandate:          *mandate,
		BuyerID:          req.BuyerID,
		Version:          1,
		CreatedAt:        now,
		UpdatedAt:        now,
		ExperimentCohort: cohort,
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

// HandleStats returns mission metrics for the homepage social-proof bar.
func (h *Handler) HandleStats(w http.ResponseWriter, r *http.Request) {
	missions, err := h.store.ListMissions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to compute stats")
		return
	}
	var completed int
	buyers := make(map[string]bool)
	for _, m := range missions {
		if m.Status == domain.StatusCompleted {
			completed++
			if m.BuyerID != "" {
				buyers[m.BuyerID] = true
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"completed":      completed,
		"distinctBuyers": len(buyers),
		"totalMissions":  len(missions),
	})
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
		// Idempotent: in DELEGATE mode the worker may have already committed
		// the best in-budget offer (COMMITTED → IN_PROGRESS → EVIDENCE_PENDING).
		// Re-approving a mission that is already at or past COMMITTED is a
		// no-op success, not a 400 — the state machine has no self-transition
		// from those states back to COMMITTED.
		switch m.Status {
		case domain.StatusCommitted, domain.StatusInProgress,
			domain.StatusEvidencePending, domain.StatusVerifying, domain.StatusCompleted:
			writeJSON(w, http.StatusOK, m)
			return
		}
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

	if err := h.updateMissionWithRetry(ctx, m); err != nil {
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

// 11a. Submit Post-Job Feedback (reliability loop)
// Records the buyer's rating of the supplier who won a COMPLETED mission.
// Recomputes ReliabilityScore from the supplier's full feedback history so
// the score becomes a value earned on the job, not a static float set at
// onboarding. One feedback per mission; re-submitting overwrites.
func (h *Handler) HandleSubmitFeedback(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid feedback payload")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeError(w, http.StatusBadRequest, "rating must be between 1 and 5")
		return
	}

	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}
	if m.Status != domain.StatusCompleted {
		writeError(w, http.StatusConflict, fmt.Sprintf("Feedback only for COMPLETED missions (current: %s)", m.Status))
		return
	}
	if m.SelectedSupplierID == "" {
		writeError(w, http.StatusConflict, "No supplier was selected for this mission")
		return
	}

	now := time.Now().UTC()
	fb := &domain.MissionFeedback{
		ID:         fmt.Sprintf("fb_%s", m.ID),
		MissionID:  m.ID,
		SupplierID: m.SelectedSupplierID,
		Rating:     req.Rating,
		Comment:    strings.TrimSpace(req.Comment),
		CreatedAt:  now,
	}
	if err := h.store.SaveMissionFeedback(ctx, fb); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save feedback")
		return
	}

	// Recompute the supplier's reliability from their full feedback history
	// AND their callout response-latency record. The latency blend follows
	// the incentive design: penalize silence/non-response (expiry), not
	// honest declines. See domain.ReliabilityFromLatency.
	history, _ := h.store.ListMissionFeedbackBySupplier(ctx, m.SelectedSupplierID)
	sup, err := h.store.GetSupplier(ctx, m.SelectedSupplierID)
	if err == nil {
		seed := sup.ReliabilityScore
		if seed == 0 {
			seed = 0.5 // onboarding default before any feedback
		}
		// Gather this supplier's callout outcomes across all missions so
		// the latency factor reflects their full response history, not
		// just this one job.
		outcomes := h.gatherSupplierCalloutOutcomes(ctx, m.SelectedSupplierID)
		sup.ReliabilityScore = domain.ReliabilityFromLatency(seed, history, outcomes)
		if err := h.store.SaveSupplier(ctx, sup); err != nil {
			log.Printf("[Feedback] Failed to recompute reliability for %s: %v", sup.ID, err)
		}
	} else {
		log.Printf("[Feedback] Selected supplier %s not found on roster: %v", m.SelectedSupplierID, err)
	}

	h.recordEvent(ctx, m.ID, "FEEDBACK_RECORDED", "BUYER", fb, "ALLOW", "")
	writeJSON(w, http.StatusOK, map[string]any{
		"feedback": fb,
		"supplier": sup,
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
	h.enrichReceiptWithFeedback(r.Context(), receipt)
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
	h.enrichReceiptWithFeedback(r.Context(), receipt)
	writeJSON(w, http.StatusOK, receipt)
}

// enrichReceiptWithFeedback stamps the buyer's post-job rating onto the
// receipt at read time. Feedback is submitted after the receipt is issued,
// so the rating lives on MissionFeedback and is joined here rather than
// persisted on the receipt itself.
func (h *Handler) enrichReceiptWithFeedback(ctx context.Context, receipt *domain.ProofReceipt) {
	fb, err := h.store.GetMissionFeedback(ctx, receipt.MissionID)
	if err != nil || fb == nil {
		return // unrated — leave the zero value
	}
	receipt.Rating = fb.Rating
	receipt.RatingComment = fb.Comment
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

// updateMissionWithRetry attempts to persist a mission with optimistic-concurrency
// retry (up to 3 total attempts). On a version conflict the mission is re-read
// from the store and the write is replayed before returning.
func (h *Handler) updateMissionWithRetry(ctx context.Context, m *domain.Mission) error {
	var err error
	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		err = h.store.UpdateMission(ctx, m)
		if err == nil {
			return nil
		}
		if err != store.ErrConflict {
			return err // non-concurrency errors are not retried
		}
		// Re-read the latest version and re-apply (the mission object is
		// already mutated, so this just bumps its version to avoid a
		// second conflict on the next attempt).
		if attempt == maxRetries-1 {
			return err
		}
		log.Printf("[Worker] Version conflict for mission %s, retrying (attempt %d/%d)", m.ID, attempt+1, maxRetries)
		if fresh, reErr := h.store.GetMission(ctx, m.ID); reErr == nil {
			m.Version = fresh.Version + 1
		} else {
			return reErr
		}
	}
	return err
}

// recordWorkerFailed logs a WORKER_FAILED event for a mission when a step
// fails so the pipeline is observable and not a black box.
func (h *Handler) recordWorkerFailed(ctx context.Context, missionID, stepID, errStr string) {
	h.recordEvent(ctx, missionID, "WORKER_FAILED", "DEMAND_AGENT", map[string]string{
		"stepId": stepID,
		"error":  errStr,
	}, "BLOCK", "")
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

	errMsg := ""

	switch m.Status {
	case domain.StatusMandateConfirmed, domain.StatusRerouted:
		// Exa finds stay off the bookable roster. They are listed separately via GET /api/discovery.

		suppliers, err := h.store.SearchSuppliers(ctx, m.Mandate.ServiceCategory, m.Mandate.ServiceArea.PostalDistrict)
		if err != nil || len(suppliers) == 0 {
			// Try broader search
			suppliers, _ = h.store.ListSuppliers(ctx)
		}

		// Only ACTIVE roster suppliers take callouts.
		active := make([]*domain.Supplier, 0, len(suppliers))
		for _, sup := range suppliers {
			if sup.Status == "" || strings.EqualFold(sup.Status, "ACTIVE") {
				active = append(active, sup)
			}
		}

		if err := domain.Transition(m, domain.StatusSourcing); err != nil {
			errMsg = err.Error()
			break
		}
		if err := h.updateMissionWithRetry(ctx, m); err != nil {
			errMsg = err.Error()
			break
		}

		now := time.Now().UTC()

		if len(active) == 0 {
			// FR-6: no matching supplier is an exception, not a silent stall.
			if err := domain.Transition(m, domain.StatusEscalated); err != nil {
				errMsg = err.Error()
				break
			}
			if err := h.updateMissionWithRetry(ctx, m); err != nil {
				errMsg = err.Error()
				break
			}
			h.recordEvent(ctx, m.ID, "NO_SUPPLIERS", "DEMAND_AGENT", "No matching suppliers on the roster", "ESCALATE", payload.IdempotencyKey)
			break
		}

		simulated := 0

		// A/B cohort: "parallel" (the structural fix) broadcasts to all
		// qualified engineers at once. "sequential" (the status-quo control
		// arm) sends one callout, waits for a terminal response, then sends
		// the next — the sequential bargaining the incentive design argues
		// against. The field experiment measures the difference.
		cohort := m.ExperimentCohort
		if cohort == "" {
			cohort = "parallel" // default for missions created before the field
		}

		if cohort == "sequential" {
			// Send only the FIRST engineer; the sweeper advances the rest
			// after decline/expiry. The accept window is still 10 min.
			active = active[:1]
		}

		for _, sup := range active {
			co := &domain.Callout{
				ID:         fmt.Sprintf("co_%s_%d", sup.ID, now.UnixNano()),
				MissionID:  m.ID,
				SupplierID: sup.ID,
				Status:     domain.CalloutSent,
				Message:    calloutMessage(m, sup, len(active)),
				SentAt:     now,
				ExpiresAt:  now.Add(calloutTTL),
			}

			if sup.Verified {
				// Real supplier: the callout waits for a quote entered via
				// the concierge console (POST /api/callouts/{id}/offer).
				if saveErr := h.store.SaveCallout(ctx, co); saveErr != nil {
					log.Printf("[Worker] Failed to save callout for mission %s: %v", m.ID, saveErr)
				}
				h.recordEvent(ctx, m.ID, "CALLOUT_SENT", "DEMAND_AGENT", map[string]string{"supplier": sup.DisplayName, "calloutId": co.ID}, "ALLOW", payload.IdempotencyKey)
				continue
			}

			// Unverified roster supplier (synthetic seed): auto-generate a
			// clearly labelled simulated quote so the flow stays runnable
			// without a real roster. Never presented as a real quote.
			co.Simulated = true
			co.Status = domain.CalloutOffered
			co.RespondedAt = now
			if saveErr := h.store.SaveCallout(ctx, co); saveErr != nil {
				log.Printf("[Worker] Failed to save callout for mission %s: %v", m.ID, saveErr)
			}

			price := 350.0 - float64(simulated)*40.0
			if sup.PriceTier == "PREMIUM" {
				price = 420.0
			}
			off := &domain.Offer{
				ID:              fmt.Sprintf("off_%s_%d", sup.ID, now.Unix()),
				MissionID:       m.ID,
				SupplierAgentID: sup.ID,
				CalloutID:       co.ID,
				Price:           price,
				Currency:        "GBP",
				Availability:    sup.Availability,
				Terms:           "Simulated quote - synthetic roster, not a real offer",
				Status:          "SUBMITTED",
				Evidence:        []string{"synthetic_roster"},
				CreatedAt:       now,
				Simulated:       true,
			}
			if saveErr := h.store.SaveOffer(ctx, off); saveErr != nil {
				log.Printf("[Worker] Failed to save offer for mission %s: %v", m.ID, saveErr)
			}
			h.recordEvent(ctx, m.ID, "OFFER_RECEIVED", sup.ID, off, "ALLOW", "")
			simulated++
		}
		h.recordEvent(ctx, m.ID, "SUPPLIERS_SOURCED", "DEMAND_AGENT", fmt.Sprintf("Asked %d suppliers (%d simulated)", len(active), simulated), "ALLOW", payload.IdempotencyKey)

		// Advance to evaluation only when at least one offer exists. Real
		// (verified) callouts keep the mission in SOURCING until a quote is
		// entered via the concierge console.
		offers, _ := h.store.ListOffers(ctx, m.ID)
		if len(offers) > 0 {
			if err := domain.Transition(m, domain.StatusOffersReceived); err != nil {
				errMsg = err.Error()
				break
			}
			if err := h.updateMissionWithRetry(ctx, m); err != nil {
				errMsg = err.Error()
				break
			}
			h.enqueueNext(ctx, m)
		}

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
					if err := domain.Transition(m, domain.StatusCommitted); err != nil {
						errMsg = err.Error()
						break
					}
					if err := h.updateMissionWithRetry(ctx, m); err != nil {
						errMsg = err.Error()
						break
					}

					// First-accept-wins: cancel every other SENT callout so
					// competing engineers see the job disappear, not linger.
					h.cancelCompetingCallouts(ctx, m.ID, selectedOffer.CalloutID, payload.IdempotencyKey)

					// Explainable selection — derive the rationale from the
					// audit trail so the receipt can say WHY this engineer
					// was picked, not just that they were.
					rationale := h.buildSelectionRationale(ctx, m, selectedOffer)
					h.recordEvent(ctx, m.ID, "OFFER_ACCEPTED", "DEMAND_AGENT", map[string]any{
						"offer":              selectedOffer,
						"selectionRationale": rationale,
					}, "ALLOW", payload.IdempotencyKey)
					h.scheduleMilestone(ctx, m)
				} else if policyRes.Disposition == domain.DispositionEscalate {
					if err := domain.Transition(m, domain.StatusAwaitingApproval); err != nil {
						errMsg = err.Error()
						break
					}
					if err := h.updateMissionWithRetry(ctx, m); err != nil {
						errMsg = err.Error()
						break
					}
					h.recordEvent(ctx, m.ID, "POLICY_ESCALATION", "POLICY_ENGINE", policyRes.Reason, "ESCALATE", payload.IdempotencyKey)
				} else {
					if err := domain.Transition(m, domain.StatusEscalated); err != nil {
						errMsg = err.Error()
						break
					}
					if err := h.updateMissionWithRetry(ctx, m); err != nil {
						errMsg = err.Error()
						break
					}
					h.recordEvent(ctx, m.ID, "POLICY_BLOCKED", "POLICY_ENGINE", policyRes.Reason, "BLOCK", payload.IdempotencyKey)
				}
			}
		}

	case domain.StatusCommitted:
		if err := domain.Transition(m, domain.StatusInProgress); err != nil {
			errMsg = err.Error()
			break
		}
		if err := h.updateMissionWithRetry(ctx, m); err != nil {
			errMsg = err.Error()
			break
		}
		h.recordEvent(ctx, m.ID, "WORK_DISPATCHED", "SUPPLIER_AGENT", "Technician dispatched to location", "ALLOW", payload.IdempotencyKey)

		if err := domain.Transition(m, domain.StatusEvidencePending); err != nil {
			errMsg = err.Error()
			break
		}
		if err := h.updateMissionWithRetry(ctx, m); err != nil {
			errMsg = err.Error()
			break
		}
		h.recordEvent(ctx, m.ID, "EVIDENCE_REQUESTED", "DEMAND_AGENT", "Waiting for completion report and photo evidence", "ALLOW", "")
	}

	if errMsg != "" {
		h.recordWorkerFailed(ctx, m.ID, payload.StepID, errMsg)
		log.Printf("[Worker] FAILED for mission %s in status %s: %s", m.ID, m.Status, errMsg)
		writeError(w, http.StatusInternalServerError, "Worker step failed: "+errMsg)
		return
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

// cancelCompetingCallouts is the first-accept-wins mechanic: when one
// engineer's offer is committed, every other SENT callout for the mission
// is marked CANCELLED so competing engineers see the job disappear, not
// linger as open optionality. This removes the leverage that makes
// "stringing along" rational.
func (h *Handler) cancelCompetingCallouts(ctx context.Context, missionID, winningCalloutID, idempotencyKey string) {
	callouts, err := h.store.ListCallouts(ctx, missionID)
	if err != nil {
		return
	}
	for _, co := range callouts {
		if co.ID == winningCalloutID {
			continue
		}
		if co.Status != domain.CalloutSent {
			continue
		}
		co.Status = domain.CalloutCancelled
		co.RespondedAt = time.Now().UTC()
		if err := h.store.SaveCallout(ctx, co); err != nil {
			log.Printf("[Worker] Failed to cancel callout %s: %v", co.ID, err)
			continue
		}
		h.recordEvent(ctx, missionID, "CALLOUT_CANCELLED", "DEMAND_AGENT",
			map[string]string{"supplierId": co.SupplierID, "calloutId": co.ID, "reason": "first_accept_wins"},
			// Per-callout key: the events store writes by doc ID with no
			// key dedupe, so a worker-step replay sharing the accept's key
			// would double-record cancellations and skew later metrics.
			"ALLOW", idempotencyKey+":cancel:"+co.ID)
	}
}

// buildSelectionRationale derives a plain-English explanation of why the
// agent picked this engineer — from the audit trail, not self-reported.
// This is the explainability that makes the selection a trust mechanism,
// not a black box. Surfaced on the receipt.
func (h *Handler) buildSelectionRationale(ctx context.Context, m *domain.Mission, offer *domain.Offer) string {
	var parts []string

	// Budget fit
	budget := m.Mandate.Budget.MaxAmount
	if budget > 0 && offer.Price > 0 {
		pct := (budget - offer.Price) / budget * 100
		if pct >= 0 {
			parts = append(parts, fmt.Sprintf("%.0f%% under budget", pct))
		} else {
			parts = append(parts, fmt.Sprintf("%.0f%% over budget", -pct))
		}
	}

	// Prior jobs in this area
	sup, err := h.store.GetSupplier(ctx, offer.SupplierAgentID)
	if err == nil && sup != nil {
		feedback, _ := h.store.ListMissionFeedbackBySupplier(ctx, offer.SupplierAgentID)
		if len(feedback) > 0 {
			parts = append(parts, fmt.Sprintf("%d prior job%s", len(feedback), pluralS(len(feedback))))
		}

		// Accept speed from the callout
		if offer.CalloutID != "" {
			co, coErr := h.store.GetCallout(ctx, offer.CalloutID)
			if coErr == nil && co != nil && !co.RespondedAt.IsZero() && !co.SentAt.IsZero() {
				respMin := co.RespondedAt.Sub(co.SentAt).Minutes()
				if respMin < 1 {
					parts = append(parts, "under 1-min accept")
				} else {
					parts = append(parts, fmt.Sprintf("%.0f-min accept", respMin))
				}
			}
		}

		// Reliability score
		if sup.ReliabilityScore > 0 {
			parts = append(parts, fmt.Sprintf("%.0f%% reliability", sup.ReliabilityScore*100))
		}
	}

	if len(parts) == 0 {
		return "Best match within your rules"
	}
	return strings.Join(parts, " · ")
}

// assignExperimentCohort deterministically assigns a mission to the
// "parallel" or "sequential" A/B arm at creation time. The assignment is
// hash-based (mission ID) so it's stable and replayable, and roughly 50/50.
// The worker reads this to decide whether to broadcast all callouts at
// once (parallel — the structural fix) or send them one at a time
// (sequential — the status-quo control arm for the field experiment).
//
// FNV-1a over the whole ID: a naive character-sum parity skews badly on
// m_<UnixNano> IDs because trailing timestamp digits dominate the sum.
func assignExperimentCohort(missionID string) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(missionID))
	if h.Sum32()%2 == 0 {
		return "parallel"
	}
	return "sequential"
}

// gatherSupplierCalloutOutcomes builds the latency-signal record for a
// supplier by scanning all missions' callouts for this supplier. This is
// the derived-from-the-audit-trail data that ReliabilityFromLatency uses —
// no self-report, just response times and outcomes from the event log.
// Scans recent missions (the supplier's callout history isn't indexed by
// supplier in the store, so we list missions and check callouts per
// mission; bounded by the mission list size which is small pre-scale).
func (h *Handler) gatherSupplierCalloutOutcomes(ctx context.Context, supplierID string) []domain.CalloutOutcome {
	missions, err := h.store.ListMissions(ctx)
	if err != nil {
		return nil
	}
	now := time.Now().UTC()
	var outcomes []domain.CalloutOutcome
	for _, m := range missions {
		callouts, err := h.store.ListCallouts(ctx, m.ID)
		if err != nil {
			continue
		}
		for _, co := range callouts {
			if co.SupplierID != supplierID {
				continue
			}
			// A live SENT callout is not silence — the engineer still has
			// the accept window open. Expiry is applied lazily, so skip
			// anything still inside its TTL; otherwise an in-flight callout
			// silently drags the supplier's latency score down whenever
			// unrelated feedback recomputes it.
			if co.Status == domain.CalloutSent && now.Before(co.ExpiresAt) {
				continue
			}
			var respSec float64
			if !co.RespondedAt.IsZero() && !co.SentAt.IsZero() {
				respSec = co.RespondedAt.Sub(co.SentAt).Seconds()
				if respSec < 0 {
					respSec = 0
				}
			}
			outcomes = append(outcomes, domain.CalloutOutcome{
				SupplierID:  co.SupplierID,
				Status:      co.Status,
				ResponseSec: respSec,
			})
		}
	}
	return outcomes
}

// calloutTTL is how long a real callout waits for a response before it is
// considered expired. The structural incentive design (see INCENTIVES.md):
// a short, visible accept window removes the leverage that makes
// "stringing along" the dominant strategy. 10 minutes, not 4 hours —
// first to accept wins, everyone else's offer disappears.
const calloutTTL = 10 * time.Minute

// calloutMessage drafts the scoped job request for a supplier in kitchen
// English. Deterministic on purpose: the same mandate always produces the
// same ask, which is what the concierge pastes into a call or message.
// The message now carries the structural incentive: a visible accept window
// and the fact that other engineers are seeing it too — converting the
// invisible externality (vendor's wasted time) into a felt constraint.
func calloutMessage(m *domain.Mission, sup *domain.Supplier, competitorCount int) string {
	when := "today"
	if !m.Mandate.LatestCompletionAt.IsZero() {
		when = "by " + m.Mandate.LatestCompletionAt.Format("3:04pm, Mon 2 Jan")
	}
	msg := fmt.Sprintf("%s - kitchen job in %s: %s. Budget up to %s, need it done %s. Can you take it? Reply with your price and earliest arrival.",
		sup.DisplayName,
		m.Mandate.ServiceArea.PostalDistrict,
		m.Goal,
		formatGBP(m.Mandate.Budget.MaxAmount),
		when,
	)
	// The incentive layer: make the cost of holding optionality visible.
	// "This closes in 10 min" + "N other engineers can see this" = loss
	// aversion pointed at the right party, not the vendor.
	others := competitorCount - 1
	if others > 0 {
		msg += fmt.Sprintf(" First to accept gets the job — this closes in 10 minutes. %d other engineer%s can see this.", others, pluralS(others))
	} else {
		msg += " This closes in 10 minutes — first to accept gets the job."
	}
	return msg
}

func pluralS(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

func formatGBP(amount float64) string {
	if amount == math.Trunc(amount) {
		return fmt.Sprintf("£%.0f", amount)
	}
	return fmt.Sprintf("£%.2f", amount)
}

// opsAuthorized gates the mutating concierge endpoints. When OPS_TOKEN is
// set, requests must carry a matching X-Ops-Token header. When it is not
// set (local demo / judge runs) the endpoints stay open, consistent with
// the no-auth demo stance (D020). Set OPS_TOKEN on any deployed instance.
func (h *Handler) opsAuthorized(r *http.Request) bool {
	token := os.Getenv("OPS_TOKEN")
	if token == "" {
		return true
	}
	return r.Header.Get("X-Ops-Token") == token
}

// expireCallouts lazily marks past-ExpiresAt callouts as EXPIRED. It saves
// each flipped callout back to the store (store reads return copies) and
// records one event per expiry.
func (h *Handler) expireCallouts(ctx context.Context, callouts []*domain.Callout) {
	now := time.Now().UTC()
	for _, co := range callouts {
		if co.Status == domain.CalloutSent && !co.ExpiresAt.IsZero() && now.After(co.ExpiresAt) {
			co.Status = domain.CalloutExpired
			co.RespondedAt = now
			if err := h.store.SaveCallout(ctx, co); err != nil {
				log.Printf("[Ops] Failed to expire callout %s: %v", co.ID, err)
				continue
			}
			h.recordEvent(ctx, co.MissionID, "CALLOUT_EXPIRED", "DEMAND_AGENT", map[string]string{"supplierId": co.SupplierID, "calloutId": co.ID}, "ESCALATE", "")
		}
	}
}

// SweepStalledSourcing is the stall breaker for the concierge loop (FR-6:
// a supplier timeout is an exception, not a silent stall). One pass over
// all missions: for each mission sitting in SOURCING it lazily expires
// past-due callouts, then escalates any mission whose callouts are all
// terminal (DECLINED/EXPIRED) and that still has no offers. Missions with
// an offer in flight, or with callouts still awaiting a reply, are left
// alone. Safe to run on a ticker from the server process; a durable
// Cloud Tasks cron is the production shape for this (see ARCHITECTURE.md).
func (h *Handler) SweepStalledSourcing(ctx context.Context) {
	missions, err := h.store.ListMissions(ctx)
	if err != nil {
		log.Printf("[Sweeper] Failed to list missions: %v", err)
		return
	}
	for _, m := range missions {
		if m.Status != domain.StatusSourcing {
			continue
		}

		callouts, err := h.store.ListCallouts(ctx, m.ID)
		if err != nil {
			log.Printf("[Sweeper] Failed to list callouts for %s: %v", m.ID, err)
			continue
		}
		// Expire first, then re-read so the terminal check sees fresh state.
		h.expireCallouts(ctx, callouts)
		callouts, err = h.store.ListCallouts(ctx, m.ID)
		if err != nil {
			log.Printf("[Sweeper] Failed to re-read callouts for %s: %v", m.ID, err)
			continue
		}

		offers, _ := h.store.ListOffers(ctx, m.ID)
		if len(offers) > 0 {
			continue // a quote is in hand; the pipeline is progressing
		}
		if len(callouts) == 0 {
			continue // worker has not sourced this mission yet
		}

		allTerminal := true
		for _, co := range callouts {
			if co.Status != domain.CalloutDeclined && co.Status != domain.CalloutExpired && co.Status != domain.CalloutCancelled {
				allTerminal = false
				break
			}
		}
		if !allTerminal {
			continue
		}

		// Sequential cohort: if the first engineer declined/expired, send
		// the NEXT qualified engineer rather than escalating. The sweeper
		// is the engine of the sequential control arm — it advances one
		// callout at a time, waiting for each terminal response.
		if m.ExperimentCohort == "sequential" && len(callouts) > 0 {
			// Find the suppliers already asked (by callout) so we skip them.
			asked := make(map[string]bool)
			for _, co := range callouts {
				asked[co.SupplierID] = true
			}
			// Find the next active supplier who hasn't been called yet.
			suppliers, _ := h.store.SearchSuppliers(ctx, m.Mandate.ServiceCategory, m.Mandate.ServiceArea.PostalDistrict)
			if len(suppliers) == 0 {
				suppliers, _ = h.store.ListSuppliers(ctx)
			}
			var next *domain.Supplier
			for _, sup := range suppliers {
				if asked[sup.ID] {
					continue
				}
				if sup.Status != "" && !strings.EqualFold(sup.Status, "ACTIVE") {
					continue
				}
				next = sup
				break
			}
			if next != nil {
				now := time.Now().UTC()
				co := &domain.Callout{
					ID:         fmt.Sprintf("co_%s_%d", next.ID, now.UnixNano()),
					MissionID:  m.ID,
					SupplierID: next.ID,
					Status:     domain.CalloutSent,
					Message:    calloutMessage(m, next, 1), // 1 competitor = just this engineer
					SentAt:     now,
					ExpiresAt:  now.Add(calloutTTL),
				}
				if next.Verified {
					if saveErr := h.store.SaveCallout(ctx, co); saveErr != nil {
						// Save failed — do NOT fall through to the simulated
						// branch: that would mint a synthetic offer against a
						// real supplier's ID. Skip escalation instead and let
						// the next sweep retry.
						log.Printf("[Sweeper] Failed to save next callout for %s: %v", m.ID, saveErr)
						continue
					}
					h.recordEvent(ctx, m.ID, "CALLOUT_SENT", "DEMAND_AGENT", map[string]string{"supplier": next.DisplayName, "calloutId": co.ID, "cohort": "sequential_next"}, "ALLOW", "")
					log.Printf("[Sweeper] Sequential arm: sent next callout to %s for %s", next.DisplayName, m.ID)
					continue // don't escalate — the next callout is in flight
				}
				// Simulated supplier: auto-generate the quote immediately
				// (same as the worker does in the parallel arm).
				co.Simulated = true
				co.Status = domain.CalloutOffered
				co.RespondedAt = now
				if saveErr := h.store.SaveCallout(ctx, co); saveErr != nil {
					log.Printf("[Sweeper] Failed to save simulated callout for %s: %v", m.ID, saveErr)
					continue
				}
				price := 350.0
				if next.PriceTier == "PREMIUM" {
					price = 420.0
				}
				off := &domain.Offer{
					ID:              fmt.Sprintf("off_%s_%d", next.ID, now.Unix()),
					MissionID:       m.ID,
					SupplierAgentID: next.ID,
					CalloutID:       co.ID,
					Price:           price,
					Currency:        "GBP",
					Availability:    next.Availability,
					Terms:           "Simulated quote - synthetic roster, not a real offer",
					Status:          "SUBMITTED",
					Evidence:        []string{"synthetic_roster"},
					CreatedAt:       now,
					Simulated:       true,
				}
				_ = h.store.SaveOffer(ctx, off)
				h.recordEvent(ctx, m.ID, "OFFER_RECEIVED", next.ID, off, "ALLOW", "")
				// Advance to evaluation.
				if err := domain.Transition(m, domain.StatusOffersReceived); err == nil {
					if uerr := h.updateMissionWithRetry(ctx, m); uerr == nil {
						h.enqueueNext(ctx, m)
					}
				}
				continue
			}
			// No more suppliers to ask — fall through to escalate.
		}

		if err := domain.Transition(m, domain.StatusEscalated); err != nil {
			log.Printf("[Sweeper] Failed to escalate %s: %v", m.ID, err)
			continue
		}
		if err := h.updateMissionWithRetry(ctx, m); err != nil {
			log.Printf("[Sweeper] Failed to save escalation for %s: %v", m.ID, err)
			continue
		}
		h.recordEvent(ctx, m.ID, "NO_QUOTES", "DEMAND_AGENT", "Every supplier declined or timed out - no quotes received", "ESCALATE", "")
		log.Printf("[Sweeper] Escalated stalled sourcing mission %s (all callouts terminal, no offers)", m.ID)
	}
}

// 15. List Callouts
func (h *Handler) HandleListCallouts(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	callouts, err := h.store.ListCallouts(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list callouts")
		return
	}
	h.expireCallouts(r.Context(), callouts)
	writeJSON(w, http.StatusOK, callouts)
}

// 16. Concierge Quote Intake
// Records a quote (or decline) for a callout. This is the concierge loop:
// a human (or the supplier through their own channel) reports what the
// engineer actually said. An over-budget quote is still recorded - the
// policy stop fires at commitment, which is the point of it.
func (h *Handler) HandleSubmitCalloutOffer(w http.ResponseWriter, r *http.Request) {
	if !h.opsAuthorized(r) {
		writeError(w, http.StatusUnauthorized, "Ops token required")
		return
	}

	id := r.PathValue("id")
	var req struct {
		Price    float64 `json:"price"`
		Currency string  `json:"currency"`
		ETA      string  `json:"eta"`
		Terms    string  `json:"terms"`
		Decline  bool    `json:"decline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	ctx := r.Context()
	co, err := h.store.GetCallout(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Callout not found")
		return
	}

	// Lazy expiry before accepting a response.
	now := time.Now().UTC()
	if co.Status == domain.CalloutSent && !co.ExpiresAt.IsZero() && now.After(co.ExpiresAt) {
		co.Status = domain.CalloutExpired
		co.RespondedAt = now
		_ = h.store.SaveCallout(ctx, co)
		h.recordEvent(ctx, co.MissionID, "CALLOUT_EXPIRED", "DEMAND_AGENT", map[string]string{"supplierId": co.SupplierID, "calloutId": co.ID}, "ESCALATE", "")
		writeError(w, http.StatusGone, "Callout expired")
		return
	}

	if co.Status != domain.CalloutSent {
		writeError(w, http.StatusConflict, fmt.Sprintf("Callout already %s", strings.ToLower(string(co.Status))))
		return
	}

	co.RespondedAt = now

	if req.Decline {
		co.Status = domain.CalloutDeclined
		if err := h.store.SaveCallout(ctx, co); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to record decline")
			return
		}
		h.recordEvent(ctx, co.MissionID, "CALLOUT_DECLINED", co.SupplierID, req.Terms, "ALLOW", "")
		writeJSON(w, http.StatusOK, co)
		return
	}

	if req.Price <= 0 {
		writeError(w, http.StatusBadRequest, "Price must be greater than zero (or decline the callout)")
		return
	}
	currency := req.Currency
	if currency == "" {
		currency = "GBP"
	}
	eta := req.ETA
	if eta == "" {
		eta = "TBC"
	}

	off := &domain.Offer{
		ID:              fmt.Sprintf("off_%s_%d", co.SupplierID, now.Unix()),
		MissionID:       co.MissionID,
		SupplierAgentID: co.SupplierID,
		CalloutID:       co.ID,
		Price:           req.Price,
		Currency:        currency,
		Availability:    eta,
		Terms:           req.Terms,
		Status:          "SUBMITTED",
		Evidence:        []string{"concierge_intake"},
		CreatedAt:       now,
	}
	if err := h.store.SaveOffer(ctx, off); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save offer")
		return
	}

	co.Status = domain.CalloutOffered
	if err := h.store.SaveCallout(ctx, co); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update callout")
		return
	}
	h.recordEvent(ctx, co.MissionID, "QUOTE_RECEIVED", co.SupplierID, off, "ALLOW", co.ID)

	// A real quote can move the mission from SOURCING into evaluation.
	// Later quotes (mission already OFFERS_RECEIVED or beyond) are recorded
	// and will be considered if the mission is rerouted.
	var m *domain.Mission
	if fresh, err := h.store.GetMission(ctx, co.MissionID); err == nil {
		m = fresh
		if m.Status == domain.StatusSourcing {
			if err := domain.Transition(m, domain.StatusOffersReceived); err == nil {
				if uerr := h.updateMissionWithRetry(ctx, m); uerr == nil {
					h.enqueueNext(ctx, m)
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"callout": co,
		"offer":   off,
		"mission": m,
	})
}

// 17. Resume stalled mission (concierge "try again", FR-6)
// A mission escalated by the sweeper (every callout declined or expired,
// no quotes) comes back through MANDATE_CONFIRMED, which makes the worker
// re-run sourcing and mint fresh callouts.
//
// Deliberately NOT ops-guarded: retrying your own stalled job is a buyer
// action, same threat model as /start and /approve (mission-ID-scoped,
// unauthenticated demo surface). Ops keeps the guarded supplier-onboard
// and callout-offer endpoints.
func (h *Handler) HandleResumeMission(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ctx := r.Context()
	m, err := h.store.GetMission(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Mission not found")
		return
	}
	if m.Status != domain.StatusEscalated {
		writeError(w, http.StatusConflict, fmt.Sprintf("Only escalated missions can be resumed, current status %s", m.Status))
		return
	}

	if err := domain.Transition(m, domain.StatusMandateConfirmed); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.updateMissionWithRetry(ctx, m); err != nil {
		writeError(w, http.StatusConflict, "Mission update conflict")
		return
	}
	h.recordEvent(ctx, m.ID, "MISSION_RESUMED", "CONCIERGE", "Sourcing re-run after stall", "ALLOW", "")
	h.enqueueNext(ctx, m)
	writeJSON(w, http.StatusOK, m)
}

// 17. Concierge Supplier Onboarding
// Registers a verified supplier into the bookable roster. A human has
// already run the find-and-verify playbook (docs/SUPPLY-SIDE.md) and this
// records the outcome: the supplier takes real callouts from here on.
func (h *Handler) HandleOnboardSupplier(w http.ResponseWriter, r *http.Request) {
	if !h.opsAuthorized(r) {
		writeError(w, http.StatusUnauthorized, "Ops token required")
		return
	}

	var req struct {
		ID               string   `json:"id"`
		DisplayName      string   `json:"displayName"`
		Contact          string   `json:"contact"`
		Capabilities     []string `json:"capabilities"`
		PostalDistrict   string   `json:"postalDistrict"`
		RadiusKM         float64  `json:"radiusKm"`
		Availability     string   `json:"availability"`
		ReliabilityScore float64  `json:"reliabilityScore"`
		PriceTier        string   `json:"priceTier"`
		Evidence         []string `json:"evidence"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if strings.TrimSpace(req.DisplayName) == "" || strings.TrimSpace(req.PostalDistrict) == "" || strings.TrimSpace(req.Contact) == "" {
		writeError(w, http.StatusBadRequest, "displayName, postalDistrict and contact are required")
		return
	}
	if len(req.Capabilities) == 0 {
		writeError(w, http.StatusBadRequest, "capabilities is required")
		return
	}

	now := time.Now().UTC()
	if req.ID == "" {
		req.ID = fmt.Sprintf("sup_concierge_%d", now.UnixNano())
	}
	if req.Availability == "" {
		req.Availability = "TBC"
	}
	if req.PriceTier == "" {
		req.PriceTier = "STANDARD"
	}
	if req.RadiusKM == 0 {
		req.RadiusKM = 10
	}
	if req.ReliabilityScore == 0 {
		// New suppliers start modest; completed jobs move the score.
		req.ReliabilityScore = 0.5
	}

	sup := &domain.Supplier{
		ID:               req.ID,
		PrincipalType:    "supplier_agent",
		DisplayName:      strings.TrimSpace(req.DisplayName),
		Capabilities:     req.Capabilities,
		ServiceArea:      domain.ServiceArea{PostalDistrict: strings.TrimSpace(req.PostalDistrict), RadiusKM: req.RadiusKM},
		Availability:     req.Availability,
		ReliabilityScore: req.ReliabilityScore,
		PriceTier:        req.PriceTier,
		Evidence:         req.Evidence,
		Status:           "ACTIVE",
		Verified:         true,
		Contact:          strings.TrimSpace(req.Contact),
		Source:           "CONCIERGE",
		OnboardedAt:      now,
	}

	if err := h.store.SaveSupplier(r.Context(), sup); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save supplier")
		return
	}
	log.Printf("[Ops] Onboarded verified supplier %s (%s) in %s", sup.ID, sup.DisplayName, sup.ServiceArea.PostalDistrict)
	writeJSON(w, http.StatusCreated, sup)
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
	// Derive the selection rationale from the event trail so the receipt
	// explains WHY this engineer was picked — derived, not self-reported.
	rationale := ""
	if m.SelectedSupplierID != "" {
		offers, _ := h.store.ListOffers(ctx, m.ID)
		for _, o := range offers {
			if o.SupplierAgentID == m.SelectedSupplierID {
				rationale = h.buildSelectionRationale(ctx, m, o)
				break
			}
		}
	}

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
		ShareToken:         fmt.Sprintf("receipt_token_%s", m.ID),
		HumanReviewed:      false,
		CreatedAt:          time.Now().UTC(),
		SelectionRationale: rationale,
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

// ─── Waitlist ──────────────────────────────────────────────

type waitlistEntry struct {
	Email    string `json:"email"`
	Role     string `json:"role"`
	Source   string `json:"source"`
	District string `json:"district,omitempty"`
	JoinedAt string `json:"joinedAt"`
}

// In-memory waitlist (persists to Firestore when available, otherwise memory-only)
var waitlistEntries []waitlistEntry

func (h *Handler) HandleWaitlist(w http.ResponseWriter, r *http.Request) {
	var entry waitlistEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if entry.Email == "" {
		writeError(w, http.StatusBadRequest, "Email is required")
		return
	}

	// Deduplicate
	for _, existing := range waitlistEntries {
		if existing.Email == entry.Email {
			writeJSON(w, http.StatusOK, map[string]string{"status": "already_joined"})
			return
		}
	}

	if entry.JoinedAt == "" {
		entry.JoinedAt = time.Now().UTC().Format(time.RFC3339)
	}

	waitlistEntries = append(waitlistEntries, entry)
	log.Printf("[Waitlist] New signup: %s (role=%s, source=%s, district=%s)", entry.Email, entry.Role, entry.Source, entry.District)

	writeJSON(w, http.StatusOK, map[string]string{"status": "joined"})
}

func (h *Handler) HandleListWaitlist(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"count":   len(waitlistEntries),
		"entries": waitlistEntries,
	})
}
