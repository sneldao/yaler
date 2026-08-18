# Roadmap

## Two horizons

Yaler is built across two horizons:

1. **Kiro Hackathon (Aug 8–23):** Judge-runnable mission kernel — Go backend, Astro frontend, Gemini, Firestore, worker steps (Cloud Tasks in production, labelled direct call locally).
2. **All Things Agentic Hackathon + Customer Launch:** Extended agent coordination, voice channels, real London pilot with live providers. Customer interviews live here, not in Horizon 1.

---

## Horizon 1 — Kiro Hackathon

**Deadline:** August 23, 2026 23:59 UTC

**Objective:** Build a working autonomous mission kernel that demonstrates spec-driven development with Kiro. A judge can clone the repo, follow setup instructions, and watch a mission move from creation through supplier matching, policy-gated selection, milestone tracking, and completion — with policy enforcement at every step. See [SCOPE.md](SCOPE.md) for the Kiro slice versus later.

### Evaluation criteria (from hackathon rules)

- Application Quality: 40 pts
- Kiro Usage: 20 pts
- Documentation: 20 pts
- Innovation and Potential: 15 pts
- Presentation: 5 pts

### What gets built

1. **Go mission gateway and worker** on Cloud Run — API, state machine, policy engine, Cloud Tasks orchestration.
2. **Firestore** — mission state, events, offers, milestones, agent profiles.
3. **Cloud Tasks** — async mission execution with retries and idempotency.
4. **Gemini integration** — goal → mandate extraction, offer comparison, evidence extraction. Counteroffer drafting is optional.
5. **Deterministic policy engine** — budget, deadline, geography, autonomy mode enforcement.
6. **Supplier agent stubs** — 3+ curated agents that respond to typed mission messages with realistic offers.
7. **Astro frontend** — mission composer, mandate confirmation, timeline, offer comparison, exception panel, proof receipt.
8. **Evidence as Firestore metadata** — text submissions and an optional labelled fixture. Cloud Storage uploads are Horizon 2.
9. **Observable event timeline** — every action recorded, viewable in the UI.
10. **Proof receipt generation** — shareable summary of a completed mission.

### Build order

1. Domain types + mission state machine + policy engine (Go)
2. Firestore connection + data model
3. Cloud Tasks integration + async step execution
4. Gemini: goal → structured mandate extraction
5. Supplier agent registry + offer request/response flow
6. Gemini: offer comparison and ranking
7. Optional one-shot counteroffer, then freeze negotiation
8. Milestone scheduling and text evidence submission
9. Exception/escalation/reroute path
10. Proof receipt generation
11. Astro frontend: mission composer + timeline
12. Astro frontend: offer comparison + exception panel + proof receipt
13. Cloud Run deployment only if the local demo is already green
14. Demo video recording (at most 3 minutes)

### Kiro-specific deliverables

The `.kiro/` directory must demonstrate meaningful spec-driven development:

- `steering/` — project context, conventions, build instructions
- `specs/mission-loop/` — requirements → design → tasks showing the full feature lifecycle
- Clean commit history showing spec-first, then implementation
- README documenting Kiro usage in the development process

### Success criteria

- A mission can be created from natural language.
- A mandate is shown and confirmed before delegated execution begins.
- At least 3 supply agents return distinct offers.
- The demand agent ranks and selects within policy.
- Worker steps are idempotent and version-checked. Local mode is a labelled direct call; production uses Cloud Tasks.
- A milestone can be submitted and parsed as evidence.
- At least one failure path causes a meaningful escalation or reroute.
- Every action is visible in a durable event timeline.
- Budget and autonomy boundaries are enforced in code.
- A proof receipt is generated.
- Judges can clone and run the project from README instructions.
- Demo video is at most 3 minutes and shows the spec-to-ship workflow plus the working application.

---

## Horizon 2 — Agentic Hackathon + Customer Launch

**Objective:** Extend the working system into a real pilot with live London businesses and providers.

### What extends from Horizon 1

- Supplier registry becomes a real curated network (manually verified providers).
- Voice already covers speak-in and hear-the-receipt. Horizon 2 is outbound milestone calls / SMS, not first capture.
- A2A-compatible external agent endpoints for third-party supplier agents.
- Mobile-first supplier evidence submission.
- Real-time notifications (SMS/email/voice) for milestone updates.
- Multiple mission categories beyond refrigeration.

### Validation phase

- 5 demand-side conversations (cafés, restaurants, takeaways).
- 5 supply-side conversations (repair, maintenance, cleaning providers).
- 3+ real supplier profiles in the registry.
- 1 real mission with a human operator on standby.
- Record what breaks, improve mandate and evidence language.

### Growth phase

- Supplier self-registration.
- Repeat-mission automation.
- Shareable proof receipts driving referrals.
- Dispute handling.
- Commercial model (decided after observing repeat behavior).

---

## Success metrics

### Kiro hackathon metrics

- Complete autonomous mission: creation → completion.
- 3+ supply-side agents with distinct offers.
- 1+ visible exception or reroute.
- Durable event history viewable in UI.
- Proof receipt generated.
- Project runs from clean clone.
- Demo video at most 3 minutes.
- Clean `.kiro/` demonstrating spec-driven workflow.

### Pilot metrics (post-hackathon)

- Time from mission creation to first qualified offer.
- Offers per mission.
- Time to accepted commitment.
- Completion rate.
- Human interventions per mission.
- Repeat missions from same buyer.
- Supplier acceptance rate.

### Product-market signals

1. A buyer returns with another mission.
2. A supplier asks to remain in the network.
3. A buyer accepts a provider they didn't already know.
4. A mission completes with less human coordination than the previous one.
