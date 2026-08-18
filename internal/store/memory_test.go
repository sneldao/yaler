package store_test

import (
	"context"
	"testing"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/store"
)

func TestMemoryStore(t *testing.T) {
	ctx := context.Background()
	s := store.NewMemoryStore()

	// 1. Create Mission
	m := &domain.Mission{
		ID:      "m-100",
		Goal:    "Fix walk-in freezer",
		Status:  domain.StatusDraft,
		Version: 1,
	}
	if err := s.CreateMission(ctx, m); err != nil {
		t.Fatalf("CreateMission error: %v", err)
	}

	// 2. Get Mission
	got, err := s.GetMission(ctx, "m-100")
	if err != nil {
		t.Fatalf("GetMission error: %v", err)
	}
	if got.Goal != "Fix walk-in freezer" {
		t.Errorf("expected goal 'Fix walk-in freezer', got '%s'", got.Goal)
	}

	// 3. Update Mission Version Check
	updated := *got
	updated.Status = domain.StatusMandateConfirmed
	updated.Version = 2
	if err := s.UpdateMission(ctx, &updated); err != nil {
		t.Fatalf("UpdateMission error: %v", err)
	}

	// Stale update should fail
	stale := *got
	stale.Version = 1
	if err := s.UpdateMission(ctx, &stale); err != store.ErrConflict {
		t.Errorf("expected ErrConflict for stale update, got: %v", err)
	}

	// 4. Save & Search Suppliers
	sup := &domain.Supplier{
		ID:           "sup-1",
		DisplayName:  "Cold Tech",
		Capabilities: []string{"refrigeration"},
		ServiceArea:  domain.ServiceArea{PostalDistrict: "N1"},
	}
	if err := s.SaveSupplier(ctx, sup); err != nil {
		t.Fatalf("SaveSupplier error: %v", err)
	}

	sups, err := s.SearchSuppliers(ctx, "refrigeration", "N1")
	if err != nil || len(sups) != 1 {
		t.Fatalf("SearchSuppliers expected 1 match, got %d (err: %v)", len(sups), err)
	}
}
