# Yaler — Project Context

## What is Yaler

Yaler is an autonomous mission network that helps independent businesses get urgent operational work completed by coordinating demand-side and supply-side agents. The first vertical is London independent hospitality (cafés, restaurants, takeaways) needing urgent equipment repair, cleaning, or maintenance.

## Target

**Ready, Spec, Ship Hackathon** (Kiro Hackathon) — submission deadline August 23, 2026.

Evaluation criteria:
- Application Quality: 40 pts
- Kiro Usage: 20 pts
- Documentation: 20 pts
- Innovation and Potential: 15 pts
- Presentation: 5 pts

After submission, the system extends toward the All Things Agentic hackathon and then a real London pilot.

## Stack

- **Frontend:** Astro with React islands
- **Backend:** Go (mission gateway + worker)
- **LLM:** Gemini via Google Gen AI Go SDK
- **Database:** Firestore
- **Async execution:** Cloud Tasks in production; labelled direct worker calls locally
- **Storage:** Firestore evidence metadata for Kiro; Cloud Storage after submission
- **Deployment:** Local emulator path required; Cloud Run optional
- **Secrets:** `.env` locally; Secret Manager when deployed
- **Observability:** Mission events; Cloud Logging when deployed

## Key concepts

- **Mission:** The outcome the demand side wants completed.
- **Mandate:** Budget, deadline, geography, allowed actions, escalation rules — the boundary within which the agent may act.
- **Proof receipt:** A record of what was requested, who accepted, what happened, and whether it completed.
- **Bounded autonomy:** Agents act within mandates. They escalate at policy boundaries, not after.
- **Policy engine:** Deterministic Go code that validates every action against the mandate. Gemini proposes, Go decides.

## Critical constraints

- Judges must be able to clone and run the project locally.
- The `.kiro/` directory must demonstrate meaningful spec-driven development.
- No simulated features presented as working — the coordination logic must be real. Local Cloud Tasks are a labelled direct call.
- Supplier data is synthetic but clearly labelled; the mission execution system is genuine.
- No login in the Kiro demo. Ship Delegate plus one escalation gate, not every autonomy mode.
- Demo video is at most 3 minutes.

## Documentation

- `docs/PRODUCT.md` — problem, users, product loop, differentiation
- `docs/STRATEGY.md` — market landscape, whitespace, strategic analysis
- `docs/SCOPE.md` — MVP scope and definition of done
- `docs/ARCHITECTURE.md` — full system architecture
- `docs/AGENT-OPERATING-MODEL.md` — mandates, autonomy modes, messages, escalation
- `docs/ROADMAP.md` — build plan with success criteria
- `docs/VALIDATION.md` — Horizon 2 pilot recruitment (not a Kiro-week task)
- `docs/DECISIONS.md` — choices made and open questions
- `docs/BRAND.md` — mark, palette, favicon, and site metadata
