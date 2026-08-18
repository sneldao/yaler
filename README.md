# Yaler

**Yaler** is an agent-native mission network for independent businesses.

> A buyer's agent finds, negotiates with, and supervises a local operator's agent until a real-world job is complete or safely escalated.

Yaler starts with one narrow London workflow: helping independent cafés, restaurants, and food businesses resolve urgent operational jobs through local service providers. The first mission class is low-risk commercial kitchen uptime: equipment repair, cleaning, maintenance, or replacement coordination.

## 🚀 Live Hosted Deployment (GCP Cloud Run)

Judges can interact with the live hosted production environment directly in addition to local docker execution:

- **Frontend Application**: [https://yaler-frontend-48617502162.europe-west2.run.app](https://yaler-frontend-48617502162.europe-west2.run.app)
- **Backend Gateway & A2A Endpoint**: [https://yaler-backend-48617502162.europe-west2.run.app](https://yaler-backend-48617502162.europe-west2.run.app)
  - **A2A JSON-RPC 2.0**: `POST /api/a2a` ([Documentation](docs/A2A-PROTOCOL.md))
  - **Direct Uploads**: `POST /api/upload`
  - **Suppliers**: `GET /api/suppliers`

## Current milestone

Yaler is being built for the [Ready, Spec, Ship Kiro Hackathon](https://codingagents.fyi/hackathon/kiro/), with submissions due **August 23, 2026 at 23:59 UTC**.

The primary deliverable is a working, judge-runnable mission kernel. A buyer creates a mission, reviews the generated mandate, delegates execution, watches supplier offers and policy decisions, submits or reviews evidence, and receives a proof receipt. Worker steps record that work in a durable event timeline. See [docs/SCOPE.md](docs/SCOPE.md) for what ships by 23 August versus what waits.

The repository is also the foundation for a later agentic hackathon submission and a real London customer pilot.

## What is demonstrated

A Yaler mission moves through:

```text
Goal → mandate → supplier discovery → offers → negotiation → commitment
     → milestones → evidence → completion or escalation → proof receipt
```

Gemini interprets language, compares offers, drafts counteroffers, and extracts evidence. Deterministic Go code enforces budgets, permissions, state transitions, retries, and auditability. Gemini proposes; Go decides.

## Technology

- **Frontend:** Astro with React islands
- **Backend:** Go mission gateway and worker
- **LLM:** Gemini through the Google Gen AI Go SDK
- **State:** Firestore
- **Async execution:** Cloud Tasks in production; labelled direct worker calls locally (`CLOUD_TASKS_EMULATOR=true`)
- **Evidence:** Firestore metadata (text plus optional labelled fixture). Cloud Storage is post-submission.
- **Deployment:** Local emulator path is required. Cloud Run is optional if that path is solid.
- **Secrets:** `.env` locally; Secret Manager when deployed
- **Observability:** Structured mission events; Cloud Logging when deployed

## Repository guide

1. [Product brief](docs/PRODUCT.md) — problem, users, product loop, and differentiation.
2. [Market and strategy](docs/STRATEGY.md) — adjacent products, whitespace, and strategic analysis.
3. [Scope](docs/SCOPE.md) — MVP workflow, screens, acceptance criteria, and non-goals.
4. [Architecture](docs/ARCHITECTURE.md) — Go, Astro, Gemini, Firestore, Cloud Tasks, and Cloud Run.
5. [Agent operating model](docs/AGENT-OPERATING-MODEL.md) — mandates, autonomy, messages, evidence, and escalation.
6. [Roadmap](docs/ROADMAP.md) — Kiro hackathon plan and follow-on pilot.
7. [Validation and onboarding](docs/VALIDATION.md) — Horizon 2 pilot recruitment. Not required before the Kiro deadline.
8. [Decisions](docs/DECISIONS.md) — technical and product decisions plus open questions.
9. [Brand](docs/BRAND.md) — mark, palette, favicon, and site metadata.
10. [Mission-loop requirements](.kiro/specs/mission-loop/requirements.md) — behavior and acceptance criteria.
11. [Mission-loop design](.kiro/specs/mission-loop/design.md) — domain model and system design.
12. [Mission-loop tasks](.kiro/specs/mission-loop/tasks.md) — implementation sequence.
13. [Kiro steering](.kiro/steering/) — project context, conventions, and build instructions.

## Quick start

### Prerequisites

These commands describe the intended local path. They will work after Task 1 scaffolds the repo. Until then this section is the target, not a claim that `make` and `web/` already exist.

- Go 1.22+
- Node.js 20+
- Firebase CLI, for the Firestore emulator
- Gemini API key from Google AI Studio
- Google Cloud SDK only if you deploy (optional)

### Local setup

```bash
git clone https://github.com/sneldao/yaler.git
cd yaler

cp .env.example .env
# Set GEMINI_API_KEY in .env

cd web
npm install
cd ..

firebase emulators:start --only firestore
```

In a second terminal:

```bash
make seed
make dev
```

In a third terminal:

```bash
cd web
npm run dev
```

Open `http://localhost:4321`. The complete local demo flow is:

1. Create a mission from natural language.
2. Review and confirm the generated mandate.
3. Start delegated execution.
4. Watch supplier discovery, offers, ranking, and policy checks in the timeline.
5. Submit milestone evidence.
6. View completion and the redacted proof receipt.

Set `CLOUD_TASKS_EMULATOR=true` to invoke worker steps with a **labelled direct call**. That is not a Cloud Tasks queue. Production enqueueing is a separate, optional deploy path. See [.kiro/steering/build.md](.kiro/steering/build.md) for environment variables, tests, and deployment notes.

There is no login. The local app uses a single implicit demo buyer.

## Hooks, secrets, and lint

Install once after clone:

```bash
make hooks
```

That installs `pre-commit` and `pre-push` hooks. Every commit runs Gitleaks, a `.env` block, `gofmt` / `go vet`, golangci-lint, EditorConfig, and the usual pre-commit hygiene checks. Push re-runs the same set.

```bash
pre-commit run --all-files
make lint
```

Do not commit `.env`. `.env.example` is the only env file that belongs in git.

## Brand and site metadata

Canonical favicon, icons, Open Graph image, and web manifest live in `assets/`. See [docs/BRAND.md](docs/BRAND.md). Copy `assets/site/` into `web/public/` when the Astro app is scaffolded.

```bash
make assets
```

## Testing

```bash
make test
```

Policy and domain tests run without external services. Firestore integration tests use the emulator. Gemini tests use recorded fixtures rather than requiring a live model call in CI.

## Kiro and spec-driven development

This project is intentionally built with Kiro's spec-driven workflow:

```text
requirements → design → tasks → implementation → tests → demo
```

The `.kiro/` directory is a committed project artifact, not generated documentation:

- `.kiro/steering/` keeps project context, stack conventions, and build instructions available during implementation.
- `.kiro/specs/mission-loop/requirements.md` defines the behavior and acceptance criteria.
- `.kiro/specs/mission-loop/design.md` defines the architecture, domain model, policy boundary, and execution model.
- `.kiro/specs/mission-loop/tasks.md` decomposes the feature into testable implementation increments.

The demo video (at most 3 minutes) and README should make clear which work was directed through these artifacts and how they shaped the implementation.

## Third-party services, cost, and limits

Judges need only a Google AI Studio Gemini API key for the model. The Firestore emulator is free and local.

| Service | Required to run locally? | Cost / limits notes |
|---|---|---|
| Gemini (Google AI Studio) | Yes, for live mandate/ranking/evidence. Fixture tests run without it. | Free-tier API key. Rate limits apply; the app times out at 30s and retries once. |
| Firestore emulator | Yes | Free, local. No GCP project required. |
| Cloud Tasks | No | Local mode is a direct worker HTTP call, labelled as a simulation. |
| Cloud Run / Secret Manager / Cloud Storage | No | Optional deploy. Not required to evaluate the kernel. |
| Firebase Authentication | No | Not used in the Kiro demo. |

Do not commit API keys. Copy `.env.example` to `.env`.

## Synthetic data and product boundaries

The repository uses three clearly labelled synthetic London supplier profiles so the end-to-end workflow is reproducible. The coordination system, policy enforcement, state machine, async execution, evidence flow, and receipt generation are genuine; the seed providers are not presented as real businesses.

Yaler's MVP does not hold money, provide regulated financial advice, or autonomously dispatch gas, electrical, structural, or other unsafe work. Such categories always escalate for human verification. Public proof receipts are redacted and opt-in.

## Follow-on work

After the Kiro submission, the system can be extended with:

- A Vapi + ElevenLabs voice mission-creation channel
- A2A-compatible external supplier endpoints
- Mobile-first supplier onboarding and evidence submission
- Cloud Storage uploads and Firebase Authentication
- Real provider verification and London pilot missions ([docs/VALIDATION.md](docs/VALIDATION.md))
- Repeat-mission automation and referral links

## License

See [LICENSE](LICENSE).
