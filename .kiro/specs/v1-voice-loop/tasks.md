# Tasks: V1 Voice Loop

## Implementation tasks

Tasks are ordered for fastest path to a working demo. Each task produces a testable increment.

---

### Task 1: Project scaffold

**What:** Initialize the V1 TypeScript project with dependencies and configuration.

**Steps:**
1. Create `v1/` directory with `package.json` (name: `yaler-v1`, type: module).
2. Add dependencies: `@google/generative-ai`, `hono` (lightweight server), `dotenv`.
3. Add dev dependencies: `typescript`, `tsx`, `@types/node`.
4. Create `tsconfig.json` with strict mode, ES2022 target, NodeNext module resolution.
5. Create `.env.example` with `GEMINI_API_KEY`, `PORT`.
6. Add scripts: `dev` (tsx watch), `start` (tsx).
7. Create `src/types.ts` with `Mandate`, `SupplierProfile`, `RankingResult`, `Escalation` types.

**Done when:** `npm run dev` starts a server that responds to health checks.

---

### Task 2: Supplier data

**What:** Define the 3 hardcoded London supplier profiles.

**Steps:**
1. Create `src/suppliers.ts`.
2. Define 3 suppliers with distinct trade-offs:
   - CoolFix Refrigeration: mid-price (£150-450), 2hr response, 0.92 reliability, N1-N7 area, specializes in commercial refrigeration.
   - Metro Cool Services: higher price (£200-600), 4hr response, 0.87 reliability, Central London, broader capabilities (refrigeration + installation + maintenance).
   - Rapid Kitchen Repair: cheapest (£100-350), 1hr response, 0.95 reliability, E1-E17/N1-N5, broadest capabilities (refrigeration + dishwasher + oven).
3. Export as typed array.

**Done when:** Supplier data is importable and type-safe.

---

### Task 3: Gemini prompt and client

**What:** Build the prompt template and Gemini API wrapper for supplier ranking.

**Steps:**
1. Create `src/gemini.ts` — initialize the Generative AI client with API key.
2. Create `src/prompts.ts` — `buildRankingPrompt(mandate: Mandate, suppliers: SupplierProfile[]): string`.
3. The prompt instructs Gemini to:
   - Rank suppliers by fit to the mandate.
   - Score on capability, area, availability, price, reliability.
   - Return structured JSON with rankings, selected supplier, escalation info, and confirmation message.
4. Use Gemini's JSON response mode (`responseMimeType: "application/json"`).
5. Parse the response with validation — if malformed, return a safe fallback.
6. Add a `rankSuppliers(mandate: Mandate): Promise<RankingResult>` function that combines prompt building and Gemini calling.

**Done when:** `rankSuppliers` can be called with a test mandate and returns a valid `RankingResult`.

---

### Task 4: Webhook endpoint

**What:** Create the HTTP endpoint that Vapi calls when the mandate is extracted.

**Steps:**
1. Create `src/index.ts` with a Hono server.
2. Add `POST /webhook` route that:
   - Parses the Vapi function call payload (extract the `rankSuppliers` arguments).
   - Validates the mandate fields (goal, budget, deadline, location, urgency).
   - Calls `rankSuppliers()`.
   - Returns the result in Vapi's expected response format.
3. Add `GET /health` for basic connectivity testing.
4. Add error handling: catch Gemini failures, return graceful fallback messages.
5. Add request logging for debugging.

**Done when:** `curl -X POST /webhook` with a test mandate returns a spoken confirmation string.

---

### Task 5: Vapi assistant configuration

**What:** Configure the Vapi assistant with system prompt, function definition, and voice.

**Steps:**
1. Create Vapi assistant via the Vapi dashboard or API.
2. Set the system prompt (from design doc — persona, conversation flow, extraction rules).
3. Define the `rankSuppliers` function with parameter schema.
4. Set the server URL to the backend endpoint (ngrok URL for local dev).
5. Configure voice: select an ElevenLabs voice (professional, British-accented if available).
6. Set first message: "Hi, this is Yaler. I help get urgent problems sorted for restaurants and cafés. What's going on?"
7. Configure end-of-call behavior.
8. Document the configuration in `vapi-config.json` for reference.

**Done when:** Calling the Vapi phone number starts a conversation with the configured persona.

---

### Task 6: End-to-end integration

**What:** Connect Vapi → backend → Gemini → Vapi voice response.

**Steps:**
1. Start the local server with `npm run dev`.
2. Expose via ngrok: `ngrok http 3000`.
3. Update Vapi server URL to ngrok HTTPS URL.
4. Make a test call to the Vapi phone number.
5. Walk through the happy path: describe problem → state budget → state deadline → state location → receive confirmation.
6. Verify: mandate is correctly extracted, Gemini returns a valid ranking, Vapi speaks the result.
7. Fix any payload format mismatches between Vapi and the backend.

**Done when:** A phone call produces a spoken booking confirmation end-to-end.

---

### Task 7: Failure path

**What:** Implement and test the escalation scenario.

**Steps:**
1. Test with a low budget (e.g., £50) that no supplier can meet.
2. Verify Gemini returns `escalation.needed: true` with a helpful reason and suggestion.
3. Verify Vapi speaks the escalation naturally ("I couldn't find anyone within £50...").
4. Test with an out-of-area location (e.g., "SW19") where coverage is limited.
5. Add Gemini API error handling: if the call fails, return a timeout/retry message.
6. Test the retry-once-then-fallback logic.

**Done when:** Both budget-exceeded and no-availability scenarios produce natural spoken escalations.

---

### Task 8: Demo polish

**What:** Optimize the demo experience for the 2-minute lightning presentation.

**Steps:**
1. Time the happy path call — target under 60 seconds.
2. Time the failure path — target under 45 seconds.
3. Tune the Vapi system prompt for brevity (remove unnecessary confirmations if the call is too long).
4. Verify voice quality — adjust ElevenLabs voice settings if needed.
5. Prepare demo script: what to say as the caller for the live demo.
6. Test with background noise (simulating the hack night environment).
7. Have a backup plan: if live call fails, have a pre-recorded successful call ready.

**Done when:** The demo can reliably complete both scenarios within 2 minutes total, with clear audio.

---

## Stretch tasks (only if core is solid with time remaining)

### Stretch A: Apify supplier scraping

Use Apify ($100 credit) to scrape real London commercial refrigeration providers from Google Maps or Checkatrade. Replace hardcoded data with real provider names, areas, and capabilities. Targets the Apify prize.

### Stretch B: Post-call summary

After the call ends, generate a text summary (proof receipt preview) sent via SMS or displayed in a simple web page. Shows what the V2 proof receipt will look like.

### Stretch C: Multi-turn negotiation

If the caller rejects the first option ("too expensive"), the agent offers the next-ranked supplier. Requires handling the post-function-call conversation turn in Vapi.
