# Conventions

## Go backend

- Go 1.22+ with modules.
- Use strict typing — define domain types in a `domain/` package.
- Package layout follows standard Go project structure:
  - `cmd/` — entry points (gateway, worker if split)
  - `internal/` — application logic not exported
  - `internal/domain/` — mission, mandate, offer, event types
  - `internal/policy/` — deterministic policy engine
  - `internal/gemini/` — Gemini API client and prompt builders
  - `internal/store/` — Firestore data access
  - `internal/tasks/` — Cloud Tasks integration
  - `internal/handler/` — HTTP handlers
- Name files in snake_case: `mission_handler.go`, `policy_engine.go`.
- Name types in PascalCase: `Mission`, `Mandate`, `SupplierOffer`.
- Name functions in PascalCase (exported) or camelCase (unexported).
- Use `context.Context` for all operations that touch external services.
- Return errors explicitly — no panics in application code.
- Use table-driven tests.

## Astro frontend

- Astro 4+ with React islands.
- Keep pages in `src/pages/`, components in `src/components/`.
- React islands are in `src/components/islands/` — only used for stateful interactions.
- Static/server-rendered pages for: landing, supplier cards, proof receipts.
- Use Tailwind CSS for styling.
- Name component files in PascalCase: `MissionTimeline.tsx`, `OfferComparison.tsx`.
- Name utility files in kebab-case: `api-client.ts`, `format-currency.ts`.

## Project structure

```
yaler/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── domain/
│   ├── policy/
│   ├── gemini/
│   ├── store/
│   ├── tasks/
│   └── handler/
├── web/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   └── islands/
│   │   └── layouts/
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   └── package.json
├── seed/
│   └── suppliers.json
├── docs/
├── .kiro/
├── Makefile
├── go.mod
├── go.sum
├── .env.example
└── README.md
```

## Environment variables

- Never commit secrets. Use `.env` files locally, Secret Manager in production.
- Document all required env vars in `.env.example` with placeholder values.
- Required for local Kiro demo: `GEMINI_API_KEY`, `FIRESTORE_EMULATOR_HOST`, `CLOUD_TASKS_EMULATOR=true`.
- `GCP_PROJECT_ID` may be a placeholder when using the emulator.

## Kiro-slice conventions

- No authentication in handlers for the judge demo.
- Evidence is Firestore metadata unless a later task adds Cloud Storage.
- Local task dispatch is a labelled direct worker call, never described as a queue.
- Collaborate / Observe may exist as mandate enum values; do not build their consoles before Delegate plus one escalation path works.

## Gemini usage

- Always use structured output (JSON mode) for responses that feed into application logic.
- Keep prompts in `internal/gemini/prompts.go`, not inline in handlers.
- Include the mandate as structured context, not as part of a conversational prompt.
- Log Gemini inputs and outputs during development for debugging.
- Gemini never mutates state directly — it returns a typed proposal that the policy engine validates.

## Git

- Commit messages: imperative mood, concise. E.g., "Add policy engine budget check", "Wire Cloud Tasks to mission worker".
- Keep commits small and focused. One logical change per commit.
- The `.kiro/` directory is committed and maintained as a project artifact.
- Install hooks with `make hooks`. Never commit `.env` or live API keys. Gitleaks and `detect-private-key` must pass.

## Brand

- Visual system: [docs/BRAND.md](../../docs/BRAND.md).
- Site icons and metadata: `assets/site/`. Do not invent a second mark.

## Error handling

- Go: return `error` from all fallible operations. Wrap with context using `fmt.Errorf("doing X: %w", err)`.
- Never swallow errors silently.
- API responses use structured error types with codes.
- Mission failures are recorded as events, not HTTP errors.

## Testing

- Policy engine: comprehensive unit tests (table-driven).
- Handlers: integration tests with Firestore emulator.
- Gemini prompts: test with recorded fixtures to avoid API calls in CI.
- State machine: test every valid transition and verify invalid ones are rejected.
