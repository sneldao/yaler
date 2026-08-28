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
	"github.com/sneldao/yaler/internal/tasks"
)

// seedMissionWithSignals inserts a mission whose diagnostic brief carries
// two extracted signals, one suggested and one already confirmed.
func seedMissionWithSignals(t *testing.T, st *store.MemoryStore, missionID string) {
	t.Helper()
	now := time.Now().UTC()
	m := &domain.Mission{
		ID:     missionID,
		Goal:   "Fridge down, food at risk",
		Status: domain.StatusMandateConfirmed,
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
		DiagnosticBrief: domain.DiagnosticBrief{
			ReportedSummary: "Freezer holding at -8C instead of -18C",
			Confidence:      "preliminary",
			ExtractedSignals: []domain.DiagnosticSignal{
				{Label: "Displayed temperature", Value: "-8C", Source: "image", Confidence: "observed", Status: "SUGGESTED"},
				{Label: "Model number", Value: "Foster Xtra 600", Source: "image", Confidence: "observed", Status: "CONFIRMED"},
			},
		},
	}
	if err := st.CreateMission(context.Background(), m); err != nil {
		t.Fatalf("failed to seed mission %s: %v", missionID, err)
	}
}

// newSignalTestHandler builds a handler wired to a fresh memory store.
func newSignalTestHandler(t *testing.T) (*store.MemoryStore, *http.ServeMux) {
	t.Helper()
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := tasks.NewLocalDirectClient("http://localhost:8081/api/worker/step")
	h := handler.NewHandler(st, pe, nil, tc)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	return st, mux
}

func postSignal(t *testing.T, mux *http.ServeMux, missionID string, body map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}
	req := httptest.NewRequest("POST", "/api/missions/"+missionID+"/diagnostic-signals", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func decodeMission(t *testing.T, rec *httptest.ResponseRecorder) *domain.Mission {
	t.Helper()
	var m domain.Mission
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("failed to decode mission response: %v", err)
	}
	return &m
}

func TestDiagnosticSignalConfirm(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_confirm")

	rec := postSignal(t, mux, "m_sig_confirm", map[string]any{"index": 0, "action": "CONFIRM"})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	m := decodeMission(t, rec)
	if got := m.DiagnosticBrief.ExtractedSignals[0].Status; got != "CONFIRMED" {
		t.Fatalf("expected CONFIRMED, got %s", got)
	}
	if got := m.DiagnosticBrief.ExtractedSignals[0].Value; got != "-8C" {
		t.Fatalf("confirm must not rewrite value, got %q", got)
	}

	events, err := st.ListEvents(context.Background(), "m_sig_confirm")
	if err != nil {
		t.Fatalf("failed to list events: %v", err)
	}
	var reviewed *domain.Event
	for _, e := range events {
		if e.Type == "DIAGNOSTIC_SIGNAL_REVIEWED" {
			reviewed = e
		}
	}
	if reviewed == nil {
		t.Fatal("expected DIAGNOSTIC_SIGNAL_REVIEWED event")
	}
	payload, ok := reviewed.Payload.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %T", reviewed.Payload)
	}
	if payload["action"] != "CONFIRM" {
		t.Fatalf("expected action CONFIRM in event, got %v", payload["action"])
	}
	if payload["original"] == nil || payload["updated"] == nil {
		t.Fatal("audit event must record original and updated signal")
	}
}

func TestDiagnosticSignalDismiss(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_dismiss")

	rec := postSignal(t, mux, "m_sig_dismiss", map[string]any{"index": 0, "action": "DISMISS"})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	m := decodeMission(t, rec)
	if got := m.DiagnosticBrief.ExtractedSignals[0].Status; got != "DISMISSED" {
		t.Fatalf("expected DISMISSED, got %s", got)
	}
}

func TestDiagnosticSignalEdit(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_edit")

	rec := postSignal(t, mux, "m_sig_edit", map[string]any{"index": 0, "action": "EDIT", "value": "-6C"})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	m := decodeMission(t, rec)
	sig := m.DiagnosticBrief.ExtractedSignals[0]
	if sig.Value != "-6C" {
		t.Fatalf("expected edited value -6C, got %q", sig.Value)
	}
	if sig.Status != "CONFIRMED" {
		t.Fatalf("edit must confirm the signal, got %s", sig.Status)
	}

	// Audit event must keep the original value intact.
	events, err := st.ListEvents(context.Background(), "m_sig_edit")
	if err != nil {
		t.Fatalf("failed to list events: %v", err)
	}
	for _, e := range events {
		if e.Type != "DIAGNOSTIC_SIGNAL_REVIEWED" {
			continue
		}
		payload := e.Payload.(map[string]any)
		original, ok := payload["original"].(domain.DiagnosticSignal)
		if !ok {
			t.Fatalf("expected DiagnosticSignal original, got %T", payload["original"])
		}
		if original.Value != "-8C" {
			t.Fatalf("audit event must preserve original value, got %q", original.Value)
		}
	}
}

func TestDiagnosticSignalEditWithLabel(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_edit_label")

	rec := postSignal(t, mux, "m_sig_edit_label", map[string]any{"index": 0, "action": "EDIT", "value": "-6C", "label": "Displayed temperature (revised)"})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	m := decodeMission(t, rec)
	sig := m.DiagnosticBrief.ExtractedSignals[0]
	if sig.Label != "Displayed temperature (revised)" {
		t.Fatalf("expected revised label, got %q", sig.Label)
	}
}

func TestDiagnosticSignalEditRequiresValue(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_edit_empty")

	rec := postSignal(t, mux, "m_sig_edit_empty", map[string]any{"index": 0, "action": "EDIT", "value": "  "})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty edit value, got %d", rec.Code)
	}
}

func TestDiagnosticSignalInvalidAction(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_bad_action")

	rec := postSignal(t, mux, "m_sig_bad_action", map[string]any{"index": 0, "action": "IGNORE"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid action, got %d", rec.Code)
	}
}

func TestDiagnosticSignalIndexOutOfRange(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_bad_index")

	rec := postSignal(t, mux, "m_sig_bad_index", map[string]any{"index": 9, "action": "CONFIRM"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for out-of-range index, got %d", rec.Code)
	}
}

func TestDiagnosticSignalMissionNotFound(t *testing.T) {
	_, mux := newSignalTestHandler(t)
	rec := postSignal(t, mux, "m_sig_missing", map[string]any{"index": 0, "action": "CONFIRM"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing mission, got %d", rec.Code)
	}
}

func TestDiagnosticSignalIdempotentConfirm(t *testing.T) {
	st, mux := newSignalTestHandler(t)
	seedMissionWithSignals(t, st, "m_sig_idem")

	first := postSignal(t, mux, "m_sig_idem", map[string]any{"index": 0, "action": "CONFIRM"})
	if first.Code != http.StatusOK {
		t.Fatalf("first confirm expected 200, got %d", first.Code)
	}
	second := postSignal(t, mux, "m_sig_idem", map[string]any{"index": 0, "action": "CONFIRM"})
	if second.Code != http.StatusOK {
		t.Fatalf("second confirm expected 200, got %d", second.Code)
	}
	m := decodeMission(t, second)
	sig := m.DiagnosticBrief.ExtractedSignals[0]
	if sig.Status != "CONFIRMED" {
		t.Fatalf("expected CONFIRMED after repeat, got %s", sig.Status)
	}
	if sig.Value != "-8C" {
		t.Fatalf("repeat confirm must not rewrite value, got %q", sig.Value)
	}

	// Repeat review records another audit event but never corrupts state.
	events, err := st.ListEvents(context.Background(), "m_sig_idem")
	if err != nil {
		t.Fatalf("failed to list events: %v", err)
	}
	var count int
	for _, e := range events {
		if e.Type == "DIAGNOSTIC_SIGNAL_REVIEWED" {
			count++
		}
	}
	if count != 2 {
		t.Fatalf("expected 2 review events, got %d", count)
	}
}
