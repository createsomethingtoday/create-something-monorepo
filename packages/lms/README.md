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

## Public foundation service

`/foundation` is the reusable client onboarding guide. Its downloadable files live
in `static/foundation/`. The service exposes only public educational content:

- `POST /api/foundation/mcp`: stateless Streamable HTTP MCP with
  `search_foundation` and `get_foundation_lesson`.
- `GET /api/foundation`: version, inventory, limits and connection metadata.
- `GET /api/foundation/search?query=memory&limit=3`: bounded search.
- `GET /api/foundation/lesson?id=original/governed-agent-engineering/build-the-loop`:
  bounded lesson content. Optional `section`, `offset`, `maxChars`, `revision`.

`src/lib/server/foundation/core.ts` owns retrieval semantics. The generated index
is an allowlist derived from `PATHS` and `REFERENCE_CATALOG`, with content hashes,
source links, attribution and a corpus revision. Builds regenerate it; CI/test
checks fail on a stale index. No arbitrary path or URL fetching is offered.

The auth hook bypasses learner identity processing for these endpoints. Both
interfaces share an atomic D1 quota of 60 requests per fixed minute per network
address. The only writes are transient hashed request counters in
`foundation_rate_limits`; no query text, progress or client knowledge is stored.
Counters older than two minutes are removed on subsequent requests. The guard
fails closed with 503 if D1 is unavailable. Limits cover service use, not a
global spend cap or a guarantee against distributed traffic. MCP browser Origins
must match the request origin or Learn; desktop/server clients omit Origin.
Public HTTP GET supports cross-origin access without credentials.

```sh
pnpm --filter @create-something/lms foundation:index
pnpm --filter @create-something/lms foundation:test
pnpm --filter @create-something/lms check
pnpm --filter @create-something/lms foundation:smoke -- http://127.0.0.1:4173 --rate-limit
```

The smoke uses the real TypeScript MCP SDK. `--rate-limit` sends a bounded burst
and verifies 429/Retry-After; wait until the next minute before other checks from
the same address. It verifies transport, retrieval parity and negative paths;
the agent policy scenario and rendered onboarding checks are separate evidence.

Before deploying this release, apply only its new additive table to the existing
LMS database (from `packages/lms`, with the normal deployment credentials):

```sh
node ../../scripts/run-wrangler.mjs d1 execute lms-db --remote --file migrations/0007_foundation_rate_limits.sql
```

Use `--local` instead for development. Do not apply unrelated historical migrations
as part of this release. Deploy through the normal PR gate and verify production:

```sh
pnpm --filter @create-something/lms foundation:smoke -- https://learn.createsomething.space --rate-limit
```

Rollback to the recorded previous Pages deployment if necessary; retain the
additive counter table so rollback does not delete data. Curriculum updates
require license/source review, regenerated index, relevance tests and a new
verified release. Existing `packages/learn` authentication/progress tools remain
a separate service and are never exposed by foundation discovery.

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

The controlled `Property Pages Deploy` workflow applies and checks only migration `0007_foundation_rate_limits.sql` for LMS before publishing handlers. Its Cloudflare repository credential requires D1 Edit as well as Pages deployment access. A missing permission or schema failure stops the release.
