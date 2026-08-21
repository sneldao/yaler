# Yaler — Get the fridge fixed

> **Built with Kiro** | [Spec → Design → Tasks](.kiro/specs/mission-loop/) — autonomous agent that books real-world work
> **Build Club Hack Night** | Hosted by Build Club with Gemini / Google DeepMind & Exa

---

## 🎯 The Problem

Independent London cafés, restaurants, and food operators lose **£1,000s per day** when critical kitchen equipment breaks (refrigeration, extraction hoods, grease traps). Finding, vetting, negotiating, and supervising local technicians takes hours of manual stress during busy service shifts.

## 💡 The Solution

**Yaler** lets a kitchen manager say what's broken once. A buyer agent finds, books, and checks a local engineer inside the stated budget, then issues a shareable receipt.

The operator UI is a paper receipt, not a chatbot: kitchen English, a labelled N1 rehearsal first, traces hidden until asked.

```text
Speak or type → Check the details → Ask nearby engineers → Book inside the rules
              → Photos checked → Receipt
```

*Gemini interprets intent and evaluates evidence; deterministic Go code enforces budgets, safety, and auditability. Gemini proposes; Go decides.*

## 🎬 Demo

**Live app**: [yaler.persidian.com](https://yaler.persidian.com) — click **Start here — try a rehearsal**

**Quick 3-minute demo video**: [Watch the demo](https://youtube.com/watch?v=PLACEHOLDER) — create a mission, see the mandate, watch the agent source suppliers, rank offers, and generate a receipt.

**For judges** — the fastest path to "wow":
1. Open [yaler.persidian.com/rehearsal](https://yaler.persidian.com/rehearsal)
2. Click **Start here — try a rehearsal**
3. Speak or type: *"My commercial fridge is down in N1, budget £500, need it before lunch"*
4. Watch the mandate appear. See the over-budget stop fire.
5. Hit **Hear the paper** — ElevenLabs reads the receipt

**Clone and run locally** (zero GCP setup):

```bash
git clone https://github.com/sneldao/yaler.git
cd yaler
docker-compose up --build
```

Open `http://localhost:4321` and tap **Start here — try a rehearsal** (nothing is booked). The live form is under **This is a real job**.

See [docs/DEPLOY.md](docs/DEPLOY.md) for full setup.

---

## 🚀 Key Frontiers Built

1. **🎬 N1 fridge rehearsal**: Speak last Tuesday’s job, feel the over-budget stop, hear the paper. Nothing is booked.
2. **⚡ Gemini 2.5 Mandate Engine**: Converts messy speech/text into structured policy mandates with budget ceilings and SLAs.
3. **🤝 Agent-to-Agent (A2A) Protocol**: Standardized JSON-RPC 2.0 endpoint (`/api/a2a`) with cryptographic payload signing (`RSA-2048`).
4. **🛡️ Go Policy Guardrails**: Enforces hard budget ceilings, geographic postal boundaries, and mandatory safety escalations.
5. **☁️ Direct Cloud Storage Uploads**: Direct drag-and-drop photo evidence uploads to GCP Cloud Storage buckets.
6. **🔒 Zero-Knowledge Proof Receipts**: Gemini-verified evidence with automated PII privacy redaction.

---

## 🛠️ Sponsor Technologies Used

| Sponsor Technology | Integration & Usage |
|---|---|
| **Gemini / Google DeepMind** | Mandate extraction, supplier offer ranking, counter-offer drafting, photo evidence verification, and privacy redaction. |
| **GCP Cloud Run & Cloud Storage** | Serverless backend/frontend container deployment with Secret Manager binding and direct Cloud Storage bucket uploads. |
| **Vapi** | Speak a job on rehearsal and the live form (Web Speech fallback). |
| **ElevenLabs** | `Hear the paper` on rehearsal and live receipts (`POST /api/tts`). |
| **Exa** | Nearby names as “found this morning” — labelled, not bookable (`GET /api/discovery`). |
| **Apify** | Companies House check; fails closed to “not checked” (`GET /api/credentials`). |

---

## 📚 Deep-Dive Documentation

For complete technical specifications, architecture diagrams, and product guides, see the `/docs` directory:

- 📖 [Product Brief & Problem Statement](docs/PRODUCT.md) — Problem, user personas, and product loop.
- 🏗️ [Architecture & System Design](docs/ARCHITECTURE.md) — Go, Astro, Gemini, Firestore, and Cloud Run architecture.
- 🚢 [Deploy](docs/DEPLOY.md) — Netlify on `main` for the app; `make deploy-backend` for Cloud Run.
- 🎙️ [Talk to last Tuesday’s fridge](docs/ELEVENAGENT.md) — ElevenLabs Hosted MCP sidecar (not on the kitchen UI).
- 🤝 [Agent-to-Agent (A2A) Protocol Specification](docs/A2A-PROTOCOL.md) — JSON-RPC 2.0 schema and RSA signatures.
- 🛡️ [Agent Operating Model & Safety Guardrails](docs/AGENT-OPERATING-MODEL.md) — Policy boundaries and human escalations.
- 🗺️ [Market Strategy & Adjacent Whitespace](docs/STRATEGY.md) — London market analysis and pilot roadmap.
- 📋 [Kiro Spec-Driven Requirements](.kiro/specs/mission-loop/requirements.md) — Behavior and acceptance criteria.
- 📐 [Kiro Spec-Driven Design](.kiro/specs/mission-loop/design.md) — Domain model and system design.

---

## ⚙️ Built with Kiro

Yaler was spec-driven from day one using [Kiro](https://kiro.dev). Every feature followed the Kiro loop: **spec → design → task → code → review**.

### Spec → Design → Tasks

| Artifact | What it defines | Where |
|---|---|---|
| [`requirements.md`](.kiro/specs/mission-loop/requirements.md) | 8 functional requirements (mission creation, supplier discovery, offer ranking, evidence, exceptions, audit trail, async execution) plus non-functional constraints and acceptance criteria | `.kiro/specs/mission-loop/` |
| [`design.md`](.kiro/specs/mission-loop/design.md) | Domain model (Mission, Mandate, Offer, Event, Milestone, Receipt), state machine with 14 states, policy engine contract, Gemini integration boundaries, Firestore layout, API surface, error handling | `.kiro/specs/mission-loop/` |
| [`tasks.md`](.kiro/specs/mission-loop/tasks.md) | 21 ordered implementation tasks, each mapping to one or more requirements. Tasks 1–11 cover the core kernel; Tasks 13–14 add evidence and exceptions; Task 16–18 build the frontend. All marked complete. | `.kiro/specs/mission-loop/` |

### Steering Files

| File | Purpose |
|---|---|
| [`project.md`](.kiro/steering/project.md) | Project context, evaluation criteria, stack, key concepts (mission, mandate, proof receipt), critical constraints for judges |
| [`conventions.md`](.kiro/steering/conventions.md) | Go package layout, Astro/React island pattern, testing standards, Kiro-slice constraints, Gemini structured output rules, error handling |
| [`build.md`](.kiro/steering/build.md) | Prerequisites, quick-start commands, Makefile targets, Cloud Tasks local simulation, judge demo flow |

### Kiro-driven decisions that shaped the code

1. **Mandate as data, policy as a pure function.** The requirements spec (FR-1) demanded that a generated mandate be shown before any execution. This produced the `PUT /api/missions/:id/mandate` endpoint and the `MandateEditor` React island — the mandate is a data object in Firestore, not a chat message.

2. **Gemini proposes, Go decides.** The design spec explicitly states: "The model cannot bypass mandate checks." This produced a clean boundary: `internal/gemini/` returns typed proposals only; `internal/policy/` is a pure function that validates every action. No Gemini response mutates state directly.

3. **All state transitions are deterministic and recorded.** Requirement FR-7 mandated immutable events for every action. This produced the append-only `events` subcollection and the `Event` type with `PolicyResult` and `IdempotencyKey` fields. The state machine in `internal/domain/` tests every valid transition and rejects invalid ones with table-driven tests.

4. **Cloud Tasks local simulation.** The design spec required production Cloud Tasks but a working local demo. Tasks.md task 6 produced the task interface with `local.go` (labelled direct worker call) and `cloud_tasks.go` (real Cloud Tasks), with `CLOUD_TASKS_EMULATOR=true` switching between them.

### How Kiro was used in practice

The `.kiro/` directory was created on August 17 with the initial specs, steering files, and requirements. Tasks were implemented in commit order matching the task list. Each feature (Vapi voice, Exa discovery, ElevenLabs TTS, N1 rehearsal, the Aurora UI canvas) was traced back to a task or requirement before implementation.

```
Aug 17 — Initial specs (requirements, design, tasks, steering)
Aug 18 — Core kernel: tasks 1–11 (Go service, policy engine, Gemini, supplier offers, offer ranking)
Aug 18 — Frontend: tasks 16–18 (Astro, mission composer, offers, evidence, receipt)
Aug 18 — Verification: task 19 (end-to-end local demo)
Aug 18–19 — Sponsor integrations: Vapi, ElevenLabs, Exa, Apify
Aug 19 — ElevenAgent sidecar + submission polish
```

The spec-driven approach meant we never had to backtrack. When we added Exa for supplier discovery (task 10), we already had the contract from the design doc. When we added Vapi voice, the requirements already defined the mission creation flow. The specs were our source of truth.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
