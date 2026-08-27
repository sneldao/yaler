package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
)

const testMissionID = "m_test_callout_1"

// testSupplier builds a roster supplier matching the test mission's
// category (commercial_refrigeration) and district (N1).
func testSupplier(id, name string, verified bool) *domain.Supplier {
	return &domain.Supplier{
		ID:            id,
		PrincipalType: "supplier_agent",
		DisplayName:   name,
		Capabilities:  []string{"commercial_refrigeration", "emergency_repair"},
		ServiceArea:   domain.ServiceArea{PostalDistrict: "N1", RadiusKM: 10},
		Availability:  "SAME_DAY_2HR",
		PriceTier:     "STANDARD",
		Status:        "ACTIVE",
		Verified:      verified,
	}
}

// seedMission inserts a mission in the given status with the standard
// test mandate (commercial refrigeration in N1, £500 budget).
func seedMission(t *testing.T, st *store.MemoryStore, missionID string, status domain.MissionStatus) {
	t.Helper()
	now := time.Now().UTC()
	m := &domain.Mission{
		ID:     missionID,
		Goal:   "Fridge down, food at risk",
		Status: status,
		Mandate: domain.Mandate{
			Goal:            "Fridge down, food at risk",
			Budget:          domain.Budget{MaxAmount: 500, Currency: "GBP"},
			ServiceCategory: "commercial_refrigeration",
			ServiceArea:     domain.ServiceArea{PostalDistrict: "N1", RadiusKM: 10},
			AutonomyMode:    domain.AutonomyModeDelegate,
		},
		BuyerID:   "buyer_test",
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := st.CreateMission(context.Background(), m); err != nil {
		t.Fatalf("failed to seed mission %s: %v", missionID, err)
	}
}

// setupCalloutTest creates a handler with an in-memory store, seeds the
// given suppliers and the standard test mission in the given status, and
// returns the mux plus store for direct inspection.
func setupCalloutTest(t *testing.T, status domain.MissionStatus, suppliers ...*domain.Supplier) (http.Handler, *store.MemoryStore) {
	t.Helper()
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := &noopTaskClient{}
	h := handler.NewHandler(st, pe, nil, tc)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	for _, sup := range suppliers {
		if err := st.SaveSupplier(context.Background(), sup); err != nil {
			t.Fatalf("failed to seed supplier %s: %v", sup.ID, err)
		}
	}

	seedMission(t, st, testMissionID, status)
	return mux, st
}

// runWorkerStep posts a worker task for the given mission at its current
// version (1) and returns the recorder.
func runWorkerStep(t *testing.T, mux http.Handler, missionID string) *httptest.ResponseRecorder {
	t.Helper()
	payload := domain.TaskPayload{
		MissionID:       missionID,
		StepID:          "test_step",
		ExpectedVersion: 1,
		IdempotencyKey:  "test_idem_1",
		AttemptCount:    1,
		Deadline:        time.Now().Add(5 * time.Minute).Format(time.RFC3339),
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/worker/step", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func missionStatus(t *testing.T, st *store.MemoryStore, missionID string) domain.MissionStatus {
	t.Helper()
	m, err := st.GetMission(context.Background(), missionID)
	if err != nil {
		t.Fatalf("failed to get mission: %v", err)
	}
	return m.Status
}

func eventTypes(t *testing.T, st *store.MemoryStore, missionID string) map[string]bool {
	t.Helper()
	events, _ := st.ListEvents(context.Background(), missionID)
	types := make(map[string]bool)
	for _, e := range events {
		types[e.Type] = true
	}
	return types
}

func seedSentCallout(t *testing.T, st *store.MemoryStore, id, supplierID string, expiresAt time.Time) {
	t.Helper()
	co := &domain.Callout{
		ID:         id,
		MissionID:  testMissionID,
		SupplierID: supplierID,
		Status:     domain.CalloutSent,
		Message:    "can you take this?",
		SentAt:     time.Now().UTC(),
		ExpiresAt:  expiresAt,
	}
	if err := st.SaveCallout(context.Background(), co); err != nil {
		t.Fatalf("failed to seed callout: %v", err)
	}
}

// A verified supplier must receive a real SENT callout and the mission
// must wait in SOURCING — no fabricated offer.
func TestWorker_VerifiedSupplier_WaitsForQuote(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusMandateConfirmed,
		testSupplier("sup_real_1", "Noor Refrigeration", true))

	rec := runWorkerStep(t, mux, testMissionID)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker step: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	if got := missionStatus(t, st, testMissionID); got != domain.StatusSourcing {
		t.Fatalf("mission should wait in SOURCING, got %s", got)
	}

	callouts, _ := st.ListCallouts(context.Background(), testMissionID)
	if len(callouts) != 1 {
		t.Fatalf("expected 1 callout, got %d", len(callouts))
	}
	co := callouts[0]
	if co.Status != domain.CalloutSent {
		t.Errorf("expected callout SENT, got %s", co.Status)
	}
	if co.Simulated {
		t.Errorf("verified supplier callout must not be simulated")
	}
	if co.Message == "" {
		t.Errorf("callout message should be drafted")
	}
	if co.ExpiresAt.IsZero() {
		t.Errorf("callout should have an expiry")
	}

	offers, _ := st.ListOffers(context.Background(), testMissionID)
	if len(offers) != 0 {
		t.Errorf("verified callout must not fabricate an offer, got %d", len(offers))
	}

	if types := eventTypes(t, st, testMissionID); !types["CALLOUT_SENT"] {
		t.Errorf("expected CALLOUT_SENT event, got %v", types)
	}
}

// An unverified (synthetic) roster supplier gets a clearly labelled
// simulated quote so the demo stays runnable, and the mission advances.
func TestWorker_SyntheticSupplier_SimulatedQuote(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusMandateConfirmed,
		testSupplier("sup_seed", "London Rapid ColdCare (Synthetic)", false))

	rec := runWorkerStep(t, mux, testMissionID)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker step: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	if got := missionStatus(t, st, testMissionID); got != domain.StatusOffersReceived {
		t.Fatalf("mission should advance to OFFERS_RECEIVED, got %s", got)
	}

	callouts, _ := st.ListCallouts(context.Background(), testMissionID)
	if len(callouts) != 1 {
		t.Fatalf("expected 1 callout, got %d", len(callouts))
	}
	if !callouts[0].Simulated {
		t.Errorf("synthetic callout should be flagged simulated")
	}
	if callouts[0].Status != domain.CalloutOffered {
		t.Errorf("synthetic callout should be OFFERED, got %s", callouts[0].Status)
	}

	offers, _ := st.ListOffers(context.Background(), testMissionID)
	if len(offers) != 1 {
		t.Fatalf("expected 1 offer, got %d", len(offers))
	}
	off := offers[0]
	if !off.Simulated {
		t.Errorf("offer should be flagged simulated")
	}
	if off.CalloutID != callouts[0].ID {
		t.Errorf("offer should reference its callout, got %s", off.CalloutID)
	}
}

// FR-6: no matching roster suppliers is an exception, not a silent stall.
func TestWorker_NoSuppliers_Escalates(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusMandateConfirmed)

	rec := runWorkerStep(t, mux, testMissionID)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker step: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	if got := missionStatus(t, st, testMissionID); got != domain.StatusEscalated {
		t.Fatalf("mission should escalate with no suppliers, got %s", got)
	}
	if types := eventTypes(t, st, testMissionID); !types["NO_SUPPLIERS"] {
		t.Errorf("expected NO_SUPPLIERS event, got %v", types)
	}
}

// The concierge records a real quote against a SENT callout: it mints a
// real offer, flips the callout to OFFERED, and wakes the mission into
// evaluation.
func TestConciergeQuoteIntake(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusSourcing,
		testSupplier("sup_real", "Real Refrigeration Co", true))
	seedSentCallout(t, st, "call_test_1", "sup_real", time.Now().UTC().Add(time.Hour))

	body, _ := json.Marshal(map[string]any{
		"price":    380.0,
		"currency": "GBP",
		"eta":      "Today 5pm",
		"terms":    "Refrigerant + gas included",
	})
	req := httptest.NewRequest("POST", "/api/callouts/call_test_1/offer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("intake: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var resp struct {
		Callout domain.Callout `json:"callout"`
		Offer   domain.Offer   `json:"offer"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode intake response: %v", err)
	}

	if resp.Callout.Status != domain.CalloutOffered {
		t.Errorf("callout should be OFFERED, got %s", resp.Callout.Status)
	}
	if resp.Offer.CalloutID != "call_test_1" {
		t.Errorf("offer should reference the callout, got %q", resp.Offer.CalloutID)
	}
	if resp.Offer.Simulated {
		t.Errorf("concierge-intake offer must not be simulated")
	}
	if resp.Offer.Price != 380.0 {
		t.Errorf("expected price 380, got %v", resp.Offer.Price)
	}

	// Mission was in SOURCING, so a real quote must wake it into evaluation.
	if got := missionStatus(t, st, testMissionID); got != domain.StatusOffersReceived {
		t.Errorf("mission should advance to OFFERS_RECEIVED, got %s", got)
	}
	if types := eventTypes(t, st, testMissionID); !types["QUOTE_RECEIVED"] {
		t.Errorf("expected QUOTE_RECEIVED event, got %v", types)
	}

	// The offer must be persisted, tied to the callout.
	offers, _ := st.ListOffers(context.Background(), testMissionID)
	if len(offers) != 1 {
		t.Fatalf("expected 1 persisted offer, got %d", len(offers))
	}
	if offers[0].Evidence[0] != "concierge_intake" {
		t.Errorf("expected concierge_intake evidence, got %v", offers[0].Evidence)
	}
}

// A decline is recorded honestly: callout flips to DECLINED, no offer is
// minted, and the mission keeps waiting for other callouts.
func TestConciergeDecline(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusSourcing,
		testSupplier("sup_real", "Real Refrigeration Co", true))
	seedSentCallout(t, st, "call_test_2", "sup_real", time.Now().UTC().Add(time.Hour))

	body, _ := json.Marshal(map[string]any{
		"decline": true,
		"terms":   "Too far away today",
	})
	req := httptest.NewRequest("POST", "/api/callouts/call_test_2/offer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("decline: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	callouts, _ := st.ListCallouts(context.Background(), testMissionID)
	if len(callouts) != 1 || callouts[0].Status != domain.CalloutDeclined {
		t.Fatalf("callout should be DECLINED, got %+v", callouts)
	}
	offers, _ := st.ListOffers(context.Background(), testMissionID)
	if len(offers) != 0 {
		t.Errorf("decline must not mint an offer, got %d", len(offers))
	}
	if got := missionStatus(t, st, testMissionID); got != domain.StatusSourcing {
		t.Errorf("mission should stay in SOURCING after a decline, got %s", got)
	}
}

// Lazy expiry: answering a callout past its ExpiresAt is rejected and the
// callout is marked EXPIRED.
func TestExpiredCalloutRejected(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusSourcing,
		testSupplier("sup_real", "Real Refrigeration Co", true))
	seedSentCallout(t, st, "call_test_3", "sup_real", time.Now().UTC().Add(-1*time.Hour))

	body, _ := json.Marshal(map[string]any{"price": 100.0})
	req := httptest.NewRequest("POST", "/api/callouts/call_test_3/offer", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410 for expired callout, got %d", rec.Code)
	}
	got, err := st.GetCallout(context.Background(), "call_test_3")
	if err != nil {
		t.Fatalf("failed to get callout: %v", err)
	}
	if got.Status != domain.CalloutExpired {
		t.Errorf("callout should be EXPIRED, got %s", got.Status)
	}
	if types := eventTypes(t, st, testMissionID); !types["CALLOUT_EXPIRED"] {
		t.Errorf("expected CALLOUT_EXPIRED event, got %v", types)
	}
}

// A callout can only be answered once.
func TestAlreadyRespondedCalloutConflict(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusSourcing,
		testSupplier("sup_real", "Real Refrigeration Co", true))

	co := &domain.Callout{
		ID:         "call_test_4",
		MissionID:  testMissionID,
		SupplierID: "sup_real",
		Status:     domain.CalloutOffered,
		SentAt:     time.Now().UTC(),
		ExpiresAt:  time.Now().UTC().Add(time.Hour),
	}
	if err := st.SaveCallout(context.Background(), co); err != nil {
		t.Fatalf("failed to seed callout: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"price": 100.0})
	req := httptest.NewRequest("POST", "/api/callouts/call_test_4/offer", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 for re-answered callout, got %d", rec.Code)
	}
}

// Concierge onboarding registers a verified, bookable supplier — and once
// on the roster they receive real (SENT) callouts, not simulated quotes.
func TestOnboardSupplier(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusDraft)

	body, _ := json.Marshal(map[string]any{
		"displayName":    "Khan's Fridge Fix Ltd",
		"contact":        "+44 7700 900123",
		"postalDistrict": "N1",
		"radiusKm":       8,
		"capabilities":   []string{"commercial_refrigeration"},
		"priceTier":      "MODERATE",
		"availability":   "SAME_DAY_4HR",
		"evidence":       []string{"f_gas_certified", "refcom_registered"},
	})
	req := httptest.NewRequest("POST", "/api/suppliers/onboard", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("onboard: expected 201, got %d (body: %s)", rec.Code, rec.Body.String())
	}

	var sup domain.Supplier
	if err := json.NewDecoder(rec.Body).Decode(&sup); err != nil {
		t.Fatalf("failed to decode supplier: %v", err)
	}
	if !sup.Verified {
		t.Errorf("onboarded supplier must be Verified")
	}
	if sup.Status != "ACTIVE" {
		t.Errorf("expected ACTIVE status, got %s", sup.Status)
	}
	if sup.Source != "CONCIERGE" {
		t.Errorf("expected CONCIERGE source, got %s", sup.Source)
	}
	if sup.Contact == "" {
		t.Errorf("contact must be stored for outreach")
	}

	// A new mission on the same store now sources via the onboarded
	// supplier: it must get a real SENT callout, not a simulated quote.
	seedMission(t, st, "test_mission_2", domain.StatusMandateConfirmed)
	rec2 := runWorkerStep(t, mux, "test_mission_2")
	if rec2.Code != http.StatusOK {
		t.Fatalf("worker step: expected 200, got %d (body: %s)", rec2.Code, rec2.Body.String())
	}
	callouts, _ := st.ListCallouts(context.Background(), "test_mission_2")
	if len(callouts) != 1 {
		t.Fatalf("expected 1 callout for onboarded supplier, got %d", len(callouts))
	}
	if callouts[0].Status != domain.CalloutSent {
		t.Errorf("onboarded supplier should get a real SENT callout, got %s", callouts[0].Status)
	}
	if callouts[0].Simulated {
		t.Errorf("onboarded supplier callout must not be simulated")
	}
	if got := missionStatus(t, st, "test_mission_2"); got != domain.StatusSourcing {
		t.Errorf("mission with only verified suppliers should wait in SOURCING, got %s", got)
	}
}

// A stalled mission (ESCALATED by the sweeper) can be resumed: it returns
// to MANDATE_CONFIRMED and re-runs sourcing with fresh callouts (FR-6).
func TestResumeEscalatedMission(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusEscalated)

	// Resume from ESCALATED: 200, mission back to MANDATE_CONFIRMED.
	body, _ := json.Marshal(map[string]any{})
	req := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/resume", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("resume: expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var m domain.Mission
	if err := json.NewDecoder(rec.Body).Decode(&m); err != nil {
		t.Fatalf("failed to decode mission: %v", err)
	}
	if m.Status != domain.StatusMandateConfirmed {
		t.Fatalf("expected MANDATE_CONFIRMED after resume, got %s", m.Status)
	}
	if types := eventTypes(t, st, testMissionID); !types["MISSION_RESUMED"] {
		t.Errorf("expected MISSION_RESUMED event, got %v", types)
	}

	// Resume on a non-escalated mission: 409.
	mux2, _ := setupCalloutTest(t, domain.StatusCommitted)
	body2, _ := json.Marshal(map[string]any{})
	req2 := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/resume", bytes.NewBuffer(body2))
	req2.Header.Set("Content-Type", "application/json")
	rec2 := httptest.NewRecorder()
	mux2.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusConflict {
		t.Fatalf("resume on COMMITTED: expected 409, got %d", rec2.Code)
	}

	// Resume stays open even when OPS_TOKEN is set — retrying a stalled
	// job is a buyer action, not a concierge one.
	t.Setenv("OPS_TOKEN", "s3cret-concierge")
	req3 := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/resume", bytes.NewBuffer(body2))
	req3.Header.Set("Content-Type", "application/json")
	rec3 := httptest.NewRecorder()
	mux2.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusConflict {
		t.Fatalf("resume without ops token: expected 409 (still gated on status), got %d", rec3.Code)
	}
}

// When OPS_TOKEN is set, the concierge endpoints require the header.
func TestOpsTokenGuard(t *testing.T) {
	mux, _ := setupCalloutTest(t, domain.StatusSourcing)
	t.Setenv("OPS_TOKEN", "s3cret-concierge")

	body, _ := json.Marshal(map[string]any{
		"displayName":    "Blocked Ltd",
		"contact":        "+44 7000 000000",
		"postalDistrict": "N1",
		"capabilities":   []string{"commercial_refrigeration"},
	})
	req := httptest.NewRequest("POST", "/api/suppliers/onboard", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without ops token, got %d", rec.Code)
	}

	req2 := httptest.NewRequest("POST", "/api/suppliers/onboard", bytes.NewBuffer(body))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-Ops-Token", "s3cret-concierge")
	rec2 := httptest.NewRecorder()
	mux.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusCreated {
		t.Fatalf("expected 201 with ops token, got %d (body: %s)", rec2.Code, rec2.Body.String())
	}
}
