# Design: Autonomous Mission Loop

## System shape

```text
Astro + React islands
        │ HTTP / polling
        ▼
Go mission gateway ───── Firestore (missions, offers, events, receipts)
        │
        ├── deterministic policy engine
        ├── Gemini client (typed proposals only)
        └── Cloud Tasks ──► Go worker ──► supplier agents / next task
                                      │
                                      └── evidence metadata (Firestore; Cloud Storage later)
```

The gateway owns API requests, validation, event writes, and task creation. The Kiro demo does not authenticate callers. The worker loads current state, checks the expected version, executes exactly one deterministic step, records an event, and schedules the next step. The same Go service may expose gateway and worker routes initially.

## Domain model

Core types:

```go
type Mission struct {
    ID                  string
    Goal                string
    Status              MissionStatus
    Mandate             Mandate
    BuyerID             string
    SelectedSupplierID  string
    Version             int64
    CreatedAt           time.Time
    UpdatedAt           time.Time
}

type Mandate struct {
    Goal               string
    Budget             Budget
    ServiceCategory    string
    ServiceArea        ServiceArea
    LatestCompletionAt time.Time
    AllowedActions     []string
    RequiredEvidence   []string
    AutonomyMode       AutonomyMode
    ExpiresAt          time.Time
}

type Offer struct {
    ID, MissionID, SupplierAgentID string
    Price                          float64
    Currency, Availability, Terms  string
    Evidence                       []string
    Status                         string
    CreatedAt                      time.Time
}

type Event struct {
    ID, MissionID, Type, Actor string
    Payload                     any
    PolicyResult                string
    IdempotencyKey              string
    CreatedAt                   time.Time
}
```

The state machine contains: `DRAFT`, `MANDATE_CONFIRMED`, `SOURCING`, `OFFERS_RECEIVED`, `NEGOTIATING`, `AWAITING_APPROVAL`, `COMMITTED`, `IN_PROGRESS`, `EVIDENCE_PENDING`, `VERIFYING`, `COMPLETED`, `REROUTED`, `ESCALATED`, and `CANCELLED`.

Valid transition examples:

```text
DRAFT → MANDATE_CONFIRMED → SOURCING → OFFERS_RECEIVED
OFFERS_RECEIVED → NEGOTIATING → COMMITTED
OFFERS_RECEIVED → AWAITING_APPROVAL → COMMITTED
COMMITTED → IN_PROGRESS → EVIDENCE_PENDING → VERIFYING → COMPLETED
NEGOTIATING → OFFERS_RECEIVED       # rejected counteroffer
VERIFYING → EVIDENCE_PENDING        # insufficient evidence
IN_PROGRESS → REROUTED / ESCALATED  # timeout or failure
Any non-terminal state → CANCELLED
```

## Policy engine

The policy engine is a pure, table-tested function:

```go
func (e *Engine) Validate(action Action, mandate Mandate) PolicyResult
```

It checks budget, deadline, service area, allowed actions, autonomy mode, mandate expiry, required evidence, and prohibited categories. A failed check returns `Allowed: false` with a reason and disposition (`block` or `escalate`). No Gemini response can bypass this function.

## Gemini integration

Four typed operations are isolated in `internal/gemini`:

1. `ExtractMandate(goal) -> Mandate`
2. `CompareOffers(mandate, offers) -> RankingResult`
3. `DraftCounteroffer(mandate, offer, reason) -> Counteroffer`
4. `ExtractEvidence(submission, requirements) -> EvidenceResult`

Each call uses a prompt builder, JSON response mode, schema validation, timeout, and one retry. Invalid output becomes a recorded exception rather than an unsafe action. Prompts are kept out of HTTP handlers.

## Task execution

```go
type TaskPayload struct {
    MissionID       string `json:"missionId"`
    StepID          string `json:"stepId"`
    ExpectedVersion int64  `json:"expectedVersion"`
    IdempotencyKey  string `json:"idempotencyKey"`
    AttemptCount    int    `json:"attemptCount"`
    Deadline        string `json:"deadline"`
}
```

The worker rejects stale payloads, skips already-completed idempotency keys, and handles one status-specific step per invocation:

```text
MANDATE_CONFIRMED → source suppliers
SOURCING           → collect offers
OFFERS_RECEIVED   → evaluate offers
NEGOTIATING       → handle counteroffer
COMMITTED         → schedule milestones
EVIDENCE_PENDING  → request/check evidence
VERIFYING         → verify evidence and complete/reroute
```

The local task client calls the worker endpoint directly. The production client creates Cloud Tasks HTTP tasks.

## Firestore layout

```text
agents/{agentId}
missions/{missionId}
missions/{missionId}/offers/{offerId}
missions/{missionId}/milestones/{milestoneId}
missions/{missionId}/events/{eventId}
proofReceipts/{receiptId}
```

Mission updates use a transaction or version precondition. Events are append-only. Seed data contains three clearly labelled synthetic London suppliers with distinct capability, price, availability, and reliability trade-offs.

## API surface

```text
POST   /api/missions
PUT    /api/missions/:id/mandate
POST   /api/missions/:id/start
GET    /api/missions/:id
GET    /api/missions/:id/events
GET    /api/missions/:id/offers
POST   /api/missions/:id/approve
POST   /api/missions/:id/cancel
POST   /api/missions/:id/evidence
GET    /api/missions/:id/receipt
GET    /api/agents
POST   /api/worker/step
GET    /health
```

## Frontend routes

```text
/                         Landing page
/missions/new             Mission composer + mandate editor
/missions/:id             Timeline and current state
/missions/:id/offers      Ranked offer comparison
/missions/:id/receipt     Redacted shareable proof receipt
/suppliers/:id            Supplier agent card
/evidence/:missionId      Mobile-friendly evidence form
```

React islands handle stateful forms, polling, approval, and evidence submission. Astro handles static or server-rendered content.

## Error handling

- Gemini timeout or malformed JSON: retry once, then record an exception.
- Firestore conflict: reread current mission and retry the operation.
- Cloud Tasks failure: use platform retry, then escalate after three attempts.
- Supplier timeout: record the timeout and reroute.
- Policy violation: block the action, append an event, and escalate.
- All user-facing errors are structured and safe; raw provider errors stay in logs.
