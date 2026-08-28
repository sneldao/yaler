# Product brief

## One-line description

Yaler is an autonomous mission network that helps independent businesses get urgent operational work completed by coordinating demand-side and supply-side agents.

## The problem

A small restaurant or café can lose a service, a day's revenue, and customer trust because one piece of equipment fails or one operational task is missed. The business owner often has to:

- Describe a messy problem repeatedly.
- Search several providers.
- Wait for replies.
- Compare incomplete quotes.
- Negotiate timing and price.
- Coordinate access and arrival.
- Chase progress.
- Prove that the job was completed.

Local providers have the complementary problem: they have capacity but are difficult to discover at the exact moment a suitable job appears. They also spend time responding to poorly scoped requests and chasing payment or confirmation.

The problem is not merely supplier discovery. It is **reliable coordination after discovery**.

## The product

Yaler lets a business owner delegate an outcome rather than a sequence of administrative tasks.

Example mission:

> Our commercial fridge is down. Find a qualified local provider who can attend today, stay under £500, and give us a clear ETA. Escalate if no one accepts within 30 minutes.

Yaler's demand-side agent turns that into a structured mission. Supply-side agents represent local providers and respond with capability, availability, terms, and evidence. Yaler coordinates the mission until it is complete or requires human intervention.

## Users

### Demand-side operator

An independent café, restaurant, takeaway, or food business that needs an operational outcome.

They care about:

- Speed to resolution
- Cost and budget discipline
- Provider reliability
- Clear communication
- Minimal administrative work
- Evidence that the mission is complete

### Supply-side operator

A local repair, maintenance, cleaning, or equipment-service business.

They care about:

- Qualified leads
- Accurate job descriptions
- Control over price and availability
- Fewer wasted conversations
- A record of reliable completed work
- More repeat work from nearby businesses

### Yaler agent

The system that interprets the mission, discovers and communicates with counterpart agents, negotiates within constraints, schedules milestones, records evidence, and escalates exceptions.

## Adaptive diagnostic assistance

Yaler adapts the experience by role and job context without changing the underlying mandate or policy rules. Business managers get a short, voice- or text-first intake; engineers receive a concise diagnostic handoff with the original report, known facts, possible issue areas, and checks still required on site.

When useful, managers can attach guided photos before dispatch:

- Full unit — identify the equipment and surroundings.
- Display / error — capture temperatures or fault codes.
- Model plate — identify compatible parts and service documentation.

These inputs are contextual aids, not proof of a diagnosis. Yaler preserves the distinction between reported, observed, inferred, and confirmed information. Extracted signals such as a mentioned temperature or fault code retain their source and confidence label. Likely issue areas remain suggestions until an appropriately qualified engineer verifies them.

The service can progressively add source-backed research—model identification, error-code context, manufacturer documentation, likely parts, and certification requirements—while showing the source and confidence. Research should produce a short engineer-ready brief, not an unqualified repair instruction. Current image analysis is deliberately limited to readable/visible signals and remains advisory. Managers should be able to correct or dismiss an extracted observation; the original observation remains auditable rather than being silently overwritten. If analysis cannot extract a useful signal, Yaler may offer up to two optional, targeted follow-up captures (such as a display or model plate), never an open-ended questionnaire.

## Core workflow

```text
1. Create mission
2. Define mandate
3. Discover suitable supplier agents
4. Request and normalize offers
5. Compare offers against policy
6. Negotiate inside the mandate
7. Create a commitment or request approval
8. Track milestones asynchronously
9. Verify evidence
10. Complete, reroute, or escalate
11. Generate a proof receipt
```

## Three product primitives

### Mission

The outcome the demand side wants completed.

### Mandate

The boundaries inside which the agent may act:

- Budget
- Geography
- Deadline
- Quality requirements
- Required evidence
- Allowed actions
- Escalation conditions
- Expiration time

### Proof receipt

A concise, shareable record of what was requested, who accepted it, what happened, what evidence was supplied, and whether the mission completed.

## Autonomy modes

Yaler should support three modes, with delegated mode as the product's distinctive default:

### Observe

The agent researches and recommends. It does not contact or commit.

### Collaborate

The agent can contact suppliers and prepare actions, but requests approval before commitments.

### Delegate

The agent executes within the mandate and escalates only when it reaches a policy boundary, uncertainty threshold, or failure condition.

Autonomy is not the absence of control. It is control expressed as a mandate before execution.

## Differentiation

Yaler is not:

- A directory of AI agents.
- A generic chatbot for procurement.
- A local-services listing site.
- A payment rail.
- A full enterprise procurement suite.
- A platform that dispatches regulated work without verification.

Yaler is an **outcome-execution network** for fragmented, real-world capacity. Its differentiating asset is the mission and proof graph: which providers can do which work, under which conditions, with what observed reliability.

## Product principles

1. **Outcome over conversation.** A successful mission matters more than a fluent response.
2. **Bounded autonomy.** Every action is checked against a mandate.
3. **Evidence over assertion.** Completion requires explicit evidence or a clearly labelled human confirmation.
4. **Local before global.** Start with a small, curated London network.
5. **Supply dignity.** The system should help providers win better-scoped work, not merely squeeze prices.
6. **Human exceptions.** Humans handle safety, disputes, ambiguity, and policy changes.
7. **Open protocol, focused product.** Use interoperable agent messages, but own one concrete workflow.
8. **Adaptive clarity.** Reduce friction for the manager and uncertainty for the engineer; adapt detail to role, urgency, expertise, and evidence without hiding the rules.
9. **Kitchen English in the operator UI.** The product may be a mission network internally. The person with the broken fridge sees a job, a budget, an engineer, and a receipt. Protocol and model names belong in docs, not on buttons.
