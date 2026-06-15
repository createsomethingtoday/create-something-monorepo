---
name: create-something-monorepo-workflow
description: Follow the CREATE SOMETHING monorepo workflow in Ona. Use when starting work in this repository, bootstrapping an Ona environment, choosing a lane, coordinating Linear work, using Codex Agent, or deciding which repo task or service to run.
---

# CREATE SOMETHING Monorepo Workflow

Use this skill when the task is about operating inside this repository rather than only editing a single isolated file.

## Start Here

1. Read `AGENTS.md` for the repo operating model.
2. Read `docs/guides/ONA_CORE_ROLLOUT.md` when the task touches Ona environment setup, project layout, secrets, or runtime alignment.
3. Treat `.ona/automations.yaml` as the source of truth for startup tasks, manual checks, and dev services.
4. Treat `.devcontainer/devcontainer.json` and `.ona/scripts/bootstrap.sh` as the source of truth for the pinned runtime.
5. Use Linear for tracked work, ownership, status, and evidence.

## Runtime Rules

- Use the repo-pinned runtime:
  - Node `22.21.1`
  - pnpm `9.15.0`
- If bootstrap fails on a different local Node version, do not wave it through because `package.json` has a broader engine range.
- Prefer opening the repo through `.devcontainer/devcontainer.json` or using `./scripts/ona-bootstrap-local.sh` before improvising local fixes.

## Linear Rules

- Run `pnpm linear:ready` or the `linear-ready` task before starting tracked work when Linear context is needed.
- Use `pnpm linear:list -- --status open` to find existing work before creating a duplicate.
- Use `pnpm linear:create -- --title "..." --description "..." --label code-quality` when the work is not already tracked.
- Use `pnpm linear:claim -- --issue CRE-123` before implementation.
- Use `pnpm linear:comment -- --issue CRE-123 --body "..."` for intermediate evidence.
- Use `pnpm linear:done -- --issue CRE-123 --evidence "Validation: ..."` only when the issue is genuinely complete.
- The wrapper requires `LINEAR_API_KEY` in the environment. Store it in Ona user/project secrets or Infisical, never in repo files.
- Do not create new Loom work. Legacy `lm-*` IDs are historical migration context only.

## Codex Agent In Ona

- Codex Agent runs separately from Ona Agent but uses the same project context, environment isolation, integrations, and guardrails.
- Use the Codex conversation option only after the organization has enabled Codex Agent for Ona Cloud.
- If a user connects ChatGPT to Ona, Codex model requests use that user's ChatGPT plan. The environment still consumes Ona compute while running.
- Keep implementation instructions in `AGENTS.md` and deeper workflow detail in `docs/` or `.ona/skills/`; do not fork separate guidance for Ona Agent and Codex Agent unless their behavior truly diverges.

## Prefer Repo Tasks Over Ad Hoc Commands

When a task or service already exists in `.ona/automations.yaml`, prefer it over inventing a new shell sequence.

Use these first:

- `bootstrap` for workspace startup
- `linear-ready` for Linear wrapper and secret validation
- `repo-lint` for workspace linting
- `repo-check` for workspace validation
- `agency-check` and `agency-build` for agency-specific validation/builds
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
- Prefer official repo sources before memory: `AGENTS.md`, `docs/guides/ONA_CORE_ROLLOUT.md`, `.ona/automations.yaml`, `.devcontainer/devcontainer.json`, and package-local docs.
- When third-party APIs are unstable, use official docs or the configured MCP source instead of memory.

## Anti-Patterns

- Do not run `lm init` in Ona environments.
- Do not use `lm`, local `.loom`, or `pnpm loom:*` for new work in this repo.
- Do not bypass `.ona/automations.yaml` with a custom command when an equivalent task or service already exists.
- Do not treat a newer Node version as equivalent to the pinned toolchain.
- Do not split the monorepo or move packages between lanes just to work around a local storage bottleneck.
- Do not use destructive git commands unless the user explicitly asks.

## Escalate

Slow down and verify before proceeding when:

- Linear authentication, issue ownership, or task status is unclear
- the required Ona project secret is missing
- the task spans multiple lanes and the narrowest owner is ambiguous
- a deploy or preview action would use project-scoped credentials
