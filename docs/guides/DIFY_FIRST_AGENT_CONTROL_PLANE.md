# Dify-First Agent Control Plane

This guide records the operating choice: use Dify as the preferred client-facing
agent/chat runtime, and keep governance, policy, registry, and eval evidence in
this repo.

## Decision

Dify remains the right default for client-accessible agents because it gives us a
usable chat surface, app publishing, MCP tool wiring, run logs, and Service API
access that Braintrust can evaluate directly.

Do not move agent governance into workflow automation tools. Workflow systems can
still be useful for operational jobs, but they should not become the source of
truth for which MCP tools a client agent can use or which evals prove it is safe.

## Source Of Truth

Use this split:

- `config/mcp-hub/registry.json`: canonical MCP capability registry
- `config/dify/inventory.json`: Dify MCP server cards and agent/tool exposure
- `config/dify-agents/*.json`: compact agent manifest and instruction source
- `config/dify-agents/*.dify.yml`: importable Dify app DSL snapshot
- `docs/DIFY_WORKSPACE_INVENTORY.generated.md`: generated operator view
- `evals/braintrust/dify/`: Dify Service API evals and scorers
- Infisical: all Dify app API keys and MCP bearer tokens

Dify Studio can remain the live UI. The repo owns review, diffs, policy, and
eval acceptance.

## Agent Lifecycle

1. Register or verify the MCP server in the MCP registry.
2. Add or update the Dify MCP server card in `config/dify/inventory.json`.
3. Classify every Dify-discovered tool as read, write, external side effect,
   secret sensitive, or unknown.
4. Create or export the Dify app DSL.
5. Add a compact agent manifest with instructions and secret references.
6. Map the agent to allowed MCP servers and enabled tools in the inventory.
7. Add Braintrust eval gates in `evals.required_checks`.
8. Run the Dify Service API smoke and Braintrust eval.
9. Publish or keep published only after the eval gates pass.

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
