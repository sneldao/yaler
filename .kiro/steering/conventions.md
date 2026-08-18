# Conventions

## Code style

- TypeScript for V1 backend (single file or minimal structure).
- Use strict TypeScript — no `any` types, explicit return types on functions.
- Prefer `const` over `let`. No `var`.
- Use async/await over raw promises.
- Name files in kebab-case: `supplier-ranker.ts`, `mandate-extractor.ts`.
- Name types/interfaces in PascalCase: `Mandate`, `SupplierProfile`, `RankingResult`.
- Name functions and variables in camelCase.

## Project structure (V1)

```
v1/
  src/
    index.ts          — entry point / server
    suppliers.ts      — hardcoded supplier data
    prompts.ts        — Gemini prompt templates
    types.ts          — TypeScript type definitions
  package.json
  tsconfig.json
  .env.example
```

## Environment variables

- Never commit secrets. Use `.env` files locally, Secret Manager in production.
- Document all required env vars in `.env.example` with placeholder values.
- Prefix with `YALER_` for application-specific vars where practical.

## Gemini usage

- Always use structured output (JSON mode) for Gemini responses that feed into application logic.
- Keep prompts in a dedicated file, not inline in handlers.
- Include the mandate as structured context, not as part of a conversational prompt.
- Log Gemini inputs and outputs during development for debugging.

## Git

- Commit messages: imperative mood, concise. E.g., "Add supplier ranking prompt", "Wire Vapi webhook to Gemini".
- Branch naming: `v1/feature-name` for V1 work, `v2/feature-name` for V2 work.
- Keep commits small and focused. One logical change per commit.

## Error handling

- Fail gracefully in the voice loop — if Gemini fails, tell the caller "I'm having trouble right now, let me connect you to a human" rather than crashing.
- Log errors with context (what was attempted, what input was provided).
- Never expose raw error messages to callers.

## Documentation

- Update `docs/DECISIONS.md` when making a non-obvious technical choice.
- Keep README.md focused on setup and running instructions.
- Architecture and product decisions live in `docs/`.
