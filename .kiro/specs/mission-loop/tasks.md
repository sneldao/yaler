# Tasks: Autonomous Mission Loop

Tasks are ordered for a working local demo first, then optional cloud deployment and submission polish.

The Kiro slice is Tasks 1–11, 13–19, and 21. Task 12 (negotiation) and Task 20 (Cloud Run) are only if the local demo is already green. See `docs/SCOPE.md` for what must ship versus what is stubbed.

## Foundation

### - [x] Task 1 — Scaffold the Go service
Create `go.mod`, `cmd/server`, `internal/{domain,policy,gemini,store,tasks,handler}`, `.env.example`, `.gitignore`, and a Makefile. Add `/health` and verify `make build`, `make test`, and `make dev`.

### - [x] Task 2 — Define domain types and state machine
Implement mission, mandate, offer, supplier, event, milestone, receipt, and task payload types. Implement every valid state transition and table-driven tests for valid and invalid transitions.

### - [x] Task 3 — Implement the deterministic policy engine
Validate budget, deadline, geography, allowed actions, autonomy mode, expiry, evidence, and regulated categories. Add comprehensive table-driven tests. No handler or Gemini call may bypass this engine.

## Persistence and orchestration

### - [x] Task 4 — Add Firestore storage
Implement client initialization with emulator support and repositories for missions, events, offers, agents, milestones, and receipts. Add optimistic version checks and memory fallback.

### - [x] Task 5 — Add synthetic supplier seed data
Create `seed/suppliers.json` with three clearly labelled London suppliers and `cmd/seed/main.go`. Add `make seed` and verify capability/area search.

### - [x] Task 6 — Add Cloud Tasks clients
Define a task interface, production Cloud Tasks implementation, local direct-call implementation, retry metadata, idempotency handling, and `/api/worker/step`.

## Intelligence and mission API

### - [x] Task 7 — Implement Gemini mandate extraction
Create the Gemini client and prompt builders. Implement structured JSON extraction with timeout, retry, validation, and fallback handling.

### - [x] Task 8 — Implement mission creation and mandate confirmation
Add `POST /api/missions`, `PUT /api/missions/:id/mandate`, `GET /api/missions/:id`, and events endpoints. Create a draft mission, show the mandate, and record confirmation.

### - [x] Task 9 — Implement mission worker step routing
Add `POST /api/missions/:id/start`. Route each status to one idempotent worker step, check expected versions, record transitions, and enqueue the next task.

### - [x] Task 10 — Implement supplier discovery and offers
Search the registry, request offers from the three synthetic supplier agents, persist offers and events, and advance to `OFFERS_RECEIVED`. Add offers API and tests.

### - [x] Task 11 — Implement Gemini offer ranking and policy-gated selection
Add `CompareOffers`, ranking explanations, delegate/collaborate/observe behavior, and policy validation. Advance to `COMMITTED`, `AWAITING_APPROVAL`, or `ESCALATED` appropriately.

### - [x] Task 12 — Optional one-shot counteroffer
Optional counteroffer drafting in `gemini.DraftCounteroffer`.

## Evidence and exceptions

### - [x] Task 13 — Implement milestone and evidence flow
Create milestones, schedule checks, add text evidence submission, add `ExtractEvidence`, verify requirements, and complete missions when all milestones pass.

### - [x] Task 14 — Implement exceptions, approval, reroute, and cancel
Add exception records and approval actions: approve, reject, reroute, adjust mandate, and cancel. Cover budget, timeout, missing evidence, policy violation, and regulated-work scenarios.

### - [x] Task 15 — Generate proof receipts
Compile goal, mandate, terms, milestones, evidence labels, outcome, and human review markers. Redact sensitive fields, generate a share token, persist the receipt, and expose the receipt endpoint.

## Frontend

### - [x] Task 16 — Scaffold Astro and Tailwind
Create `web/`, add Astro, React integration, Tailwind, shared layout, landing page, API base URL configuration, and development proxy.

### - [x] Task 17 — Build mission composer and timeline
Implement `MissionForm`, `MandateEditor`, mission detail route, start action, status badges, polling, and chronological event timeline.

### - [x] Task 18 — Build offers, exceptions, evidence, and receipt views
Implement ranked offer comparison, exception actions, mobile-friendly evidence form, supplier cards, and server-rendered redacted proof receipt.

## Verification and submission

### - [x] Task 19 — End-to-end local demo
Run the full flow against local direct-call task simulation and memory/Firestore store: create → confirm → source → offers → rank → commit → evidence → complete → receipt.

### - [ ] Task 20 — Optional Cloud Run deployment
Deploy to GCP Cloud Run / Cloud Tasks if needed.

### - [x] Task 21 — Kiro submission package
Update README and docs for hackathon package.
