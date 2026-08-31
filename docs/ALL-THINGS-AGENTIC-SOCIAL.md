# All Things Agentic Hackathon — Social & Content Bonus

## Social media post (X / LinkedIn)

> We built Yaler for the #AllThingsAgenticHackathon — an autonomous agent that books real-world kitchen repairs.
>
> A café manager says "fridge down, budget £500, N1, before lunch." Gemini 3.5 Flash extracts the mandate. A Go policy engine enforces hard boundaries. The agent sources suppliers, ranks offers, refuses over-budget quotes, books the engineer, verifies photo evidence, and issues a shareable proof receipt.
>
> The operator UI is a paper receipt, not a chatbot. Gemini proposes; Go decides.
>
> Live: https://yaler.persidian.com
> Code: https://github.com/sneldao/yaler
> Built on Google Cloud: Cloud Run, Cloud Tasks, Firestore, Gemini 3.5 Flash.
>
> #AllThingsAgenticHackathon

## Blog post outline (dev.to or medium.com)

**Title:** Building an Autonomous Kitchen Repair Agent with Gemini 3.5 Flash and Google Cloud

**Required disclaimer (must include):**
> I created this blog post for the purposes of entering the All Things Agentic Hackathon.

**Outline:**

1. **The problem** — Independent London cafés lose £1,000s/day when kitchen equipment breaks. Finding a qualified engineer takes hours of phone tag during a busy service shift.
2. **The approach** — An autonomous agent that takes a goal, makes a plan, and carries it out: source → rank → book → verify → receipt. The operator UI is a paper receipt, not a chatbot.
3. **The architecture** — Gemini 3.5 Flash for interpretation (mandate extraction, offer ranking, evidence verification). Go policy engine for deterministic enforcement (budget ceilings, postal boundaries, safety escalations). Cloud Run for compute, Cloud Tasks for async mission steps, Firestore for append-only state, Cloud Storage for evidence.
4. **The key design decision: Gemini proposes, Go decides** — The model never mutates state directly. It proposes typed actions; a pure-function policy engine validates every proposal. This made the agent trustworthy enough to let it spend real money inside boundaries.
5. **The over-budget stop** — The strongest moment in the demo. An agent that *refuses* to spend is more credible than one that always complies.
6. **What we learned** — Mandate-as-data is the right abstraction. Seeded replay mode makes the demo bulletproof. Paper UI > dark console for this audience.
7. **What's next** — Vertex AI migration, real supplier roster, outbound notifications.

**Posting instructions:**
- Post on dev.to or medium.com (public, not unlisted)
- Include the disclaimer above
- Link to the repo and live app
- Share the post URL in the Devpost submission under "Published content"
