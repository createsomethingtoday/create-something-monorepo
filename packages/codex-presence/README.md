# Codex Presence

`@create-something/codex-presence` is the deterministic observation and action
boundary between local Codex tasks and constrained operator interfaces.

It provides:

- bounded head/tail parsing of append-only Codex rollout files;
- canonical states and attention ranking based on explicit events;
- authenticated cards, detail, SSE, action, and transcription endpoints;
- state-bound, idempotent action receipts;
- an Even Terminal adapter that keeps its token server-side; and
- server-side G2 PCM/WAV transcription through OpenAI.

Start it with:

```bash
CODEX_PRESENCE_TOKEN="$(openssl rand -hex 24)" \
  pnpm --filter @create-something/codex-presence start
```

Optional environment:

- `CODEX_HOME` (default `~/.codex`)
- `CODEX_PRESENCE_PORT` (default `4782`)
- `CODEX_PRESENCE_ORIGIN` (exact browser origin allowed by CORS)
- `EVEN_TERMINAL_INSTANCES` (default `~/.even-terminal/instances`)
- `OPENAI_API_KEY` (required only for live transcription)

The service binds to loopback. A public or private relay is a separately
approved deployment boundary.
