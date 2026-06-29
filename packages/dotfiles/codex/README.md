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
- `debug-feedback-loop` - repro-first debugging for bugs, failing checks, flaky behavior, and performance regressions
- `deep-module-design` - interface and module design using leverage, locality, tests, and tier ownership
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
Use $debug-feedback-loop to diagnose this failing check before patching.
Use $deep-module-design before refactoring this workflow interface.
Use $tdd-vertical-slice to add this behavior through a public interface test.
```
