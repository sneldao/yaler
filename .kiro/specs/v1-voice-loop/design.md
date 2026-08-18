# Design: V1 Voice Loop

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Caller    │────▶│   Vapi Agent     │────▶│   Backend   │
│  (Phone)    │◀────│  (Voice + LLM)   │◀────│  (Server)   │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │   Gemini    │
                                              │  (Ranking)  │
                                              └─────────────┘
```

## Component design

### 1. Vapi Assistant Configuration

The Vapi assistant is configured with:

- **System prompt:** Defines the agent persona (Yaler operations assistant), conversation flow, and extraction goals.
- **Voice:** ElevenLabs voice ID for natural output.
- **Function definitions:** One function `rankSuppliers` that Vapi calls when the mandate is complete.
- **First message:** A warm greeting that sets context.

#### Vapi system prompt (core logic)

```
You are Yaler, an AI operations assistant for London restaurants and cafés.
Your job is to help the caller get an urgent operational problem resolved quickly.

CONVERSATION FLOW:
1. Greet and ask what's wrong.
2. Extract: what the problem is, their budget, when they need it fixed by, and their location/postcode.
3. Confirm the details back to them.
4. Call the rankSuppliers function with the structured data.
5. Deliver the result naturally.

EXTRACTION RULES:
- If they don't mention budget, ask: "Do you have a budget in mind for this?"
- If they don't mention urgency, ask: "When do you need this sorted by?"
- If they don't mention location, ask: "What's your postcode or area?"
- Use sensible defaults: no budget stated after asking = "flexible", no deadline = "today"
- Convert informal time ("before lunch", "ASAP", "end of day") to structured urgency levels.

TONE:
- Professional but warm. Like a capable concierge, not a call center script.
- Keep responses brief. The caller is stressed and busy.
- Don't over-explain the system. Just get it done.
```

#### Vapi function definition

```json
{
  "name": "rankSuppliers",
  "description": "Find and rank available suppliers for the caller's operational problem",
  "parameters": {
    "type": "object",
    "properties": {
      "goal": {
        "type": "string",
        "description": "What the caller needs fixed or done"
      },
      "budget": {
        "type": "object",
        "properties": {
          "amount": { "type": "number" },
          "currency": { "type": "string", "default": "GBP" }
        },
        "required": ["amount"]
      },
      "deadline": {
        "type": "string",
        "description": "When it needs to be done by (e.g., 'today', 'within 2 hours', 'before 5pm')"
      },
      "location": {
        "type": "string",
        "description": "Postcode or area (e.g., 'N1', 'Shoreditch', 'EC2')"
      },
      "urgency": {
        "type": "string",
        "enum": ["immediate", "today", "this-week"]
      }
    },
    "required": ["goal", "budget", "deadline", "location", "urgency"]
  }
}
```

### 2. Backend Server

A single TypeScript server with one webhook endpoint.

#### Endpoint: `POST /webhook`

Receives Vapi's function call payload, calls Gemini, returns the result.

```typescript
// Simplified flow
async function handleRankSuppliers(mandate: Mandate): Promise<RankingResult> {
  const prompt = buildRankingPrompt(mandate, suppliers);
  const result = await callGemini(prompt);
  return result;
}
```

#### Response format back to Vapi

The server returns a string message that Vapi speaks to the caller:

- **Success:** "Great news — I've found CoolFix Refrigeration. They can be with you within 2 hours, and it should come in around £340. They specialise in commercial fridges and have a 92% reliability rating. Shall I confirm that?"
- **Escalation:** "I couldn't find anyone within your £200 budget — the closest option is £250 from Rapid Kitchen Repair. Would you like me to go ahead at that price, or would you prefer to adjust your budget?"

### 3. Gemini Ranking Logic

#### Input prompt structure

```
You are a supplier matching engine for urgent operational services.

MANDATE:
- Goal: {goal}
- Budget: {budget.amount} {budget.currency}
- Deadline: {deadline}
- Location: {location}
- Urgency: {urgency}

AVAILABLE SUPPLIERS:
{JSON array of 3 supplier profiles}

TASK:
Rank the suppliers by fit to this mandate. Consider:
1. Can they do this type of work? (capability match)
2. Do they cover this area? (service area match)
3. Can they arrive in time? (availability vs deadline)
4. Is their price within budget? (price range vs budget)
5. How reliable are they? (reliability score)

Return JSON:
{
  "rankings": [
    {
      "supplierId": "string",
      "rank": number,
      "score": number (0-100),
      "reasoning": "string",
      "estimatedPrice": number,
      "estimatedArrival": "string",
      "fits": boolean
    }
  ],
  "selectedSupplier": "supplierId or null",
  "escalation": {
    "needed": boolean,
    "reason": "string or null",
    "suggestion": "string or null"
  },
  "confirmationMessage": "string — what to tell the caller"
}
```

#### Output handling

- If `selectedSupplier` is not null → speak `confirmationMessage`
- If `escalation.needed` is true → speak the escalation reason and suggestion
- If Gemini returns malformed JSON → fallback to a safe error message

### 4. Supplier Data

Hardcoded in `suppliers.ts`. Three profiles designed to create interesting ranking scenarios:

- **CoolFix:** Mid-price, moderate speed, high reliability, narrow specialization
- **Metro Cool:** Higher price, slower, broader capability, wider area
- **Rapid Kitchen Repair:** Cheapest, fastest, highest reliability, narrower area

This creates natural trade-offs: the cheapest isn't always available, the fastest isn't always in area, etc.

### 5. Error handling

| Failure | Response to caller |
|---------|-------------------|
| Gemini API timeout | "I'm having a moment — let me try that again." (retry once, then fallback) |
| Gemini API error | "I'm not able to search right now. Can I take your number and call you back in 5 minutes?" |
| No suppliers fit | Escalation message with the closest option |
| Vapi can't reach server | Vapi fallback message: "We're experiencing a brief issue. Please try again in a moment." |

## Sequence diagram (happy path)

```
Caller: "Hi, my commercial fridge has broken down"
Agent: "I'm sorry to hear that. I can help find someone to fix it quickly.
        What's your budget for the repair?"
Caller: "Try to keep it under 500 quid"
Agent: "Got it. When do you need this sorted by?"
Caller: "Before the lunch rush — so within a couple of hours ideally"
Agent: "And what's your postcode or area?"
Caller: "We're in N1, just off Upper Street"
Agent: "Let me confirm — you need a commercial fridge repair, budget up to £500,
        within the next couple of hours, in the N1 area. Is that right?"
Caller: "Yes that's right"
Agent: [calls rankSuppliers function]
       [receives result from backend]
       "Great news — I've found Rapid Kitchen Repair. They can be with you within
        an hour, estimated cost around £280. They specialise in commercial
        refrigeration and have excellent reliability. Shall I confirm that booking?"
Caller: "Yes please"
Agent: "Done. Rapid Kitchen Repair will be with you within the hour. They'll call
        you on this number if they need access details. Is there anything else?"
Caller: "No that's perfect, thanks"
Agent: "Good luck with the lunch rush. Goodbye!"
```

## File structure

```
v1/
├── src/
│   ├── index.ts              — Express/Hono server, webhook endpoint
│   ├── types.ts              — Mandate, SupplierProfile, RankingResult types
│   ├── suppliers.ts          — 3 hardcoded supplier profiles
│   ├── prompts.ts            — Gemini prompt builder
│   └── gemini.ts             — Gemini API client wrapper
├── package.json
├── tsconfig.json
├── .env.example
└── vapi-config.json          — Vapi assistant configuration (for reference)
```
