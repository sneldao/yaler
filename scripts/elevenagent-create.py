#!/usr/bin/env python3
"""
Create the "Last Tuesday's fridge" ElevenAgent via the ConvAI REST API.
Reads docs/elevenagent/source.md (knowledge) and docs/elevenagent/system-prompt.md (prompt).
Prints the agent_id, share link, and widget snippet.

Usage:
  export ELEVENLABS_API_KEY=...
  python3 scripts/elevenagent-create.py
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://api.elevenlabs.io"


def request(method: str, path: str, api_key: str, data: dict | None = None) -> dict:
    url = f"{API_BASE}{path}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        sys.stderr.write(f"HTTP {e.code} on {method} {path}: {err}\n")
        sys.exit(1)


def main() -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.stderr.write("Error: ELEVENLABS_API_KEY is not set.\n")
        sys.exit(1)

    root = Path(__file__).resolve().parent.parent
    source_file = root / "docs" / "elevenagent" / "source.md"
    prompt_file = root / "docs" / "elevenagent" / "system-prompt.md"

    if not source_file.exists() or not prompt_file.exists():
        sys.stderr.write(f"Missing source or prompt in {root / 'docs' / 'elevenagent'}\n")
        sys.exit(1)

    source_text = source_file.read_text("utf-8")
    prompt_text = prompt_file.read_text("utf-8")

    first_msg = "This is last Tuesday’s fridge in N1. Nothing was booked. Ask me about the ceiling, the quotes, or the paper."

    print("1/3 Uploading knowledge base document...")
    doc_resp = request(
        "POST",
        "/v1/convai/knowledge-base/text",
        api_key,
        {
            "name": "Last Tuesday fridge source pack",
            "text": source_text,
        },
    )
    doc_id = doc_resp.get("id")
    print(f"    Document created: {doc_id}")

    print("2/3 Creating ElevenAgent 'Last Tuesday’s fridge'...")
    agent_body = {
        "name": "Last Tuesday’s fridge",
        "tags": ["yaler", "rehearsal", "hackathon"],
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": prompt_text,
                    "knowledge_base": [
                        {
                            "id": doc_id,
                            "type": "file",
                            "name": "Last Tuesday fridge source pack",
                        }
                    ],
                },
                "first_message": first_msg,
                "language": "en",
            },
            "tts": {
                "model_id": "eleven_turbo_v2",
                "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel (calm)
            },
            "conversation": {
                "max_duration_seconds": 300,
            },
        },
    }

    create_resp = request(
        "POST",
        "/v1/convai/agents/create",
        api_key,
        agent_body,
    )
    agent_id = create_resp.get("agent_id")
    print(f"    Agent created: {agent_id}")

    share_url = f"https://elevenlabs.io/app/talk-to?agent_id={agent_id}"

    print("3/3 Link ready.")
    print("")
    print("========================================")
    print(f"Agent ID:   {agent_id}")
    print(f"Share link: {share_url}")
    print("========================================")
    print("")
    print("Try the demo script on that link:")
    print("  1. 'What’s the ceiling?' -> £500")
    print("  2. 'Why didn’t you book East London?' -> £580 is £80 over.")
    print("  3. 'Book them anyway.' -> Refused.")


if __name__ == "__main__":
    main()
