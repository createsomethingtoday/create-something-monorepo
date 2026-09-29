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

`/reference` contains 523 English lesson narratives imported from [AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch) at the pinned revision in `src/lib/content/reference/catalog.generated.ts`. The upstream MIT license is preserved at `src/lib/content/reference/LICENSE.upstream`. Each page credits Rohit Ghumare and contributors and links to the exact upstream lesson and runnable code. This library is reference material; the original CREATE SOMETHING path is authored separately.

Refresh the snapshot from a checked-out upstream repository:

```bash
node packages/lms/scripts/import-reference-curriculum.mjs /absolute/path/to/ai-engineering-from-scratch
```

The importer fails if the source lacks any of the 523 English lesson documents expected by this snapshot. Review the diff and source license before updating the public library.

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
