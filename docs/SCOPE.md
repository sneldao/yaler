# Scope

## Scope objective

Deliver one convincing autonomous workflow in which a demand-side agent delegates an urgent hospitality operations mission to supply-side agents and carries it through offers, negotiation, milestone tracking, evidence, and completion or escalation.

The project is successful when:
1. The demo shows the agent doing work asynchronously rather than merely responding in a chat window.
2. A judge can clone the repo, follow setup instructions, and run the full workflow.
3. The `.kiro/` directory demonstrates meaningful spec-driven development.

## Target hackathon

**Ready, Spec, Ship** — Kiro Hackathon (codingagents.fyi)

- Submissions: August 8–23, 2026
- Judging: August 24 – September 5
- Winners announced: September 6

## Mission

**Mission:** resolve a low-risk commercial kitchen or hospitality operations issue in London.

Example:

> Find a local commercial refrigeration provider who can attend today, remain within £500, and provide a completion update before the next service.

The demo uses clearly labelled synthetic businesses and providers. The system is designed so real pilot data can replace stubs without architectural changes.

## Kiro slice versus later

The 23 August submission is a kernel of the mission network, not every surface in this document.

**Must ship for Kiro:**

- Natural-language goal → structured mandate, shown and confirmed before any side effect
- Three distinct synthetic supplier offers
- Deterministic policy engine that can refuse (budget, area, regulated category)
- Idempotent, version-checked worker steps
- Readable event timeline
- Text evidence in → redacted proof receipt out
- One honest escalation or approval path
- Clean clone + seed + local demo in under two minutes
- README plus a demo video of at most 3 minutes

**Stub or defer until after 23 August:**

- Full Collaborate and Observe UI — ship Delegate plus one approval or escalation gate
- Multi-round negotiation — rank and select, or one scripted counteroffer
- Cloud Storage uploads — text evidence and a labelled fixture are enough
- Firebase Authentication — no login for the judge demo
- WebSockets — poll the timeline
- Separate Cloud Run services, voice, A2A, SMS, self-serve suppliers
- London customer interviews — those belong to Horizon 2 / [VALIDATION.md](VALIDATION.md)

Non-negotiable even when cutting UI: mandate is data, policy is a pure function, events are append-only, supplier messages are untrusted, receipts are redacted by default.

## User journey

1. Create a mission from a natural-language goal.
2. Review and confirm the generated mandate.
3. Start delegated execution.
4. Demand agent searches the curated supplier registry.
5. Supply agents return offers with availability, price, capability, and evidence.
6. Demand agent ranks offers against the mandate.
7. Agent selects an in-policy offer, or sends at most one scripted counteroffer.
8. Mission enters `committed` or `awaiting_approval`.
9. A worker step schedules a milestone check (direct call locally; Cloud Tasks in production).
10. A supplier submits progress evidence through a mobile-friendly link.
11. Agent extracts and records the evidence.
12. Mission completes, reroutes, or escalates.
13. Yaler generates a proof receipt and event timeline.

## Screens

### Mission composer

- Goal (natural language)
- Budget
- Deadline
- Location / radius
- Required evidence
- Autonomy mode
- Escalation policy

### Mission timeline

- Current state
- Agent actions with timestamps
- Supplier responses
- Pending tasks
- Evidence submissions
- Policy checks
- Human intervention points

### Offer comparison

- Provider name and capabilities
- Availability
- Price
- Evidence of capability
- Reliability signals
- Ranking reasons

### Exception panel

- What happened
- Why the mandate is insufficient
- Options available
- Approve, reject, reroute, or change mandate

### Proof receipt

- Mission summary
- Agreed terms
- Milestones with timestamps
- Evidence links
- Final outcome
- Redacted share link

## Agent tools

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

## Mission states

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

All state transitions are deterministic and recorded as immutable events.

## Definition of done

The submission is ready when:

- A mission can be created from natural language.
- A mandate is shown before delegated execution begins.
- At least 3 supply agents return distinct offers.
- The demand agent can rank offers and select within policy (one scripted counteroffer at most).
- Mission steps run through a worker. Locally this is a labelled direct call; production uses Cloud Tasks.
- A milestone can be submitted and parsed as evidence (text, plus an optional labelled fixture).
- At least one failure path causes a meaningful escalation or reroute.
- Every action is visible in a durable event timeline.
- Budget and autonomy boundaries are enforced in code.
- A proof receipt is generated.
- Gemini, Firestore, and worker-step execution are demonstrated. Cloud Run is optional if the local path is solid.
- The project installs and runs from a clean clone.
- The `.kiro/` directory shows spec-driven development.
- A demo video exists and is at most 3 minutes.

## Explicit non-goals

Do not build these before the core loop works:

- Real payments or escrow
- An open agent marketplace
- General-purpose procurement
- Full voice ops channel (SMS / WhatsApp / outbound calls) — speak-in and hear-the-receipt are already shipped
- WhatsApp or SMS integration
- Automated dispatch of regulated work (gas, electrical, structural)
- Complex ratings and review systems
- Multi-city expansion
- Enterprise supplier-management suite
- Custom agent protocol competing with A2A
- Analytics dashboard
- Firebase Authentication or any login wall for judges
- Cloud Storage file uploads as a required demo path
- Full Collaborate / Observe consoles
- Multi-round live negotiation
- Customer interviews before the Kiro deadline
