# All Things Agentic Hackathon — Submission

**Track:** Taskmaster (autonomous workflow that takes action, not just chat)  
**Deadline:** September 1, 2026, 1:00 AM GMT+1  
**Status:** ✅ Ready for submission

---

## Link

- **Hosted app:** https://yaler.persidian.com
- **Repo:** https://github.com/sneldao/yaler
- **Architecture diagram:** [docs/architecture.svg](../docs/architecture.svg) · [docs/architecture.png](../docs/architecture.png)

---

## What we built

Yaler is an autonomous mission agent for independent kitchens. A café manager says what's broken in plain English — or speaks it — and the agent books a local engineer inside the stated budget, verifies the work with photo evidence, and issues a shareable proof receipt. The operator UI is a paper receipt, not a chatbot.

**Google tech gates met:**
| Requirement | Implementation |
|---|---|
| Gemini 3.5+ | `gemini-3.5-flash` via Google Gen AI SDK — mandate extraction, offer ranking, evidence verification |
| Additional Google AI model | `gemma-3-27b-it` via the same GenAI SDK — supplier agent quote generation (role-playing distinct engineer personas) |
| Google Agent Framework | `google.golang.org/genai` (GenAI SDK) |
| Google Cloud infra | Cloud Run, Cloud Tasks, Firestore, Cloud Storage, Secret Manager, Cloud Build |

---

## Key features

1. **Natural-language mandate extraction** — Gemini parses budget, area, deadline, and category from speech or text, surfaces them as editable chips, enforces rules before any side effect.
2. **Deterministic policy guardrails** — A pure-function Go policy engine checks every Gemini proposal against budget ceilings, postal boundaries, and safety escalations. Gemini proposes; Go decides.
3. **Asynchronous agent workflow** — Cloud Tasks queue drives multi-step missions (source → rank → book → evidence → receipt) that survive scale-to-zero and can run for hours.
4. **Photo evidence verification** — Gemini checks completion photos against the agreed mandate, verifies compliance, and redacts PII before issuing the receipt.
5. **Animated proof receipts** — Thermal-print animation, verified stamp, fold lines, rating — the artifact people actually share.
6. **Replay mode** — Every completed mission has a scrubber replay at `/replay/<id>`, playable 1× or 4×, so judges can watch the full lifecycle.
7. **Cross-tab live sync** — BroadcastChannel-powered mission list cache keeps the home-page pulse in sync across tabs.
8. **A11y-first craft** — Skip-link, aria-live regions, keyboard shortcuts (`/` to composer, `?` for cheat-sheet, `S` for share), reduced-motion support.

---

## Architecture

See [docs/ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/architecture.svg](./architecture.svg).

Core flow:

```
Buyer speaks/types → Gemini 3.5 Flash extracts mandate → Policy checks rules →
Cloud Tasks queues worker → Worker calls 3 supplier agents (Gemma 3 27B) →
Each supplier agent role-plays a persona, generates independent quote →
Gemini 3.5 Flash ranks offers → Policy enforces ceiling → Booking committed →
Engineer submits evidence → Gemini verifies → Receipt issued
```

All state is append-only in Firestore. Version-checked writes prevent race conditions. The policy engine is a pure function — no model can bypass it.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Astro + React islands, Tailwind CSS, GSAP, Phaser (rehearsal game) |
| Backend | Go, Cloud Run, Cloud Tasks (production), Firestore |
| AI | Google Gen AI SDK (`gemini-3.5-flash`), Vapi (voice input), ElevenLabs (TTS) |
| Discovery | Exa (supplier search), Apify (Companies House verification) |
| Deploy | Netlify (frontend), Cloud Run (backend), Cloud Build |

---

## How to run locally

```bash
# 1. Clone and install
git clone https://github.com/sneldao/yaler.git
cd yaler
npm --prefix web install

# 2. Environment
cp .env.example .env
# Fill in at minimum: GEMINI_API_KEY (Google AI Studio key — no GCP project needed)
# See docs/DEPLOY.md for full config

# 3. Start the backend (Go API on :8081)
make dev

# 4. In a second terminal, start the frontend (Astro on :4321)
make web

# 5. Seed demo data (12 missions covering every lifecycle state)
make seed

# 6. Open http://localhost:4321
```

**Zero-GCP path:** The rehearsal (`/rehearsal`) and demo receipt (`/missions/demo/receipt`) work without any API keys — they're fully client-side with stub data. The live form at `/missions/new` calls the production backend by default; set `PUBLIC_API_URL=http://localhost:8081` to point at your local server instead.

**Firestore:** Local dev defaults to an in-memory store (no setup needed). To use the Firestore emulator instead, set `FIRESTORE_EMULATOR_HOST=localhost:8080` in `.env` and start it with `gcloud emulators firestore start`. Production uses real Firestore on GCP.

---

## Demo video

~4-minute demo following [docs/DEMO-VIDEO-SCRIPT.md](./DEMO-VIDEO-SCRIPT.md). The video covers:

1. **The problem** — London café loses £2,000/day when a fridge breaks
2. **The value prop** — autonomous agent finds, books, and verifies a local engineer
3. **Speak the job** — Gemini 3.5 Flash extracts the mandate from natural language
4. **The agent works** — sourcing, ranking, policy checks on the timeline
5. **The over-budget stop** — the agent refuses to spend beyond the mandate
6. **Hear the paper** — ElevenLabs reads the proof receipt
7. **Replay mode** — scrubber playback of a completed mission
8. **Backend on Google Cloud** (required) — Cloud Run console + live `curl` to the `.run.app` endpoint showing Gemini 3.5 Flash mandate extraction
9. **The stack** — architecture diagram and spec-driven development story

Full runbook: [docs/DEMO-RUNBOOK.md](./DEMO-RUNBOOK.md)

---

## Findings & learnings

### What worked
- **Mandate-as-data** is the right abstraction. Showing the 4 extracted fields as editable chips before any execution built trust immediately — the mandate is a data object, not a chat message.
- **The over-budget stop** is the single strongest moment. An agent that *refuses* to spend is more credible than one that always complies. It's the product's moral center.
- **Paper UI > dark console.** Kitchen managers don't want a dashboard. They want a receipt they can stick on the wall. This design decision made the demo feel like a product, not a prototype.
- **Seeded replay mode** was the right call. A live demo is fragile; a scrubber replay of a completed mission is bulletproof and lets judges verify the full lifecycle at their own pace.
- **Gemini proposes, Go decides.** Keeping the model behind a pure-function policy engine meant we could test every decision path deterministically. No Gemini response mutates state directly.
- **Multi-agent supplier quotes.** Each supplier agent gets an independent Gemma 3 27B call with its own persona (premium specialist, mid-market firm, budget outfit). The quotes are genuinely LLM-generated — different prices, different terms, different voices — and the buyer agent (Gemini 3.5 Flash) ranks them. Using two distinct Google AI models (Gemini for the buyer, Gemma for the suppliers) makes the agent-to-agent interaction architecturally visible, not just a prompt trick.

### What we'd do differently
- **Voice input (Vapi) is a polish cost.** Speak-in works when the key is set; falls back to Web Speech otherwise. For a hackathon, the text path is sufficient and more reliable.
- **The concierge desk (`/ops`) is the scariest screen.** It works for local demo but hasn't been stress-tested with real supply-side traffic. Worth a real pilot before any production play.
- **Seed data is our demo spine.** The 12 seed missions covering every lifecycle state are what make the replay feature work. Without them, judges see a blank timeline and lose the thread.

### Technical debt / future work
- `google.golang.org/genai` (GenAI SDK) is wired and working; Google ADK could be layered in later for tool-calling orchestration, but the current GenAI SDK + pure-function policy engine satisfies the hackathon requirement and keeps the architecture clean.
- Vertex AI authentication is live (Application Default Credentials via Cloud Run service account). The Gemini API key path remains as a local-dev fallback.
- Outbound voice/SMS notifications (milestone calls to engineers) are Horizon 2 — deferred intentionally.

---

## Judging criteria mapping

| Criterion (weight) | Evidence |
|---|---|
| **Innovation & Operational Utility 40%** | Agent completes a real operational workflow (find → book → verify → receipt) autonomously, not just chat. Multi-agent sourcing: 3 independent Gemma 3 27B-powered supplier agents role-play different business personas and generate independent quotes — the buyer agent (Gemini 3.5 Flash) then ranks them. Two distinct Google AI models in the same pipeline. The over-budget policy stop proves autonomy isn't blind compliance — the agent *refuses* to break the owner's rules. Cloud Tasks drives multi-step missions that survive scale-to-zero and run for hours without hand-holding. |
| **Architectural Discipline 30%** | Pure-function policy engine (`internal/policy/`) validates every Gemini proposal. Append-only event log in Firestore with version-checked writes prevents race conditions. Idempotent worker steps via `ExpectedVersion` + `IdempotencyKey` — safe to retry on both local and Cloud Tasks transports. Gemini never mutates state directly; it proposes typed actions, Go decides. 14-state mission state machine with table-driven tests. |
| **Demo & Production Readiness 30%** | Live hosted app (yaler.persidian.com), public repo (github.com/sneldao/yaler), 12 seeded missions covering all lifecycle states, replay mode with scrubber, spin-up instructions in README, architecture diagram (SVG + PNG), visible Google Cloud backend (Cloud Run console + live `.run.app` endpoint in the demo video). |

---

## Bonus points (optional)

- [ ] **Published content** — blog post on dev.to or medium.com covering how the project was built, with the required hackathon disclaimer language
- [ ] **Social media post** — X/LinkedIn post with `#AllThingsAgenticHackathon`
- [x] **Google AI model integration** — Gemma 3 27B (`gemma-3-27b-it`) integrated for supplier agent quote generation, alongside Gemini 3.5 Flash for mandate extraction and offer ranking. Two distinct Google AI models in the same pipeline.

---

*Built with Kiro · Spec-driven development from [requirements](../.kiro/specs/mission-loop/requirements.md) through [design](../.kiro/specs/mission-loop/design.md) to [tasks](../.kiro/specs/mission-loop/tasks.md).*
