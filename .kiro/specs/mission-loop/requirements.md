# Requirements: Autonomous Mission Loop

## Overview

Build a complete autonomous mission network where a demand-side agent delegates an urgent hospitality operations mission to supply-side agents and carries it through offers, negotiation, milestone tracking, evidence, and completion or escalation with durable asynchronous state.

## Actors

- **Buyer:** Independent café or restaurant owner with an urgent operational problem.
- **Demand agent:** Interprets the mission, discovers suppliers, negotiates, and coordinates.
- **Supply agent:** Represents a local provider and returns offers and evidence.
- **Policy engine:** Deterministic Go code that validates every action against the mandate.
- **Gemini:** Interprets goals, compares offers, drafts counteroffers, and extracts evidence.
- **Human operator:** Defines boundaries and resolves exceptions.

## Functional requirements

### FR-1: Mission creation and mandate

- The system SHALL accept a natural-language goal through the web UI.
- Gemini SHALL extract a structured mandate containing budget, deadline, location, service category, urgency, required evidence, allowed actions, autonomy mode, and expiry.
- The system SHALL show the generated mandate before execution.
- The buyer SHALL be able to edit mandate fields and confirm or cancel.
- Confirmation SHALL transition the mission to `MANDATE_CONFIRMED` and record an event.

### FR-2: Supplier discovery and offers

- The demand agent SHALL search the supplier registry by capability and service area.
- The system SHALL send structured offer requests to matching supplier agents.
- A supplier response SHALL include price, availability, capability evidence, and terms.
- Offers and responses SHALL be recorded with timestamps and idempotency keys.
- At least one valid offer SHALL transition the mission to `OFFERS_RECEIVED`.

### FR-3: Evaluation and negotiation

- Gemini SHALL compare offers using capability, price, availability, reliability, and evidence quality.
- Gemini SHALL return ranked offers with scores and explanations.
- Delegate mode SHALL allow an in-policy commitment without per-step approval. This is the Kiro demo mode.
- Collaborate and Observe remain valid mandate values. The Kiro UI is not required to expose them. Collaborate SHALL require buyer approval before commitment when exercised. Observe SHALL not contact or commit to suppliers when exercised.
- If a counteroffer is sent, it SHALL remain within mandate boundaries. The Kiro kernel may rank-and-select with at most one scripted counteroffer.
- Failed selection SHALL try the next suitable supplier or raise an exception.

### FR-4: Commitment and milestones

- An accepted in-policy offer SHALL transition the mission to `COMMITTED`.
- Commitment SHALL create milestone records with due times and evidence requirements.
- Cloud Tasks SHALL schedule milestone checks.
- Supplier start confirmation SHALL transition the mission to `IN_PROGRESS`.

### FR-5: Evidence and completion

- Suppliers SHALL submit text evidence through a mobile-friendly link. Photo or document references are optional labelled fixtures in the Kiro kernel, not a required Cloud Storage upload path.
- Gemini SHALL extract structured evidence and assess sufficiency against milestone requirements.
- Evidence SHALL retain its source label, including supplier self-report, photo/document, agent extraction, system timestamp, or human review.
- Insufficient evidence SHALL trigger a request for more evidence.
- When all milestones pass verification, the mission SHALL transition to `COMPLETED`.
- The system SHALL generate a redacted, shareable proof receipt containing the goal, mandate summary, agreed terms, milestones, evidence labels, and final outcome.

### FR-6: Exceptions and safety

- The system SHALL raise an exception for budget overrun, missed deadline, no matching supplier, missing or contradictory evidence, supplier timeout, policy violation, or an action outside the mandate.
- The buyer SHALL be able to approve, reject, reroute, adjust the mandate, or cancel.
- Supplier timeout SHALL reroute to the next-ranked supplier where possible.
- Regulated or unsafe categories, including gas, electrical, and structural work, SHALL always escalate.

### FR-7: State and auditability

- All state transitions SHALL be deterministic and validated before execution.
- Every action SHALL produce an immutable event containing type, actor, payload, policy result, timestamp, and idempotency key.
- Mission updates SHALL use optimistic version checks.
- The complete event timeline SHALL be visible in the UI.

### FR-8: Asynchronous execution

- Mission steps SHALL run through Cloud Tasks, with a local direct-call simulation for development.
- Tasks SHALL contain mission ID, step ID, expected version, idempotency key, attempt count, and deadline.
- Tasks SHALL be retry-safe and idempotent.
- Failed tasks SHALL retry with exponential backoff up to three attempts, then raise an exception.

## Non-functional requirements

- A clean clone SHALL run with documented setup instructions.
- Basic local development SHALL work with the Firestore emulator and no GCP project.
- The local demo flow SHALL complete in under two minutes using task simulation.
- Gemini calls SHALL use structured JSON output and a 30-second timeout.
- API keys SHALL never be committed.
- Supplier content SHALL be treated as untrusted input.
- Public receipts SHALL contain only redacted, opt-in information.
- Gemini SHALL propose actions; deterministic Go code SHALL decide whether to execute them.

## Constraints and acceptance criteria

- Submission deadline: August 23, 2026, 23:59 UTC.
- The project must demonstrate meaningful Kiro spec-driven development.
- No real payments or financial transactions.
- Supplier data is synthetic but clearly labelled; mission execution is genuine.
- A successful demo creates a mission, confirms a mandate, receives three offers, ranks and selects within policy, advances via worker steps, accepts evidence, generates a receipt, and shows one escalation path.
- The demo video SHALL be at most 3 minutes.
