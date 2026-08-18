# Scope

## Scope structure

Yaler's scope is defined across two build phases:

- **V1 (Build Club hack night):** Voice-first mission intake and provider matching in 90 minutes.
- **V2 (Agentic hackathon MVP):** Full durable mission loop with async execution, multi-agent coordination, and proof receipts.

V1 is a subset of V2. Everything built tonight extends into the larger system.

---

## V1 scope — Build Club hack night

### Objective

Demonstrate autonomous coordination through a single voice call. A café owner describes a problem, the system extracts a mandate, matches a supplier, and confirms the booking — entirely by voice in under 60 seconds.

### V1 user journey

1. Café owner calls a Vapi phone number.
2. Voice agent asks clarifying questions (what's broken, budget, urgency, location).
3. System extracts a structured mandate: goal, budget, deadline, radius.
4. Gemini ranks 3 hardcoded suppliers against the mandate.
5. Best-fit provider is selected (or escalation triggered if none fit).
6. Voice agent confirms: who's coming, when, how much.
7. Call ends.

### V1 components

| Component | Tech | Purpose |
|-----------|------|---------|
| Voice intake | Vapi | Conversational mandate extraction |
| Agent brain | Gemini | Supplier ranking and selection |
| Voice output | ElevenLabs (via Vapi or direct) | Natural confirmation delivery |
| Backend | Lightweight server (TypeScript or Python) | Orchestration glue |

### V1 supplier data

Three hardcoded London providers:

```json
[
  {
    "id": "coolfix",
    "name": "CoolFix Refrigeration",
    "capabilities": ["commercial-refrigeration", "emergency-repair"],
    "serviceArea": "N1-N7",
    "responseTime": "2 hours",
    "priceRange": { "min": 150, "max": 450 },
    "availability": "today",
    "reliability": 0.92
  },
  {
    "id": "metro-cool",
    "name": "Metro Cool Services",
    "capabilities": ["commercial-refrigeration", "installation", "maintenance"],
    "serviceArea": "Central London",
    "responseTime": "4 hours",
    "priceRange": { "min": 200, "max": 600 },
    "availability": "today",
    "reliability": 0.87
  },
  {
    "id": "rapid-repair",
    "name": "Rapid Kitchen Repair",
    "capabilities": ["commercial-refrigeration", "dishwasher", "oven-repair"],
    "serviceArea": "E1-E17, N1-N5",
    "responseTime": "1 hour",
    "priceRange": { "min": 100, "max": 350 },
    "availability": "today",
    "reliability": 0.95
  }
]
```

### V1 mandate schema (simplified)

```json
{
  "goal": "string — what's broken or needed",
  "budget": { "amount": "number", "currency": "GBP" },
  "deadline": "string — when it needs to be done by",
  "location": "string — postcode or area",
  "urgency": "immediate | today | this-week"
}
```

### V1 success criteria

- A real phone call produces a spoken booking confirmation.
- Budget constraint is enforced (if budget is too low, agent explains why and asks to adjust).
- Deadline constraint is enforced (if no one is available in time, agent escalates).
- One failure path demonstrates the mandate boundary.
- Demo is compelling in under 2 minutes.

### V1 explicit non-goals

- No database or persistent state.
- No frontend or web UI.
- No real supplier communication.
- No evidence, milestones, or proof receipts.
- No authentication.
- No deployment to cloud infrastructure (local or serverless function is fine).

---

## V2 scope — Agentic hackathon MVP

### Objective

Deliver one convincing autonomous workflow in which a demand-side agent delegates an urgent hospitality operations mission to supply-side agents and carries it through offers, negotiation, milestone tracking, evidence, and completion or escalation.

The project is successful when the demo shows the agent doing work asynchronously rather than merely responding in a chat window.

### V2 mission

**Mission:** resolve a low-risk commercial kitchen or hospitality operations issue in London.

Example:

> Find a local commercial refrigeration provider who can attend today, remain within £500, and provide a completion update before the next service.

### V2 user journey

1. Create a mission from natural language (web UI or voice via V1's Vapi agent).
2. Review and confirm the generated mandate.
3. Start delegated execution.
4. Demand agent searches the curated supplier registry.
5. Supply agents return offers with availability, price, capability, and evidence.
6. Demand agent ranks offers against the mandate.
7. Agent sends a counteroffer or selects an offer within policy.
8. Mission enters `committed` or `awaiting_approval`.
9. Cloud Tasks schedules a milestone check.
10. A supplier submits progress evidence through a mobile-friendly link.
11. Agent extracts and records the evidence.
12. Mission completes, reroutes, or escalates.
13. Yaler generates a proof receipt and event timeline.

### V2 screens

- **Mission composer** — goal, budget, deadline, location, evidence requirements, autonomy mode.
- **Mission timeline** — current state, agent actions, supplier responses, policy checks, intervention points.
- **Offer comparison** — provider, capability, availability, price, reliability signals, ranking reasons.
- **Exception panel** — what happened, why the mandate is insufficient, options available.
- **Proof receipt** — mission summary, agreed terms, milestones, evidence, outcome.

### V2 agent tools

```text
search_supplier_agents
request_offer
record_offer
compare_offers
send_counteroffer
create_commitment
schedule_milestone
record_evidence
verify_evidence
raise_exception
reroute_mission
complete_mission
generate_proof_receipt
```

### V2 mission states

```text
DRAFT
MANDATE_CONFIRMED
SOURCING
OFFERS_RECEIVED
NEGOTIATING
AWAITING_APPROVAL
COMMITTED
IN_PROGRESS
EVIDENCE_PENDING
VERIFYING
COMPLETED
REROUTED
ESCALATED
CANCELLED
```

All state transitions must be deterministic and recorded as events.

### V2 success criteria

- A mission can be created from natural language.
- A mandate is shown before delegated execution begins.
- At least three supply agents can return distinct offers.
- The demand agent can rank and negotiate offers.
- A mission can run through Cloud Tasks asynchronously.
- A milestone can be submitted and parsed as evidence.
- At least one failure path causes a meaningful escalation or reroute.
- Every action is visible in a durable event timeline.
- Budget and autonomy boundaries are enforced in code.
- A proof receipt is generated.
- Cloud Run, Gemini, Firestore, and asynchronous execution are visible in the demo evidence.

---

## Explicit non-goals (both phases)

Do not build these before the V2 loop works:

- Real payments or escrow
- An open agent marketplace
- General-purpose procurement
- WhatsApp or SMS integration
- Automated dispatch of regulated work (gas, electrical, structural)
- Complex ratings and review systems
- Multi-city expansion
- Enterprise supplier-management suite
- Custom agent protocol competing with A2A
- Analytics dashboard
