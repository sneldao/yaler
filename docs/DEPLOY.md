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

### Durable diagnostic media

Production diagnostic uploads use a private Google Cloud Storage bucket. The
recommended bucket is `cognivern-yaler-diagnostic-media` in `europe-west2`.
The Cloud Run runtime service account needs object creator and viewer access;
no service-account key belongs in the repository.

One-time setup (run only after confirming the bucket name and IAM principal):

```bash
gcloud storage buckets create gs://cognivern-yaler-diagnostic-media \
  --project=cognivern --location=europe-west2 --uniform-bucket-level-access
RUNNER=$(gcloud run services describe yaler-backend --region=europe-west2 \
  --project=cognivern --format='value(status.template.spec.serviceAccountName)')
gcloud storage buckets add-iam-policy-binding gs://cognivern-yaler-diagnostic-media \
  --member="serviceAccount:${RUNNER}" --role=roles/storage.objectCreator
gcloud storage buckets add-iam-policy-binding gs://cognivern-yaler-diagnostic-media \
  --member="serviceAccount:${RUNNER}" --role=roles/storage.objectViewer
```

Set `MEDIA_STORAGE=gcs` and `MEDIA_BUCKET=cognivern-yaler-diagnostic-media`
on Cloud Run. Local development keeps `MEDIA_STORAGE` unset and uses `./uploads`.
Uploads are private object references; diagnostic analysis reads them through
the backend storage abstraction rather than fetching arbitrary URLs.

```bash
make deploy-backend
```

That runs `cloudbuild-backend.yaml`: build `Dockerfile.server`, push the image, `gcloud run deploy` the same service. Path-filter: do this when `cmd/`, `internal/`, `Dockerfile.server`, or seed data change — not for copy in `web/`.

### Cloud Tasks queue (production async spine)

The backend runs mission steps through a task client. Local dev uses an
in-process direct client; production enqueues on a real Cloud Tasks queue so
a sourcing mission can wait for a real quote and resume when the concierge
enters one — the step survives across requests and scale-to-zero.

One-time setup (create the queue + give the service account invoke rights):

```bash
QUEUE=projects/cognivern/locations/europe-west2/queues/yaler-missions
gcloud tasks queues create yaler-missions --location=europe-west2
# Retry config: 5 attempts, exponential backoff 10s→10min.
gcloud tasks queues update yaler-missions --location=europe-west2 \
  --max-attempts=5 --max-backoff=600s --max-doublings=3
# Let the Cloud Run service account invoke itself.
RUNNER=$(gcloud run services describe yaler-backend --region=europe-west2 --format='value(status.template.spec.serviceAccountName)')
gcloud tasks queues add-iam-policy-binding yaler-missions --location=europe-west2 \
  --member="serviceAccount:${RUNNER}" --role='roles/cloudtasks.enqueuer'
```

Then set these env vars on the Cloud Run service (via `cloudbuild-backend.yaml`
`--set-env-vars` or `gcloud run services update --set-env-vars`):

```text
CLOUD_TASKS_EMULATOR=false
CLOUD_TASKS_QUEUE=projects/cognivern/locations/europe-west2/queues/yaler-missions
CLOUD_TASKS_TARGET=https://yaler-backend-48617502162.europe-west2.run.app/api/worker/step
# CLOUD_TASKS_SA is optional; unset => the service's runtime account is used.
```

The server fails to start if `CLOUD_TASKS_EMULATOR=false` without these —
that's a deliberate fail-loud guard. Locally, leave `CLOUD_TASKS_EMULATOR=true`
and no queue is needed.

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
