package handler_test

import (
	"context"
	"testing"
	"time"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
)

// setupSweepTest builds a handler (no mux needed — we call the sweeper
// method directly) with the standard mission in the given status and the
// given suppliers.
func setupSweepTest(t *testing.T, status domain.MissionStatus, suppliers ...*domain.Supplier) (*handler.Handler, *store.MemoryStore) {
	t.Helper()
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := &noopTaskClient{}
	h := handler.NewHandler(st, pe, nil, tc)

	for _, sup := range suppliers {
		if err := st.SaveSupplier(context.Background(), sup); err != nil {
			t.Fatalf("failed to seed supplier %s: %v", sup.ID, err)
		}
	}
	seedMission(t, st, testMissionID, status)
	return h, st
}

// seedDeclinedCallout inserts a terminal DECLINED callout for the mission.
func seedDeclinedCallout(t *testing.T, st *store.MemoryStore, id, supplierID string) {
	t.Helper()
	co := &domain.Callout{
		ID:          id,
		MissionID:   testMissionID,
		SupplierID:  supplierID,
		Status:      domain.CalloutDeclined,
		Message:     "can you take this?",
		SentAt:      time.Now().UTC().Add(-2 * time.Hour),
		ExpiresAt:   time.Now().UTC().Add(-1 * time.Hour),
		RespondedAt: time.Now().UTC().Add(-1 * time.Hour),
	}
	if err := st.SaveCallout(context.Background(), co); err != nil {
		t.Fatalf("failed to seed callout: %v", err)
	}
}

// A sourcing mission whose callouts all declined/expired with no quotes is
// escalated — FR-6: a supplier timeout is an exception, not a silent stall.
func TestSweep_EscalatesAllTerminal(t *testing.T) {
	h, st := setupSweepTest(t, domain.StatusSourcing,
		testSupplier("sup_a", "A Refrigeration", true),
		testSupplier("sup_b", "B Refrigeration", true))
	seedSentCallout(t, st, "call_a", "sup_a", time.Now().UTC().Add(-2*time.Hour))
	seedDeclinedCallout(t, st, "call_b", "sup_b")

	// callout_a is past its expiry: the sweep must expire it, then escalate.
	h.SweepStalledSourcing(context.Background())

	if got := missionStatus(t, st, testMissionID); got != domain.StatusEscalated {
		t.Fatalf("expected ESCALATED, got %s", got)
	}
	if types := eventTypes(t, st, testMissionID); !types["NO_QUOTES"] {
		t.Errorf("expected NO_QUOTES event, got %v", types)
	}
	// Both callouts must be terminal by the end of the pass.
	callouts, _ := st.ListCallouts(context.Background(), testMissionID)
	for _, co := range callouts {
		if co.Status != domain.CalloutDeclined && co.Status != domain.CalloutExpired {
			t.Errorf("callout %s should be terminal, got %s", co.ID, co.Status)
		}
	}
}

// A callout still awaiting a reply must keep the mission sourcing.
func TestSweep_KeepsWaitingForOpenCallout(t *testing.T) {
	h, st := setupSweepTest(t, domain.StatusSourcing,
		testSupplier("sup_a", "A Refrigeration", true))
	seedSentCallout(t, st, "call_open", "sup_a", time.Now().UTC().Add(time.Hour))

	h.SweepStalledSourcing(context.Background())

	if got := missionStatus(t, st, testMissionID); got != domain.StatusSourcing {
		t.Fatalf("expected SOURCING still, got %s", got)
	}
	if types := eventTypes(t, st, testMissionID); types["NO_QUOTES"] {
		t.Errorf("sweeper must not escalate while a callout is open: %v", types)
	}
}

// A quote in hand means the pipeline is progressing — skip, even if some
// callouts already expired.
func TestSweep_SkipsWhenOfferExists(t *testing.T) {
	h, st := setupSweepTest(t, domain.StatusSourcing,
		testSupplier("sup_real", "Real Refrigeration Co", true))
	seedSentCallout(t, st, "call_expired", "sup_real", time.Now().UTC().Add(-2*time.Hour))
	st.SaveOffer(context.Background(), &domain.Offer{
		ID:              "off_live",
		MissionID:       testMissionID,
		SupplierAgentID: "sup_real",
		CalloutID:       "call_expired",
		Price:           400,
		Currency:        "GBP",
		Status:          "SUBMITTED",
	})

	h.SweepStalledSourcing(context.Background())

	if got := missionStatus(t, st, testMissionID); got != domain.StatusSourcing {
		t.Fatalf("mission with an offer must not be escalated, got %s", got)
	}
}

// Missions outside SOURCING are never touched by the sweeper.
func TestSweep_SkipsOtherStatuses(t *testing.T) {
	for _, status := range []domain.MissionStatus{
		domain.StatusOffersReceived,
		domain.StatusMandateConfirmed,
		domain.StatusEscalated,
		domain.StatusCommitted,
	} {
		t.Run(string(status), func(t *testing.T) {
			h, st := setupSweepTest(t, status)
			seedDeclinedCallout(t, st, "call_x", "sup_x")

			h.SweepStalledSourcing(context.Background())

			if got := missionStatus(t, st, testMissionID); got != status {
				t.Fatalf("expected %s unchanged, got %s", status, got)
			}
		})
	}
}
