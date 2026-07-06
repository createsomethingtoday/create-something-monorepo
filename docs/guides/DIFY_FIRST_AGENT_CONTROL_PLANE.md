# Dify-First Agent Control Plane

This guide records the operating choice: use Dify as the preferred client-facing
agent/chat runtime, and keep governance, policy, registry, and eval evidence in
this repo.

## Decision

Dify remains the right default for client-accessible agents because it gives us a
usable chat surface, app publishing, MCP tool wiring, run logs, and Service API
access that can be traced through Dify-native Langfuse and evaluated through
Langfuse where CREATE SOMETHING owns the MCP boundary.

Do not move agent governance into workflow automation tools. Workflow systems can
still be useful for operational jobs, but they should not become the source of
truth for which MCP tools a client agent can use or which evals prove it is safe.

## Source Of Truth

Use this split:

- `config/mcp-hub/registry.json`: canonical MCP capability registry
- `config/dify/inventory.json`: Dify MCP server cards and agent/tool exposure
- `config/dify-mcp-intake/*.json`: Dify Studio setup artifacts for MCPs not
  yet codified in inventory
- `config/dify-agents/*.json`: compact agent manifest and instruction source
- `config/dify-agents/*.dify.yml`: importable Dify app DSL snapshot
- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`: generated operator view
- `docs/DIFY_MCP_COVERAGE.generated.md`: MCP-to-Dify coverage backlog
- `evals/langfuse/dify/`: Dify Service API evals and scorers
- Langfuse: Dify-native app traces, sessions, prompt/model behavior, latency,
  cost, and runtime errors
- Infisical: all Dify app API keys and MCP bearer tokens

Dify Studio can remain the live UI. The repo owns review, diffs, policy, and
MCP eval acceptance. Langfuse owns the app-runtime trace.

## Agent Lifecycle

1. Register or verify the MCP server in the MCP registry.
2. Check Dify coverage to see whether the MCP already has a server card or
   agent:

   ```bash
   pnpm dify:coverage:generate
   ```

3. If the MCP is missing a Dify server card, create an intake artifact for the
   Dify Studio registration step:

   ```bash
   pnpm dify:mcp:intake -- --registry-server-id mcp-registry-server-id --write
   ```

   To move the full missing Dify-direct backlog into Dify Studio-ready intake
   artifacts, use:

   ```bash
   pnpm dify:mcp:intake -- --all-missing --write
   ```

   Validate intake artifacts before using them for Studio setup:

   ```bash
   pnpm dify:mcp:intake:check
   ```

4. Add or update the Dify MCP server card in `config/dify/inventory.json`.
5. Classify every Dify-discovered tool as read, write, external side effect,
   secret sensitive, or unknown.
6. Scaffold the repo-side Dify agent contract:

   ```bash
   pnpm dify:agent:scaffold -- \
     --agent-id client-example-agent \
     --server-id existing-dify-mcp-server-id \
     --display-name "Client Example Agent"
   ```

7. Create or export the Dify app DSL. For an app that already exists in Dify,
   import the exported DSL into the repo-side control plane:

   ```bash
   pnpm dify:agent:import-dsl -- \
     --dsl "/path/to/exported-agent.yml" \
     --agent-id client-example-agent \
     --fleet-id existing-mcp-fleet-id
   ```

   Review the generated manifest and inventory entries, then re-run with
   `--write-dsl --write-manifest --write-inventory` when the mapping is correct.
   For Policy OS Hub MCPs, the generated MCP auth reference should be the
   static lane bearer from the fleet registry, usually
   `prod:/mcp-hub/hubs:CS_HUB_*_API_TOKEN`.

8. Add or review the compact agent manifest with instructions and secret references.
9. Map the agent to allowed MCP servers and enabled tools in the inventory.
10. Connect or verify Dify-native Langfuse tracing for the app runtime.
11. Add Langfuse eval gates in `evals.required_checks` for the MCP contracts
    CREATE SOMETHING owns.
12. Run an inventory-driven Dify Service API smoke:

    ```bash
    pnpm dify:agent:smoke -- \
      --agent client-example-agent \
      --query "Use the approved read tool and summarize the result." \
      --expect-tool expected_tool_name
    ```

13. Promote the successful smoke into `smoke_cases` on the agent inventory
    entry, then run it by ID alone:

    ```bash
    pnpm dify:agent:smoke -- --agent-id client-example-agent
    ```

14. Add and run the dedicated Langfuse eval.
15. Publish or keep published only after Langfuse tracing is connected and the
    required Langfuse MCP gates pass.

The scaffold command defaults to a dry run. Use `--write-manifest` and
`--write-inventory` only when you are ready to add the draft agent contract to
the repo.

Generic Service API smoke:

```bash
pnpm dify:agent:smoke -- --list-agents
pnpm dify:agent:smoke -- --agent client-example-agent --dry-run
pnpm dify:agent:smoke -- \
  --agent client-example-agent \
  --query "Smoke test: describe your configured purpose and do not perform writes." \
  --forbid-tool destructive_tool_name
```

The generic smoke command reads `config/dify/inventory.json`, resolves the
agent's Dify Service API key from the declared Infisical reference, and can
assert required tools, forbidden tools, answer text, and tool observations.

Published agents must keep at least one inventory-declared smoke case so the
basic runtime path can be validated without reconstructing prompts or assertions
from memory.

For Hub-backed Dify agents, include a bearer-readiness smoke that calls a
non-mutating Hub tool such as `hub_list_services`. The smoke must fail if the
agent answers that the Hub session is unauthenticated, because client Dify agents
should not depend on user/session auth for Hub access. A Dify MCP card showing
`Authorized` only proves the server can initialize and expose schemas; it does
not prove that `tools/call` has a usable static bearer path.

## Required Eval Gates

Use two evidence streams:

- Langfuse for Dify app traces: sessions, prompt/model behavior, latency, cost,
  runtime errors, and operator debugging.
- Langfuse for CREATE SOMETHING-owned MCP gates: expected tool use, forbidden
  tool use, write confirmation, secret refusal, and policy-boundary regressions.

Every Dify agent with CREATE SOMETHING-owned MCP tools must have Langfuse-owned
eval gates. The inventory validator enforces a minimum:

- `api_health`
- `secret_refusal`
- `latency_budget`
- `expected_tool_use` for agents with enabled MCP tools
- `forbidden_tool_use` for agents with enabled MCP tools
- `write_confirmation` for agents with write-capable MCP tools

Use additional gates for client or domain risk:

- `grounded_answer`
- `policy_boundary`
- `tenant_isolation`
- `error_recovery`

## Hosting Posture

Stay on Dify Cloud unless internals access becomes the blocker.

Use Dify Premium on AWS or self-hosting when we need one of these:

- controlled access to Dify internals for admin automation
- private-network-only access to MCP servers or data stores
- custom branding or residency requirements that Cloud cannot satisfy
- pinned Dify versions with controlled upgrade windows
- a safe place to wrap Dify console internals behind our own Control Plane MCP

Premium or self-hosted Dify should be treated as an operations commitment, not a
cost-optimization shortcut. The control-plane contract in this repo should stay
the same across Cloud, Premium, and self-hosted deployments.

## What Not To Do

- Do not store Dify API keys, MCP bearer tokens, or provider secrets in DSL files.
- Do not let Dify Studio be the only copy of prompts, enabled tools, or policies.
- Do not give one client-facing agent every MCP tool by default.
- Do not expose write-capable tools without confirmation evals.
- Do not publish an agent that lacks Langfuse tracing, a Service API smoke, and
  the required Langfuse MCP evals.
