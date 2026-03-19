# Codex Skills

Repo-owned Codex skills live here so CREATE SOMETHING can version its judgment layer alongside code.

## Install

```bash
pnpm --filter @create-something/dotfiles install-codex-skills
```

This symlinks repo-owned skills into `~/.codex/skills` without deleting unrelated global skills.

## Current Skills

- `bootstrap-gitpod-osa` - prepare Gitpod/Osa or other fresh workspaces so repo-owned Codex skills are installed and verified
- `canon-design-review` - Canon-aligned critique and polish for UI work
- `canon-public-surface` - public-page and landing-page polish without generic SaaS drift
- `webflow-template-review-reviewer`
- `webflow-template-review-analysis-calibration`
- `webflow-template-review-write-guardrails`
- `webflow-template-review-pilot-triage`

## Usage

Invoke these explicitly in Codex when you want the repo's judgment layer:

```text
Use $bootstrap-gitpod-osa to prepare this Gitpod workspace before coding.
Use $canon-design-review on this component.
Use $canon-public-surface to tighten this hero and CTA.
```
