# Demo runbook — the four-minute tour

For judges and presenters. Everything below works from a phone or a laptop. Total time: under 4 minutes. Every step has an offline fallback — you cannot be stranded.

## Before you start (30 seconds)

| Setup | What to do |
|---|---|
| **Easiest (deployed)** | Open [yaler.persidian.com](https://yaler.persidian.com). The static frontend talks to the production API at `https://yaler-backend-48617502162.europe-west2.run.app`. First click may take ~10s while Cloud Run warms up — that's cold start, not a bug. Health check: `curl -sS https://yaler-backend-48617502162.europe-west2.run.app/health` |
| **Local** | `make dev` (backend, needs `FIRESTORE_EMULATOR_HOST` pointing at a Firestore emulator) then `cd web && npm run dev` → http://localhost:4321. Seed demo data with `make seed`. |
| **Reset demo data** | Re-run `go run ./cmd/seed` any time. Fixed IDs — it overwrites, never duplicates. |

## The script

| Time | Do this | Say this (one line) | If the backend is cold/offline |
|---|---|---|---|
| 0:00 | Open `/`. Point at the live pulse under the hero. | "That pulse is real — it reads the live job list. Nothing broken right now? It says so." | Pulse falls back to a quiet "standing by" line. Carry on — the next step needs no backend. |
| 0:15 | Press **R** (or open `/rehearsal`). Press play. Watch the mandate get extracted → three quotes land → the £580 quote hits the £500 ceiling and the agent **stops**. | "Every job runs inside rules the owner wrote in plain English. When a quote would break them, the agent stops and asks — it never just spends." | None needed — rehearsal is fully client-side (`web/src/lib/rehearsal.ts` is static data, no API calls). |
| 0:45 | In the rehearsal, approve the blocked quote. Watch it book. | "One over-budget quote needed a human yes. Everything inside the rules just happened." | None needed. |
| 1:00 | Open `/missions/new`. Press **/** to jump to the job box, tap **Use a sample job**, submit. Watch DRAFT → rules → SOURCING → quotes land. | "That's a real job on the real API. The roster engineers answering are synthetic — every quote is labelled as simulated." | If creation fails, open a seeded job instead: `/missions/seed-mission-offers-01` (quotes in) or `/missions/seed-mission-sourcing-01` (still asking). |
| 1:45 | Compare the quotes, approve the best in-budget one → COMMITTED. Or open `/missions/seed-mission-awaiting-approval-01` and approve the over-ceiling quote. | "The agent compared every quote against the ceiling and the deadline. The decision is one tap; the reasoning stays on the timeline." | Replay a finished booking instead: `/replay/seed-mission-committed-01` locally, or `/replay/1?id=seed-mission-committed-01` on the deployed site. |
| 2:15 | Open the receipt: `/missions/seed-mission-completed-01/receipt`. Press **S** to copy the share link. | "The receipt is the deliverable: what was agreed, the photos checked, spend inside the ceiling — shareable with one key." | `/missions/demo/receipt` renders a complete static receipt with no backend at all. |
| 2:45 | Open `/ops` — the concierge desk. | "Verified engineers get real callouts; a human concierge works this queue — WhatsApp out, typed replies in. The synthetic roster keeps demos moving and is always labelled." | The desk shows its quiet empty state — that *is* the fallback, and it's honest. |
| 3:00 | Close: back to `/`. | "Owners get their evening back. The agent spends only inside their rules — and every step leaves a receipt." | — |

## Seeded jobs — one per lifecycle state

After `make seed`, each of these opens at `/missions/<id>` (and replays at `/replay/<id>`):

| Job ID | State | What it shows |
|---|---|---|
| `seed-mission-draft-01` | DRAFT | A note not yet started — the mandate editor. |
| `seed-mission-mandate-01` | MANDATE_CONFIRMED | Rules extracted and confirmed, search not started. |
| `seed-mission-sourcing-01` | SOURCING | Callouts sent to three engineers, waiting on quotes. |
| `seed-mission-offers-01` | OFFERS_RECEIVED | Three quotes in (£420 / £465 / £480), all inside £500. |
| `seed-mission-negotiating-01` | NEGOTIATING | Same-day quote £70 over — counter-offer sent at the ceiling. |
| `seed-mission-awaiting-approval-01` | AWAITING_APPROVAL | Only deadline-making quote is £60 over — policy stop, needs the owner. |
| `seed-mission-committed-01` | COMMITTED | Best in-budget quote accepted, booking locked. |
| `seed-mission-in-progress-01` | IN_PROGRESS | Engineer dispatched, on site within the hour. |
| `seed-mission-evidence-01` | EVIDENCE_PENDING | Work done, waiting on the photo. |
| `seed-mission-verifying-01` | VERIFYING | Photo in, being checked against the agreement. |
| `seed-mission-completed-01` | COMPLETED | Verified, receipt issued, 5★ rated — receipt at `/missions/seed-mission-completed-01/receipt`. |
| `seed-mission-escalated-01` | ESCALATED | Everyone declined or timed out — re-run the search from here. |

## Replay mode

`/replay/<job-id>` plays a finished job's timeline back like a recording: play/pause, a scrubber, 1×/4× speed, and a quotes counter that climbs as each quote lands. A **Replay** badge marks it as a recording; "Watch it live →" jumps to the live page. Locally any seeded ID works; on the deployed static host use `/replay/1?id=<job-id>` (the pre-rendered page resolves the ID from the query string).

## Keyboard

| Key | Does |
|---|---|
| `?` | Show/hide the shortcut cheat-sheet |
| `/` | Jump to the job box (new-job page) |
| `R` | Open the rehearsal |
| `S` | Copy the receipt share link (when the share card is on screen) |
| `Esc` | Close the cheat-sheet |

## If something breaks

- **Cold start**: first API call after idle can take ~10s. Wait; don't refresh-spam.
- **A live page 404s a job**: IDs are environment-specific. Use a seeded ID from the table, or the rehearsal.
- **Nothing works**: go straight to `/rehearsal` and `/missions/demo/receipt` — both are fully static and carry the whole story: rules → quotes → policy stop → booking → receipt.
