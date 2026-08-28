# Create Something Monorepo

CREATE SOMETHING is a `pnpm` monorepo for the platform, services, and product surfaces behind our MCP-first tooling. The repo also carries client-specific packages, operational tooling, and a small number of polyglot apps such as Meeting Capture.

Start with the docs map in [docs/README.md](./docs/README.md). Strategy and operating model live in [docs/MCP_FIRST_THESIS.md](./docs/MCP_FIRST_THESIS.md) and [docs/THREE_TIER_FRAMEWORK.md](./docs/THREE_TIER_FRAMEWORK.md).

## Workspace Model

The workspace is organized into five lanes defined in [config/workspace-lanes.json](./config/workspace-lanes.json):

- `platform`: shared MCP substrate, hub infrastructure, policy engines, orchestration
- `product`: first-party apps and design system packages such as `canon`, `tufte`, `io`, `space`, `agency`
- `services`: deployable MCP servers, workers, admin surfaces, service packages
- `clients`: tenant-specific packages and partner integrations
- `labs`: experiments, tools, scaffolds, and other non-core packages

The `pnpm` workspace membership lives in [pnpm-workspace.yaml](./pnpm-workspace.yaml). Lane-aware root commands are powered by [scripts/workspace-lane-run.mjs](./scripts/workspace-lane-run.mjs).

## Repository Shape

```text
create-something-monorepo/
├── apps/                  # Polyglot apps such as Meeting Capture
├── packages/              # Workspace packages and nested workers/extensions
├── config/                # Hub config and workspace lane metadata
├── docs/                  # Strategy, policy, runbooks, internal context
├── scripts/               # Root orchestration and verification scripts
├── specs/                 # Specs and design notes
├── package.json           # Root command surface
└── pnpm-workspace.yaml    # Workspace package globs
```

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` 9+

### Install

```bash
git clone https://github.com/createsomethingtoday/create-something-monorepo.git
cd create-something-monorepo
pnpm install
```

### Worktree Bootstrap

For repo worktrees under this folder, use the repo bootstrap instead of relying on
whatever global Node or pnpm happens to be installed:

```bash
pnpm bootstrap:worktree
```

This wrapper ensures the worktree uses the repo-pinned Node from [.nvmrc](./.nvmrc)
and the pinned pnpm version from [package.json](./package.json). It then runs the
same lockfile-aware workspace install used by Ona bootstrap, which makes local
tooling such as `pnpm exec tsc` and `pnpm exec tsx` available in the worktree.

If your host runtime already matches the repo pins, it runs `./.ona/scripts/bootstrap.sh`
directly. If not, it falls back to [`./scripts/ona-bootstrap-local.sh`](./scripts/ona-bootstrap-local.sh)
and uses the repo-cached toolchain without changing your global Node install.

### Development

```bash
# Product surfaces
pnpm dev
pnpm dev:product

# Service packages and workers
pnpm dev:services

# Broader workspace lanes
pnpm dev:platform
pnpm dev:clients
pnpm dev:labs

# Default active lanes together
pnpm dev:all
```

### Quality Gates

```bash
# Default lanes: platform + product + services
pnpm build
pnpm check
pnpm test

# Include clients and labs when needed
pnpm check:all
pnpm test:all

# Lane-specific execution
pnpm build:services
pnpm check:clients
pnpm test:labs
```

### Meeting Capture

Meeting Capture is a SwiftPM app under [apps/meeting-capture](./apps/meeting-capture).

```bash
pnpm meeting-capture:build
pnpm meeting-capture:install
pnpm meeting-capture:install:user
```

## Working In The Repo

- Read [AGENTS.md](./AGENTS.md) before making coordinated changes.
- Treat `docs/` as the system of record for architecture, policy, and runbooks.
- Use `pnpm exports` to verify package exports before assuming symbol names.
- Prefer lane commands over broad recursive commands when running checks locally.

## Selected Packages

- [packages/canon](./packages/canon): design system and shared UI primitives
- [packages/tufte](./packages/tufte): information design and visualization layer
- [packages/cs-mcp-hub](./packages/cs-mcp-hub): local hub runtime
- [packages/cs-mcp-hub-remote](./packages/cs-mcp-hub-remote): remote hub control plane
- [packages/mcp-core](./packages/mcp-core): MCP shared primitives
- [packages/mcp-authz](./packages/mcp-authz): authorization and policy support
- [packages/create-something-mcp](./packages/create-something-mcp): deployable service package
- [packages/agency](./packages/agency): first-party service/product surface

## Pi Packages

Publishable [Pi](https://pi.dev) coding agent packages that deliver CREATE SOMETHING's framework and governance as installable agent knowledge:

| Package | Install | Purpose |
|---------|---------|--------|
| [@createsomething/pi-three-tier-framework](./packages/pi-three-tier-framework) | `pi install npm:@createsomething/pi-three-tier-framework` | Three-Tier Framework skills and prompts |
| [@createsomething/pi-policy-os](./packages/pi-policy-os) | `pi install npm:@createsomething/pi-policy-os` | Policy OS governance starter |
| [@create-something/pi-halfdozen](./packages/pi-halfdozen) | Private | Half Dozen client fleet knowledge |
| [@create-something/pi-webflow](./packages/pi-webflow) | Private | Webflow fleet knowledge |

The project-local `.pi/` directory provides the full development harness configuration. See [AGENTS.md](./AGENTS.md) and [docs/AGENCY_CODEX_VECTOR_STRATEGY.md](./docs/AGENCY_CODEX_VECTOR_STRATEGY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). At minimum, run the relevant lane checks for the code you changed.
