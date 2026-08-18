package policy

import (
	"fmt"
	"strings"
	"time"

	"github.com/sneldao/yaler/internal/domain"
)

// ProhibitedCategories are service areas that automatically require human verification/escalation for safety.
var ProhibitedCategories = map[string]bool{
	"gas":         true,
	"electrical":  true,
	"structural":  true,
	"fire_safety": true,
}

// Engine implements deterministic policy enforcement.
type Engine struct {
	nowFunc func() time.Time
}

// NewEngine constructs a policy Engine.
func NewEngine() *Engine {
	return &Engine{
		nowFunc: func() time.Time { return time.Now().UTC() },
	}
}

// NewEngineWithTime constructs an Engine with a mocked clock for deterministic tests.
func NewEngineWithTime(nowFunc func() time.Time) *Engine {
	return &Engine{nowFunc: nowFunc}
}

// Validate evaluates a proposed action against a mission mandate.
func (e *Engine) Validate(action domain.Action, mandate domain.Mandate) domain.PolicyResult {
	now := e.nowFunc()

	// 1. Mandate Expiration Check
	if !mandate.ExpiresAt.IsZero() && now.After(mandate.ExpiresAt) {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      "Mandate has expired",
			Disposition: domain.DispositionBlock,
		}
	}

	// 2. Autonomy Mode Check
	if mandate.AutonomyMode == domain.AutonomyModeObserve {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      "Mandate is in OBSERVE mode — no autonomous actions permitted",
			Disposition: domain.DispositionBlock,
		}
	}

	if mandate.AutonomyMode == domain.AutonomyModeCollaborate && isCommitmentAction(action.Type) {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      "Mandate is in COLLABORATE mode — buyer approval required before commitment",
			Disposition: domain.DispositionEscalate,
		}
	}

	// 3. Regulated Category Check
	cat := strings.ToLower(strings.TrimSpace(action.ServiceCategory))
	if cat != "" && ProhibitedCategories[cat] {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      fmt.Sprintf("Service category '%s' is regulated or hazardous and requires human verification", cat),
			Disposition: domain.DispositionEscalate,
		}
	}

	// 4. Budget Check
	if action.Amount > mandate.Budget.MaxAmount && mandate.Budget.MaxAmount > 0 {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      fmt.Sprintf("Proposed amount (£%.2f) exceeds mandate max budget (£%.2f)", action.Amount, mandate.Budget.MaxAmount),
			Disposition: domain.DispositionEscalate,
		}
	}

	if action.Currency != "" && mandate.Budget.Currency != "" && !strings.EqualFold(action.Currency, mandate.Budget.Currency) {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      fmt.Sprintf("Proposed currency '%s' does not match mandate currency '%s'", action.Currency, mandate.Budget.Currency),
			Disposition: domain.DispositionBlock,
		}
	}

	// 5. Completion Deadline Check
	if !action.CompletionDeadline.IsZero() && !mandate.LatestCompletionAt.IsZero() && action.CompletionDeadline.After(mandate.LatestCompletionAt) {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      "Completion deadline exceeds mandate limit",
			Disposition: domain.DispositionEscalate,
		}
	}

	// 6. Allowed Action Types Check
	if len(mandate.AllowedActions) > 0 && action.Type != "" {
		allowed := false
		for _, a := range mandate.AllowedActions {
			if strings.EqualFold(a, action.Type) {
				allowed = true
				break
			}
		}
		if !allowed {
			return domain.PolicyResult{
				Allowed:     false,
				Reason:      fmt.Sprintf("Action type '%s' is not permitted by mandate allowed actions", action.Type),
				Disposition: domain.DispositionBlock,
			}
		}
	}

	// 7. Geographic Radius Check
	if action.ServiceArea.RadiusKM > mandate.ServiceArea.RadiusKM && mandate.ServiceArea.RadiusKM > 0 {
		return domain.PolicyResult{
			Allowed:     false,
			Reason:      fmt.Sprintf("Service area radius (%.1f km) exceeds mandate limit (%.1f km)", action.ServiceArea.RadiusKM, mandate.ServiceArea.RadiusKM),
			Disposition: domain.DispositionBlock,
		}
	}

	return domain.PolicyResult{
		Allowed:     true,
		Reason:      "Action complies with all mandate policies",
		Disposition: domain.DispositionAllow,
	}
}

func isCommitmentAction(actionType string) bool {
	upper := strings.ToUpper(strings.TrimSpace(actionType))
	return upper == "COMMIT" || upper == "ACCEPT_OFFER" || upper == "DISPATCH"
}
