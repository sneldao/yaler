package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
	"github.com/sneldao/yaler/internal/tasks"
)

func TestA2ARegisterSupplierAndSubmitQuote(t *testing.T) {
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := tasks.NewLocalDirectClient("http://localhost:8081/api/worker/step")
	h := handler.NewHandler(st, pe, nil, tc)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// 1. Test a2a.registerSupplier
	regBody := []byte(`{
		"jsonrpc": "2.0",
		"method": "a2a.registerSupplier",
		"params": {
			"id": "sup_a2a_london_1",
			"displayName": "A2A London Catering Repairs",
			"capabilities": ["commercial_refrigeration", "extraction_cleaning"],
			"postalDistrict": "EC1",
			"radiusKm": 15,
			"priceTier": "PREMIUM",
			"reliabilityScore": 0.98
		},
		"id": 1
	}`)

	req := httptest.NewRequest("POST", "/api/a2a", bytes.NewBuffer(regBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp handler.JSONRPCResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode JSON-RPC response: %v", err)
	}
	if resp.Error != nil {
		t.Fatalf("unexpected JSON-RPC error: %v", resp.Error)
	}

	// 2. Test a2a.submitQuote
	quoteBody := []byte(`{
		"jsonrpc": "2.0",
		"method": "a2a.submitQuote",
		"params": {
			"missionId": "m_test_123",
			"supplierAgentId": "sup_a2a_london_1",
			"price": 350.0,
			"currency": "GBP",
			"availability": "SAME_DAY_2HR",
			"terms": "A2A signed SLA",
			"signature": "sha256_sig_mock_12345"
		},
		"id": 2
	}`)

	reqQuote := httptest.NewRequest("POST", "/api/a2a", bytes.NewBuffer(quoteBody))
	reqQuote.Header.Set("Content-Type", "application/json")
	recQuote := httptest.NewRecorder()
	mux.ServeHTTP(recQuote, reqQuote)

	if recQuote.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recQuote.Code)
	}

	var respQuote handler.JSONRPCResponse
	if err := json.NewDecoder(recQuote.Body).Decode(&respQuote); err != nil {
		t.Fatalf("failed to decode JSON-RPC quote response: %v", err)
	}
	if respQuote.Error != nil {
		t.Fatalf("unexpected JSON-RPC error on quote: %v", respQuote.Error)
	}
}
