# template-review-skill

A composable Claude Code skill for reviewing Webflow Marketplace template submissions against the official quality rubric and submission guidelines.

## Install

Copy this folder to either:

- **Personal** (`~/.claude/skills/template-review/`) — available in every project
- **Project** (`.claude/skills/template-review/`) — available only in this repo

```bash
cp -r packages/template-review-skill ~/.claude/skills/template-review
```

The skill entry point is `SKILL.md` — Claude Code reads its frontmatter to register the skill.

## Invoke

In a Claude Code session:

```
/template-review https://aurae-temlis.webflow.io/
```

Or with a queue version_id (requires `wf-template-review-micah-bridge` MCP):

```
/template-review --version-id <id>
```

Or just describe what you want in natural language — Claude will pick up the skill if your request matches its `description`:

> "Review the template at https://aurae-temlis.webflow.io against the marketplace submission guidelines."

## What it does

1. Crawls the published template (home, style guide, licenses, changelog, instructions, 404, and main nav pages)
2. Runs every binary check from `criteria/checklist.md` and `criteria/new-requirements.md`
3. Assesses each dimension of `criteria/rubric.md` at Satisfactory / Good / Exceptional
4. Flags Designer-only and visual-only checks for the human reviewer
5. Produces the report in `output/review-template.md` shape

## What it doesn't do

- Run PageSpeed Insights (no headless browser — flags as manual)
- Render JS / inspect interactions at runtime (flagged as visual-review)
- Open the Webflow Designer (Designer-only items flagged for the human)
- Make a final accept/reject decision — outputs a recommendation; the human reviewer sets status

## File map

```
template-review-skill/
├── SKILL.md                          # Entry point — Claude Code reads frontmatter
├── README.md                         # This file
├── criteria/
│   ├── rubric.md                     # 3-tier quality rubric
│   ├── checklist.md                  # Hard requirements
│   └── new-requirements.md           # GSAP, image sizes, thumbnails, OG specs
├── checks/
│   ├── automated.md                  # HTML / HTTP verifiable
│   └── manual.md                     # Judgment-based
└── output/
    └── review-template.md            # Report shape
```

## Updating the criteria

The rubric and guidelines change. To update:

1. Re-fetch https://webflow.com/templates/grading-rubric → update `criteria/rubric.md`
2. Re-fetch https://webflow.com/templates/submission-guidelines → update `criteria/checklist.md` and `criteria/new-requirements.md`
3. Commit. Teammates pull and the skill picks up the new criteria on next invocation.

The skill itself doesn't need code changes when criteria change — `SKILL.md` references the files by relative path.

## Sharing with teammates

Three options, easiest to most controlled:

| Approach | Steps |
|----------|-------|
| **Folder copy** | `cp -r packages/template-review-skill ~/.claude/skills/template-review` on each teammate's machine |
| **Git submodule** | Add this folder as a submodule in each teammate's `~/.claude/skills/` |
| **Internal package** | Publish to your internal registry; install per project under `.claude/skills/` |

Teammates need the `wf-template-review-micah-bridge` MCP connected only if they want the queue-pull / draft-save flow. Without it, the skill still works end-to-end against any URL.
