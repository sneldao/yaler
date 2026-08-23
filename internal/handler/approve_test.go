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

// noopTaskClient is a tasks.Client that does nothing — the approve
// handler test doesn't need to trigger worker steps.
type noopTaskClient struct{}

func (n *noopTaskClient) EnqueueTask(_ context.Context, _ domain.TaskPayload) error {
	return nil
}

// setupApproveTest creates a handler with an in-memory store, seeds a
// mission, and returns the mux + store for direct inspection.
func setupApproveTest(t *testing.T, status domain.MissionStatus) (http.Handler, *store.MemoryStore) {
	t.Helper()
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := &noopTaskClient{}
	h := handler.NewHandler(st, pe, nil, tc)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Seed a mission in the given status. We create it in DRAFT first,
	// then manually advance it via the store so we can place it in any
	// status the state machine allows from the APPROVE entry point.
	now := time.Now().UTC()
	m := &domain.Mission{
		ID:     "m_test_approve_1",
		Goal:   "Fix the fridge",
		Status: status,
		Mandate: domain.Mandate{
			Goal:            "Fix the fridge",
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
		t.Fatalf("failed to seed mission: %v", err)
	}

	return mux, st
}

func postApprove(t *testing.T, mux http.Handler, missionID, action string) (*httptest.ResponseRecorder, domain.Mission) {
	t.Helper()
	body, _ := json.Marshal(map[string]any{
		"action":          action,
		"selectedOfferId": "off_test_1",
	})
	req := httptest.NewRequest("POST", "/api/missions/"+missionID+"/approve", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	var m domain.Mission
	_ = json.NewDecoder(rec.Body).Decode(&m)
	return rec, m
}

// TestApproveWhenAlreadyBooked is the core regression test: a mission
// that auto-committed in DELEGATE mode must return 200 on re-approve,
// not 400. This locks in the fix from commit 61c8fec.
func TestApproveWhenAlreadyBooked(t *testing.T) {
	for _, status := range []domain.MissionStatus{
		domain.StatusCommitted,
		domain.StatusInProgress,
		domain.StatusEvidencePending,
		domain.StatusVerifying,
		domain.StatusCompleted,
	} {
		t.Run(string(status), func(t *testing.T) {
			mux, st := setupApproveTest(t, status)
			rec, m := postApprove(t, mux, "m_test_approve_1", "APPROVE")

			if rec.Code != http.StatusOK {
				t.Fatalf("APPROVE on %s: expected 200, got %d (body: %s)", status, rec.Code, rec.Body.String())
			}
			if m.Status != status {
				t.Errorf("APPROVE on %s: status should be unchanged, got %s", status, m.Status)
			}

			// No events should have been recorded — it's a no-op.
			events, _ := st.ListEvents(context.Background(), "m_test_approve_1")
			if len(events) != 0 {
				t.Errorf("APPROVE on %s: expected 0 events, got %d", status, len(events))
			}
		})
	}
}

func TestApproveWhenAwaitingApproval(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusAwaitingApproval)
	rec, m := postApprove(t, mux, "m_test_approve_1", "APPROVE")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if m.Status != domain.StatusCommitted {
		t.Errorf("expected COMMITTED, got %s", m.Status)
	}
	if m.SelectedSupplierID != "off_test_1" {
		t.Errorf("expected selectedSupplierId=off_test_1, got %s", m.SelectedSupplierID)
	}
}

func TestApproveWhenOffersReceived(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusOffersReceived)
	rec, m := postApprove(t, mux, "m_test_approve_1", "APPROVE")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if m.Status != domain.StatusCommitted {
		t.Errorf("expected COMMITTED, got %s", m.Status)
	}
}

func TestRejectMission(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusAwaitingApproval)
	rec, m := postApprove(t, mux, "m_test_approve_1", "REJECT")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if m.Status != domain.StatusCancelled {
		t.Errorf("expected CANCELLED, got %s", m.Status)
	}
}

func TestRerouteMission(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusAwaitingApproval)
	rec, m := postApprove(t, mux, "m_test_approve_1", "REROUTE")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if m.Status != domain.StatusRerouted {
		t.Errorf("expected REROUTED, got %s", m.Status)
	}
}

func TestApproveMissionNotFound(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusAwaitingApproval)
	rec, _ := postApprove(t, mux, "nonexistent", "APPROVE")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestApproveBadPayload(t *testing.T) {
	mux, _ := setupApproveTest(t, domain.StatusAwaitingApproval)
	req := httptest.NewRequest("POST", "/api/missions/m_test_approve_1/approve", bytes.NewBufferString("{invalid json"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
