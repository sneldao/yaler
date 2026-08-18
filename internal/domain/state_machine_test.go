package domain_test

import (
	"testing"

	"github.com/sneldao/yaler/internal/domain"
)

func TestValidateTransition(t *testing.T) {
	tests := []struct {
		name    string
		from    domain.MissionStatus
		to      domain.MissionStatus
		wantErr bool
	}{
		{"Draft to MandateConfirmed", domain.StatusDraft, domain.StatusMandateConfirmed, false},
		{"Draft to Cancelled", domain.StatusDraft, domain.StatusCancelled, false},
		{"Draft to Completed (Invalid)", domain.StatusDraft, domain.StatusCompleted, true},
		{"MandateConfirmed to Sourcing", domain.StatusMandateConfirmed, domain.StatusSourcing, false},
		{"MandateConfirmed to Escalated", domain.StatusMandateConfirmed, domain.StatusEscalated, false},
		{"Sourcing to OffersReceived", domain.StatusSourcing, domain.StatusOffersReceived, false},
		{"OffersReceived to Committed", domain.StatusOffersReceived, domain.StatusCommitted, false},
		{"OffersReceived to Negotiating", domain.StatusOffersReceived, domain.StatusNegotiating, false},
		{"OffersReceived to AwaitingApproval", domain.StatusOffersReceived, domain.StatusAwaitingApproval, false},
		{"Negotiating to OffersReceived", domain.StatusNegotiating, domain.StatusOffersReceived, false},
		{"Committed to InProgress", domain.StatusCommitted, domain.StatusInProgress, false},
		{"InProgress to EvidencePending", domain.StatusInProgress, domain.StatusEvidencePending, false},
		{"EvidencePending to Verifying", domain.StatusEvidencePending, domain.StatusVerifying, false},
		{"Verifying to Completed", domain.StatusVerifying, domain.StatusCompleted, false},
		{"Verifying to EvidencePending (Reject Evidence)", domain.StatusVerifying, domain.StatusEvidencePending, false},
		{"Completed to Sourcing (Invalid)", domain.StatusCompleted, domain.StatusSourcing, true},
		{"Cancelled to Draft (Invalid)", domain.StatusCancelled, domain.StatusDraft, true},
		{"Escalated to MandateConfirmed", domain.StatusEscalated, domain.StatusMandateConfirmed, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := domain.ValidateTransition(tt.from, tt.to)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateTransition(%s, %s) error = %v, wantErr %v", tt.from, tt.to, err, tt.wantErr)
			}
		})
	}
}

func TestTransition(t *testing.T) {
	m := &domain.Mission{
		ID:      "m-1",
		Status:  domain.StatusDraft,
		Version: 1,
	}

	err := domain.Transition(m, domain.StatusMandateConfirmed)
	if err != nil {
		t.Fatalf("unexpected transition error: %v", err)
	}

	if m.Status != domain.StatusMandateConfirmed {
		t.Errorf("expected status %s, got %s", domain.StatusMandateConfirmed, m.Status)
	}
	if m.Version != 2 {
		t.Errorf("expected version 2, got %d", m.Version)
	}

	// Try invalid transition
	err = domain.Transition(m, domain.StatusCompleted)
	if err == nil {
		t.Errorf("expected error for invalid transition, got nil")
	}
}
