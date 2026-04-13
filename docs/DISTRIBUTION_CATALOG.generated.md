# Distribution Catalog

> Generated from `config/distribution/catalog.json`.
> Regenerate with `pnpm distribution:generate`.

## Summary

| ID | Kind | Owner Package | Goose Modes | Compatibility Hosts | Related Packages |
|----|------|---------------|-------------|---------------------|------------------|
| `ground-extension` | `extension` | `packages/ground` | goose_extension, stdio_command | cursor, claude-code, claude-desktop, windsurf, vscode, codex | ground-policy-pack, ground-review-recipe, create-something-distro |
| `loom-extension` | `extension` | `packages/loom` | goose_extension, stdio_command | cursor, claude-code, claude-desktop, windsurf, vscode, codex | loom-policy-pack, loom-coordination-recipe, create-something-distro |
| `playbook-extension` | `extension` | `packages/playbook-mcp` | goose_extension, goose_bundle | cursor, claude-code, claude-desktop, windsurf, codex | create-something-distro |
| `create-something-extension` | `extension` | `packages/create-something-mcp` | goose_extension, goose_bundle | cursor, claude-code, claude-desktop, windsurf, codex | create-something-distro |
| `ground-policy-pack` | `policy_pack` | `packages/judgment-layer` | goose_bundle, persistent_instructions_file, prompt_template_file, prompt_template_file, adversary_rule_file | goose-only | ground-extension, ground-review-recipe, create-something-distro |
| `loom-policy-pack` | `policy_pack` | `packages/judgment-layer` | goose_bundle, persistent_instructions_file, prompt_template_file, prompt_template_file, adversary_rule_file | goose-only | loom-extension, loom-coordination-recipe, create-something-distro |
| `ground-review-recipe` | `recipe` | `packages/playbook-mcp` | goose_recipe, goose_bundle | goose-only | ground-extension, ground-policy-pack, create-something-distro |
| `loom-coordination-recipe` | `recipe` | `packages/playbook-mcp` | goose_recipe, goose_bundle | goose-only | loom-extension, loom-policy-pack, create-something-distro |
| `create-something-distro` | `distro` | `packages/agency` | goose_distro, goose_bundle | goose-only | ground-extension, loom-extension, playbook-extension, create-something-extension, ground-policy-pack, loom-policy-pack, ground-review-recipe, loom-coordination-recipe |

## Artifact Details

### Ground Extension (`ground-extension`)

- Kind: `extension`
- Owner package: `packages/ground`
- Visibility: `public`
- Entitlement: `public`
- Docs: `packages/ground/npm/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- Telemetry key: `distribution.ground.extension`
- Related packages: `ground-policy-pack`, `ground-review-recipe`, `create-something-distro`
- Verification summary: Verify the Goose extension is installed, then run one grounded claim workflow.

#### Goose Packaging

- `goose_extension` — Install in Goose (Goose)

```text
goose://extension?cmd=npx&arg=-y&arg=%40createsomething%2Fground-mcp&timeout=300&id=ground&name=Ground&description=Grounded%20claims%20for%20code
```

- `stdio_command` — Local stdio command (Goose)

```text
npx @createsomething/ground-mcp
```

#### Artifact Refs

- npmPackage: `@createsomething/ground-mcp`
- landingPage: `https://createsomething.agency/products/ground`

#### Compatibility

- Hosts: `cursor`, `claude-code`, `claude-desktop`, `windsurf`, `vscode`, `codex`

- `cursor_deeplink` for `cursor` — Cursor deeplink (Compatibility)

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D
```

- `claude_code_command` for `claude-code` — Claude Code command (Compatibility)

```text
claude mcp add --scope user --transport stdio ground -- npx @createsomething/ground-mcp
```

- `claude_desktop_config` for `claude-desktop` — Claude Desktop config (Compatibility)

```text
{"mcpServers":{"ground":{"command":"npx","args":["@createsomething/ground-mcp"]}}}
```

- `windsurf_config` for `windsurf` — Windsurf config (Compatibility)

```text
{"mcpServers":{"ground":{"command":"npx","args":["@createsomething/ground-mcp"]}}}
```

- `vscode_extension_hint` for `vscode` — VS Code MCP hint (Compatibility)

```text
Open Extensions, filter by "MCP Server", then search for "ground".
```

- `codex_command` for `codex` — Codex CLI command (Compatibility)

```text
codex mcp add ground --command "npx @createsomething/ground-mcp"
```

#### Verification

1. Confirm the Goose extension is listed. Prompt: Open the Goose extension list and confirm `ground` is installed. Expected: Goose lists `ground` as an available extension.
2. Run a Ground verification flow. Prompt: Call `ground_compare` on two known files. Expected: The extension returns a computed result rather than a heuristic claim.

### Loom Extension (`loom-extension`)

- Kind: `extension`
- Owner package: `packages/loom`
- Visibility: `public`
- Entitlement: `public`
- Docs: `packages/loom/npm/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- Telemetry key: `distribution.loom.extension`
- Related packages: `loom-policy-pack`, `loom-coordination-recipe`, `create-something-distro`
- Verification summary: Verify the Goose extension is installed, then query the Loom task surface.

#### Goose Packaging

- `goose_extension` — Install in Goose (Goose)

```text
goose://extension?cmd=npx&arg=-y&arg=%40createsomething%2Floom-mcp&timeout=300&id=loom&name=Loom&description=Memory%20and%20coordination%20for%20AI%20agents
```

- `stdio_command` — Local stdio command (Goose)

```text
npx @createsomething/loom-mcp
```

#### Artifact Refs

- npmPackage: `@createsomething/loom-mcp`
- landingPage: `https://createsomething.agency/products/loom`

#### Compatibility

- Hosts: `cursor`, `claude-code`, `claude-desktop`, `windsurf`, `vscode`, `codex`

- `cursor_deeplink` for `cursor` — Cursor deeplink (Compatibility)

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19
```

- `claude_code_command` for `claude-code` — Claude Code command (Compatibility)

```text
claude mcp add loom -- npx @createsomething/loom-mcp
```

- `claude_desktop_config` for `claude-desktop` — Claude Desktop config (Compatibility)

```text
{"mcpServers":{"loom":{"command":"npx","args":["@createsomething/loom-mcp"]}}}
```

- `windsurf_config` for `windsurf` — Windsurf config (Compatibility)

```text
{"mcpServers":{"loom":{"command":"npx","args":["@createsomething/loom-mcp"]}}}
```

- `vscode_extension_hint` for `vscode` — VS Code MCP hint (Compatibility)

```text
Open Extensions, filter by "MCP Server", then search for "loom".
```

- `codex_command` for `codex` — Codex CLI command (Compatibility)

```text
codex mcp add loom --command "npx @createsomething/loom-mcp"
```

#### Verification

1. Confirm the Goose extension is listed. Prompt: Open the Goose extension list and confirm `loom` is installed. Expected: Goose lists `loom` as an available extension.
2. Run a Loom readiness query. Prompt: Call `loom_ready` or `loom_summary`. Expected: The extension returns valid task-state data or an empty-but-valid response.

### Playbook Extension (`playbook-extension`)

- Kind: `extension`
- Owner package: `packages/playbook-mcp`
- Visibility: `public`
- Entitlement: `public`
- Docs: `packages/playbook-mcp/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- Telemetry key: `distribution.playbook.extension`
- Related packages: `create-something-distro`
- Verification summary: Verify the remote extension is reachable, then read one playbook resource.

#### Goose Packaging

- `goose_extension` — Install remote extension in Goose (Goose)

```text
goose://extension?url=https%3A%2F%2Fplaybook.mcp.createsomething.ltd%2Fmcp&type=streamable_http&timeout=300&id=playbook&name=Playbook%20MCP&description=Host%20workflow%20playbooks%20for%20MCP%20onboarding
```

- `goose_bundle` — Remote MCP URL (Goose)

```text
https://playbook.mcp.createsomething.ltd/mcp
```

#### Artifact Refs

- remoteMcpUrl: `https://playbook.mcp.createsomething.ltd/mcp`

#### Compatibility

- Hosts: `cursor`, `claude-code`, `claude-desktop`, `windsurf`, `codex`

- `claude_code_command` for `claude-code` — Claude Code command (Compatibility)

```text
claude mcp add playbook --transport http https://playbook.mcp.createsomething.ltd/mcp
```

- `claude_desktop_config` for `claude-desktop` — Claude Desktop config (Compatibility)

```text
{"mcpServers":{"playbook":{"url":"https://playbook.mcp.createsomething.ltd/mcp"}}}
```

- `cursor_config` for `cursor` — Cursor config (Compatibility)

```text
{"mcpServers":{"playbook":{"url":"https://playbook.mcp.createsomething.ltd/mcp"}}}
```

- `windsurf_config` for `windsurf` — Windsurf config (Compatibility)

```text
{"mcpServers":{"playbook":{"url":"https://playbook.mcp.createsomething.ltd/mcp"}}}
```

- `codex_config` for `codex` — Codex config (Compatibility)

```text
[mcp_servers."playbook"]
url = "https://playbook.mcp.createsomething.ltd/mcp"
```

#### Verification

1. Confirm the Goose extension is listed. Prompt: Open the Goose extension list and confirm `playbook` is installed. Expected: Goose lists `playbook` as an available extension.
2. Read the playbook list. Prompt: Read the `playbooks://list` resource. Expected: The resource returns the available host playbooks.

### CREATE SOMETHING Content Extension (`create-something-extension`)

- Kind: `extension`
- Owner package: `packages/create-something-mcp`
- Visibility: `public`
- Entitlement: `public`
- Docs: `packages/create-something-mcp/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- Telemetry key: `distribution.create-something.extension`
- Related packages: `create-something-distro`
- Verification summary: Verify the remote extension is reachable, then run one content lookup.

#### Goose Packaging

- `goose_extension` — Install remote extension in Goose (Goose)

```text
goose://extension?url=https%3A%2F%2Fmcp.createsomething.ltd%2Fmcp&type=streamable_http&timeout=300&id=create-something&name=CREATE%20SOMETHING%20Content%20MCP&description=Single%20entry%20point%20to%20CREATE%20SOMETHING%20content
```

- `goose_bundle` — Remote MCP URL (Goose)

```text
https://mcp.createsomething.ltd/mcp
```

#### Artifact Refs

- remoteMcpUrl: `https://mcp.createsomething.ltd/mcp`

#### Compatibility

- Hosts: `cursor`, `claude-code`, `claude-desktop`, `windsurf`, `codex`

- `claude_code_command` for `claude-code` — Claude Code command (Compatibility)

```text
claude mcp add create-something --transport http https://mcp.createsomething.ltd/mcp
```

- `claude_desktop_config` for `claude-desktop` — Claude Desktop config (Compatibility)

```text
{"mcpServers":{"create-something":{"url":"https://mcp.createsomething.ltd/mcp"}}}
```

- `cursor_config` for `cursor` — Cursor config (Compatibility)

```text
{"mcpServers":{"create-something":{"url":"https://mcp.createsomething.ltd/mcp"}}}
```

- `windsurf_config` for `windsurf` — Windsurf config (Compatibility)

```text
{"mcpServers":{"create-something":{"url":"https://mcp.createsomething.ltd/mcp"}}}
```

- `codex_config` for `codex` — Codex config (Compatibility)

```text
[mcp_servers."create-something"]
url = "https://mcp.createsomething.ltd/mcp"
```

#### Verification

1. Confirm the Goose extension is listed. Prompt: Open the Goose extension list and confirm `create-something` is installed. Expected: Goose lists `create-something` as an available extension.
2. Run a content search. Prompt: Call `search` for `three-tier framework`. Expected: The extension returns matching CREATE SOMETHING documents.

### Ground Policy Pack (`ground-policy-pack`)

- Kind: `policy_pack`
- Owner package: `packages/judgment-layer`
- Visibility: `public`
- Entitlement: `public`
- Docs: `config/distribution/goose/policies/ground/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`, `packages/judgment-layer/README.md`
- Telemetry key: `distribution.ground.policy-pack`
- Related packages: `ground-extension`, `ground-review-recipe`, `create-something-distro`
- Verification summary: Verify Goose is reading the pack and enforcing verification-first behavior.

#### Goose Packaging

- `goose_bundle` — Policy pack directory (Goose)

```text
config/distribution/goose/policies/ground
```

- `persistent_instructions_file` — Persistent instructions file (Goose)

```text
config/distribution/goose/policies/ground/persistent-instructions.md
```

- `prompt_template_file` — System prompt template (Goose)

```text
config/distribution/goose/policies/ground/prompts/system.md
```

- `prompt_template_file` — Permission judge prompt template (Goose)

```text
config/distribution/goose/policies/ground/prompts/permission_judge.md
```

- `adversary_rule_file` — Adversary rules file (Goose)

```text
config/distribution/goose/policies/ground/adversary.md
```

#### Artifact Refs

- policyDir: `config/distribution/goose/policies/ground`
- persistentInstructionsFile: `config/distribution/goose/policies/ground/persistent-instructions.md`
- systemPromptFile: `config/distribution/goose/policies/ground/prompts/system.md`
- permissionJudgeFile: `config/distribution/goose/policies/ground/prompts/permission_judge.md`
- adversaryFile: `config/distribution/goose/policies/ground/adversary.md`

#### Compatibility

- Goose-only artifact.

#### Verification

1. Load the persistent instructions file. Command: `cat config/distribution/goose/policies/ground/persistent-instructions.md` Expected: The file states that Ground must verify claims before they are reported as facts.
2. Exercise a Ground-required claim. Prompt: Ask Goose to report duplicate code and confirm it reaches for Ground rather than guessing. Expected: Goose uses Ground or explicitly says the claim is unverified.

### Loom Policy Pack (`loom-policy-pack`)

- Kind: `policy_pack`
- Owner package: `packages/judgment-layer`
- Visibility: `public`
- Entitlement: `public`
- Docs: `config/distribution/goose/policies/loom/README.md`
- Policy refs: `docs/MCP_CATALOG_EXPOSURE_POLICY.md`, `packages/judgment-layer/README.md`
- Telemetry key: `distribution.loom.policy-pack`
- Related packages: `loom-extension`, `loom-coordination-recipe`, `create-something-distro`
- Verification summary: Verify Goose is reading the pack and preserving Loom checkpoints as part of execution.

#### Goose Packaging

- `goose_bundle` — Policy pack directory (Goose)

```text
config/distribution/goose/policies/loom
```

- `persistent_instructions_file` — Persistent instructions file (Goose)

```text
config/distribution/goose/policies/loom/persistent-instructions.md
```

- `prompt_template_file` — System prompt template (Goose)

```text
config/distribution/goose/policies/loom/prompts/system.md
```

- `prompt_template_file` — Plan prompt template (Goose)

```text
config/distribution/goose/policies/loom/prompts/plan.md
```

- `adversary_rule_file` — Adversary rules file (Goose)

```text
config/distribution/goose/policies/loom/adversary.md
```

#### Artifact Refs

- policyDir: `config/distribution/goose/policies/loom`
- persistentInstructionsFile: `config/distribution/goose/policies/loom/persistent-instructions.md`
- systemPromptFile: `config/distribution/goose/policies/loom/prompts/system.md`
- planPromptFile: `config/distribution/goose/policies/loom/prompts/plan.md`
- adversaryFile: `config/distribution/goose/policies/loom/adversary.md`

#### Compatibility

- Goose-only artifact.

#### Verification

1. Load the persistent instructions file. Command: `cat config/distribution/goose/policies/loom/persistent-instructions.md` Expected: The file states that meaningful work should use Loom readiness, claims, and checkpoints.
2. Exercise a Loom-coordinated task. Prompt: Ask Goose to start a meaningful task and confirm it reaches for Loom task state before claiming completion. Expected: Goose uses Loom or explicitly says why Loom was unavailable.

### Grounded Code Review Recipe (`ground-review-recipe`)

- Kind: `recipe`
- Owner package: `packages/playbook-mcp`
- Visibility: `public`
- Entitlement: `public`
- Docs: `config/distribution/goose/recipes/ground-review.yaml`
- Policy refs: `config/distribution/goose/policies/ground/README.md`
- Telemetry key: `distribution.ground.recipe`
- Related packages: `ground-extension`, `ground-policy-pack`, `create-something-distro`
- Verification summary: Validate the recipe file, then confirm Goose loads the extension and instructions together.

#### Goose Packaging

- `goose_recipe` — Open recipe in Goose CLI (Goose)

```text
goose recipe open config/distribution/goose/recipes/ground-review.yaml
```

- `goose_bundle` — Recipe file (Goose)

```text
config/distribution/goose/recipes/ground-review.yaml
```

#### Artifact Refs

- recipeFile: `config/distribution/goose/recipes/ground-review.yaml`

#### Compatibility

- Goose-only artifact.

#### Verification

1. Validate the recipe. Command: `goose recipe validate config/distribution/goose/recipes/ground-review.yaml` Expected: Goose validates the recipe without schema errors.
2. Open the recipe. Command: `goose recipe open config/distribution/goose/recipes/ground-review.yaml` Expected: Goose opens a session with Ground and the bundled review instructions.

### Loom Coordination Recipe (`loom-coordination-recipe`)

- Kind: `recipe`
- Owner package: `packages/playbook-mcp`
- Visibility: `public`
- Entitlement: `public`
- Docs: `config/distribution/goose/recipes/loom-coordination.yaml`
- Policy refs: `config/distribution/goose/policies/loom/README.md`
- Telemetry key: `distribution.loom.recipe`
- Related packages: `loom-extension`, `loom-policy-pack`, `create-something-distro`
- Verification summary: Validate the recipe file, then confirm Goose loads Loom and the bundled coordination instructions together.

#### Goose Packaging

- `goose_recipe` — Open recipe in Goose CLI (Goose)

```text
goose recipe open config/distribution/goose/recipes/loom-coordination.yaml
```

- `goose_bundle` — Recipe file (Goose)

```text
config/distribution/goose/recipes/loom-coordination.yaml
```

#### Artifact Refs

- recipeFile: `config/distribution/goose/recipes/loom-coordination.yaml`

#### Compatibility

- Goose-only artifact.

#### Verification

1. Validate the recipe. Command: `goose recipe validate config/distribution/goose/recipes/loom-coordination.yaml` Expected: Goose validates the recipe without schema errors.
2. Open the recipe. Command: `goose recipe open config/distribution/goose/recipes/loom-coordination.yaml` Expected: Goose opens a session with Loom and the bundled coordination instructions.

### CREATE SOMETHING Goose Distro Starter (`create-something-distro`)

- Kind: `distro`
- Owner package: `packages/agency`
- Visibility: `public`
- Entitlement: `public`
- Docs: `config/distribution/goose/distros/create-something/README.md`
- Policy refs: `docs/DISTRIBUTION_PLANE_PRODUCT_SPEC_2026-04-13.md`
- Telemetry key: `distribution.create-something.distro`
- Related packages: `ground-extension`, `loom-extension`, `playbook-extension`, `create-something-extension`, `ground-policy-pack`, `loom-policy-pack`, `ground-review-recipe`, `loom-coordination-recipe`
- Verification summary: Verify the distro bundle includes extensions, policy packs, and recipes in one place.

#### Goose Packaging

- `goose_distro` — Starter init-config file (Goose)

```text
config/distribution/goose/distros/create-something/init-config.yaml
```

- `goose_bundle` — Goose bundle root (Goose)

```text
config/distribution/goose
```

#### Artifact Refs

- distroDir: `config/distribution/goose/distros/create-something`
- initConfigFile: `config/distribution/goose/distros/create-something/init-config.yaml`
- bundleRoot: `config/distribution/goose`

#### Compatibility

- Goose-only artifact.

#### Verification

1. Inspect the distro starter. Command: `cat config/distribution/goose/distros/create-something/init-config.yaml` Expected: The init-config file sets the starter provider and model defaults.
2. Inspect the bundle root. Command: `ls config/distribution/goose` Expected: The bundle root exposes distros, policies, and recipes together.
