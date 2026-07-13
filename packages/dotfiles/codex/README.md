# Codex Skills

Repo-owned Codex skills live here so CREATE SOMETHING can version its judgment layer alongside code.

## Install

```bash
pnpm --filter @create-something/dotfiles install-codex-skills
```

This symlinks repo-owned skills into `~/.codex/skills` without deleting unrelated global skills.

## Current Skills

- `bootstrap-gitpod-ona` - prepare Gitpod/Ona or other fresh workspaces so repo-owned Codex skills are installed and verified
- `canon-design-review` - Canon-aligned critique and polish for UI work
- `canon-public-surface` - public-page and landing-page polish without generic SaaS drift
- `claude-agent-cli-handoff` - route bounded work to the local Claude CLI when Claude owns the needed tools or connectors
- `debug-feedback-loop` - repro-first debugging for bugs, failing checks, flaky behavior, and performance regressions
- `deep-module-design` - interface and module design using leverage, locality, tests, and tier ownership
- `intent-mapping` - decision, scope, validation, and handoff capture before ambiguous or long-running work
- `svg-education-precision` - exact educational SVGs from structured specs with overflow, text-fit, collision, and browser-render gates
- `tdd-vertical-slice` - test-first behavior slices through public interfaces
- `webflow-template-review-reviewer`
- `webflow-template-review-analysis-calibration`
- `webflow-template-review-write-guardrails`
- `webflow-template-review-pilot-triage`

## Usage

Invoke these explicitly in Codex when you want the repo's judgment layer:

```text
Use $bootstrap-gitpod-ona to prepare this Gitpod workspace before coding.
Use $canon-design-review on this component.
Use $canon-public-surface to tighten this hero and CTA.
Use $claude-agent-cli-handoff to package this Airtable update for Claude CLI.
Use $debug-feedback-loop to diagnose this failing check before patching.
Use $deep-module-design before refactoring this workflow interface.
Use $intent-mapping before turning this ambiguous request into implementation work.
Use $svg-education-precision for an exact workflow, policy, comparison, system, or evidence diagram.
Use $tdd-vertical-slice to add this behavior through a public interface test.
```

## Testing

Run the deterministic skill gate for every repo-owned skill change:

```bash
pnpm agent:skills:test
```

That gate verifies skill files exist in the Codex and Pi/package surfaces,
frontmatter is valid, discovery docs mention the skills, and the Codex installer
can link them into a temporary `CODEX_HOME`.

For skills that shape important runtime behavior, add focused behavioral
fixtures to `scripts/test/agent-skills-effectiveness.test.mjs`. Keep these
fixtures deterministic: assert the skill encodes the required process, packet
shape, commands, stop conditions, and evidence surfaces. Do not make this gate
depend on a live model call. `intent-mapping` is the current example: the test
checks its Intent Packet fields and prompt-like scenarios for ambiguous
workflow mapping, shared implementation handoff, and solo exploratory work.

Use this focused validation set before PRs:

```bash
pnpm agent:skills:test
pnpm exec prettier --check <touched skill/docs/test files>
git diff --check -- <touched skill/docs/test files>
pnpm agent:solo-loop:check
```

Broaden to package, lint, or repo-wide checks when a skill change touches shared
scripts, install behavior, package exports, or production promotion surfaces.
