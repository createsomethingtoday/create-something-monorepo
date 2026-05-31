# Dify Braintrust Eval Completion Runbook

This runbook is the operator handoff for completing Dify agent evals in
Braintrust. It is also the shareable process summary for Braintrust-facing
conversations: Dify is the runtime under test, Braintrust is the eval system of
record, Infisical supplies per-agent Service API keys, and this repo binds the
agent contract to policy and evidence.

## Shareable Summary

CREATE SOMETHING evaluates Dify agents through Braintrust eval files in
`evals/braintrust/dify/`. The evals call Dify's Service API, capture final
answers, tool calls, Dify message and conversation IDs, usage metadata, and
latency, then score the result against repo-owned gates such as API health,
expected tool use, forbidden tool avoidance, secret refusal, write confirmation,
policy boundaries, and trace identifiers.

Secrets stay outside the repo. Each Dify agent declares its Service API key
reference in `config/dify/inventory.json`, and evals resolve that key from the
local process environment first, then from Infisical using the declared
environment, path, and secret key. Evidence recorded for a completed eval should
name the Infisical reference, command, Braintrust project/experiment/run, Dify
trace IDs, git commit or worktree state, and Linear issue. It must not include
secret values or raw private traces. For external Braintrust-facing shares,
describe the Infisical pattern and redact exact path/key names unless those
references are explicitly approved for disclosure.

## Source Of Truth

| Layer                 | Source                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| Agent inventory       | `config/dify/inventory.json`                                                           |
| Dify app snapshots    | `config/dify-agents/*.json` and `config/dify-agents/*.dify.yml`                        |
| Operator views        | `docs/DIFY_WORKSPACE_INVENTORY.generated.md` and `docs/DIFY_MCP_COVERAGE.generated.md` |
| Eval implementation   | `evals/braintrust/dify/*.eval.ts`                                                      |
| Dify Service API keys | Infisical references declared under `agents.*.service_api.api_key_secret`              |
| Tracker/evidence      | Linear issue plus repo diff or deployment note                                         |

## Current Runnable Experiments

List the current Braintrust Dify experiments before a run:

```bash
pnpm braintrust:eval:dify:list
```

Current first-class eval commands:

| Agent or group                                        | Local no-log command                                           | Published Braintrust command                             |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `create-something-guide-agent`                        | `pnpm braintrust:eval:dify:create-something-guide-agent:local` | `pnpm braintrust:eval:dify:create-something-guide-agent` |
| `youtube-transcript-notion-agent`                     | `pnpm braintrust:eval:dify:youtube-transcript:local`           | `pnpm braintrust:eval:dify:youtube-transcript`           |
| `abundance-hub`                                       | `pnpm braintrust:eval:dify:abundance-hub:local`                | `pnpm braintrust:eval:dify:abundance-hub`                |
| `bettermode-marketplace-creator-agent`                | `pnpm braintrust:eval:dify:bettermode-creator:local`           | `pnpm braintrust:eval:dify:bettermode-creator`           |
| `eric-hub`, `natalia-hub`, `mariana-hub`, `vicki-hub` | `pnpm braintrust:eval:dify:reviewer-hubs:local`                | `pnpm braintrust:eval:dify:reviewer-hubs`                |
| all current Dify eval files                           | `pnpm braintrust:eval:dify:local`                              | `pnpm braintrust:eval:dify`                              |

When passing Braintrust-specific flags that are not already captured by package
scripts, call `pnpm exec braintrust eval ...` directly so the flags go to the
Braintrust CLI.

## Infisical Access Pattern

Do not export or print secret values unless a narrow live probe requires it.
Check that a key exists without exposing it:

```bash
infisical secrets get "$SECRET_KEY" \
  --env "$INFISICAL_ENV" \
  --path "$INFISICAL_PATH" \
  --plain >/dev/null
```

The eval helper reads a Dify key in this order:

1. environment variable named by the eval or inventory, for example
   `DIFY_ABUNDANCE_HUB_API_KEY`;
2. `infisical secrets get <secret> --env <env> --path <path> --silent --output=json`;
3. optional `INFISICAL_PROJECT_ID` or `DIFY_AGENT_INFISICAL_PROJECT_ID` when the
   active Infisical CLI context is not enough.

For one-off generic probes, use the same override names:

```bash
DIFY_AGENT_INFISICAL_ENV=prod \
DIFY_AGENT_INFISICAL_PATH=/dify/abundance-hub \
DIFY_AGENT_API_KEY_SECRET_NAME=DIFY_ABUNDANCE_HUB_API_KEY \
pnpm dify:agent:smoke -- --agent-id abundance-hub
```

## Current Agent Key References

These are secret references only, not values. They are appropriate for internal
repo and Linear process evidence. For an external share, reduce them to the
pattern `prod:/dify/<agent-id>:DIFY_<AGENT>_API_KEY` unless exact references are
explicitly approved for disclosure. Never add resolved values to docs,
Braintrust metadata, Linear comments, or screenshots.

| Agent                             | Status      | Infisical reference                                                                       | Runnable Braintrust coverage                             |
| --------------------------------- | ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `create-something-guide-agent`    | `published` | `prod:/dify/create-something-guide-agent:DIFY_CREATE_SOMETHING_GUIDE_AGENT_API_KEY`       | dedicated eval                                           |
| `youtube-transcript-notion-agent` | `published` | `prod:/dify/youtube-transcript-notion-agent:DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY` | dedicated eval                                           |
| `blondish-hub`                    | `imported`  | `prod:/dify/blondish-hub:DIFY_BLONDISH_HUB_API_KEY`                                       | declared gate; add eval implementation before completion |
| `morgan-hub`                      | `imported`  | `prod:/dify/morgan-hub:DIFY_MORGAN_HUB_API_KEY`                                           | declared gate; add eval implementation before completion |
| `viv-hub`                         | `imported`  | `prod:/dify/viv-hub:DIFY_VIV_HUB_API_KEY`                                                 | declared gate; add eval implementation before completion |
| `c3-hub`                          | `imported`  | `prod:/dify/c3-hub:DIFY_C3_HUB_API_KEY`                                                   | declared gate; add eval implementation before completion |
| `aaron-hub`                       | `imported`  | `prod:/dify/aaron-hub:DIFY_AARON_HUB_API_KEY`                                             | declared gate; add eval implementation before completion |
| `abundance-hub`                   | `published` | `prod:/dify/abundance-hub:DIFY_ABUNDANCE_HUB_API_KEY`                                     | dedicated eval                                           |
| `shea-hub`                        | `imported`  | `prod:/dify/shea-hub:DIFY_SHEA_HUB_API_KEY`                                               | declared gate; add eval implementation before completion |
| `pablo-hub`                       | `imported`  | `prod:/dify/pablo-hub:DIFY_PABLO_HUB_API_KEY`                                             | declared gate; add eval implementation before completion |
| `eric-hub`                        | `imported`  | `prod:/dify/eric-hub:DIFY_ERIC_HUB_API_KEY`                                               | reviewer-hubs eval                                       |
| `natalia-hub`                     | `imported`  | `prod:/dify/natalia-hub:DIFY_NATALIA_HUB_API_KEY`                                         | reviewer-hubs eval                                       |
| `mariana-hub`                     | `imported`  | `prod:/dify/mariana-hub:DIFY_MARIANA_HUB_API_KEY`                                         | reviewer-hubs eval                                       |
| `vicki-hub`                       | `imported`  | `prod:/dify/vicki-hub:DIFY_VICKI_HUB_API_KEY`                                             | reviewer-hubs eval                                       |

## Completion Flow

1. Bootstrap the worktree.

   ```bash
   pnpm bootstrap:worktree
   ```

2. Validate the repo-side Dify contract.

   ```bash
   pnpm dify:inventory:check
   pnpm dify:coverage:check
   pnpm braintrust:eval:dify:list
   ```

3. Confirm the target agent's Service API key reference exists in Infisical
   without printing the value.

4. Run the inventory-driven Dify smoke before Braintrust. This proves the live
   Dify Service API path and the repo assertions agree.

   ```bash
   pnpm dify:agent:smoke -- --agent-id <agent-id>
   ```

   For reviewer hubs, use the aggregate smokes when the change affects every
   reviewer lane:

   ```bash
   pnpm dify:reviewer-hubs:smoke
   pnpm dify:reviewer-hubs:e2b-smoke
   ```

5. Run the local Braintrust eval first with `--no-send-logs`. This still calls
   live Dify for live cases, but it avoids publishing a noisy Braintrust run
   while you are debugging.

6. If a row fails, rerun the smallest eval file or case you can isolate. Do not
   change prompts or policy based on a single aggregate failure until the row has
   been reproduced in isolation.

7. Run the published Braintrust command only after the local run is clean enough
   to become evidence.

8. Record completion evidence in Linear:
   - Linear issue ID and owner;
   - command list and pass/fail outcome;
   - Braintrust project `create-something-dify-agents`, experiment name, and
     run URL or ID;
   - Dify `message_id` and `conversation_id` for live cases;
   - Infisical reference only, not secret values;
   - any skipped write-enabled cases and the reason they remain skipped;
   - git commit, branch, or deployment boundary.

## Failure Triage

| Symptom                                                | Likely cause                                                         | Response                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| eval row is skipped                                    | missing Dify Service API key                                         | verify inventory secret reference and Infisical access                      |
| Dify returns `401` or `403`                            | stale Dify Service API key                                           | rotate in Dify Studio, update Infisical, rerun smoke                        |
| Dify MCP tool call reports unauthenticated Hub session | Dify MCP card has discovery auth but no static bearer execution path | fix the Hub bearer reference before touching eval scoring                   |
| expected tool score fails                              | Dify prompt/tool wiring drifted                                      | inspect Dify trace IDs, DSL snapshot, and inventory enabled tools           |
| secret refusal fails                                   | policy/prompt regression                                             | patch the prompt source and rerun local before publishing                   |
| aggregate run has one empty/transient row              | Dify/provider transient                                              | rerun that row or eval file in isolation before declaring a product failure |

Braintrust is the eval and observability system for this process. It does not
replace the repo inventory, Infisical secret boundary, Dify Studio app state, or
policy approval rules.
