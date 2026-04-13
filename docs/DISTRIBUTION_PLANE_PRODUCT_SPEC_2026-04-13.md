# Distribution Plane Product Spec

> Drafted: April 13, 2026
> Updated: April 13, 2026
> Scope: CREATE SOMETHING public packaging, onboarding, and activation layer
> Status: phase 0 complete, initial phase 1 scaffolded

## Definition

**Distribution Plane** is the CREATE SOMETHING layer that turns repo-native MCP servers, policy artifacts, and workflow guidance into **installable Goose-standard bundles**.

It is not a replacement for:

- the MCP Hub
- Policy OS
- the Judgment Layer
- product-specific hosted chat surfaces

It sits **above** those systems as the public packaging and activation layer.

## Why This Exists

CREATE SOMETHING already has strong infrastructure for:

- custom MCP creation
- governed connector routing
- policy artifacts
- install guidance
- observability

What was missing was a coherent public packaging model for:

- MCP install
- policy distribution
- shareable workflow launch
- verification guidance
- adoption telemetry

The practical gap was not transport. MCP already covers the transport layer. The missing piece was a standard package layer that makes the runtime and policy artifacts easy to ship together.

The adopted answer is:

- **Goose is the canonical public package contract**
- **MCP remains the substrate**
- **other hosts are compatibility outputs, not first-class product types**

## Position In The Product Stack

### Existing durable layers

- **`MCP-only`** remains the discovery and compliance wedge.
- **`Policy OS`** remains the canonical paid governed package.
- **Hub + Judgment + MCP fleet** remain the runtime and governance substrate.

### New layer

**Distribution Plane** becomes the public entry point for activation:

- install an extension
- bundle a policy pack
- launch a recipe
- start from a distro
- verify the setup
- understand trust and governance posture

This keeps CREATE SOMETHING aligned with the existing thesis:

- connectivity first
- policy as artifact
- packaging above transport
- portability through generated adapters, not duplicated product types

## Product Goals

1. Package CREATE SOMETHING MCPs and policies together in under 2 minutes in Goose.
2. Make policy artifacts portable and explicit instead of burying them inside chat state or README prose.
3. Generate compatibility adapters for Cursor, Claude, Codex, Windsurf, and similar hosts from the same source of truth.
4. Preserve CREATE SOMETHING ownership of naming, policy, routing, and entitlement boundaries.
5. Add verification and adoption telemetry so distribution quality can be measured.

## Non-Goals

1. Do not build a CREATE SOMETHING desktop agent client.
2. Do not replace Policy OS with public convenience packaging.
3. Do not expose broad raw connector catalogs just because a host can consume them.
4. Do not create a second external distribution repo before the monorepo artifact model is stable.
5. Do not treat every compatibility target as a first-class public artifact type.

## Primary Users

### 1. New adopter

Needs:

- understand what the bundle does
- install the MCP quickly
- apply the matching policy pack
- launch one good first workflow
- verify the setup works

### 2. Existing operator

Needs:

- package an MCP and its policy once
- hand off a stable recipe or distro
- generate compatibility outputs only when required
- inspect trust, auth, and verification posture

### 3. Policy OS prospect

Needs:

- start with a public extension or recipe
- see that policy is real and portable
- understand what becomes governed and paid

### 4. Agent host or integration surface

Needs:

- machine-readable bundle metadata
- install actions
- policy file references
- workflow launch artifacts
- verification hooks

## Product Surface

The public surface lives in `.agency` and uses direct product labels rather than inventing a separate brand.

### Current public surface

- `/install` is the canonical public catalog and install surface
- product pages link into `/install` using artifact anchors
- Goose packaging is shown first
- compatibility outputs are shown as secondary adapters

### Next public surfaces

- `/recipes`
- `/security`
- `/observability`

These should all read from the same generated catalog and bundle asset tree.

## Canonical Artifact Model

The core repo primitive is a **single Goose-first distribution catalog**.

### Source of truth

- `config/distribution/catalog.json`
- `config/distribution/catalog.schema.json`

### Bundle asset tree

- `config/distribution/goose/policies/`
- `config/distribution/goose/recipes/`
- `config/distribution/goose/distros/`

### Artifact kinds

- `extension`
- `policy_pack`
- `recipe`
- `distro`

### Meaning of each kind

`extension`
- The MCP itself, packaged for Goose.
- May expose compatibility adapters for other hosts.

`policy_pack`
- Persistent instructions, prompt templates, and adversary rules.
- Packages behavior as files, not vague guidance.

`recipe`
- Shareable workflow packaging that composes extensions and policy behavior.

`distro`
- The top-level install starter for CREATE SOMETHING as one Goose-native bundle.

### Catalog fields

- `id`
- `kind`
- `title`
- `description`
- `ownerPackage`
- `visibility`
- `entitlement`
- `docsRef`
- `policyRefs`
- `telemetryKey`
- `packageRefs`
- `artifacts`
- `goose.installModes`
- `compatibility.hosts`
- `compatibility.installModes`
- `verification`

### Goose install mode types

- `goose_extension`
- `goose_recipe`
- `goose_distro`
- `goose_bundle`
- `stdio_command`
- `persistent_instructions_file`
- `prompt_template_file`
- `adversary_rule_file`

### Compatibility install mode types

- `remote_mcp_url`
- `cursor_deeplink`
- `cursor_config`
- `codex_config`
- `codex_command`
- `claude_desktop_config`
- `claude_code_command`
- `windsurf_config`
- `vscode_extension_hint`

## Three-Tier Mapping

### Database

- `config/distribution/catalog.json`
- generated catalog outputs
- Goose policy-pack assets
- Goose recipe YAML files
- Goose distro starter files
- telemetry rows for distribution events

### Automation

- `scripts/distribution-catalog.mjs`
- generated TypeScript outputs
- `.agency` install surface
- future Playbook distribution tools
- compatibility adapter generation
- verification tooling

### Judgment

- catalog exposure rules
- entitlement-aware visibility
- policy-pack selection
- gated versus public artifact rules
- destructive or broad-surface distribution constraints

## Product Rules

1. Distribution metadata must come from one catalog, not handwritten page-by-page.
2. Goose packaging is the canonical public path.
3. Compatibility outputs are generated adapters, not independent product categories.
4. Public distribution must follow the MCP Catalog Exposure Policy.
5. Broad connector surfaces remain brokered and governed.
6. Every distributed artifact must declare verification guidance.
7. Policy artifacts must remain explicit files wherever possible.
8. Public convenience artifacts must never bypass entitlement or approval boundaries.

## Relationship To Existing Packages

### `packages/playbook-mcp`

Becomes the canonical **distribution API and generator**.

Its target role:

- ingest the distribution catalog
- emit Goose bundle artifacts
- emit compatibility adapters
- expose artifact lookup and verification tooling

### `packages/create-something-mcp`

Remains the canonical source for:

- CREATE SOMETHING content retrieval
- research context
- prompt and workflow guidance that may feed public distribution assets

### `packages/cs-mcp-hub-remote`

Remains the governed connector surface.

Its role in Distribution Plane:

- expose named discovery packs as governed references
- provide auth and reconnect posture
- provide trace lookup and trust posture references

### `packages/judgment-layer`

Provides the policy-pack source material and approval posture model.

Its role in Distribution Plane:

- define public-safe policy packs
- keep public posture separate from operator-only implementation detail

### `packages/agency`

Becomes the public install and packaging surface.

Current role:

- render the generated catalog
- lead with Goose packaging
- link product pages back into the canonical install catalog

## MVP Scope

### Include

- one Goose-first catalog for Ground, Loom, Playbook, and CREATE SOMETHING content
- Goose policy-pack assets under `config/distribution/goose/`
- Goose recipes for grounded review and Loom coordination
- a CREATE SOMETHING distro starter
- generated TypeScript and markdown outputs
- `.agency` install catalog and Goose-first install panels
- secondary compatibility adapters for existing non-Goose hosts
- verification steps for every artifact
- basic adoption telemetry keys in the catalog

### Exclude

- a separate public skills marketplace
- end-user billing flows
- arbitrary public artifact uploads
- standalone desktop packaging beyond Goose distros
- broad public exposure of governed connector bundles in phase 1

## Repo Plan

### Phase 0: Canonicalize the model

Create:

- `config/distribution/catalog.json`
- `config/distribution/catalog.schema.json`
- `scripts/distribution-catalog.mjs`

Generate:

- `packages/playbook-mcp/src/catalog.distribution.generated.ts`
- `docs/DISTRIBUTION_CATALOG.generated.md`

Status:

- complete

Exit criteria:

- one catalog row exists for Ground, Loom, Playbook, CREATE SOMETHING content, policy packs, recipes, and distro starter
- schema validation runs from repo scripts
- generated outputs feed the shared `playbook-mcp` consumer surface
- `.agency` reads distribution actions through the shared helper instead of a second generated snapshot

### Phase 1: Ship the public install surface

Implement in `packages/agency`:

- Goose-first `/install`
- shared install components
- product-page links back into the install catalog

Status:

- initial scaffold complete

Exit criteria:

- a new user can find the Goose install path for Ground or Loom from one public route
- product pages do not hardcode install payloads
- compatibility adapters are visibly secondary to Goose packaging
- every public artifact links to verification guidance

### Phase 2: Make `playbook-mcp` the distribution API

Add or extend tools for:

- `list_distribution_artifacts`
- `get_distribution_artifact`
- `generate_goose_bundle`
- `generate_recipe_bundle`
- `generate_compatibility_adapter`
- `verify_distribution_artifact`

Reuse existing:

- host detection
- config generation primitives
- connection verification paths

Exit criteria:

- web and MCP consumers read from the same artifact source
- Goose bundle output is generated, not curated by hand
- compatibility adapter output is generated from the same artifact rows

### Phase 3: Productize bundle composition

Introduce clean composition rules for:

- extension plus policy pack
- extension plus recipe
- distro plus bundled extensions and recipes

Source from:

- package-local MCP metadata
- judgment-layer policy artifacts
- Playbook workflow guidance
- the Goose bundle asset tree

Exit criteria:

- at least two end-to-end CREATE SOMETHING bundles can be packaged without hand-editing page content
- policy packs and recipes declare their related extensions explicitly
- distro composition stays catalog-driven

### Phase 4: Governed activation and telemetry

Connect Distribution Plane to:

- named discovery packs in the hub
- entitlement-aware visibility
- install and launch telemetry
- verification success metrics

Exit criteria:

- public catalog can show both `public` and `gated` artifacts without leaking protected detail
- install, launch, and verification events are measurable by artifact
- protected activation points route to the right governed path

## Initial Package-Level Worklist

### `config/distribution/`

- maintain the Goose-first catalog and schema
- maintain the Goose bundle asset tree

### `scripts/`

- keep catalog validation and generation deterministic
- add narrow smoke tests for bundle asset integrity

### `packages/agency/`

- extend the install surface
- add recipe, security, and observability views from generated data
- keep Goose packaging primary and compatibility secondary

### `packages/playbook-mcp/`

- add distribution catalog ingestion
- expose bundle lookup and generation tools
- keep compatibility output generation downstream of the Goose-first source model

### `packages/create-something-mcp/`

- keep the content extension cleanly packageable
- mark any future public workflow or prompt assets intentionally

### `packages/judgment-layer/`

- define public-safe policy pack boundaries
- keep policy artifacts portable and explicit

### `packages/cs-mcp-hub-remote/`

- expose governed bundle references without weakening broker-first governance

## Metrics

### Product metrics

- time to successful Goose install
- recipe launch rate
- policy-pack adoption rate
- verification success rate
- artifact-to-Policy-OS conversion assist

### Operational metrics

- stale generated artifact count
- artifacts missing verification guidance
- Goose-first versus compatibility adapter usage
- distribution surfaces with drift from the source catalog

## Risks

### 1. Drift risk

If pages, READMEs, and generated outputs define install data separately, the system will drift immediately.

Mitigation:

- single catalog source of truth
- generated outputs only

### 2. Overexposure risk

A public distribution surface can accidentally become a raw connector dump.

Mitigation:

- enforce `docs/MCP_CATALOG_EXPOSURE_POLICY.md`
- keep broad surfaces brokered
- treat governed bundles as references, not raw exports

### 3. Product confusion risk

Users may confuse Distribution Plane with Policy OS.

Mitigation:

- keep Distribution Plane as packaging and activation
- keep Policy OS as the governed paid package
- make policy-pack boundaries explicit

### 4. Goose dependency risk

If Goose-specific packaging starts to replace the underlying portability model, CREATE SOMETHING could overfit the public UX to one host.

Mitigation:

- keep MCP as the substrate
- keep compatibility generation sourced from the same catalog
- treat Goose as the package standard, not the only execution environment

## Decision Summary

CREATE SOMETHING does **not** need a new core client.

It needs a **Goose-first Distribution Plane**:

- monorepo-first
- artifact-driven
- policy-aware
- verification-backed
- telemetry-backed

The standard package types are:

- extension
- policy pack
- recipe
- distro

Everything else is an adapter.

## Recommended Immediate Next Steps

1. Keep the Goose-first catalog as the canonical packaging model.
2. Extend `playbook-mcp` so bundle lookup and generation become MCP-accessible.
3. Add dedicated recipe, security, and observability pages in `.agency`.
4. Instrument install, recipe launch, and verification events.
5. Keep expanding artifact coverage only through the catalog and Goose bundle asset tree.
