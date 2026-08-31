# Yaler Demo Video Script

## Purpose
- **All Things Agentic Hackathon** (Google + Devpost, Taskmaster track): ~4-min demo
- Must show: problem, value prop, app in action, **backend running on Google Cloud**
- **Length**: ~4 minutes (hard cap per rules)

## Visual style
- Screen recording, no face cam needed
- Clean cursor, slight zoom on key actions
- Subtitles or minimal narration
- Paper/ink aesthetic matches the app — don't over-polish

---

## Script (Timestamped)

### 0:00–0:15 — The Problem

**Visual**: Open the landing page at https://yaler.persidian.com. Show the headline.

> A London café loses £2,000 a day when their fridge breaks. Finding a qualified engineer takes hours of phone tag, price guessing, and trust. Independent kitchens don't have a procurement team — they have a manager on a shift.

### 0:15–0:30 — The Value Prop

**Visual**: Stay on the landing page. Point at the "Start here — try a rehearsal" button.

> Yaler is an autonomous agent that does this for them. A kitchen manager says what's broken, once. A buyer agent finds, books, and checks a local engineer — inside the stated budget — then issues a shareable proof receipt. The operator UI is a paper receipt, not a chatbot. Gemini proposes; Go decides.

### 0:30–0:55 — Speak the Job

**Visual**: Navigate to `/rehearsal`. Click "Start here — try a rehearsal." Type or speak: *"My commercial fridge is down in N1, budget £500, need it before lunch."* Show the mandate appearing on screen.

> You tell the system: fridge down, N1, budget £500, before lunch. Gemini 3.5 Flash extracts the mandate — budget, deadline, location, evidence needed — and shows it to you before anything executes.

**Cut to**: The mandate editor. Show the budget field, deadline, service area.

> This is the mandate. It's data — not a chat message. Hard boundaries that no agent can bypass.

### 0:55–1:25 — The Agent Works

**Visual**: Click "Start looking." Show the timeline animation as events populate.

> You confirm. The agent starts sourcing. Watch the timeline: it calls three independent supplier agents, each powered by Gemini 3.5 Flash and role-playing a different London business persona. They generate independent quotes with real reasoning — a premium specialist, a mid-market firm, and a budget outfit, each in their own voice.

**Cut to**: The offer comparison view. Show the ranking.

> Gemini ranks the offers with explanations. The policy engine checks each one against the mandate.

### 1:25–1:50 — The Over-Budget Stop

**Visual**: Highlight a supplier that's over budget. Show the stop/fire.

> East London Quotes is £80 over budget. The system stops — it doesn't book. This is the mandate enforcing itself. Deterministic Go code, not a soft suggestion. An agent that *refuses* to spend is more credible than one that always complies.

**Cut to**: Selecting the in-policy supplier (ColdCare at £480). Show "committed" status.

> ColdCare is in-policy. The agent commits. Now it tracks milestones.

### 1:50–2:15 — Hear the Paper

**Visual**: Show the proof receipt at `/missions/seed-mission-completed-01/receipt`. Click "Hear the paper" / TTS button.

> When the job completes, the agent generates a proof receipt. You can read it — or hear it. ElevenLabs reads the paper in a calm voice. This is the audit trail you share with your landlord, your EHO, your insurer.

### 2:15–2:35 — Replay Mode

**Visual**: Open `/replay/seed-mission-completed-01`. Scrub the timeline.

> Every completed mission has a replay. Judges can scrub the full lifecycle — sourcing, ranking, booking, evidence, receipt — without waiting on a live API call.

### 2:35–3:05 — The Backend Runs on Google Cloud (REQUIRED)

**Visual**: Switch to the browser. Open the Cloud Run console:
`console.cloud.google.com/run/detail/europe-west2/yaler-backend`

Show:
1. The **service name** (`yaler-backend`) and **region** (`europe-west2`)
2. The **latest revision** (`yaler-backend-00033-mln`, active)
3. The **URL** field containing `https://yaler-backend-48617502162.europe-west2.run.app`

**Cut to**: A terminal or browser tab. Run:
```
curl -s https://yaler-backend-48617502162.europe-west2.run.app/health
```
Show the `200` response.

**Cut to**: A live API call — create a real mission:
```
curl -s -X POST https://yaler-backend-48617502162.europe-west2.run.app/api/missions \
  -H "Content-Type: application/json" \
  -d '{"goal":"Commercial fridge down in N1, budget £500, before lunch"}'
```
Show the JSON response with the Gemini-extracted mandate (budget 500 GBP, N1, commercial_refrigeration).

> The backend is a Go service deployed on Cloud Run in europe-west2. Every mission step is enqueued on Cloud Tasks and persisted in Firestore. Gemini 3.5 Flash runs the mandate extraction, offer ranking, and evidence verification — all through the Google Gen AI SDK. This is the live production endpoint, not a mock.

### 3:05–3:30 — The Stack

**Visual**: Quick flash of the architecture diagram from `docs/architecture.svg` or the `.kiro` directory.

> Built with Kiro spec-driven development: requirements, design, and 21 tasks tracked in `.kiro/`. The stack: Gemini 3.5 Flash for interpretation, Go for policy, Cloud Run for compute, Cloud Tasks for the async queue, Firestore for state, Cloud Storage for evidence. Vapi for voice. ElevenLabs for the receipt. Exa for discovery. Apify for credential checks. All orchestrated in a deterministic mission loop.

### 3:30–3:55 — Close

**Visual**: Show the live app one more time. URL on screen: `yaler.persidian.com`.

> Yaler is an autonomous agent for fragmented real-world work. The first vertical is London hospitality. The agent takes a goal, makes a plan, and carries it out — sourcing, booking, verifying — while the kitchen gets back to service. The mandate is enforceable. The receipt is shareable. The code is on GitHub.

**On-screen text**: `github.com/sneldao/yaler` · `yaler.persidian.com` · Built with Gemini 3.5 Flash on Google Cloud

---

## Production Notes

### What to record
1. Landing page → headline, live app URL
2. Rehearsal page → "Start here" button
3. Mission creation → typing the job description
4. Mandate editor → budget, deadline, area fields
5. Timeline → show events animating in
6. Offer comparison → ranked list with explanations
7. Over-budget stop → highlight the refused offer
8. Proof receipt → show the UI
9. "Hear the paper" → TTS button
10. Replay scrubber → `/replay/seed-mission-completed-01`
11. **Cloud Run console** → service `yaler-backend`, region `europe-west2`, revision `00033-mln`, URL
12. **Terminal** → `curl /health` (200) + `curl POST /api/missions` (live Gemini mandate)
13. Architecture diagram or `.kiro` directory → the spec-driven story

### The Google Cloud proof shot (DO NOT SKIP)
The hackathon rules state the video *"Must demonstrate the backend is running on Google Cloud (ie: Google Cloud Console, Cloud Run dashboard, Vertex AI logs, URL of .run, etc)."* This is a hard requirement, not bonus. The 2:35–3:05 segment covers it. If you cut anything, cut the replay segment — **not** the Cloud Run proof.

### What to skip
- Loading spinners, navigation fluff
- The "this is a real job" live form (save for live demo)
- Code review, terminal setup commands
- Any sponsor logos on screen (they're in the README, not the video)

### Technical tips
- Use `QuickTime Player` → File → New Screen Recording on Mac
- Record at 1920×1080, zoom the browser to 110% for readability
- Record in one take if possible — edits break pacing
- Export as H.264 .mp4
- Upload as **Unlisted** — accessible to anyone with the link
- For the Cloud Run console segment, zoom in on the service name, region, and URL fields so they're readable

### Narration
- Keep voice calm, kitchen-plain (match the product voice)
- Read the script once to time it — trim if over 4:00
- If no narration, use text overlays: each section header as a title card
- The Cloud Run segment narration should be matter-of-fact: "this is the live backend, here's the proof"

### After recording
1. Upload to YouTube as Unlisted
2. Replace the `PLACEHOLDER` URL in `README.md` line 31 with the real YouTube link
3. Commit and push: `git add README.md && git commit -m "Add demo video URL" && git push`
4. Submit on Devpost with the video URL + repo URL + hosted app URL + text from `docs/HACKATHON-SUBMISSION.md`
