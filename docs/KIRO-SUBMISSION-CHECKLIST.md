# Kiro Submission Checklist

**Deadline**: August 23, 2026, 23:59 UTC  
**Form**: https://forms.gle/xBLjk9nKMqbi2zie9

---

## Pre-Submission Verification

### ✅ Code works
- [ ] `docker-compose up --build` runs end-to-end
- [ ] Rehearsal flow works without any GCP credentials
- [ ] All synthetic supplier seed data loads
- [ ] N1 rehearsal is the first thing you see on the app
- [ ] No login wall — judges can access everything

### ✅ Kiro specs present
- [ ] `.kiro/specs/mission-loop/requirements.md` — 8 functional requirements
- [ ] `.kiro/specs/mission-loop/design.md` — domain model, state machine, policy contract
- [ ] `.kiro/specs/mission-loop/tasks.md` — 21 tasks, all checked off
- [ ] `.kiro/steering/project.md` — project context, constraints
- [ ] `.kiro/steering/conventions.md` — Go/Astro patterns, testing standards
- [ ] `.kiro/steering/build.md` — dev setup, Makefile, demo flow

### ✅ README explicitly shows Kiro usage
- [ ] "Built with Kiro" section added (✅ DONE)
- [ ] Links to specs, steering files
- [ ] Kiro-driven decisions documented
- [ ] Timeline showing spec → task → commit

### ✅ Demo video ready
- [ ] Script written ✅ (see `docs/DEMO-VIDEO-SCRIPT.md`)
- [ ] Screen recording completed
- [ ] YouTube upload (unlisted)
- [ ] Video ≤ 3 minutes
- [ ] Video link in README

### ✅ Submissions pass-or-fail criteria
- [ ] Public GitHub repo (https://github.com/sneldao/yaler)
- [ ] `.kiro/` directory present
- [ ] Complete README with setup instructions
- [ ] Working demo accessible without payment
- [ ] Demo video available without payment
- [ ] Testing instructions in README

---

## Submission Form Fields

When filling out https://forms.gle/xBLjk9nKMqbi2zie9:

| Field | Content |
|---|---|
| **Project name** | Yaler — Get the fridge fixed |
| **Repository URL** | https://github.com/sneldao/yaler |
| **Live demo URL** | https://yaler.persidian.com |
| **Demo video URL** | [YouTube unlisted link — to be filled after recording] |
| **One-line description** | An autonomous mission network: say what's broken, an agent finds/books/verifies a local engineer within your rules |
| **Problem solved** | Independent businesses lose thousands daily when critical equipment breaks. Finding, vetting, and supervising local technicians takes hours. |
| **How Kiro was used** | Spec-driven development: requirements.md → design.md → tasks.md → implementation. Steering files for conventions, build, and project context. 21 tasks tracked. See .kiro/ directory. |
| **Tech stack** | Go, Astro, React islands, Gemini (Google Gen AI SDK), Firestore, Cloud Tasks, Exa, Vapi, ElevenLabs, Apify |
| **Testing instructions** | `git clone`, `docker-compose up --build`, open localhost:4321, click "Start here — try a rehearsal" |

---

## Post-Submission

After submitting to Kiro:

1. **Push all changes** — make sure the README with Kiro section is on `main`
2. **Deploy the latest** — `git push origin main` triggers Netlify
3. **Verify the live site** — check https://yaler.persidian.com shows the updated README
4. **Share People's Choice link** — post to Build Club channels
5. **Submit to Build Club Campus** — same repo, different form
