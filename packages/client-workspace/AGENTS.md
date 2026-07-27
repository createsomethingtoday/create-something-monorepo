# Agents: @create-something/client-workspace

## Agent Entry

- Start with `README.md` for the product and safety contract.
- Read `UNDERSTANDING.md` for module ownership.
- Primary entrypoints: `src/lib/server/workspaces/registry.ts`,
  `src/lib/server/sessions/workspace-session.ts`, and `src/routes/+page.svelte`.

## Safety Boundary

- Browser requests may select only checked-in workspace IDs or IDs registered
  from a delivery that passed the pinned signature, file hash, release,
  resource-limit, and path-boundary verifier. Never accept a raw
  client-provided filesystem root, process command, port, environment, preview
  origin, or unverified workspace definition.
- Keep Codex app-server, API credentials, local paths, process IDs, and raw
  provider errors server-side.
- Default to workspace-write with network disabled. Deployment, secrets,
  destructive commands, external writes, and writes outside the declared
  workspace require an operator-controlled promotion workflow.
- Do not add direct Webflow Designer mutation or arbitrary repository cloning.

## Validation

- Boot: `pnpm dev`
- Tests: `pnpm test`
- Smoke: `pnpm smoke`
- UI path: open `/`, select the checked-in demo workspace, and run the declared
  multimodal edit workflow in a real browser.
- Escalate if the workspace root, approval owner, preview command, deployment
  authority, or credential boundary cannot be traced to a checked-in artifact.
