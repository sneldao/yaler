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
// DiagnosticBrief turns a manager's unstructured report into a concise,
// role-aware handoff. Observed facts stay separate from inferences so a
// likely diagnosis is never presented as a confirmed repair.
type DiagnosticBrief struct {
	ReportedSummary   string                      `json:"reportedSummary" firestore:"reportedSummary"`
	Known             []string                    `json:"known" firestore:"known"`
	LikelyAreas       []string                    `json:"likelyAreas" firestore:"likelyAreas"`
	ToConfirm         []string                    `json:"toConfirm" firestore:"toConfirm"`
	EvidenceNeeded    []string                    `json:"evidenceNeeded" firestore:"evidenceNeeded"`
	Confidence        string                      `json:"confidence" firestore:"confidence"`
	DiagnosticMedia   []DiagnosticMedia           `json:"diagnosticMedia,omitempty" firestore:"diagnosticMedia,omitempty"`
	ExtractedSignals  []DiagnosticSignal          `json:"extractedSignals,omitempty" firestore:"extractedSignals,omitempty"`
	AnalysisStatus    DiagnosticAnalysisStatus    `json:"analysisStatus,omitempty" firestore:"analysisStatus,omitempty"`
	AnalysisAttempts  int                         `json:"analysisAttempts,omitempty" firestore:"analysisAttempts,omitempty"`
	AnalysisError     string                      `json:"analysisError,omitempty" firestore:"analysisError,omitempty"`
	AnalysisUpdatedAt time.Time                   `json:"analysisUpdatedAt,omitempty" firestore:"analysisUpdatedAt,omitempty"`
	FollowUpRequests  []DiagnosticFollowUpRequest `json:"followUpRequests,omitempty" firestore:"followUpRequests,omitempty"`
	MediaExpiresAt    time.Time                   `json:"mediaExpiresAt,omitempty" firestore:"mediaExpiresAt,omitempty"`
}

// DiagnosticFollowUpRequest is a single, optional request for higher-value
// evidence. Requests are deliberately bounded so analysis never becomes an
// endless questionnaire.
type DiagnosticFollowUpRequest struct {
	Kind      string `json:"kind" firestore:"kind"`
	Reason    string `json:"reason" firestore:"reason"`
	Requested bool   `json:"requested" firestore:"requested"`
	Completed bool   `json:"completed" firestore:"completed"`
}

// DiagnosticSignal is a bounded observation extracted from a report or image.
type DiagnosticSignal struct {
	Label      string `json:"label" firestore:"label"`
	Value      string `json:"value" firestore:"value"`
	Source     string `json:"source" firestore:"source"`
	Confidence string `json:"confidence" firestore:"confidence"`
	Status     string `json:"status,omitempty" firestore:"status,omitempty"` // SUGGESTED, CONFIRMED, DISMISSED
}

// DiagnosticMedia is manager-supplied context captured before dispatch.
type DiagnosticMedia struct {
	Kind      string `json:"kind" firestore:"kind"`
	URL       string `json:"url" firestore:"url"`
	Label     string `json:"label" firestore:"label"`
	ObjectKey string `json:"objectKey,omitempty" firestore:"objectKey,omitempty"`
	MimeType  string `json:"mimeType,omitempty" firestore:"mimeType,omitempty"`
}

// DiagnosticAnalysisStatus tracks non-blocking image analysis.
type DiagnosticAnalysisStatus string

const (
	DiagnosticAnalysisNotStarted DiagnosticAnalysisStatus = "NOT_STARTED"
	DiagnosticAnalysisQueued     DiagnosticAnalysisStatus = "QUEUED"
	DiagnosticAnalysisAnalyzing  DiagnosticAnalysisStatus = "ANALYZING"
	DiagnosticAnalysisCompleted  DiagnosticAnalysisStatus = "COMPLETED"
	DiagnosticAnalysisFailed     DiagnosticAnalysisStatus = "FAILED"
)

// Mission struct fields include the buyer-facing mandate and the engineer
// handoff generated from the original report.
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
	// ExperimentCohort assigns this mission to a matching-mechanism A/B arm:
	// "parallel" (default, current behaviour — broadcast to all qualified
	// engineers at once with a short accept window) or "sequential" (send
	// callouts one at a time, wait for decline/expiry before the next).
	// Set once at creation; the worker reads it to decide sourcing strategy.
	ExperimentCohort string          `json:"experimentCohort,omitempty" firestore:"experimentCohort,omitempty"`
	DiagnosticBrief  DiagnosticBrief `json:"diagnosticBrief,omitempty" firestore:"diagnosticBrief,omitempty"`
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
	// Persona is a short character brief used by the LLM-powered supplier
	// agent to generate independent quotes. Empty for verified suppliers
	// who respond via the concierge console.
	Persona string `json:"persona,omitempty" firestore:"persona,omitempty"`
	// Verified is true only after a human has checked the supplier
	// (register lookup + capability/capacity confirmation). Only verified
	// suppliers take real callouts; unverified (synthetic) roster suppliers
	// receive labelled simulated quotes so the demo stays runnable.
	Verified    bool      `json:"verified" firestore:"verified"`
	Contact     string    `json:"contact,omitempty" firestore:"contact"`
	Source      string    `json:"source,omitempty" firestore:"source"` // SEED, CONCIERGE, PORTAL
	OnboardedAt time.Time `json:"onboardedAt,omitempty" firestore:"onboardedAt"`
}

// CalloutStatus is the lifecycle of a supplier callout.
type CalloutStatus string

const (
	CalloutSent      CalloutStatus = "SENT"      // sent to supplier (or concierge), awaiting response
	CalloutOffered   CalloutStatus = "OFFERED"   // a quote was recorded
	CalloutDeclined  CalloutStatus = "DECLINED"  // supplier cannot take the job
	CalloutExpired   CalloutStatus = "EXPIRED"   // passed ExpiresAt without a response
	CalloutCancelled CalloutStatus = "CANCELLED" // another engineer accepted first — first-accept-wins
)

// Callout is a scoped job request sent to a specific supplier for a mission.
// It is the supply-side request that a real offer responds to.
type Callout struct {
	ID          string        `json:"id" firestore:"id"`
	MissionID   string        `json:"missionId" firestore:"missionId"`
	SupplierID  string        `json:"supplierId" firestore:"supplierId"`
	Status      CalloutStatus `json:"status" firestore:"status"`
	Message     string        `json:"message" firestore:"message"`
	SentAt      time.Time     `json:"sentAt" firestore:"sentAt"`
	ExpiresAt   time.Time     `json:"expiresAt" firestore:"expiresAt"`
	RespondedAt time.Time     `json:"respondedAt,omitempty" firestore:"respondedAt"`
	// Simulated is true when the roster supplier is synthetic and the system
	// auto-generated a labelled quote instead of waiting for a real response.
	Simulated bool `json:"simulated" firestore:"simulated"`
}

// Offer represents a proposal submitted by a supplier agent.
type Offer struct {
	ID              string    `json:"id" firestore:"id"`
	MissionID       string    `json:"missionId" firestore:"missionId"`
	SupplierAgentID string    `json:"supplierAgentId" firestore:"supplierAgentId"`
	CalloutID       string    `json:"calloutId,omitempty" firestore:"calloutId"`
	Price           float64   `json:"price" firestore:"price"`
	Currency        string    `json:"currency" firestore:"currency"`
	Availability    string    `json:"availability" firestore:"availability"`
	Terms           string    `json:"terms" firestore:"terms"`
	Score           float64   `json:"score" firestore:"score"`
	Explanation     string    `json:"explanation" firestore:"explanation"`
	Evidence        []string  `json:"evidence" firestore:"evidence"`
	Status          string    `json:"status" firestore:"status"` // SUBMITTED, ACCEPTED, REJECTED, COUNTERED
	CreatedAt       time.Time `json:"createdAt" firestore:"createdAt"`
	// Simulated is true for quotes generated against the synthetic roster.
	// Simulated offers are clearly labelled and never presented as real quotes.
	Simulated bool `json:"simulated" firestore:"simulated"`
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
	// Buyer verdict (the reliability loop). Enriched at read time from
	// MissionFeedback — not stored on the receipt itself, since feedback
	// is submitted after the receipt is issued. Zero value means unrated.
	Rating        int    `json:"rating,omitempty" firestore:"-"`
	RatingComment string `json:"ratingComment,omitempty" firestore:"-"`
	// SelectionRationale is the plain-English explanation of why the agent
	// picked this engineer — derived from the audit trail, not self-reported.
	// e.g. "20% under budget · 3 prior N1 jobs · 12-min average accept time".
	// Shown on the receipt so the selection is explainable, not a black box.
	SelectionRationale string `json:"selectionRationale,omitempty" firestore:"selectionRationale,omitempty"`
}

// TaskPayload represents the async task payload sent via Cloud Tasks or direct call emulator.
type TaskPayload struct {
	MissionID       string `json:"missionId"`
	StepID          string `json:"stepId"`
	ExpectedVersion int64  `json:"expectedVersion"`
	IdempotencyKey  string `json:"idempotencyKey"`
	AttemptCount    int    `json:"attemptCount"`
	Deadline        string `json:"deadline"`
	TaskType        string `json:"taskType,omitempty"` // MISSION_STEP or DIAGNOSTIC_ANALYSIS
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

// MissionFeedback is the buyer's post-job rating of the supplier who won a
// mission. It is the input to the reliability loop: ReliabilityScore becomes
// a value computed from feedback history rather than a static float set at
// onboarding. One feedback per mission.
type MissionFeedback struct {
	ID         string    `json:"id" firestore:"id"`
	MissionID  string    `json:"missionId" firestore:"missionId"`
	SupplierID string    `json:"supplierId" firestore:"supplierId"`
	Rating     int       `json:"rating" firestore:"rating"` // 1..5
	Comment    string    `json:"comment,omitempty" firestore:"comment,omitempty"`
	CreatedAt  time.Time `json:"createdAt" firestore:"createdAt"`
}

// ReliabilityFromFeedback computes a 0..1 reliability score from a supplier's
// feedback history. The formula blends the static seed (so a newly-onboarded
// supplier with one job isn't wildly volatile) with the running average of
// ratings, decaying toward the feedback mean as evidence accumulates:
//
//   - 0 jobs  => seed
//   - 1 job   => 70% seed + 30% mean (one rating shouldn't dominate)
//   - 5+ jobs => 20% seed + 80% mean (the track record now speaks)
//
// Between 1 and 5 jobs the weight ramps linearly. Ratings are 1..5 mapped
// to 0..1 as (rating-1)/4 so a 5 is 1.0 and a 1 is 0.0.
func ReliabilityFromFeedback(seed float64, feedback []*MissionFeedback) float64 {
	if len(feedback) == 0 {
		return seed
	}
	var sum float64
	for _, f := range feedback {
		if f.Rating < 1 {
			f.Rating = 1
		}
		if f.Rating > 5 {
			f.Rating = 5
		}
		sum += float64(f.Rating-1) / 4.0
	}
	mean := sum / float64(len(feedback))

	// weight of the feedback mean ramps from 0.3 (1 job) to 0.8 (5+ jobs).
	var w float64
	switch n := len(feedback); {
	case n >= 5:
		w = 0.8
	case n == 1:
		w = 0.3
	default:
		w = 0.3 + 0.5*float64(n-1)/4.0
	}
	score := seed*(1-w) + mean*w
	// clamp
	if score < 0 {
		return 0
	}
	if score > 1 {
		return 1
	}
	return score
}

// CalloutOutcome records the result of one callout for latency scoring.
type CalloutOutcome struct {
	SupplierID  string
	Status      CalloutStatus // SENT (no response yet), OFFERED, DECLINED, EXPIRED, CANCELLED
	ResponseSec float64       // seconds from SentAt to RespondedAt; 0 if no response
}

// ReliabilityFromLatency blends the feedback-based score with response-latency
// signals from the callout audit trail. The design principle (from the
// incentive audit): penalize SILENCE and non-response, not declining.
//
//   - A fast honest decline is neutral (engineers are allowed to be busy).
//   - A fast accept is a positive signal.
//   - Silence / expiry is the negative signal — it's what creates the
//     "stringing-along" cost for the vendor.
//
// latencyFactor is 0..1: 1.0 = excellent (fast accepts, no expiries),
// 0.0 = terrible (everything expired silently). The final score blends
// 70% feedback-based reliability with 30% latency factor, decaying toward
// the latency factor as more callout data accumulates.
func ReliabilityFromLatency(seed float64, feedback []*MissionFeedback, outcomes []CalloutOutcome) float64 {
	base := ReliabilityFromFeedback(seed, feedback)
	if len(outcomes) == 0 {
		return base
	}

	var total, positive, negative, neutral float64
	for _, o := range outcomes {
		total++
		switch o.Status {
		case CalloutOffered:
			// Fast accept is the best signal; slower accept still positive.
			positive++
			if o.ResponseSec > 0 && o.ResponseSec < 300 { // under 5 min
				positive += 0.5 // bonus for speed
			}
		case CalloutDeclined:
			neutral++ // honest decline is neutral, not negative
		case CalloutExpired, CalloutSent:
			negative++ // silence / non-response is the penalty
		case CalloutCancelled:
			neutral++ // someone else won — not this engineer's fault
		}
	}

	latencyFactor := 0.5 // neutral start
	if total > 0 {
		latencyFactor = (positive*1.0 + neutral*0.5) / total
		// Expiry penalty: each silent expiry drags the factor down.
		if negative > 0 {
			penalty := negative / total * 0.5
			latencyFactor -= penalty
		}
	}
	if latencyFactor < 0 {
		latencyFactor = 0
	}

	// Weight of the latency factor ramps from 0.2 (1 callout) to 0.4 (10+).
	w := 0.2
	if n := len(outcomes); n >= 10 {
		w = 0.4
	} else if n > 1 {
		w = 0.2 + 0.2*float64(n-1)/9.0
	}

	score := base*(1-w) + latencyFactor*w
	if score < 0 {
		return 0
	}
	if score > 1 {
		return 1
	}
	return score
}
