# Yaler

**Yaler** is an agent-native mission network for independent businesses.

> A buyer's agent finds, negotiates with, and supervises a local operator's agent until a real-world job is complete or safely escalated.

Yaler is deliberately starting with one narrow London workflow: helping independent cafés, restaurants, and food businesses resolve urgent operational jobs through local service providers. The first mission is likely commercial kitchen uptime: equipment repair, cleaning, maintenance, or replacement coordination.

This repository is a greenfield build for the All Things Agentic Hackathon. The product is not a general agent directory, a generic procurement chatbot, or a payment protocol. It is a durable mission-execution layer for messy, local, real-world work.

## Start here

1. [Product brief](docs/PRODUCT.md) — the problem, users, product loop, and differentiation.
2. [Market and strategy](docs/STRATEGY.md) — adjacent products, whitespace, and the Thiel/P.G. analysis.
3. [Scope](docs/SCOPE.md) — the hackathon-sized MVP and explicit non-goals.
4. [Architecture](docs/ARCHITECTURE.md) — Astro, Go, Gemini, Firestore, Cloud Tasks, and Cloud Run.
5. [Agent operating model](docs/AGENT-OPERATING-MODEL.md) — mandates, autonomy, messages, evidence, and escalation.
6. [Roadmap](docs/ROADMAP.md) — validation, implementation, onboarding, and submission milestones.
7. [Validation and onboarding](docs/VALIDATION.md) — how to recruit London pilot participants quickly and ethically.
8. [Decisions](docs/DECISIONS.md) — choices made and questions intentionally left open.

## Product thesis

Most agent products stop at answering a question, finding a provider, or handing work to another agent. Yaler owns the harder part: the mission after the match.

A Yaler mission moves through:

```text
Goal → mandate → supplier discovery → offers → negotiation → commitment
     → milestones → evidence → completion or escalation → proof receipt
```

Gemini interprets language, compares offers, extracts evidence, and proposes actions. Deterministic Yaler code enforces budgets, permissions, state transitions, retries, and auditability.

## Hackathon positioning

- **Track:** Taskmaster
- **Core demonstration:** one delegated mission completed by demand-side and supply-side agents without a human approving every step.
- **Google stack:** Gemini through the Google Gen AI SDK, Google Cloud Run, Firestore, Cloud Tasks, Cloud Storage, Secret Manager, and Cloud Logging.
- **Frontend:** Astro with React islands.
- **Backend:** Go mission gateway and orchestrator.
- **Initial geography:** London.
- **Initial vertical:** independent hospitality operational uptime.

## Product boundaries

Yaler's MVP uses simulated or explicitly labelled test commitments. It does not hold money, provide regulated financial advice, dispatch unsafe work without required credentials, or claim to replace qualified professionals.

The first demo should use low-risk operational missions. Gas, electrical, structural, and other regulated work must be escalated for human verification rather than autonomously dispatched.

## Working principles

- Start with one painful outcome, not a broad marketplace.
- Build the mission loop before building an open agent platform.
- Use bounded autonomy: agents act inside a mandate and escalate exceptions.
- Keep model decisions separate from deterministic policy enforcement.
- Treat proof of completion as a product output, not an analytics afterthought.
- Onboard a small curated network manually before opening self-serve registration.
- Do not add payments, WhatsApp, or a complex agent registry before the core workflow works.
