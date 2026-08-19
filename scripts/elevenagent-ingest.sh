#!/usr/bin/env bash
# Upload the fridge source pack to ElevenLabs ConvAI knowledge base.
# Does not create the agent (use Hosted MCP in Claude for that).
set -euo pipefail

if [ -z "${ELEVENLABS_API_KEY:-}" ]; then
  echo "Set ELEVENLABS_API_KEY in the environment. Do not put it in the repo." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/docs/elevenagent/source.md"
if [ ! -f "$SOURCE" ]; then
  echo "missing $SOURCE" >&2
  exit 1
fi

BODY="$(python3 -c 'import json,sys; print(json.dumps({"text": sys.stdin.read(), "name": "Last Tuesday fridge source"}))' < "$SOURCE")"

curl -sS -X POST "https://api.elevenlabs.io/v1/convai/knowledge-base/text" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$BODY"
echo
echo "Attach that document to the ElevenAgent. Prompt: docs/elevenagent/system-prompt.md"
