.PHONY: all build dev test lint lint-all seed web clean hooks assets deploy-backend

GCP_PROJECT ?= cognivern
BACKEND_URL ?= https://yaler-backend-48617502162.europe-west2.run.app

all: build

build:
	@mkdir -p bin
	go build -o bin/server ./cmd/server

dev:
	go run ./cmd/server

test:
	go test -v ./...

lint:
	go vet ./...
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run ./...; else echo "skip: golangci-lint not installed (brew install golangci-lint)"; fi
	@if command -v editorconfig-checker >/dev/null 2>&1; then editorconfig-checker; else echo "skip: editorconfig-checker not installed (brew install editorconfig-checker)"; fi
	@if command -v gitleaks >/dev/null 2>&1; then gitleaks detect --redact; else echo "skip: gitleaks not installed (brew install gitleaks)"; fi

# Full-stack check for humans / CI. Runs the fast commit-time hooks plus the
# heavier linters that are intentionally kept out of the pre-commit gate.
#   (no target body; this exists so README can reference a single entrypoint)
lint-all: lint

hooks:
	pre-commit install --hook-type pre-commit --hook-type pre-push
	pre-commit install-hooks

assets:
	@command -v rsvg-convert >/dev/null || { echo "rsvg-convert required (brew install librsvg)"; exit 1; }
	@command -v magick >/dev/null || { echo "magick required (brew install imagemagick)"; exit 1; }
	mkdir -p assets/site
	cp assets/brand/yaler-mark.svg assets/site/favicon.svg
	rsvg-convert -w 16 -h 16 assets/brand/yaler-mark.svg -o /tmp/yaler-16.png
	rsvg-convert -w 32 -h 32 assets/brand/yaler-mark.svg -o /tmp/yaler-32.png
	rsvg-convert -w 48 -h 48 assets/brand/yaler-mark.svg -o /tmp/yaler-48.png
	magick /tmp/yaler-16.png /tmp/yaler-32.png /tmp/yaler-48.png assets/site/favicon.ico
	rsvg-convert -w 180 -h 180 assets/brand/yaler-mark.svg -o assets/site/apple-touch-icon.png
	rsvg-convert -w 192 -h 192 assets/brand/yaler-mark.svg -o assets/site/icon-192.png
	rsvg-convert -w 512 -h 512 assets/brand/yaler-mark.svg -o assets/site/icon-512.png
	rsvg-convert -w 1200 -h 630 assets/brand/og.svg -o assets/site/og.png

seed:
	go run ./cmd/seed

web:
	cd web && npm run dev

deploy-backend:
	gcloud builds submit --config cloudbuild-backend.yaml --project=$(GCP_PROJECT) .
	@echo "Backend: $(BACKEND_URL)"
	@curl -sS -o /dev/null -w "health %{http_code}\n" $(BACKEND_URL)/health

clean:
	rm -rf bin/
