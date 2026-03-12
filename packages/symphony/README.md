# @create-something/symphony

Symphony is a long-running automation service that polls Linear, creates one workspace per issue,
and runs Codex app-server turns inside those isolated workspaces using a repository-owned
`WORKFLOW.md`.

This package implements the core Symphony service described in the OpenAI Symphony spec:
[SPEC.md](https://github.com/openai/symphony/blob/main/SPEC.md).

## Safety Posture

This implementation targets a high-trust local operator environment:

- approval policy defaults to `never`
- thread sandbox defaults to `danger-full-access`
- turn sandbox policy defaults to `{ "type": "dangerFullAccess" }`
- command/file approvals are auto-approved for the session
- user-input-required events fail the current run attempt immediately
- unsupported dynamic tool calls are rejected and the session continues

That posture is intentionally explicit. If you need a stricter harness, set safer Codex values in
`WORKFLOW.md`.

## Usage

```bash
pnpm --filter @create-something/symphony build
pnpm exec symphony ./WORKFLOW.md
```

Optional flags:

```bash
pnpm exec symphony ./WORKFLOW.md --once
pnpm exec symphony ./WORKFLOW.md --port 4000
```

## WORKFLOW.md

Symphony reads runtime config from YAML front matter and uses the Markdown body as the prompt
template.

```md
---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: my-project
polling:
  interval_ms: 30000
workspace:
  root: ./.symphony-workspaces
agent:
  max_concurrent_agents: 4
---

You are working issue {{ issue.identifier }}: {{ issue.title }}
```
