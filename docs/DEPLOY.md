# Deploy

Two pipelines. Do not mix them.

| Layer | How it ships | URL |
| --- | --- | --- |
| Frontend | Push `main` → Netlify | [yaler.persidian.com](https://yaler.persidian.com) |
| Backend | Explicit `make deploy-backend` → Cloud Run | `https://yaler-backend-48617502162.europe-west2.run.app` |

Revisions change. That hostname does not. Never rotate `PUBLIC_API_URL` unless the *service* moves.

## Frontend

Netlify builds `web/` from `main`. Astro bakes `PUBLIC_API_URL` at build time from `netlify.toml`. A Cloud Run revision does **not** need a Netlify rebuild.

```bash
git push origin main
```

## Backend

Requires `gcloud` authenticated to project `cognivern`. Secrets live in Secret Manager (`gemini-api-key`, `elevenlabs-api-key`, `exa-api-key`, `apify-api-key`). The browser never sees them.

```bash
make deploy-backend
```

That runs `cloudbuild-backend.yaml`: build `Dockerfile.server`, push the image, `gcloud run deploy` the same service. Path-filter: do this when `cmd/`, `internal/`, `Dockerfile.server`, or seed data change — not for copy in `web/`.

```bash
curl -sS https://yaler-backend-48617502162.europe-west2.run.app/health
curl -sS "https://yaler-backend-48617502162.europe-west2.run.app/api/discovery?district=N1"
```

## Local

```bash
export $(grep -v '^#' .env | xargs) && make dev   # :8081
npm --prefix web run dev                          # :4321 → localhost:8081
```

## One API URL

Canonical production API:

```text
https://yaler-backend-48617502162.europe-west2.run.app
```

Set in `netlify.toml`, `web/netlify.toml`, and the `web/src/lib/api.ts` fallback. The hashed `*.a.run.app` host is the same service — do not treat it as a second backend.
