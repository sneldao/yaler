package domain

import (
	"fmt"
	"time"
)

// AutonomyMode defines how autonomous the agent is allowed to be.
type AutonomyMode string

const (
	AutonomyModeDelegate    AutonomyMode = "DELEGATE"    // In-policy commitment without per-step approval
	AutonomyModeCollaborate AutonomyMode = "COLLABORATE" // Mandatory buyer approval before commitment
	AutonomyModeObserve     AutonomyMode = "OBSERVE"     // Read-only, no contact or commitment
)

// MissionStatus represents the lifecycle state of a mission.
type MissionStatus string

const (
	StatusDraft            MissionStatus = "DRAFT"
	StatusMandateConfirmed MissionStatus = "MANDATE_CONFIRMED"
	StatusSourcing         MissionStatus = "SOURCING"
	StatusOffersReceived   MissionStatus = "OFFERS_RECEIVED"
	StatusNegotiating      MissionStatus = "NEGOTIATING"
	StatusAwaitingApproval MissionStatus = "AWAITING_APPROVAL"
	StatusCommitted        MissionStatus = "COMMITTED"
	StatusInProgress       MissionStatus = "IN_PROGRESS"
	StatusEvidencePending  MissionStatus = "EVIDENCE_PENDING"
	StatusVerifying        MissionStatus = "VERIFYING"
	StatusCompleted        MissionStatus = "COMPLETED"
	StatusRerouted         MissionStatus = "REROUTED"
	StatusEscalated        MissionStatus = "ESCALATED"
	StatusCancelled        MissionStatus = "CANCELLED"
)

// Budget defines financial boundaries.
type Budget struct {
	MaxAmount float64 `json:"maxAmount" firestore:"maxAmount"`
	Currency  string  `json:"currency" firestore:"currency"`
}

// ServiceArea defines geographic boundaries.
type ServiceArea struct {
	PostalDistrict string  `json:"postalDistrict" firestore:"postalDistrict"`
	RadiusKM       float64 `json:"radiusKm" firestore:"radiusKm"`
}

// Mandate defines the boundary within which the agent may act.
type Mandate struct {
	Goal               string       `json:"goal" firestore:"goal"`
	Budget             Budget       `json:"budget" firestore:"budget"`
	ServiceCategory    string       `json:"serviceCategory" firestore:"serviceCategory"`
	ServiceArea        ServiceArea  `json:"serviceArea" firestore:"serviceArea"`
	LatestCompletionAt time.Time    `json:"latestCompletionAt" firestore:"latestCompletionAt"`
	AllowedActions     []string     `json:"allowedActions" firestore:"allowedActions"`
	RequiredEvidence   []string     `json:"requiredEvidence" firestore:"requiredEvidence"`
	AutonomyMode       AutonomyMode `json:"autonomyMode" firestore:"autonomyMode"`
	ExpiresAt          time.Time    `json:"expiresAt" firestore:"expiresAt"`
}

// Mission is the root domain entity representing a demand-side goal.
type Mission struct {
	ID                 string        `json:"id" firestore:"id"`
	Goal               string        `json:"goal" firestore:"goal"`
	Status             MissionStatus `json:"status" firestore:"status"`
	Mandate            Mandate       `json:"mandate" firestore:"mandate"`
	BuyerID            string        `json:"buyerId" firestore:"buyerId"`
	SelectedSupplierID string        `json:"selectedSupplierId,omitempty" firestore:"selectedSupplierId,omitempty"`
	Version            int64         `json:"version" firestore:"version"`
	CreatedAt          time.Time     `json:"createdAt" firestore:"createdAt"`
	UpdatedAt          time.Time     `json:"updatedAt" firestore:"updatedAt"`
}

// Supplier represents a supply-side agent profile.
type Supplier struct {
	ID               string      `json:"id" firestore:"id"`
	PrincipalType    string      `json:"principalType" firestore:"principalType"`
	DisplayName      string      `json:"displayName" firestore:"displayName"`
	Capabilities     []string    `json:"capabilities" firestore:"capabilities"`
	ServiceArea      ServiceArea `json:"serviceArea" firestore:"serviceArea"`
	Availability     string      `json:"availability" firestore:"availability"`
	ReliabilityScore float64     `json:"reliabilityScore" firestore:"reliabilityScore"`
	PriceTier        string      `json:"priceTier" firestore:"priceTier"`
	Evidence         []string    `json:"evidence" firestore:"evidence"`
	Status           string      `json:"status" firestore:"status"`
}

// Offer represents a proposal submitted by a supplier agent.
type Offer struct {
	ID              string    `json:"id" firestore:"id"`
	MissionID       string    `json:"missionId" firestore:"missionId"`
	SupplierAgentID string    `json:"supplierAgentId" firestore:"supplierAgentId"`
	Price           float64   `json:"price" firestore:"price"`
	Currency        string    `json:"currency" firestore:"currency"`
	Availability    string    `json:"availability" firestore:"availability"`
	Terms           string    `json:"terms" firestore:"terms"`
	Score           float64   `json:"score" firestore:"score"`
	Explanation     string    `json:"explanation" firestore:"explanation"`
	Evidence        []string  `json:"evidence" firestore:"evidence"`
	Status          string    `json:"status" firestore:"status"` // SUBMITTED, ACCEPTED, REJECTED, COUNTERED
	CreatedAt       time.Time `json:"createdAt" firestore:"createdAt"`
}

// Milestone represents a required execution step and evidence requirement.
type Milestone struct {
	ID               string    `json:"id" firestore:"id"`
	MissionID        string    `json:"missionId" firestore:"missionId"`
	Description      string    `json:"description" firestore:"description"`
	DueAt            time.Time `json:"dueAt" firestore:"dueAt"`
	Status           string    `json:"status" firestore:"status"` // PENDING, SUBMITTED, VERIFIED, REJECTED
	RequiredEvidence []string  `json:"requiredEvidence" firestore:"requiredEvidence"`
	EvidenceIDs      []string  `json:"evidenceIds" firestore:"evidenceIds"`
}

// Event represents an immutable audit log entry.
type Event struct {
	ID             string    `json:"id" firestore:"id"`
	MissionID      string    `json:"missionId" firestore:"missionId"`
	Type           string    `json:"type" firestore:"type"`
	Actor          string    `json:"actor" firestore:"actor"`
	Payload        any       `json:"payload" firestore:"payload"`
	PolicyResult   string    `json:"policyResult" firestore:"policyResult"`
	IdempotencyKey string    `json:"idempotencyKey" firestore:"idempotencyKey"`
	CreatedAt      time.Time `json:"createdAt" firestore:"createdAt"`
}

// ProofReceipt is a shareable, redacted record of a completed mission.
type ProofReceipt struct {
	ID               string            `json:"id" firestore:"id"`
	MissionID        string            `json:"missionId" firestore:"missionId"`
	Summary          string            `json:"summary" firestore:"summary"`
	AgreedTerms      string            `json:"agreedTerms" firestore:"agreedTerms"`
	Milestones       []string          `json:"milestones" firestore:"milestones"`
	EvidenceLabels   []string          `json:"evidenceLabels" firestore:"evidenceLabels"`
	RedactedEvidence map[string]string `json:"redactedEvidence" firestore:"redactedEvidence"`
	ShareToken       string            `json:"shareToken" firestore:"shareToken"`
	HumanReviewed    bool              `json:"humanReviewed" firestore:"humanReviewed"`
	CreatedAt        time.Time         `json:"createdAt" firestore:"createdAt"`
}

// TaskPayload represents the async task payload sent via Cloud Tasks or direct call emulator.
type TaskPayload struct {
	MissionID       string `json:"missionId"`
	StepID          string `json:"stepId"`
	ExpectedVersion int64  `json:"expectedVersion"`
	IdempotencyKey  string `json:"idempotencyKey"`
	AttemptCount    int    `json:"attemptCount"`
	Deadline        string `json:"deadline"`
}

// Action represents a proposed operational action subject to policy validation.
type Action struct {
	Type               string      `json:"type"`
	Actor              string      `json:"actor"`
	Amount             float64     `json:"amount"`
	Currency           string      `json:"currency"`
	ServiceCategory    string      `json:"serviceCategory"`
	ServiceArea        ServiceArea `json:"serviceArea"`
	CompletionDeadline time.Time   `json:"completionDeadline"`
	EvidenceSubmitted  []string    `json:"evidenceSubmitted"`
}

// PolicyDisposition indicates the action to take after policy validation.
type PolicyDisposition string

const (
	DispositionAllow    PolicyDisposition = "ALLOW"
	DispositionBlock    PolicyDisposition = "BLOCK"
	DispositionEscalate PolicyDisposition = "ESCALATE"
)

// PolicyResult is the output of policy engine evaluation.
type PolicyResult struct {
	Allowed     bool              `json:"allowed"`
	Reason      string            `json:"reason"`
	Disposition PolicyDisposition `json:"disposition"`
}

// ErrInvalidTransition is returned when a state transition is rejected.
type ErrInvalidTransition struct {
	From MissionStatus
	To   MissionStatus
}

func (e *ErrInvalidTransition) Error() string {
	return fmt.Sprintf("invalid state transition from %s to %s", e.From, e.To)
}
