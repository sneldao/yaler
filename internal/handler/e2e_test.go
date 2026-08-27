package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/gemini"
	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
)

// setupE2E builds a full handler with the Gemini fallback client (no API
// key => deterministic mandate extraction and offer ranking), the memory
// store, and the noop task client. Tests drive the worker by POSTing
// /api/worker/step directly, exactly as Cloud Tasks would.
func setupE2E(t *testing.T, suppliers ...*domain.Supplier) (http.Handler, *store.MemoryStore) {
	t.Helper()
	t.Setenv("GEMINI_API_KEY", "") // force the offline fallback client

	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := &noopTaskClient{}
	gc, err := gemini.NewClient(context.Background())
	if err != nil {
		t.Fatalf("failed to create fallback gemini client: %v", err)
	}
	h := handler.NewHandler(st, pe, gc, tc)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	for _, sup := range suppliers {
		if err := st.SaveSupplier(context.Background(), sup); err != nil {
			t.Fatalf("failed to seed supplier %s: %v", sup.ID, err)
		}
	}
	return mux, st
}

func doJSON(t *testing.T, mux http.Handler, method, path string, body any, want int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("failed to encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != want {
		t.Fatalf("%s %s: expected %d, got %d (body: %s)", method, path, want, rec.Code, rec.Body.String())
	}
	return rec.Body.Bytes()
}

func getMissionE2E(t *testing.T, mux http.Handler, id string) domain.Mission {
	t.Helper()
	var m domain.Mission
	if err := json.Unmarshal(doJSON(t, mux, http.MethodGet, "/api/missions/"+id, nil, http.StatusOK), &m); err != nil {
		t.Fatalf("failed to decode mission: %v", err)
	}
	return m
}

func workerStepE2E(t *testing.T, mux http.Handler, m domain.Mission) domain.Mission {
	t.Helper()
	payload := domain.TaskPayload{
		MissionID:       m.ID,
		StepID:          string(m.Status),
		ExpectedVersion: m.Version,
		IdempotencyKey:  m.ID + "_step",
		AttemptCount:    1,
	}
	doJSON(t, mux, http.MethodPost, "/api/worker/step", payload, http.StatusOK)
	return getMissionE2E(t, mux, m.ID)
} // Journey A — the demo path. A mission against the synthetic roster runs
// end-to-end through the public API: create → start → source (simulated
// callouts + offers) → evaluate → commit, all inside the mandate budget.
func TestE2E_DemoPath_SyntheticRoster(t *testing.T) {
	mux, _ := setupE2E(t,
		testSupplier("sup_seed_1", "London Rapid ColdCare (Synthetic)", false),
		testSupplier("sup_seed_2", "Capital Kitchen Services (Synthetic)", false),
	)

	created := doJSON(t, mux, http.MethodPost, "/api/missions", map[string]any{
		"goal":             "Fridge down at Cafe Noor, food at risk",
		"experimentCohort": "parallel", // pin the arm: sequential sends 1 callout
	}, http.StatusCreated)
	var m0 domain.Mission
	if err := json.Unmarshal(created, &m0); err != nil {
		t.Fatalf("failed to decode created mission: %v", err)
	}

	// Fallback mandate extraction: N1, commercial refrigeration, £500.
	if m0.Status != domain.StatusDraft {
		t.Errorf("expected DRAFT, got %s", m0.Status)
	}
	if m0.Mandate.ServiceArea.PostalDistrict != "N1" || m0.Mandate.Budget.MaxAmount != 500 {
		t.Errorf("unexpected fallback mandate: %+v", m0.Mandate)
	}

	doJSON(t, mux, http.MethodPost, "/api/missions/"+m0.ID+"/start", nil, http.StatusOK)
	m := getMissionE2E(t, mux, m0.ID)
	if m.Status != domain.StatusMandateConfirmed {
		t.Fatalf("expected MANDATE_CONFIRMED after start, got %s", m.Status)
	}

	// Sourcing step: both synthetic suppliers auto-respond with labelled
	// simulated quotes and the mission advances to evaluation.
	m = workerStepE2E(t, mux, m)
	if m.Status != domain.StatusOffersReceived {
		t.Fatalf("expected OFFERS_RECEIVED after sourcing, got %s", m.Status)
	}

	var callouts []domain.Callout
	if err := json.Unmarshal(doJSON(t, mux, http.MethodGet, "/api/missions/"+m.ID+"/callouts", nil, http.StatusOK), &callouts); err != nil {
		t.Fatalf("failed to decode callouts: %v", err)
	}
	if len(callouts) != 2 {
		t.Fatalf("expected 2 callouts, got %d", len(callouts))
	}
	for _, co := range callouts {
		if !co.Simulated || co.Status != domain.CalloutOffered {
			t.Errorf("synthetic callout %s should be simulated+OFFERED, got sim=%v status=%s", co.ID, co.Simulated, co.Status)
		}
		if !strings.Contains(co.Message, "£500") {
			t.Errorf("callout message should state the budget: %q", co.Message)
		}
	}

	var offers []domain.Offer
	if err := json.Unmarshal(doJSON(t, mux, http.MethodGet, "/api/missions/"+m.ID+"/offers", nil, http.StatusOK), &offers); err != nil {
		t.Fatalf("failed to decode offers: %v", err)
	}
	if len(offers) != 2 {
		t.Fatalf("expected 2 offers, got %d", len(offers))
	}
	for _, off := range offers {
		if !off.Simulated {
			t.Errorf("synthetic offer %s must be flagged simulated", off.ID)
		}
		if off.CalloutID == "" {
			t.Errorf("offer %s must reference its callout", off.ID)
		}
	}

	// Evaluate step: in-budget simulated offers commit in DELEGATE mode.
	m = workerStepE2E(t, mux, m)
	if m.Status != domain.StatusCommitted {
		t.Fatalf("expected COMMITTED after evaluation, got %s", m.Status)
	}
	if m.SelectedSupplierID == "" {
		t.Errorf("expected a selected supplier after commit")
	}
} // Journey B — the concierge path: a verified supplier takes a real callout
// that waits, the concierge enters the real quote via intake, and the
// mission commits on that real offer.
func TestE2E_ConciergePath_VerifiedSupplier(t *testing.T) {
	mux, _ := setupE2E(t)

	// Onboard a verified supplier through the ops endpoint.
	var onboarded domain.Supplier
	if err := json.Unmarshal(doJSON(t, mux, http.MethodPost, "/api/suppliers/onboard", map[string]any{
		"displayName":    "Khan's Fridge Fix Ltd",
		"contact":        "+44 7700 900123",
		"postalDistrict": "N1",
		"capabilities":   []string{"commercial_refrigeration", "emergency_repair"},
		"priceTier":      "STANDARD",
		"availability":   "SAME_DAY_4HR",
	}, http.StatusCreated), &onboarded); err != nil {
		t.Fatalf("failed to decode onboarded supplier: %v", err)
	}
	if !onboarded.Verified {
		t.Fatalf("onboarded supplier must be verified")
	}

	// Create + start a fresh mission.
	m0 := createAndStart(t, mux)

	// Sourcing: exactly one real SENT callout, zero offers — the mission
	// waits in SOURCING like a real job would.
	m := workerStepE2E(t, mux, m0)
	if m.Status != domain.StatusSourcing {
		t.Fatalf("expected SOURCING (waiting for a real quote), got %s", m.Status)
	}

	var callouts []domain.Callout
	if err := json.Unmarshal(doJSON(t, mux, http.MethodGet, "/api/missions/"+m.ID+"/callouts", nil, http.StatusOK), &callouts); err != nil {
		t.Fatalf("failed to decode callouts: %v", err)
	}
	if len(callouts) != 1 {
		t.Fatalf("expected exactly 1 callout, got %d", len(callouts))
	}
	co := callouts[0]
	if co.Status != domain.CalloutSent || co.Simulated {
		t.Fatalf("expected a real SENT callout, got status=%s sim=%v", co.Status, co.Simulated)
	}
	if !strings.Contains(co.Message, "Khan's Fridge Fix Ltd") {
		t.Errorf("callout should address the supplier by name: %q", co.Message)
	}

	var offersBefore []domain.Offer
	if err := json.Unmarshal(doJSON(t, mux, http.MethodGet, "/api/missions/"+m.ID+"/offers", nil, http.StatusOK), &offersBefore); err != nil {
		t.Fatalf("failed to decode offers: %v", err)
	}
	if len(offersBefore) != 0 {
		t.Errorf("no offers should exist before the concierge enters a quote, got %d", len(offersBefore))
	}

	// The concierge enters the engineer's real quote.
	var intake struct {
		Callout domain.Callout `json:"callout"`
		Offer   domain.Offer   `json:"offer"`
	}
	if err := json.Unmarshal(doJSON(t, mux, http.MethodPost, "/api/callouts/"+co.ID+"/offer", map[string]any{
		"price":    480.0,
		"currency": "GBP",
		"eta":      "Today 4pm",
		"terms":    "F-Gas certified engineer, gas included",
	}, http.StatusOK), &intake); err != nil {
		t.Fatalf("failed to decode intake result: %v", err)
	}
	if intake.Offer.Simulated {
		t.Errorf("concierge-intake offer must not be simulated")
	}

	m = getMissionE2E(t, mux, m.ID)
	if m.Status != domain.StatusOffersReceived {
		t.Fatalf("expected OFFERS_RECEIVED after the first real quote, got %s", m.Status)
	}

	// Evaluation commits on the real offer, still inside the £500 mandate.
	m = workerStepE2E(t, mux, m)
	if m.Status != domain.StatusCommitted {
		t.Fatalf("expected COMMITTED after evaluation, got %s", m.Status)
	}
	if m.SelectedSupplierID != onboarded.ID {
		t.Errorf("expected selected supplier %s, got %s", onboarded.ID, m.SelectedSupplierID)
	}
}

func createAndStart(t *testing.T, mux http.Handler) domain.Mission {
	t.Helper()
	var m domain.Mission
	if err := json.Unmarshal(doJSON(t, mux, http.MethodPost, "/api/missions", map[string]any{
		"goal":             "Fridge down, food at risk",
		"experimentCohort": "parallel", // deterministic broadcast for assertions
	}, http.StatusCreated), &m); err != nil {
		t.Fatalf("failed to decode mission: %v", err)
	}
	doJSON(t, mux, http.MethodPost, "/api/missions/"+m.ID+"/start", nil, http.StatusOK)
	return getMissionE2E(t, mux, m.ID)
}
