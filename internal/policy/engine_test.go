package policy_test

import (
	"testing"
	"time"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/policy"
)

func TestPolicyEngineValidate(t *testing.T) {
	now := time.Date(2026, 8, 18, 12, 0, 0, 0, time.UTC)
	engine := policy.NewEngineWithTime(func() time.Time { return now })

	baseMandate := domain.Mandate{
		Goal: "Fix kitchen fridge",
		Budget: domain.Budget{
			MaxAmount: 500.0,
			Currency:  "GBP",
		},
		ServiceCategory:    "refrigeration",
		ServiceArea:        domain.ServiceArea{PostalDistrict: "N1", RadiusKM: 10.0},
		LatestCompletionAt: now.Add(24 * time.Hour),
		AllowedActions:     []string{"SOURCE", "REQUEST_OFFER", "COMMIT", "COUNTER_OFFER"},
		AutonomyMode:       domain.AutonomyModeDelegate,
		ExpiresAt:          now.Add(48 * time.Hour),
	}

	tests := []struct {
		name        string
		action      domain.Action
		mandate     domain.Mandate
		wantAllowed bool
		wantDisp    domain.PolicyDisposition
	}{
		{
			name: "Valid commitment action within budget",
			action: domain.Action{
				Type:               "COMMIT",
				Amount:             350.0,
				Currency:           "GBP",
				ServiceCategory:    "refrigeration",
				CompletionDeadline: now.Add(12 * time.Hour),
			},
			mandate:     baseMandate,
			wantAllowed: true,
			wantDisp:    domain.DispositionAllow,
		},
		{
			name: "Budget overrun triggers ESCALATE",
			action: domain.Action{
				Type:     "COMMIT",
				Amount:   650.0,
				Currency: "GBP",
			},
			mandate:     baseMandate,
			wantAllowed: false,
			wantDisp:    domain.DispositionEscalate,
		},
		{
			name: "Expired mandate triggers BLOCK",
			action: domain.Action{
				Type:   "SOURCE",
				Amount: 100.0,
			},
			mandate: func() domain.Mandate {
				m := baseMandate
				m.ExpiresAt = now.Add(-1 * time.Hour)
				return m
			}(),
			wantAllowed: false,
			wantDisp:    domain.DispositionBlock,
		},
		{
			name: "OBSERVE autonomy mode triggers BLOCK",
			action: domain.Action{
				Type:   "SOURCE",
				Amount: 100.0,
			},
			mandate: func() domain.Mandate {
				m := baseMandate
				m.AutonomyMode = domain.AutonomyModeObserve
				return m
			}(),
			wantAllowed: false,
			wantDisp:    domain.DispositionBlock,
		},
		{
			name: "COLLABORATE mode on COMMIT triggers ESCALATE for approval",
			action: domain.Action{
				Type:   "COMMIT",
				Amount: 300.0,
			},
			mandate: func() domain.Mandate {
				m := baseMandate
				m.AutonomyMode = domain.AutonomyModeCollaborate
				return m
			}(),
			wantAllowed: false,
			wantDisp:    domain.DispositionEscalate,
		},
		{
			name: "Regulated category gas triggers ESCALATE",
			action: domain.Action{
				Type:            "COMMIT",
				Amount:          300.0,
				ServiceCategory: "gas",
			},
			mandate:     baseMandate,
			wantAllowed: false,
			wantDisp:    domain.DispositionEscalate,
		},
		{
			name: "Completion deadline exceeded triggers ESCALATE",
			action: domain.Action{
				Type:               "COMMIT",
				Amount:             300.0,
				CompletionDeadline: now.Add(36 * time.Hour),
			},
			mandate:     baseMandate,
			wantAllowed: false,
			wantDisp:    domain.DispositionEscalate,
		},
		{
			name: "Disallowed action type triggers BLOCK",
			action: domain.Action{
				Type:   "DIRECT_PAY",
				Amount: 100.0,
			},
			mandate:     baseMandate,
			wantAllowed: false,
			wantDisp:    domain.DispositionBlock,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := engine.Validate(tt.action, tt.mandate)
			if res.Allowed != tt.wantAllowed {
				t.Errorf("Validate() Allowed = %v, want %v (reason: %s)", res.Allowed, tt.wantAllowed, res.Reason)
			}
			if res.Disposition != tt.wantDisp {
				t.Errorf("Validate() Disposition = %v, want %v", res.Disposition, tt.wantDisp)
			}
		})
	}
}
