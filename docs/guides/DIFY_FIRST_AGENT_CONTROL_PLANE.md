# Dify-First Agent Control Plane

> Superseded for business operations by `docs/RETOOL_OPERATING_MODEL.md`.
> Keep this guide for Dify-specific agent lifecycle, Dify MCP inventory,
> Service API smoke tests, and Braintrust eval gates. Dify remains useful as a
> bounded AI skill/RAG/workflow server, but Retool is now the CREATE SOMETHING
> operating control plane.

This guide records the Dify-specific control plane that existed before Retool
became the primary operating surface. Use it when maintaining Dify agents,
inventory, Service API smoke tests, and Braintrust eval evidence.

## Current Decision

Dify remains useful for client-accessible chat agents and bounded AI skills
because it gives us a usable chat surface, app publishing, MCP tool wiring, run
logs, and Service API access that Braintrust can evaluate directly.

Do not move durable agent governance into workflow automation tools. Retool is
the operating surface for approvals, dashboards, and client workflow consoles, but
the repo remains the source of truth for which MCP tools a client agent can use
or which evals prove it is safe.

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
- `evals/braintrust/dify/`: Dify Service API evals and scorers
- Infisical: all Dify app API keys and MCP bearer tokens

Dify Studio can remain the live UI. The repo owns review, diffs, policy, and
eval acceptance.

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
10. Add Braintrust eval gates in `evals.required_checks`.
11. Run an inventory-driven Dify Service API smoke:

    ```bash
    pnpm dify:agent:smoke -- \
      --agent client-example-agent \
      --query "Use the approved read tool and summarize the result." \
      --expect-tool expected_tool_name
    ```

12. Promote the successful smoke into `smoke_cases` on the agent inventory
    entry, then run it by ID alone:

    ```bash
    pnpm dify:agent:smoke -- --agent-id client-example-agent
    ```

13. Add and run the dedicated Braintrust eval.
14. Publish or keep published only after the eval gates pass.

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

Every Dify agent must have Braintrust-owned eval gates. The inventory validator
enforces a minimum:

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
- Do not publish an agent that lacks a Service API smoke and Braintrust eval.
