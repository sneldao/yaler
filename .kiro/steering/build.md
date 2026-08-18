# Build and Run Instructions

These commands are the intended local path after Task 1. Do not treat `make`, `web/`, or `cmd/seed` as already present.

## Prerequisites

- Go 1.22+
- Node.js 20+ (for Astro frontend)
- Firebase CLI (`firebase`) — for Firestore emulator
- A Google AI Studio API key (Gemini)
- Google Cloud SDK (`gcloud`) — optional, only for Cloud Run deploy

## Quick start

```bash
# Clone and enter
git clone https://github.com/sneldao/yaler.git
cd yaler

# Install frontend dependencies
cd web && npm install && cd ..

# Copy environment template
cp .env.example .env
# Fill in GEMINI_API_KEY at minimum

# Start Firestore emulator
firebase emulators:start --only firestore

# In another terminal — seed supplier data
go run cmd/seed/main.go

# Start Go backend
make dev

# In another terminal — start Astro frontend
cd web && npm run dev
```

## Environment variables

```
GEMINI_API_KEY=             # Google AI Studio API key
GCP_PROJECT_ID=yaler-dev   # GCP project (can be placeholder for emulator)
FIRESTORE_EMULATOR_HOST=localhost:8080  # Set when using emulator
CLOUD_TASKS_EMULATOR=true  # Labelled direct worker call; not a Cloud Tasks queue
PORT=8081                   # Go server port
WEB_PORT=4321              # Astro dev server port
```

## Makefile targets

These are the targets Task 1 should create:

```bash
make dev        # Run Go server (air if available)
make build      # Build Go binary
make test       # Run all Go tests
make lint       # go vet, golangci-lint, gitleaks if installed
make hooks      # Install pre-commit + pre-push hooks
make assets     # Render favicon, icons, and og.png from SVG
make seed       # Seed Firestore with supplier data
make web        # Start Astro dev server
make deploy     # Optional Cloud Run deploy
```

## Testing

```bash
# Unit tests (no external deps)
go test ./internal/policy/... ./internal/domain/...

# Integration tests (requires Firestore emulator)
FIRESTORE_EMULATOR_HOST=localhost:8080 go test ./internal/store/...

# All tests
make test
```

## Local Cloud Tasks simulation

When `CLOUD_TASKS_EMULATOR=true`, the task client makes a **labelled direct HTTP call** to the worker. That is not a Cloud Tasks queue. Do not describe it as one in the UI, README, or demo video.

Missions execute immediately in local dev rather than with queue delay — faster for development and demos. Production deploy (Task 20, optional) must use a real queue if the submission claims Cloud Tasks.

## Deployment

Optional. A solid local + emulator path is enough to submit. Only deploy if Task 19 is green.

```bash
# Authenticate
gcloud auth login
gcloud config set project yaler-prod

# Deploy Go service
gcloud run deploy yaler-agent --source . --region europe-west2

# Deploy Astro (static or SSR)
cd web && npm run build
# Deploy built output to Cloud Run or static hosting
```

## Demo flow (for judges)

1. Start the app (backend + frontend).
2. Open `http://localhost:4321` in browser.
3. Create a mission: "My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
4. Confirm the generated mandate.
5. Watch the timeline as the agent sources suppliers, collects offers, ranks them, and commits.
6. See the milestone check trigger.
7. Submit evidence via the supplier link.
8. Watch the mission complete and generate a proof receipt.

The full flow runs in under 2 minutes with the local direct worker call. There is no login.

The submission demo video must be at most 3 minutes.
