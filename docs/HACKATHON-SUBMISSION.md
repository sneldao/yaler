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
| Gemini 3.5+ | `gemini-3.5-flash` via Google Gen AI SDK |
| Google Agent Framework | `google.golang.org/genai` (GenAI SDK) |
| Google Cloud infra | Firestore, Cloud Tasks, Cloud Run |

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
Buyer speaks/types → Gemini extracts mandate → Policy checks rules →
Cloud Tasks queues worker → Worker sources suppliers (Exa) →
Gemini ranks offers → Policy enforces ceiling → Booking committed →
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
# Fill in at minimum: GEMINI_API_KEY
# See docs/DEPLOY.md for full config

# 3. Start (backend on :8081, frontend on :4321)
make dev

# 4. Seed demo data
go run ./cmd/seed

# 5. Open http://localhost:4321
```

**Zero-GCP path:** The rehearsal (`/rehearsal`) and demo receipt (`/missions/demo/receipt`) work without any API keys — they're fully client-side with stub data.

---

## Demo video

The live demo is under 3 minutes. Recommended script:

1. **0:00** — Open https://yaler.persidian.com, point at the live pulse
2. **0:15** — `/rehearsal` → play → watch mandate extract, over-budget stop fire
3. **0:45** — Approve the blocked quote → booking
4. **1:00** — `/missions/new` → use sample job → real API call → SOURCING → quotes land
5. **1:45** — Compare quotes → approve → COMMITTED
6. **2:15** — `/missions/seed-mission-completed-01/receipt` → share link
7. **2:45** — `/replay/seed-mission-completed-01` → scrubber playback
8. **3:00** — Close: "Owners get their evening back"

Full runbook: [docs/DEMO-RUNBOOK.md](./DEMO-RUNBOOK.md)

---

## Findings & learnings

### What worked
- **Mandate-as-data** is the right abstraction. Showing the 4 extracted fields as editable chips before any execution built trust immediately. Judges asked about it more than any other screen.
- **The over-budget stop** is the single strongest moment. An agent that *refuses* to spend is more credible than one that always complies. It's the product's moral center.
- **Paper UI > dark console.** Kitchen managers don't want a dashboard. They want a receipt they can stick on the wall. This design decision made the demo feel like a product, not a prototype.
- **Seeded replay mode** was the right call. A 3-minute live demo is fragile; a 30-second replay is bulletproof.

### What we'd do differently
- **Voice input (Vapi) is a polish cost.** Speak-in works when the key is set; falls back to Web Speech otherwise. For a hackathon, the text path is sufficient and more reliable.
- **The concierge desk (`/ops`) is the scariest screen.** It works for local demo but hasn't been stress-tested with real supply-side traffic. Worth a real pilot before any production play.
- **Seed data is our demo spine.** The 12 seed missions covering every lifecycle state are what make the replay feature work. Without them, judges see a blank timeline and lose the thread.

### Technical debt / future work
- `google.golang.org/genai` is wired and working; `google/adk-go` could be layered in later for tool-calling orchestration, but the current GenAI SDK + pure-function policy engine satisfies the hackathon requirement and keeps the architecture clean.
- Vertex AI migration is planned for production (D014 decision). Current API-key path is fine for demo.
- Outbound voice/SMS notifications (milestone calls to engineers) are Horizon 2 — deferred intentionally.

---

## Judging criteria mapping

| Criterion (weight) | Evidence |
|---|---|
| **Innovation & Operational Utility 40%** | Agent completes a real operational workflow (find → book → verify) autonomously. Over-budget policy stop proves autonomy isn't just compliance. |
| **Architectural Discipline 30%** | Pure-function policy engine, append-only event log, idempotent worker steps, version-checked writes. Gemini never mutates state directly. |
| **Demo & Production Readiness 30%** | Live hosted app, public repo, 12 seeded missions covering all states, replay mode, spin-up instructions, architecture diagram, visible Google Cloud backend. |

---

*Built with Kiro · Spec-driven development from [requirements](../.kiro/specs/mission-loop/requirements.md) through [design](../.kiro/specs/mission-loop/design.md) to [tasks](../.kiro/specs/mission-loop/tasks.md).*
