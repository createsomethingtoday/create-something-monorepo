# Half Dozen Monthly Editorial Plugin

This repo-owned Codex plugin turns a verified monthly selection of Half Dozen
technical work into an approval-ready article draft. It is intentionally a
drafting workflow, not a publishing integration.

## Use it for a monthly article draft

Ask Codex to use `halfdozen-monthly-article` with a date window and a source
set of reviewed work. The source set can include merged pull requests, releases,
deployment receipts, approved internal records, or a client-approved work log.
The plugin produces a draft and an evidence ledger for review.

Before use, read the skill at
`halfdozen-monthly-editorial/skills/halfdozen-monthly-article/SKILL.md`.

## V1 boundary

The plugin does not connect to a CMS, create a scheduled job, send a newsletter,
post to social media, or modify a client system. An operator must explicitly
approve any later publication workflow outside this plugin.

## Validate

```bash
python3 /Users/micahjohnson/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  packages/halfdozen-editorial-plugin/halfdozen-monthly-editorial
node --test packages/halfdozen-editorial-plugin/test/editorial-plugin.test.mjs
```
