# @create-something/lms

CREATE SOMETHING Learning Management System.

**Live**: [learn.createsomething.space](https://learn.createsomething.space)

## Purpose

Teaching the ethos through practice. The LMS combines original CREATE SOMETHING field courses with an attributed AI engineering reference library. The original courses start with a governed agent loop, an operator MCP workflow, and Canon images that make policy gates, receipts, and handoff state visible.

## Learning Paths

- **Engineer a Governed Agent** - Six original lessons from a real job through loop, tools, policy, evaluation, and handoff. Grantbot/GiGi inform the case notes without claiming live device or provider acceptance.
- **Build Your First Business MCP** - A Codex operator workflow.
- **Make Your Workflow Visible** - Canon proof images for boundaries and gates.

## Reference Library

`/reference` contains 523 English lesson narratives imported from [AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch) at the pinned revision in `src/lib/content/reference/catalog.generated.ts`. The upstream MIT license is preserved at `src/lib/content/reference/LICENSE.upstream` and served at `/reference-license.txt`. Interactive figure scripts from the same revision live in `static/reference-figures/` and load only when a lesson uses them. Mermaid is bundled locally and loads only for diagram lessons. Each page credits Rohit Ghumare and contributors and links to the exact upstream lesson and runnable code. This library is reference material; the original CREATE SOMETHING path is authored separately.

Refresh the snapshot from a checked-out upstream repository:

```bash
node packages/lms/scripts/import-reference-curriculum.mjs /absolute/path/to/ai-engineering-from-scratch
```

The importer stages all lessons and figure providers before replacing the checked-in snapshot. It runs the upstream `site/build.js` to derive figure routing, and an incomplete checkout fails without changing the current library. It may update generated files in the local upstream checkout. Review the diff and source license before updating the public library.

## Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind + Canon tokens
- **Database**: Cloudflare D1
- **Auth**: Identity Worker integration
- **Deployment**: Cloudflare Pages

## Development

```bash
pnpm dev --filter=lms
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/routes/+page.svelte`, `src/routes/paths/+page.svelte`, `src/routes/progress/+page.svelte` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check` |
| Validation surfaces | Svelte check output, route preview, learning path/progress route responses |
| UI validation path | `/`, `/paths`, `/progress` |
| Escalation rule | stop if learner identity, D1 progress state, or curriculum semantics cannot be validated from local fixtures or documented source content |

## Deployment

```bash
pnpm --filter=lms build
wrangler pages deploy packages/lms/.svelte-kit/cloudflare --project-name=createsomething-lms
```

## Related

- `packages/identity-worker` - Authentication
- `packages/components` - Shared UI components
- `.claude/rules/css-canon.md` - Design tokens
