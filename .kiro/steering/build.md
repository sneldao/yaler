# Build and Run Instructions

## V1 — Voice Loop

### Prerequisites

- Node.js 20+
- A Vapi account with a phone number configured
- A Google AI Studio API key (Gemini)
- ElevenLabs API key (or configured via Vapi voice settings)

### Setup

```bash
cd v1
npm install
cp .env.example .env
# Fill in API keys in .env
```

### Environment variables

```
GEMINI_API_KEY=         # Google AI Studio API key
VAPI_API_KEY=           # Vapi API key (for server-side operations)
ELEVENLABS_API_KEY=     # ElevenLabs API key (if using direct integration)
PORT=3000               # Local server port
```

### Run locally

```bash
npm run dev
```

For Vapi to reach the local server, expose it via ngrok or similar:

```bash
ngrok http 3000
```

Then configure the Vapi assistant's server URL to the ngrok HTTPS URL.

### Test without voice

The backend endpoint can be called directly for testing:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Commercial fridge is down, need repair ASAP",
    "budget": { "amount": 500, "currency": "GBP" },
    "deadline": "today",
    "location": "N1",
    "urgency": "immediate"
  }'
```

### Deploy (if needed)

For the hack night, local + ngrok is sufficient. If deploying:

```bash
# Vercel
npx vercel

# Or Cloudflare Workers
npx wrangler deploy
```

## V2 — Full Mission Loop (future)

V2 uses Go on Cloud Run. Build instructions will be added when V2 development begins.

```bash
cd yaler-agent
go build ./...
go test ./...
```
