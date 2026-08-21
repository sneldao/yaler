# Yaler Demo Video Script

## Purpose
- **Kiro judges** (100 pts, 100-second read): Shows spec-driven autonomous agent with real policy enforcement
- **Build Club room** (People's Choice): Shows what a full night of building with sponsors produces
- **Length**: ≤3 minutes

## Visual style
- Screen recording, no face cam needed
- Clean cursor, slight zoom on key actions
- Subtitles or minimal narration (room will be noisy if shown live)
- Paper/ink aesthetic matches the app — don't over-polish

---

## Script (Timestamped)

### 0:00–0:10 — The Problem

**Visual**: Open the landing page. Show the headline.

> A London café loses £2,000 a day when their fridge breaks. Finding a qualified engineer takes hours of phone tag, price guessing, and trust.

### 0:10–0:25 — The Rehearsal

**Visual**: Navigate to the rehearsal page. Click "Start here — try a rehearsal."

> Yaler solves this. You speak or type what's broken. A buyer agent finds, books, and checks a local engineer — inside your rules. We start with a rehearsal so nothing is booked.

### 0:25–0:50 — Speak the Job

**Visual**: Type or speak: *"My commercial fridge is down in N1, budget £500, need it before lunch."* Show the mandate appearing on screen.

> You tell the system: fridge down, N1, budget £500, before lunch. Gemini extracts the mandate — budget, deadline, location, evidence needed — and shows it to you before anything executes.

**Cut to**: The mandate editor. Show the budget field, deadline, service area.

> This is the mandate. It's data — not a chat message. Hard boundaries that no agent can bypass.

### 0:50–1:20 — The Agent Works

**Visual**: Click "Start looking." Show the timeline animation as events populate.

> You confirm. The agent starts sourcing. Watch the timeline: it searches curated suppliers, collects offers, ranks them against the mandate. Three synthetic London suppliers respond with availability, price, and capability.

**Cut to**: The offer comparison view. Show the ranking.

> Gemini ranks the offers with explanations. The policy engine checks each one against the mandate.

### 1:20–1:45 — The Over-Budget Stop

**Visual**: Highlight a supplier that's over budget. Show the stop/fire.

> East London Quotes is £80 over budget. The system stops — it doesn't book. This is the mandate enforcing itself. Deterministic Go code, not a soft suggestion.

**Cut to**: Selecting the in-policy supplier (ColdCare at £480). Show "committed" status.

> ColdCare is in-policy. The agent commits. Now it tracks milestones.

### 1:45–2:10 — Hear the Paper

**Visual**: Show the proof receipt. Click "Hear the paper" / TTS button.

> When the job completes, the agent generates a proof receipt. You can read it — or hear it. ElevenLabs reads the paper in a calm voice. This is the audit trail you share with your landlord, your EHO, your insurer.

### 2:10–2:35 — The Stack

**Visual**: Quick flash of the code architecture diagram from docs/ARCHITECTURE.md or the `.kiro` directory.

> Built with Kiro spec-driven development: requirements, design, and 21 tasks tracked in `.kiro/`. Gemini for interpretation. Go for policy. Vapi for voice. ElevenLabs for the receipt. Exa for discovery. Apify for credential checks. All orchestrated in a deterministic mission loop.

### 2:35–3:00 — Close

**Visual**: Show the live app one more time. URL on screen.

> Yaler is an outcome-execution network for fragmented real-world work. The first vertical is London hospitality. The protocol is open. The mandate is enforceable. This was built in one hack night.
>
> The spec, the code, and the demo are all on GitHub.

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
10. Architecture or .kiro directory → the spec-driven story

### What to skip
- Loading spinners, navigation fluff
- The "this is a real job" live form (save for live demo)
- Code review, terminal windows, setup commands
- Any sponsor logos on screen (they're in the README, not the video)

### Technical tips
- Use `QuickTime Player` → File → New Screen Recording on Mac
- Record at 1920×1080, zoom the browser to 110% for readability
- Record in one take if possible — edits break pacing
- Export as H.264 .mp4, under 20MB for YouTube upload
- Upload as **Unlisted** — accessible to anyone with the link

### Narration
- Keep voice calm, kitchen-plain (match the product voice)
- Read the script once to time it — trim if over 2:45
- If no narration, use text overlays: each section header as a title card
