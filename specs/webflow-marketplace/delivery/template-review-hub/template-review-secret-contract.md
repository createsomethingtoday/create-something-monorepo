# Template Review Secret Contract

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `execution-isolation-and-sandbox-policy.md`, `published-site-sandbox-lane.md`, `review-orchestration-model.md`

## Purpose

Template review automation uses secrets in the coordinator/orchestrator layer, not in generated evidence artifacts and not inside submitted-site browser code.

The important distinction is:

- the coordinator may use secrets to call Airtable, OpenAI, Dify, E2B, D1, R2, or Webflow APIs
- the sandbox runner that renders an untrusted published URL must not receive those secrets

## Infisical Source

Use Infisical for local and CI execution:

```bash
infisical run --env=prod --path=/ --include-imports=true -- <command>
```

Current expected secret names:

| Secret | Used by | Sandbox runner receives it? |
| --- | --- | --- |
| `AIRTABLE_API_KEY` | Airtable read/calibration and reviewer MCP server | no |
| `OPENAI_API_KEY` | Subjective judge panel and eval runners | no |
| `E2B_API_KEY` | Direct E2B orchestration, if used outside Dify | no |
| `DIFY_E2B_API_KEY` | Dify/E2B provider setup or smoke support, when applicable | no |
| `MCP_API_KEY` | MCP worker boundary bearer auth | no |
| D1/R2 credentials | Artifact persistence and ledger import outside sandbox | no |

## Secret Placement

Allowed:

- shell environment for orchestrator commands
- Worker secrets for deployed MCP/API surfaces
- Dify provider configuration for the E2B builtin
- CI secret environment for smoke tests

Not allowed:

- generated Python sandbox runner
- sandbox job JSON
- screenshot/network/html artifacts
- normalized evidence JSONL
- review findings
- reviewer feedback text
- prompt-visible user messages

## Safe Presence Check

Use exit-code checks and suppress stdout/stderr:

```bash
for key in E2B_API_KEY DIFY_E2B_API_KEY OPENAI_API_KEY AIRTABLE_API_KEY; do
  if infisical secrets get "$key" --env=prod --path=/ --plain >/dev/null 2>/dev/null; then
    printf '%s=present\n' "$key"
  else
    printf '%s=not_found_or_no_access\n' "$key"
  fi
done
```

Do not print secret values to logs, documents, review artifacts, or agent responses.

## Sandbox Boundary

The published-site sandbox runner must be able to run with no secret-bearing environment variables. If a future direct E2B adapter is added, the adapter should use `E2B_API_KEY` to create and manage the sandbox from the coordinator process, then upload or execute the evidence runner without copying `E2B_API_KEY` into the sandbox code or output.

If the sandbox requires package installation, use the generated bootstrap command. The bootstrap command must not contain secrets.

The direct E2B adapter may also use `DIFY_E2B_API_KEY` as a fallback when that is the only E2B credential exposed to the coordinator process. This fallback is still coordinator-only; it must not be forwarded into the generated runner or output artifacts.
