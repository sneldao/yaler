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

### D027 — Two deploy paths, one API hostname

**Decision:** Frontend ships on push to `main` (Netlify). Backend ships only via `make deploy-backend` / `cloudbuild-backend.yaml`. The public API hostname is `https://yaler-backend-48617502162.europe-west2.run.app`. Do not rotate `PUBLIC_API_URL` for a new revision.

**Reason:** Mixing the hashed Cloud Run URL, the pretty URL, and a remembered `gcloud` incantation made deploys feel like a URL change. They are not. Revisions change; the service does not.

### D028 — Talk-to-the-paper is a sidecar, not the operator UI

**Decision:** The ElevenLabs Hosted MCP agent (“Last Tuesday’s fridge”) ingests `docs/elevenagent/` only. It answers about the rehearsal mandate and receipt. It cannot book. It is not embedded on `/` or `/rehearsal`.

**Reason:** Landlords and EHOs need to interrogate the paper. Kitchen managers need a receipt, not a second chatbot on the home screen.

### D029 — Supply side is a concierge wedge, not an A2A network

**Decision:** The supply side runs as a human-in-the-loop concierge wedge, not a multi-agent network. The worker creates `Callout` entities (one per matching ACTIVE supplier) with deterministic kitchen-English messages. Verified suppliers take real callouts that wait for the concierge to enter a quote via `POST /api/callouts/{id}/offer`. Unverified (synthetic seed) suppliers get auto-generated, clearly labelled simulated quotes so the demo stays runnable. The A2A endpoint stays protocol-ready but does not verify signatures yet — the README and docs say so explicitly.

**Reason:** You cannot bootstrap a supplier network by building the protocol. You bootstrap it with a human doing outreach while the software does scoping, matching, scoring, risk, evidence, and receipt. The network is a consequence of real jobs, not a prerequisite. D016's synthetic suppliers are still labelled; the concierge wedge adds the real path on top.

### D030 — ReliabilityScore is earned, not assumed

**Decision:** `ReliabilityScore` is a computed value, not a static float. After a mission completes, the buyer rates the engineer (1-5 + optional comment) via `POST /api/missions/{id}/feedback`. The score blends the static seed with the running mean of ratings, ramping feedback weight from 30% (one job) to 80% (five+ jobs). The buyer's rating also appears on the proof receipt (joined at read time, not persisted on the receipt itself).

**Reason:** The proof graph — real jobs producing real receipts producing real reliability data — is the differentiating asset. A static float undermines the trust product. One bad rating can't crash a long track record, but every completed job moves the score.

### D031 — Cloud Tasks is real, not just documented

**Decision:** `internal/tasks/cloudtasks.go` is a production Cloud Tasks client with OIDC auth to the Cloud Run service. `CLOUD_TASKS_EMULATOR=false` switches `cmd/server` from the local direct-call client to the real queue. The README's earlier claim that this existed (attributed to "Task 6") was aspirational; it is now real. D019's local-simulation stance is unchanged.

**Reason:** Real supply means time — a quote lands 20 minutes later, not in the same HTTP request. The fire-and-forget goroutine was the known weakness; the durable queue with retry/backoff is the fix. The worker is idempotent via `ExpectedVersion` + `IdempotencyKey` so tasks are safe to retry on both transports.

### D032 — Honesty in the UI: simulated quotes are labelled, not hidden

**Decision:** Simulated offers carry a "Simulated — not a real offer" chip, greyed styling, and "Synthetic roster — auto-generated so the flow runs" footer. Real (verified) quotes show a "Verified engineer" badge. The two never look identical. Loading and empty states across all surfaces use the same paper-card + receipt-punch craft. The `/ops` console surfaces the find-and-verify runbook when the roster has only synthetic suppliers.

**Reason:** The brand doc (D023) warns against undermining the trust product with conflation. Letting simulated and real quotes look identical, or leaving the cold-start state undocumented in the concierge's own tool, would do exactly that.

### D033 — Sponsor APIs are surfaced as branded callouts, not hidden plumbing

**Decision:** Every sponsor technology (Gemini, Vapi, Exa, Apify, ElevenLabs) fires as a visible `SponsorCallout` card — a branded, color-coded thinking card showing which API is working, what it does, and its live status. A compact `SponsorRail` in the footer and inside the mission timeline shows the full stack at a glance, with the active sponsor lit up per mission stage. This is deliberate and visible, not incidental.

**Reason:** Hackathon judges explicitly score "Use of sponsor tools" and there are dedicated prize tracks for Vapi, Apify, and ElevenLabs. Hiding the APIs as invisible plumbing was leaving the most points on the table. The product's credibility also comes from showing *which* AI does *what* at each step — Gemini proposes, Go decides; Vapi listens, Exa finds, Apify verifies, ElevenLabs reads. Making this visible is both a scoring lever and a trust signal.

### D034 — The receipt is the People's Choice artifact

**Decision:** The proof receipt is the visual centerpiece for People's Choice voting. It has a thermal-print animation (slides out of a slot), a verified stamp that thuds down with rotation and blur, fold lines that fade in, and the buyer's rating. It is designed to be shared.

**Reason:** People's Choice is a popular vote — people vote for what looks impressive in a 90-second skim. The paper/receipt aesthetic is beautiful but quiet. The animated receipt turns the completion artifact into a shareable, tangible object that pops in a demo. This does not conflict with D023 (paper, not chatbot) — it elevates the paper.

### D035 — District-agnostic, not London-locked

**Decision:** The home page has a district picker (defaults to N1, stored in localStorage). Any UK postcode works. The N1/Cafe Noor story remains the default rehearsal, but the product is not hardcoded to one postcode. This supersedes the London-only reading of D001 for the UI layer — the *pilot* is still London; the *product* works anywhere.

**Reason:** The SF hackathon audience has no N1 empathy. But the fix isn't adding SF (D024 is right — a second city widens the cold start). The fix is making the product district-agnostic so any audience can feel it, while keeping the universal story (a fridge dying before breakfast) as the default. The story is the agent, not the postcode.

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


### D036 — Landing is a 30-second pitch, not a product dashboard

**Decision:** The home page (`/`) is a compact pitch: universal pain headline → 3-step how-it-works → time comparison → sponsor tech strip → story teaser → market stats → waitlist. Product demo elements (DiscoveryBadge, SavedMandateCard, SponsorFlowDemo, DistrictPicker, active jobs) move to their contextual pages (`/missions/new`, `/rehearsal`). The hero leads with universal pain ("Equipment breaks. Every minute costs you money.") with "Live in London" as a credibility signal, not a geographic gate.

**Reason:** The Build Club SF hackathon audience is researchers, engineers, and founders — not London kitchen managers. They need to understand the problem, scale, and solution in 30 seconds of scrolling. The previous landing tried to be both a pitch page and a returning-user dashboard, diluting both. Product depth lives one click away in the rehearsal (where SponsorFlowDemo now shows all 5 sponsor APIs firing in sequence). The sponsor tech strip on the landing ensures judges see Gemini, Vapi, Exa, Apify, and ElevenLabs named and working without needing to click through — critical given dedicated prize tracks for Vapi, Apify, and ElevenLabs.
