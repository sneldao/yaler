# Agent operating model

## Core rule

Yaler agents do not receive unrestricted authority. They receive a mandate: a bounded, time-limited description of the outcome they may pursue and the actions they may take.

> Autonomy is delegated authority with observable limits.

## Agent roles

### Demand agent

Represents the buyer's goal and mandate.

Responsibilities:

- Clarify the desired outcome
- Discover suitable supply agents
- Request and compare offers
- Negotiate within the mandate
- Monitor milestones
- Escalate exceptions
- Produce the final proof receipt

### Supply agent

Represents a local service provider's capabilities and boundaries.

Responsibilities:

- Publish capabilities and service area
- Respond to mission requests
- State availability and terms
- Counteroffer within its own policy
- Submit milestone evidence
- Confirm completion or inability to complete

### Policy engine

Not an AI agent. It is deterministic application code that decides whether a proposed action is permitted.

### Human operator

The buyer, supplier, or Yaler operator who defines boundaries, resolves exceptions, and can pause or cancel a mission.

## Mandate schema

A mandate should contain:

```text
goal
budget
currency
serviceCategory
serviceArea
latestCompletionAt
allowedActions
requiredEvidence
approvalThresholds
escalationRules
autonomyMode
expiresAt
```

Example:

```json
{
  "goal": "Restore refrigeration capacity before the next service",
  "budget": { "amount": 500, "currency": "GBP" },
  "serviceCategory": "commercial-refrigeration",
  "serviceArea": { "postcode": "N1", "radiusMiles": 5 },
  "latestCompletionAt": "2026-08-21T16:00:00Z",
  "allowedActions": ["discover", "request_offer", "counteroffer", "schedule_check"],
  "requiredEvidence": ["provider_capability", "eta", "completion_confirmation"],
  "approvalThresholds": { "commitmentAbove": 500 },
  "autonomyMode": "delegate",
  "expiresAt": "2026-08-21T18:00:00Z"
}
```

## Agent-to-agent messages

Yaler can use a small typed vocabulary inspired by interoperable agent protocols without attempting to create a new standard.

```text
mission.requested
offer.requested
offer.submitted
counteroffer.proposed
commitment.proposed
commitment.accepted
milestone.requested
milestone.updated
evidence.submitted
evidence.insufficient
exception.raised
mission.rerouted
mission.completed
mission.cancelled
```

Every message includes:

- Mission ID
- Sender and recipient agent IDs
- Represented principal
- Message type
- Payload
- Mandate reference
- Correlation ID
- Timestamp
- Signature or authenticated request context

## Decision loop

```text
1. Read current mission state.
2. Load active mandate.
3. Ask Gemini for a typed next-action proposal when interpretation is needed.
4. Validate the proposal against deterministic policy.
5. Execute only if permitted.
6. Write an immutable event.
7. Enqueue the next step or raise an exception.
```

Gemini may propose:

```json
{
  "action": "send_counteroffer",
  "supplierId": "supplier_123",
  "price": 340,
  "arrivalWindow": "today 11:00-12:00",
  "reason": "Within budget and meets deadline"
}
```

Go decides whether that proposal is valid.

## Escalation conditions

Escalate when:

- Price exceeds the mandate.
- Required evidence is missing.
- A supplier category is regulated or unsafe.
- The deadline cannot be met.
- Supplier responses conflict.
- Evidence is ambiguous or contradictory.
- A mission needs a new scope or budget.
- A dispute is raised.
- The agent reaches an action not explicitly allowed.

## Evidence model

Evidence should be labelled by source:

```text
supplier_self_report
buyer_confirmation
photo_or_document
agent_extraction
system_timestamp
human_operator_review
```

Agent extraction is not the same as independent verification. The UI should preserve that distinction.

## Proof receipts

A proof receipt summarizes the mission without exposing unnecessary personal or commercial information.

It should include:

- Original goal
- Mandate summary
- Selected provider
- Agreed terms
- Milestone timestamps
- Evidence labels
- Final status
- Human review or escalation markers

## Human controls

At all times a principal must be able to:

- Pause a mission
- Cancel a mission
- Revoke an agent mandate
- Approve an exception
- Change budget or deadline
- Reject a proposed provider
- Remove a proof receipt from public sharing

The design goal is not to hide humans. It is to ensure that humans spend time on judgment rather than coordination overhead.
