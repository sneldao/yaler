# Supply Side — Concierge Wedge

This is the operating manual for the supply side as it actually works today:
**a human concierge in the loop, with software doing scoping, matching,
scoring, risk, evidence, and receipts.** There is no self-serve portal and no
agent-to-agent network yet (see Roadmap at the bottom).

## The model

```text
mission reaches SOURCING
  → worker matches ACTIVE suppliers in-district
  → creates a Callout per supplier (scoped ask: what's broken, budget, deadline)
  → VERIFIED supplier  : callout waits — concierge pings them by phone/WhatsApp,
                         enters their real quote (or decline) in the ops console
  → UNVERIFIED supplier : system auto-generates a clearly-labelled SIMULATED
                         quote so the demo runs without a real roster
  → first real or simulated quote ⇒ mission advances to evaluation (existing
                         ranking → policy stop → commitment → evidence → receipt)
```

A callout that goes unanswered for 4 hours is lazily marked EXPIRED. The
server also runs a small in-process sweeper (15s tick) that expires past-due
callouts and escalates any SOURCING mission whose callouts are all
DECLINED/EXPIRED with no quotes — a supplier timeout is an exception, not a
silent stall (FR-6).

## The trust boundary

- **Verified** (`supplier.verified = true`) means a human has checked the
  business: register lookup (Companies House via Apify, fail-closed) and a
  direct conversation confirming capability, capacity, and willingness.
  Verified suppliers are the only ones who take **real** callouts.
- **Unverified** roster entries (the synthetic seed: `(Synthetic)` in the name)
  take **simulated** callouts. The callout and the offer it produces are both
  flagged `simulated: true`, the offer terms say so, and the evidence label is
  `synthetic_roster`. Simulated quotes are never presented as real quotes.
- Only **ACTIVE** roster suppliers receive callouts at all.
- Offers created outside a callout (e.g. past/parallel paths) are not minted by
  the worker anymore — a real offer must map to a real callout.

## Find & verify (cold-start playbook)

You don't have suppliers yet. This is the order of operations, using the
discovery primitives that already exist:

1. **Find names** — `GET /api/discovery?category=commercial_refrigeration&district=N1`
   (Exa). This returns candidate businesses, not bookings. Curate to plausible
   independent repair outfits.
2. **Verify registration** (fail-closed) — `GET /api/credentials?name=<name>`
   (Apify → Companies House). If the business isn't verifiably registered,
   move on or investigate before proceeding.
3. **Manual phone check** — the actual concierge step. Call and confirm:
   - F-Gas certification for refrigerant work (REF/Compulsory for F-gas).
   - Capacity & willingness to take single-shot emergency jobs at kitchen
     pace (same-day, £300–£700) — most service firms prefer contracts, so
     this is the real filter.
   - Contact number that actually reaches them (WhatsApp ok).
4. **Onboard** — in the concierge desk (`/ops`), "Onboard a verified
   supplier": business name, phone, district, capabilities (comma-separated,
   e.g. `commercial_refrigeration,emergency_repair`). This writes an ACTIVE +
   `verified: true` supplier that from then on takes real callouts.

> Mark evidence of steps 2–3 (register + phone notes) in the supplier's
> `evidence` field when you onboard. That's the paper trail.

## The concierge desk (/ops)

One internal page. Not in the public nav. It:

- lists missions in SOURCING / OFFERS_RECEIVED (auto-refresh 10s),
- for each callout shows the drafted message (deterministic, kitchen-English:
  "Fridge down in N1. Budget up to £500… Reply with price and earliest
  arrival") with a **Copy** button for WhatsApp,
- "Quote" form: price (required), ETA, terms → `POST /api/callouts/{id}/offer`,
- "Decline" → marks the callout DECLINED (no offer minted),
- "Onboard a verified supplier" form (above).
- Shows an amber note when a quote exceeds the mandate budget — the real
  over-budget stop still fires at commitment time (that's the product).

## API surface (internal)

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/missions/{id}/callouts` | Callouts for a mission (lazy-expires) |
| POST | `/api/callouts/{id}/offer` | Record quote or decline (intake) |
| POST | `/api/suppliers/onboard` | Register a verified ACTIVE supplier |
| POST | `/api/missions/{id}/resume` | Re-run sourcing for an ESCALATED mission |

Both mutating endpoints honor the ops guard: if `OPS_TOKEN` is set (server
env), they require header `X-Ops-Token: <token>`; requests without it get 401.
If `OPS_TOKEN` is not set (local demo / judge runs), they are open — consistent
with the no-auth demo stance (D020). Set `OPS_TOKEN` on any deployed instance,
and set `PUBLIC_OPS_TOKEN` on the frontend deploy so `/ops` keeps working.

## Where things stop being clean

- **Mission stuck in SOURCING** if every callout declines/expires with no
  quote. The sweeper escalates these (NO_QUOTES → ESCALATED, checked every
  15s). The concierge then calls `POST /api/missions/{id}/resume` to re-run
  sourcing with fresh callouts — or boards someone new and resumes.
- **Durable async is not built yet**: the worker is a fire-and-forget
  goroutine (see ARCHITECTURE.md). Real supply means 20-minute quote latencies;
  the durable-queue fix (Cloud Tasks with retry/backoff, FR-8) is the next
  infra slice. Lazy expiry keeps the concierge loop honest meanwhile.

## Roadmap

1. **Concierge wedge (built now)** — verified roster + human outreach +
   intake. Produces real jobs → real receipts → real reliability data.
2. **Durable async spine** — Cloud Tasks queue with retry/backoff, inbound
   offer events that wake a mission, and a Cloud Tasks cron for the sweeper
   (the in-process 15s tick + `POST /api/missions/{id}/resume` cover the
   single-instance concierge phase now).
3. **Self-serve portal** — claim business → credential check (the Apify route)
   + F-Gas/PLI doc upload → you verify → ACTIVE. Supplier inbox/webhook
   (WhatsApp/SMS). Buyers rate completed jobs → ReliabilityScore becomes
   computed from feedback.
4. **Agent-to-agent (later)** — per-supplier auth + signature verification in
   the A2A endpoint, rate limiting. Only once real liquidity + real data
   exist. Reset until then: A2A endpoint is demo-grade, not verification.
