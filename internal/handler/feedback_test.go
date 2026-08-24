package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/sneldao/yaler/internal/domain"
)

// ReliabilityFromFeedback is the pure formula. Test the weight ramp and
// clamping without a store or handler.

func TestReliability_NoFeedback_ReturnsSeed(t *testing.T) {
	if got := domain.ReliabilityFromFeedback(0.7, nil); got != 0.7 {
		t.Errorf("no feedback should return seed 0.7, got %v", got)
	}
}

func TestReliability_OneJob_DoesntDominate(t *testing.T) {
	// A single 1-star rating on a 0.9 seed must not crash the score to ~0.
	got := domain.ReliabilityFromFeedback(0.9, []*domain.MissionFeedback{
		{Rating: 1},
	})
	// 70% seed + 30% (rating 1 -> 0.0) = 0.63
	if got < 0.62 || got > 0.64 {
		t.Errorf("one 1-star on 0.9 seed: expected ~0.63, got %v", got)
	}
}

func TestReliability_FiveJobs_TrackRecordSpeaks(t *testing.T) {
	// Five 5-star ratings: 80% mean (1.0) + 20% seed => high regardless of seed.
	got := domain.ReliabilityFromFeedback(0.5, []*domain.MissionFeedback{
		{Rating: 5}, {Rating: 5}, {Rating: 5}, {Rating: 5}, {Rating: 5},
	})
	if got < 0.89 {
		t.Errorf("five 5-star ratings should push score near 1.0, got %v", got)
	}
}

func TestReliability_ClampsToUnitInterval(t *testing.T) {
	// Ratings are clamped 1..5, so the result must stay within [0,1].
	low := domain.ReliabilityFromFeedback(0, []*domain.MissionFeedback{{Rating: 0}, {Rating: 0}})
	high := domain.ReliabilityFromFeedback(1, []*domain.MissionFeedback{{Rating: 99}, {Rating: 99}})
	if low < 0 || low > 1 || high < 0 || high > 1 {
		t.Errorf("score out of [0,1]: low=%v high=%v", low, high)
	}
}

// The handler: feedback on a completed mission recomputes the score and
// records a FEEDBACK_RECORDED event; rejects non-completed missions and
// bad ratings.

func TestSubmitFeedback_ReducesScoreOnLowRating(t *testing.T) {
	mux, st := setupCalloutTest(t, domain.StatusCompleted)
	// Seed the selected supplier with a high static score.
	st.SaveSupplier(context.Background(), &domain.Supplier{
		ID: "sup_real", DisplayName: "Real Refrigeration Co",
		ReliabilityScore: 0.9, Status: "ACTIVE", Verified: true,
	})
	// The mission must point at the supplier. Bump the version to satisfy
	// the optimistic lock (Transition isn't available here; this is a seed fix).
	m, _ := st.GetMission(context.Background(), testMissionID)
	m.SelectedSupplierID = "sup_real"
	m.Version++
	st.UpdateMission(context.Background(), m)

	body, _ := json.Marshal(map[string]any{"rating": 2, "comment": "Late but done"})
	req := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/feedback", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	sup, _ := st.GetSupplier(context.Background(), "sup_real")
	// seed 0.9, one 2-star (mean 0.25), weight 0.3 => 0.9*0.7 + 0.25*0.3 = 0.705
	if sup.ReliabilityScore > 0.71 || sup.ReliabilityScore < 0.70 {
		t.Errorf("expected score ~0.705 after one 2-star on 0.9 seed, got %v", sup.ReliabilityScore)
	}
	if types := eventTypes(t, st, testMissionID); !types["FEEDBACK_RECORDED"] {
		t.Errorf("expected FEEDBACK_RECORDED event, got %v", types)
	}
	// Feedback persisted and retrievable.
	fb, _ := st.GetMissionFeedback(context.Background(), testMissionID)
	if fb.Rating != 2 {
		t.Errorf("expected rating 2, got %d", fb.Rating)
	}
}

func TestSubmitFeedback_RejectsNonCompleted(t *testing.T) {
	mux, _ := setupCalloutTest(t, domain.StatusSourcing)
	body, _ := json.Marshal(map[string]any{"rating": 5})
	req := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/feedback", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 on non-completed mission, got %d", rec.Code)
	}
}

func TestSubmitFeedback_ValidatesRatingRange(t *testing.T) {
	mux, _ := setupCalloutTest(t, domain.StatusCompleted)
	for _, r := range []int{0, 6} {
		body, _ := json.Marshal(map[string]any{"rating": r})
		req := httptest.NewRequest("POST", "/api/missions/"+testMissionID+"/feedback", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("rating %d should be rejected (400), got %d", r, rec.Code)
		}
	}
}
