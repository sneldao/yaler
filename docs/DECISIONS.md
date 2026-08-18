# Decisions and open questions

## Decisions

### D001 — Start with London

**Decision:** Use London as the initial proving ground because the builder can reach local businesses and providers during the build period.

**Constraint:** London is a launch wedge, not a claim that the product is permanently London-only.

### D002 — Start with independent hospitality operations

**Decision:** Focus the first mission class on low-risk commercial kitchen uptime and adjacent operational services.

**Reason:** Urgent pain, reachable local demand, fragmented supply, and measurable outcomes.

### D003 — Position around one complete mission

**Decision:** Position Yaler around one complete mission rather than a conversational assistant or general platform.

**Reason:** The product wedge is coordination after the match. A single delegated mission is the unit of value for Kiro judging and for later agentic tracks.

### D004 — Use bounded autonomy

**Decision:** Agents act within mandates and escalate exceptions.

**Reason:** This makes autonomy credible, safe, and auditable.

### D005 — Use Astro with React islands

**Decision:** Astro handles public pages, proof receipts, agent cards, and documentation. React islands handle the mission console.

**Reason:** Yaler has public distribution surfaces as well as interactive workflows.

### D006 — Use Go for the runtime

**Decision:** Go owns the API, mission orchestrator, deterministic policy engine, and Cloud Tasks workers.

**Reason:** Clear state machines, concurrency, retries, and Cloud Run compatibility.

### D007 — Use the Google Gen AI SDK

**Decision:** Use the Go Google Gen AI SDK for Gemini calls.

**Reason:** Gemini structured output gives typed mandate, ranking, and evidence proposals that the Go policy engine can validate. An AI Studio API key lets judges run locally without a GCP project.

### D008 — Use Firestore first

**Decision:** Store mission state, events, offers, milestones, and agent profiles in Firestore.

**Reason:** Fast greenfield iteration and a natural document/event model.

### D009 — Use Cloud Tasks first

**Decision:** Use Cloud Tasks for asynchronous mission steps and retries.

**Reason:** Per-mission delayed work is simpler than introducing Pub/Sub before fan-out is needed.

### D010 — No real payments in MVP

**Decision:** Use simulated or explicitly labelled commitments.

**Reason:** Avoid payment, escrow, financial, and regulatory complexity while proving autonomous coordination.

### D011 — Target Kiro Hackathon as primary milestone

**Decision:** Build Yaler as a submission to the Ready, Spec, Ship hackathon (Aug 8–23). The agentic hackathon and customer pilot follow as extensions.

**Reason:** The Kiro hackathon rewards spec-driven development, working applications, and documentation quality. The evaluation criteria (Application Quality 40pts, Kiro Usage 20pts, Documentation 20pts, Innovation 15pts, Presentation 5pts) align with a judge-runnable mission kernel. The remaining build window is enough for that kernel, not for every Horizon 2 surface.

### D012 — Spec-driven development with Kiro

**Decision:** Use Kiro's spec workflow (requirements → design → tasks) to drive implementation. Maintain the `.kiro/` directory as a first-class project artifact.

**Reason:** Kiro Usage is 20% of the hackathon score. The spec-driven approach also produces better architecture because requirements are explicit before code is written.

### D013 — Judges must be able to run locally

**Decision:** The project must run from a clean `git clone` with documented setup. Use Firestore emulator or a test project. Provide seed data for supplier agents.

**Reason:** The hackathon rules explicitly state: "Judges must be able to run the project from a complete public repository with clear setup and testing instructions." A project that only works in a specific cloud environment will fail evaluation.

### D014 — Gemini via Google AI Studio for development

**Decision:** Use the Gemini API via Google AI Studio (API key auth) for development and demo. Add Vertex AI with service identity for production deployment later.

**Reason:** No GCP project setup required for judges to run locally. API key in `.env` is simpler than service account configuration.

### D015 — Voice channel is a stretch goal

**Decision:** Full outbound voice ops (calls, SMS, WhatsApp) stay post-pilot. Speak-in and hear-the-receipt shipped later as D026.

**Reason:** The web UI is still the primary interface. A full comms channel is a different product. Two bounded voice jobs on the existing loop were enough for operators and for the receipt.

### D016 — Synthetic but realistic supplier data

**Decision:** Seed the system with 3+ clearly labelled synthetic London supplier agents. Their profiles, capabilities, and response patterns should be realistic enough to demonstrate the full workflow.

**Reason:** The hackathon rules say "avoid simulated or hard-coded features presented as working functionality." The suppliers are synthetic data, not simulated features — the coordination, policy enforcement, and state machine logic are real. The README will be explicit about this distinction.

### D017 — Kiro demo video is at most three minutes

**Decision:** The submission demo video is at most 3 minutes, matching the official rules. Judges are not required to watch past that limit.

**Reason:** Earlier drafts said "under 5 minutes." The [Ready, Spec, Ship rules](https://codingagents.fyi/hackathon/kiro/rules/) cap the video at three minutes.

### D018 — Local development uses the Firestore emulator

**Decision:** Judges and contributors run against the Firestore emulator. A shared test GCP project is optional for the builder, not required to evaluate the submission.

**Reason:** Closes Q009. Emulator plus seed data is the only path that satisfies "clone and run" without sharing credentials.

### D019 — Local Cloud Tasks are a labelled direct worker call

**Decision:** When `CLOUD_TASKS_EMULATOR=true`, the task client invokes the worker endpoint directly. Production uses a real Cloud Tasks queue. The README, UI, and demo video must label the local path as a simulation, not as a queue.

**Reason:** Closes Q010. The Kiro rules prohibit presenting simulated features as working functionality.

### D020 — No authentication in the Kiro demo

**Decision:** The judge-runnable demo has no login. A single implicit demo buyer is enough. Firebase Authentication is a Horizon 2 / pilot concern.

**Reason:** Auth adds setup friction and test-credential burden without proving the mission loop.

### D021 — Ship the Kiro kernel, not the full design

**Decision:** The 23 August submission ships Delegate mode plus one approval or escalation gate. It ranks and selects (one scripted counteroffer at most). Evidence is text plus an optional labelled fixture, stored as Firestore metadata. Collaborate and Observe remain in the domain model but are not required UI modes. Cloud Storage uploads, Firebase Auth, WebSockets, and voice are post-submission.

**Reason:** Five days cannot honestly deliver 14 states, three autonomy modes, two-round negotiation, Cloud Storage, and Cloud Run. The kernel is mandate → policy → offers → timeline → evidence → receipt.

### D022 — Pre-commit hooks and brand assets before more product code

**Decision:** Install `pre-commit` + Gitleaks + golangci-lint + EditorConfig on every commit, and keep canonical favicon / OG / manifest files in `assets/site/`.

**Reason:** Secret leaks and sloppy formatting are cheaper to stop now than after the first public clone. Brand files belong in the repo before the Astro scaffold so the web app copies them rather than inventing a second mark.

### D023 — Operator UI follows the brand, not the stack

**Decision:** The shipped web UI is paper, ink, and mandate teal. Copy is kitchen English. Progressive disclosure is the default: traces, autonomy modes, radar, and sample receipts stay closed until asked. Navigation uses Astro view transitions and in-app state, not hard reloads.

**Reason:** The first user is a café manager with a dead fridge, not a hackathon judge. `docs/BRAND.md` already forbids neon agent-marketplace chrome. Selling the outcome in the UI is the same wedge as D003.

### D024 — Rehearsal is London-only, labelled, and not a second city

**Decision:** Trust is built with a single N1 fridge rehearsal on the live chrome (`/rehearsal`). It uses the labelled synthetic London roster, forces one over-budget quote, and ends on a saved mandate. There is no San Francisco sim, no city picker, and no live booking from the playthrough.

**Reason:** Users will not hand a service window to a system they have not felt. A second city widens the cold start. The rehearsal answers the trust half; liquidity still comes from concierge demand in one area (D001, D016).

### D025 — Rehearsal is the first-visit walk, not a chat overlay

**Decision:** Home’s primary action is “Start here — try a rehearsal.” The live create form is behind “This is a real job.” The playthrough has a four-step rail and one mandate-voice line per phase. Quotes open on the over-budget offer. The only completion action is saving the mandate. There is no copilot, coach-mark tour, or LLM narrator.

**Reason:** First-time operators could not tell where to start or what had just happened. A talking agent would undo D023. Bounded, quiet guidance is the product: the stop is the lesson.

### D026 — Voice, find, and credentials are jobs, not logos

**Decision:** Vapi is how a kitchen manager speaks a job (rehearsal and live form). ElevenLabs reads the receipt aloud (`Hear the paper`). Exa lists nearby names as “found this morning” — labelled, not bookable, never written into the dispatch roster. Apify checks one public register (Companies House) and **fails closed** (`not_checked`) on any error. D015’s deferral of voice is superseded for these two surfaces only.

**Reason:** Operators, landlords, and future employees need different proofs from the same loop. Search results are not vetted engineers. A missing register check must never look like a pass.

---

## Open questions

### Q001 — Exact first mission category

Choose between commercial refrigeration, catering-equipment repair, cleaning/extraction, and another low-risk operational category after interviews.

### Q002 — First London area

Choose one area that is practical to visit repeatedly. Concentration is more valuable than city-wide coverage.

### Q003 — Supplier identity verification

Determine the minimum evidence needed for the pilot without creating a heavy compliance workflow.

### Q004 — Provider incentives

Test whether suppliers value better-scoped leads, faster acceptance, repeat work, or a public reliability profile most.

### Q005 — Communication channel

Web UI plus speak-in / hear-the-receipt (D026). SMS or WhatsApp only after the core mission flow is validated.

### Q006 — External agent protocol

Use typed internal messages first. Add A2A-compatible external endpoints only after the mission lifecycle is stable.

### Q007 — Public proof defaults

Determine which proof fields can be shared publicly without exposing sensitive buyer, supplier, or location data.

### Q008 — Commercial model

Do not choose pricing until repeat mission behavior and the value of reliability data are observed.

### Q009 — Local development experience

**Closed as D018.** Firestore emulator plus seed data is the judge path.

### Q010 — Cloud Tasks local simulation

**Closed as D019.** Local mode is a labelled direct worker call. Production uses Cloud Tasks.
