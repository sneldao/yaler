# Decisions and open questions

## Decisions

### D001 — Start with London

**Decision:** Use London as the initial proving ground because the builder can reach local businesses and providers during the build period.

**Constraint:** London is a launch wedge, not a claim that the product is permanently London-only.

### D002 — Start with independent hospitality operations

**Decision:** Focus the first mission class on low-risk commercial kitchen uptime and adjacent operational services.

**Reason:** Urgent pain, reachable local demand, fragmented supply, and measurable outcomes.

### D003 — Enter Taskmaster

**Decision:** Position Yaler around one complete mission rather than a conversational assistant or general platform.

### D004 — Use bounded autonomy

**Decision:** Agents act within mandates and escalate exceptions.

**Reason:** This makes autonomy credible, safe, and auditable.

### D005 — Use Astro with React islands (V2)

**Decision:** Astro handles public pages, proof receipts, agent cards, and documentation. React islands handle the mission console.

**Reason:** Yaler has public distribution surfaces as well as interactive workflows.

### D006 — Use Go for the V2 runtime

**Decision:** Go owns the API, mission orchestrator, deterministic policy engine, and Cloud Tasks workers.

**Reason:** Clear state machines, concurrency, retries, and Cloud Run compatibility.

### D007 — Use the Google Gen AI SDK

**Decision:** Use Gemini for LLM tasks across both V1 and V2.

**Reason:** Satisfies the Google framework requirement while keeping the first workflow explicit and understandable.

### D008 — Use Firestore first (V2)

**Decision:** Store mission state, events, offers, milestones, and agent profiles in Firestore.

**Reason:** Fast greenfield iteration and a natural document/event model.

### D009 — Use Cloud Tasks first (V2)

**Decision:** Use Cloud Tasks for asynchronous mission steps and retries.

**Reason:** Per-mission delayed work is simpler than introducing Pub/Sub before fan-out is needed.

### D010 — No real payments in MVP

**Decision:** Use simulated or explicitly labelled commitments during both hackathons.

**Reason:** Avoid payment, escrow, financial, and regulatory complexity while proving autonomous coordination.

### D011 — Three-horizon build strategy

**Decision:** Build Yaler across three horizons: Build Club hack night (V1 voice loop), All Things Agentic hackathon (V2 full mission loop), then customer pilot (V3).

**Reason:** Each horizon validates a different assumption. V1 validates the voice-first intake and mandate concept with a live audience. V2 validates durable autonomous coordination. V3 validates real-world demand and supply behavior.

### D012 — Voice-first entry point

**Decision:** Use Vapi for the V1 voice agent. The buyer calls a phone number, the agent extracts a structured mandate through conversation.

**Reason:** Voice demonstrates autonomy more viscerally than a form. It removes the frontend dependency for V1. It's a natural interface for a busy café owner mid-crisis. It targets the Vapi prize category directly.

### D013 — ElevenLabs for voice output

**Decision:** Use ElevenLabs as the voice synthesis layer (configured within Vapi or as a direct integration).

**Reason:** Higher quality voice than default Vapi TTS. Targets the ElevenLabs prize category. 110,000 free credits available.

### D014 — Hardcoded suppliers for V1

**Decision:** Use 3 hardcoded realistic London supplier profiles rather than a database or live data.

**Reason:** Eliminates all infrastructure dependencies for V1. The supplier data becomes the seed for the Firestore registry in V2. 90 minutes does not allow database setup.

### D015 — TypeScript for V1 backend

**Decision:** Use TypeScript for the V1 backend server (single file or minimal serverless function).

**Reason:** Fastest iteration speed for a 90-minute sprint. Vapi webhooks and Gemini API are well-supported in TypeScript. Go is reserved for V2 where the state machine and policy engine benefit from its type safety and concurrency model.

### D016 — Gemini via Google AI Studio for V1

**Decision:** Use the Gemini API via Google AI Studio (not Vertex AI) for V1.

**Reason:** No GCP project setup required. API key auth is sufficient. Structured output mode gives reliable JSON responses for supplier ranking. Vertex AI is added in V2 when Cloud Run service identity is available.

### D017 — Target multiple prize categories

**Decision:** Architect V1 to be eligible for Vapi, ElevenLabs, and People's Choice prizes simultaneously.

**Reason:** The voice-in/voice-out architecture naturally spans these categories. A single coherent demo can win multiple prizes without bolting on disconnected integrations.

### D018 — No frontend for V1

**Decision:** V1 has no web UI. The entire interaction happens over a phone call.

**Reason:** A phone call is the demo. It's more impressive than a form, faster to build, and proves the product thesis (delegate an outcome, don't fill in a form). The frontend is built in V2.

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

Start with voice (V1) and mobile web links (V2). Add SMS or WhatsApp only after the core mission flow is validated.

### Q006 — External agent protocol

Use typed internal messages first. Add A2A-compatible external endpoints only after the mission lifecycle is stable.

### Q007 — Public proof defaults

Determine which proof fields can be shared publicly without exposing sensitive buyer, supplier, or location data.

### Q008 — Commercial model

Do not choose pricing until repeat mission behavior and the value of reliability data are observed.

### Q009 — V1 server hosting

Decide between local ngrok tunnel, Vercel serverless function, or Cloudflare Worker for the V1 backend during the hack night. Decision depends on what's fastest to deploy with Vapi webhook requirements.

### Q010 — Vapi → V2 integration

Determine how the Vapi voice agent hands off to the Go mission gateway in V2. Options: Vapi calls a Cloud Run endpoint directly, or Vapi writes to a queue that the gateway consumes.

### Q011 — Apify integration (stretch)

If time permits in V1, use Apify ($100 credit) to scrape real London commercial refrigeration providers instead of hardcoding. Adds realism and targets the Apify prize. Decision: attempt only if core voice loop works with 30+ minutes remaining.
