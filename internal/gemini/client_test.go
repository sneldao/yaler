package gemini_test

import (
	"context"
	"testing"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/gemini"
)

func TestGeminiFallback(t *testing.T) {
	t.Setenv("GEMINI_API_KEY", "")
	t.Setenv("GCP_PROJECT_ID", "")
	ctx := context.Background()
	client, err := gemini.NewClient(ctx)
	if err != nil {
		t.Fatalf("Failed to initialize Gemini client: %v", err)
	}

	// 1. Mandate Extraction
	mandate, err := client.ExtractMandate(ctx, "Commercial fridge temperature rising, need repair before lunch in N1")
	if err != nil {
		t.Fatalf("ExtractMandate error: %v", err)
	}
	if mandate.Budget.MaxAmount <= 0 {
		t.Errorf("Expected valid budget max amount, got %.2f", mandate.Budget.MaxAmount)
	}
	if mandate.AutonomyMode != domain.AutonomyModeDelegate {
		t.Errorf("Expected DELEGATE autonomy mode, got %s", mandate.AutonomyMode)
	}

	// 2. Offer Comparison
	offers := []*domain.Offer{
		{
			ID:              "off-1",
			SupplierAgentID: "sup_rapid_coldcare",
			Price:           380.0,
			Currency:        "GBP",
			Availability:    "SAME_DAY_2HR",
		},
		{
			ID:              "off-2",
			SupplierAgentID: "sup_capital_kitchen",
			Price:           280.0,
			Currency:        "GBP",
			Availability:    "NEXT_DAY",
		},
	}

	ranking, err := client.CompareOffers(ctx, *mandate, offers, nil)
	if err != nil {
		t.Fatalf("CompareOffers error: %v", err)
	}
	if len(ranking.Rankings) != 2 {
		t.Errorf("Expected 2 ranked offers, got %d", len(ranking.Rankings))
	}

	// 3. Counteroffer Drafting
	draft, err := client.DraftCounteroffer(ctx, *mandate, offers[0], "Exceeded budget")
	if err != nil {
		t.Fatalf("DraftCounteroffer error: %v", err)
	}
	if draft.CounterPrice <= 0 {
		t.Errorf("Expected positive counter price, got %.2f", draft.CounterPrice)
	}

	// 4. Evidence Extraction
	evidenceRes, err := client.ExtractEvidence(ctx, "Technician installed new compressor, cooling verified at 3°C", []string{"photo_before_after"})
	if err != nil {
		t.Fatalf("ExtractEvidence error: %v", err)
	}
	if !evidenceRes.Satisfied {
		t.Errorf("Expected evidence to be satisfied")
	}
}
