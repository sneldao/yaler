package domain

import (
	"time"
)

var validTransitions = map[MissionStatus]map[MissionStatus]bool{
	StatusDraft: {
		StatusMandateConfirmed: true,
		StatusCancelled:        true,
	},
	StatusMandateConfirmed: {
		StatusSourcing:  true,
		StatusCancelled: true,
		StatusEscalated: true,
	},
	StatusSourcing: {
		StatusOffersReceived: true,
		StatusCancelled:      true,
		StatusEscalated:      true,
	},
	StatusOffersReceived: {
		StatusNegotiating:      true,
		StatusAwaitingApproval: true,
		StatusCommitted:        true,
		StatusCancelled:        true,
		StatusEscalated:        true,
	},
	StatusNegotiating: {
		StatusOffersReceived:   true,
		StatusCommitted:        true,
		StatusAwaitingApproval: true,
		StatusCancelled:        true,
		StatusEscalated:        true,
	},
	StatusAwaitingApproval: {
		StatusCommitted:   true,
		StatusNegotiating: true,
		StatusRerouted:    true,
		StatusCancelled:   true,
		StatusEscalated:   true,
	},
	StatusCommitted: {
		StatusInProgress: true,
		StatusRerouted:   true,
		StatusCancelled:  true,
		StatusEscalated:  true,
	},
	StatusInProgress: {
		StatusEvidencePending: true,
		StatusRerouted:        true,
		StatusCancelled:       true,
		StatusEscalated:       true,
	},
	StatusEvidencePending: {
		StatusVerifying: true,
		StatusCancelled: true,
		StatusEscalated: true,
	},
	StatusVerifying: {
		StatusCompleted:       true,
		StatusEvidencePending: true,
		StatusRerouted:        true,
		StatusCancelled:       true,
		StatusEscalated:       true,
	},
	StatusRerouted: {
		StatusSourcing:       true,
		StatusOffersReceived: true,
		StatusCancelled:      true,
		StatusEscalated:      true,
	},
	StatusEscalated: {
		StatusMandateConfirmed: true,
		StatusSourcing:         true,
		StatusOffersReceived:   true,
		StatusNegotiating:      true,
		StatusAwaitingApproval: true,
		StatusCommitted:        true,
		StatusInProgress:       true,
		StatusEvidencePending:  true,
		StatusVerifying:        true,
		StatusCancelled:        true,
	},
}

// ValidateTransition checks if moving from `from` to `to` status is permitted.
func ValidateTransition(from, to MissionStatus) error {
	if allowed, ok := validTransitions[from]; ok && allowed[to] {
		return nil
	}
	return &ErrInvalidTransition{From: from, To: to}
}

// Transition updates the mission's status, updates UpdatedAt, and increments Version if valid.
func Transition(mission *Mission, to MissionStatus) error {
	if err := ValidateTransition(mission.Status, to); err != nil {
		return err
	}
	mission.Status = to
	mission.Version++
	mission.UpdatedAt = time.Now().UTC()
	return nil
}

// IsTerminal returns true if the status represents a final state.
func IsTerminal(status MissionStatus) bool {
	return status == StatusCompleted || status == StatusCancelled
}
