# Yaler — Agent-Native Mission Network for Independent Businesses

> **Build Club Hack Night Submission** | Hosted by Build Club with Gemini / Google DeepMind & Exa  
> **Submission Challenge Page:** [campus.buildclub.ai/challenges/01a00e7b-19e4-7dff-b891-bdef9784ee8a](https://campus.buildclub.ai/challenges/01a00e7b-19e4-7dff-b891-bdef9784ee8a)

---

## 🌐 Live Hosted Deployment (GCP Cloud Run)

Judges can test the live hosted production environment directly:

- **Frontend Application**: [https://yaler-frontend-48617502162.europe-west2.run.app](https://yaler-frontend-48617502162.europe-west2.run.app)
- **Backend Gateway & A2A Endpoint**: [https://yaler-backend-48617502162.europe-west2.run.app](https://yaler-backend-48617502162.europe-west2.run.app)
  - **A2A JSON-RPC 2.0**: `POST /api/a2a` ([Protocol Spec](docs/A2A-PROTOCOL.md))
  - **Direct GCP File Uploads**: `POST /api/upload`
  - **Suppliers Endpoint**: `GET /api/suppliers`

---

## 🎯 The Problem

Independent London cafés, restaurants, and food operators lose **£1,000s per day** when critical kitchen equipment breaks (refrigeration, extraction hoods, grease traps). Finding, vetting, negotiating, and supervising local technicians takes hours of manual stress during busy service shifts.

---

## 💡 The Solution

**Yaler** deploys autonomous buyer and supplier agents to resolve kitchen uptime emergencies end-to-end:

```text
Voice / Text Callout → Mandate Extraction → A2A Supplier Discovery → Policy Check & Commit
                     → Photo Evidence Verification → Zero-Knowledge Proof Receipt
```

*Gemini interprets intent and evaluates evidence; deterministic Go code enforces budgets, safety, and auditability. Gemini proposes; Go decides.*

---

## 🚀 Key Frontiers Built

1. **🎬 1-Click Guided Demo Tour & Hands-Free Voice Input**: Web Audio / Speech voice input for busy kitchen managers plus a 1-click guided demo tour.
2. **⚡ Gemini 2.5 Mandate Engine**: Converts messy speech/text into structured policy mandates with budget ceilings and SLAs.
3. **🤝 Agent-to-Agent (A2A) Protocol**: Standardized JSON-RPC 2.0 endpoint (`/api/a2a`) with cryptographic payload signing (`RSA-2048`).
4. **🛡️ Go Policy Guardrails**: Enforces hard budget ceilings, geographic postal boundaries, and mandatory safety escalations.
5. **☁️ Direct Cloud Storage Uploads**: Direct drag-and-drop photo evidence uploads to GCP Cloud Storage buckets.
6. **🔒 Zero-Knowledge Proof Receipts**: Gemini-verified evidence with automated PII privacy redaction.

---

## 🛠️ Sponsor Technologies Used

| Sponsor Technology | Integration & Usage |
|---|---|
| **Gemini / Google DeepMind** | Mandate extraction, supplier offer ranking, counter-offer drafting, photo evidence verification, and privacy redaction. |
| **GCP Cloud Run & Cloud Storage** | Serverless backend/frontend container deployment with Secret Manager binding and direct Cloud Storage bucket uploads. |
| **Vapi & Web Audio** | Hands-free voice callout creation for kitchen managers on the line. |
| **Exa & Apify** | Service provider web discovery & verification infrastructure. |

---

## ⚡ Quick Start (Local Docker Execution)

Zero GCP setup required for local evaluation:

```bash
git clone https://github.com/sneldao/yaler.git
cd yaler
docker-compose up --build
```

Open `http://localhost:4321` to interact with the mission network.

---

## 📚 Deep-Dive Documentation

For complete technical specifications, architecture diagrams, and product guides, see the `/docs` directory:

- 📖 [Product Brief & Problem Statement](docs/PRODUCT.md) — Problem, user personas, and product loop.
- 🏗️ [Architecture & System Design](docs/ARCHITECTURE.md) — Go, Astro, Gemini, Firestore, and Cloud Run architecture.
- 🤝 [Agent-to-Agent (A2A) Protocol Specification](docs/A2A-PROTOCOL.md) — JSON-RPC 2.0 schema and RSA signatures.
- 🛡️ [Agent Operating Model & Safety Guardrails](docs/AGENT-OPERATING-MODEL.md) — Policy boundaries and human escalations.
- 🗺️ [Market Strategy & Adjacent Whitespace](docs/STRATEGY.md) — London market analysis and pilot roadmap.
- 📋 [Kiro Spec-Driven Requirements](.kiro/specs/mission-loop/requirements.md) — Behavior and acceptance criteria.
- 📐 [Kiro Spec-Driven Design](.kiro/specs/mission-loop/design.md) — Domain model and system design.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
