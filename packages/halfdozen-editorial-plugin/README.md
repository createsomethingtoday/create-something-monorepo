# Half Dozen Editorial Plugin

This repo-owned Codex plugin reviews approved Half Dozen context every 14 days
and turns the one idea most useful to Half Dozen's audience into an
approval-ready article draft. The context may be operational, client-facing,
systems-oriented, or technical. Intricacy is not a selection advantage.

The plugin is intentionally a drafting workflow, not a publishing or scheduling
integration.

## Audience and selection

The target reader is the least-tenured credible owner or operator in live
events, entertainment, or client-service work. They understand their field but
do not arrive knowing Half Dozen's systems vocabulary.

Each run reviews context added or reconsidered since the previous 14-day
cutoff. Older approved material remains eligible when it supports the strongest
current article. Candidate ideas are ranked by:

1. relevance to the audience's operating work;
2. clarity of the problem or tension;
3. strength and public safety of the evidence; and
4. usefulness of the takeaway.

Technical detail belongs in the article only when it helps that reader
understand the operating consequence or an important limit.

## Use it for an every-14-days article draft

Ask Codex to use `halfdozen-audience-article` with a review window and a bounded
set of approved context. The source set can include public work stories, merged
pull requests, releases, deployment receipts, approved internal summaries,
client-approved work logs, or the approved evergreen content backlog.

The plugin returns the selected theme and rationale, an evidence ledger, weaker
or excluded candidates, and a review-ready draft. It may return a hold instead
of forcing an article when no candidate is relevant, well supported, and safe.

Before use, read the skill at
`halfdozen-editorial/skills/halfdozen-audience-article/SKILL.md`.

## Boundary

The plugin does not connect to a CMS, create a scheduled job, send a newsletter,
post to social media, or modify a client system. An operator must explicitly
approve any later publication workflow outside this plugin.

## Validate

```bash
uv run --with pyyaml python \
  /Users/micahjohnson/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  packages/halfdozen-editorial-plugin/halfdozen-editorial
uv run --with pyyaml python \
  /Users/micahjohnson/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  packages/halfdozen-editorial-plugin/halfdozen-editorial/skills/halfdozen-audience-article
node --test packages/halfdozen-editorial-plugin/test/editorial-plugin.test.mjs
```
