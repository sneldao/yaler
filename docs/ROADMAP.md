# Roadmap

## Three horizons

Yaler is built across three horizons, each extending the last:

1. **V1 — Build Club hack night** (1.5 hours): Voice-first mission intake and supplier matching. A working phone number that a café owner can call to get a provider booked.
2. **V2 — All Things Agentic hackathon** (multi-day): Full durable mission loop with async execution, multi-agent coordination, evidence, and proof receipts on Google Cloud.
3. **V3 — Customer launch**: Real London pilot with live providers, repeat missions, and commercial model.

---

## Horizon 1 — Build Club hack night

**Constraint:** 90 minutes of build time. Solo or small team. Demo in 2 minutes.

**Objective:** Demonstrate bounded autonomous coordination through a voice call. A café owner describes an urgent problem, the system extracts a mandate, finds a provider, and confirms the booking — all by voice.

### What gets built

1. Vapi voice agent — conversational intake, extracts goal/budget/deadline/location.
2. Gemini backend — receives structured mandate, ranks hardcoded suppliers, selects best fit.
3. ElevenLabs voice output — speaks the result back naturally.
4. One failure path — budget exceeded or no provider available triggers escalation.

### What gets faked

- Supplier data is hardcoded (3 realistic London providers).
- No database, no durable state, no frontend.
- No real provider communication.
- Evidence and milestones are described, not implemented.

### Success criteria

- A real phone call produces a real booking confirmation by voice.
- Budget and deadline constraints are enforced.
- One failure case demonstrates escalation.
- Demo tells a compelling "side hustle" story.

### Prize targets

- Best Use of Vapi (voice-first workflow)
- ElevenLabs Winner (voice that improves UX beyond TTS)
- People's Choice (the build the room wants to see ship)
- Best Use of Apify (if time permits: scrape real providers)

---

## Horizon 2 — All Things Agentic hackathon

**Objective:** One complete autonomous mission from creation to proof receipt, running asynchronously on Google Cloud.

### What extends from V1

- Vapi intake becomes one entry point to mission creation.
- Gemini prompts for mandate extraction and supplier ranking become full tool-call workflows.
- Hardcoded suppliers become a curated Firestore registry.
- Voice output becomes one notification channel alongside the web timeline.

### What gets built

1. Go mission gateway and worker on Cloud Run.
2. Firestore state and event storage.
3. Cloud Tasks async mission execution.
4. Full state machine (14 states, deterministic transitions).
5. Deterministic policy engine.
6. Gemini tool calls: mandate extraction, offer comparison, counteroffer drafting, evidence extraction.
7. Supplier agent endpoints (curated, respond to typed messages).
8. Astro frontend: mission composer, timeline, offer comparison, exception panel, proof receipt.
9. Cloud Storage for evidence artifacts.
10. Observable event timeline with Cloud Logging.

### Build order

1. Domain types + state machine + policy engine (Go).
2. Firestore writes + Cloud Tasks loop (happy path).
3. Gemini integration: goal → mandate extraction.
4. Supplier agent stubs (realistic canned responses).
5. Minimal frontend: create mission, view timeline.
6. Gemini integration: offer comparison and ranking.
7. Exception/escalation path.
8. Proof receipt generation.
9. Vapi + ElevenLabs as voice entry/notification layer.
10. Demo polish.

### Success criteria (from SCOPE.md)

- A mission created from natural language.
- Mandate shown before delegated execution.
- Three supply agents return distinct offers.
- Demand agent ranks and negotiates.
- Async execution via Cloud Tasks.
- Milestone submitted and parsed as evidence.
- One failure path triggers escalation or reroute.
- Durable event timeline.
- Budget and autonomy boundaries enforced.
- Proof receipt generated.
- Cloud Run + Gemini + Firestore visible in demo.

---

## Horizon 3 — Customer launch

**Objective:** Real London pilot with live businesses and providers.

### Phase A — Validate the wedge

- 5 demand-side conversations (cafés, restaurants, takeaways).
- 5 supply-side conversations (repair, maintenance, cleaning providers).
- Identify the first safe, evidenceable mission type.
- Exit: 2+ buyers describe the same pain, 3+ suppliers willing to receive structured requests.

### Phase B — Pilot onboarding

- 3+ real supplier profiles in the registry.
- 1-2 real demand-side business profiles.
- Run one real mission with a human operator on standby.
- Record what breaks, what confuses, what works.
- Improve mandate and evidence language based on feedback.

### Phase C — Repeat and grow

- Supplier self-registration.
- Mobile-first supplier evidence submission.
- Repeat-mission automation.
- Shareable proof receipts driving referrals.
- A2A-compatible external agent endpoints.
- Additional mission categories beyond refrigeration.

### Phase D — Commercial model

Possible models (do not decide until repeat behavior is observed):

- Buyer subscription
- Per-completed mission fee
- Provider lead or success fee
- Managed network fee

---

## Success metrics

### Hack night metrics

- Working voice call → booking confirmation.
- Budget enforcement demonstrated.
- One failure/escalation path.
- Demo completed in under 2 minutes.

### Agentic hackathon metrics

- One complete autonomous mission.
- Three supply-side agents.
- One visible exception or reroute.
- Durable event history.
- Proof receipt generated.
- Cloud Run and Gemini evidence.

### Pilot metrics

- Time from mission creation to first qualified offer.
- Offers per mission.
- Time to accepted commitment.
- Completion rate.
- Human interventions per mission.
- Repeat missions from same buyer.
- Supplier acceptance rate.

### Product-market signals

1. A buyer returns with another mission.
2. A supplier asks to remain in the network.
3. A buyer accepts a provider they didn't already know.
4. A mission completes with less human coordination than the previous one.
