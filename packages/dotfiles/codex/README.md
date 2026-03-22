# Codex Skills Compatibility Layer

Pi is the primary repo-owned agent surface for this repository. This directory remains as a compatibility layer for Codex users who still want the repo-owned skill set installed into `~/.codex/skills`.

## Install

```bash
pnpm --filter @create-something/dotfiles install-codex-skills
```

This symlinks compatibility skills into `~/.codex/skills` without deleting unrelated global skills.

## Current Skills

- `bootstrap-gitpod-ona` - prepare Gitpod/Ona or other fresh workspaces so repo-owned Codex skills are installed and verified
- `canon-design-review` - Canon-aligned critique and polish for UI work
- `canon-public-surface` - public-page and landing-page polish without generic SaaS drift
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
```
