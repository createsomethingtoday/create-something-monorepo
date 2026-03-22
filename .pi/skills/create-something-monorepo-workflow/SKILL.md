---
name: create-something-monorepo-workflow
description: Follow the CREATE SOMETHING monorepo workflow in Pi. Use when starting work in this repository, choosing a lane, coordinating Loom work, or deciding which repo task or service to run.
---

# CREATE SOMETHING Monorepo Workflow

Use this skill when the task is about operating inside this repository rather than only editing one isolated file.

## Start Here

1. Read `AGENTS.md` for the repo operating model.
2. Read `docs/guides/PI_WORKFLOW.md` for the Pi host workflow in this repo.
3. Read `docs/guides/ONA_CORE_ROLLOUT.md` when the task touches runtime setup, project layout, secrets, or service alignment.
4. Treat `.ona/automations.yaml` as the source of truth for startup tasks, manual checks, and dev services.
5. Treat `.devcontainer/devcontainer.json` and `.ona/scripts/bootstrap.sh` as the source of truth for the pinned runtime.

## Runtime Rules

- Use the repo-pinned runtime:
  - Node `22.21.1`
  - pnpm `9.15.0`
- If bootstrap fails on a different local Node version, do not wave it through because `package.json` has a broader engine range.
- Prefer opening the repo through `.devcontainer/devcontainer.json` or using `./scripts/ona-bootstrap-local.sh` before improvising local fixes.

## Loom Rules

- In provisioned Ona or shared remote environments, skip `lm init`.
- Use `pnpm loom:remote ready` for shared remote work queues.
- Use `pnpm loom:remote done --task-id <id> --evidence "..."` for shared completion.
- Use `lm --local ...` only when you intentionally mean the repo-local `.loom` database.
- If a remote Loom wrapper requires an explicit agent identity, check the wrapper usage or existing repo conventions before retrying.

## Prefer Repo Tasks Over Ad Hoc Commands

When a task or service already exists in `.ona/automations.yaml`, prefer it over inventing a new shell sequence.

Use these first:

- `bootstrap` for workspace startup
- `repo-lint` for workspace linting
- `repo-check` for workspace validation
- `agency-check` and `agency-build` for agency-specific validation and builds
- `agency-dev`, `product-dev`, `services-dev`, or `platform-dev` for lane dev loops
- `webflow-dashboard-cloud-*` tasks and service for the Webflow Cloud app

## Lane Selection

Choose the smallest lane or package that matches the user request:

- `agency` for the agency product and preview deploy work
- `product` for product-lane app work such as `webflow-dashboard-cloud`
- `services` for service packages and backend loops
- `platform` for platform packages and shared infrastructure

Only broaden to repo-wide commands when the work clearly spans multiple lanes.

## Grounding Rules

- Do not guess exports, symbols, or import paths. Use `pnpm exports`.
- Prefer official repo sources before memory: `AGENTS.md`, `docs/guides/PI_WORKFLOW.md`, `docs/guides/ONA_CORE_ROLLOUT.md`, `.ona/automations.yaml`, `.devcontainer/devcontainer.json`, and package-local docs.
- When third-party APIs are unstable, use official docs or the configured MCP source instead of memory.

## Anti-Patterns

- Do not run `lm init` in a provisioned environment that already has remote Loom.
- Do not use bare `lm done` for shared remote work in this repo.
- Do not bypass `.ona/automations.yaml` with a custom command when an equivalent task or service already exists.
- Do not treat a newer Node version as equivalent to the pinned toolchain.
- Do not split the monorepo or move packages between lanes just to work around a local storage bottleneck.
- Do not use destructive git commands unless the user explicitly asks.

## Escalate

Slow down and verify before proceeding when:

- a remote Loom command fails because identity or task ownership is unclear
- the required project secret is missing
- the task spans multiple lanes and the narrowest owner is ambiguous
- a deploy or preview action would use project-scoped credentials
