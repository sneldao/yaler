# Talk to last Tuesday’s fridge

ElevenLabs Hosted MCP sprint. Sidecar to Yaler — **not** on `/` or `/rehearsal`.

You talk to the rehearsal paper: ceiling, the £80 stop, what the receipt would say. The agent cannot book.

Deadline context: 19 Aug 2026, 17:00. Outputs: a short demo video + this pipeline.

## Idea (20 seconds)

Hear the paper is one-way. This is two-way. Same stakeholder job (landlord / EHO / insurer / operator): *what were the rules, and why didn’t you book them?*

## Source

Ingest only:

- `docs/elevenagent/source.md` — mandate, three quotes, receipt, refusals
- `docs/elevenagent/system-prompt.md` — voice and hard rules

Do not ingest the whole repo. Do not invent a fourth engineer.

## Path A — Hosted MCP in Claude (preferred)

1. Claude Desktop → Settings → Connectors → **ElevenLabs** → Connect. OAuth. No API key in the repo.  
   Directory: [claude.ai/directory/connectors/elevenlabs](https://claude.ai/directory/connectors/elevenlabs)  
   Docs: [Hosted MCP](https://elevenlabs.io/docs/eleven-agents/operate/hosted-mcp)
2. Paste this prompt into Claude (attach or paste the two files above):

```text
Create an ElevenAgent named “Last Tuesday’s fridge”.
Use docs/elevenagent/system-prompt.md as the system prompt and first message.
Put docs/elevenagent/source.md in its knowledge base.
UK English, calm, kitchen-plain. No tools that book, pay, or dispatch.
Do not delete any existing agents.
When it exists, give me the shareable agent link.
```

3. Approve the create/update tool calls. Destructive deletes stay off.
4. Open the share link. Run the demo script below. Record 60–90s.

## Path B — REST (optional, same pack)

Needs `ELEVENLABS_API_KEY` in the environment. Never commit it.

```bash
export ELEVENLABS_API_KEY=...   # your account, not the repo
./scripts/elevenagent-ingest.sh
```

The script uploads `source.md` as a ConvAI knowledge document (`POST /v1/convai/knowledge-base/text`) and prints the document id. Create or update the agent in the ElevenLabs UI (or via Hosted MCP) and attach that document. Full agent-create JSON is version-sensitive; MCP is the supported way to set prompt + knowledge together.

## Demo script

1. “What’s the ceiling?” → £500.
2. “Why didn’t you book East London?” → £580 is £80 over. We stopped.
3. “Book them anyway.” → No. This call does not book. The number you set is the number.
4. Optional: “What would the paper say?” → ColdCare, £480, gauge at 3°C, rehearsal.

## What not to do

- Do not embed the ElevenLabs widget on `yaler.persidian.com` home or rehearsal.
- Do not give the agent live `createMission` or approve tools.
- Do not ingest `.env` or OPS.

## After you have a link

Paste the public agent URL into this file under **Live agent** and commit. Until then the pipeline is complete; the OAuth create step is on your ElevenLabs account.

## Live agent

_Not created in-repo. Add the share link here after Path A._
