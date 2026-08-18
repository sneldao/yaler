# Yaler — Project Context

## What is Yaler

Yaler is an autonomous mission network that helps independent businesses get urgent operational work completed by coordinating demand-side and supply-side agents. The first vertical is London independent hospitality (cafés, restaurants, takeaways) needing urgent equipment repair, cleaning, or maintenance.

## Three horizons

1. **V1 (Build Club hack night):** Voice-first mission intake via Vapi + Gemini + ElevenLabs. No database, no frontend. A phone call that books a provider.
2. **V2 (All Things Agentic hackathon):** Full durable mission loop — Go backend, Firestore, Cloud Tasks, Astro frontend, proof receipts.
3. **V3 (Customer launch):** Real London pilot with live providers and repeat missions.

## Current phase: V1

We are building the voice loop for the Build Club hack night. The entire interaction is a phone call. No web UI, no database, no cloud infrastructure beyond the serverless function hosting the backend.

## Key concepts

- **Mission:** The outcome the demand side wants completed.
- **Mandate:** Budget, deadline, geography, allowed actions, escalation rules — the boundary within which the agent may act.
- **Proof receipt:** A record of what was requested, who accepted, what happened, and whether it completed.
- **Bounded autonomy:** Agents act within mandates. They escalate at policy boundaries, not after.

## Documentation

- `docs/PRODUCT.md` — problem, users, product loop, differentiation
- `docs/STRATEGY.md` — market landscape, whitespace, strategic analysis
- `docs/SCOPE.md` — V1 and V2 scope definitions
- `docs/ARCHITECTURE.md` — V1 voice loop and V2 full system architecture
- `docs/AGENT-OPERATING-MODEL.md` — mandates, autonomy modes, messages, escalation
- `docs/ROADMAP.md` — three-horizon plan with success criteria
- `docs/VALIDATION.md` — pilot recruitment and interview guides
- `docs/DECISIONS.md` — choices made and open questions
