# Public workshop image alignment

Reference: deployed Agency PR2045 (merge cc86a62e4fa36ecfd9106e57434877725b803f63), its `agencyPreviewOriginalImages.ts` story map and `VISUAL_STORY_RELEASE.md`. Current `.space` README and UNDERSTANDING define the public workshop, catalog, and retained tools. No older lesson IA was revived.

## Route inventory and story

| Route | Treatment / purpose | Asset |
| --- | --- | --- |
| `/` | Image-led introduction to openly shared tools; same Explore Projects and Workbench links | `products-workbench-paths-continuity-v2` (wide shared workshop) |
| `/projects` | Compact image opening before URL-backed search and type filters | `tool-fit-without-forcing` (macro: inspect fit) |
| `/projects/[slug]` | All 22 public catalog details retain usage, limits, install/source and related links | Explicit project map in `src/lib/workshop/scenes.ts` |
| `/about` | Contribution and publication context, existing prose retained | `about-careful-working-notes` |
| `/workbench` | Concise illustrated entrance; original tool, state and handoff links retained | `editorial-experiments-isolated-sandbox` |
| `/playground`, `/praxis`, `/motion`, `/data`, `/data/nba` and NBA child routes | Runtime interfaces retained; no decorative image inserted into task workspace | Existing interfaces |
| `/discover`, `/discover/[concept]` | Concept graph and detail behavior retained | Existing interfaces |
| `/workway/threshold-dwelling` | Independent spatial preview retained | Existing spatial assets |

The eight reused scenes were inspected as actual pixels before implementation. They show charcoal/ivory agents, realistic metal/paper texture and varied wide/macro compositions. No new generation was needed: the deployed approved scenes already explain this workshop's actual tasks. These are labeled concept illustrations, never runtime evidence, customer photographs or endorsements.

## Project-to-story mapping

- Ground, Template Preflight, App Preflight, Tufte: `ground-compare-before-claim` — inspect evidence and presentation before accepting a claim.
- Workflow Compiler, Workflow Runtime, Render Pipeline: `compiler-from-plan-to-tested-jig` — definition to inspectable output.
- Three-Tier Framework, Canon plugin/tokens, ASCII Renderer, Spritz, MCP Core: `tool-fit-without-forcing` — inspect and adapt reusable building blocks.
- Policy OS, Intent Mapping, Voice Validator, Understanding Graphs: `about-careful-working-notes` — retain intent, guidance, and context.
- Hermeneutic Review and Deep Module Design: `subtract-the-extra-route` — reuse/subtraction rather than unnecessary additions.
- Debug Feedback Loop: `editorial-upstream-shared-tool-repair` — repair the shared tool with a feedback loop.
- TDD Vertical Slice and Simulation: `editorial-experiments-isolated-sandbox` — bounded experiments and checks.

## Implementation and boundaries

`WorkshopScene` renders server-side with meaningful alt text, intrinsic dimensions, 640/960/full-width WebP srcsets, lazy secondary loading and eager high-priority openings. Derivatives preserve the complete approved composition. Reused full-size WebPs retain Agency bytes; smaller derivatives use Sharp resize with WebP quality 82. Local assets avoid cross-property image requests.

The workshop shell uses existing Canon operator tokens mapped locally to the public-page tokens. Legacy tool routes keep their prior palette and implementation. Original logo assets are preserved and inverted only in the workshop's dark navigation. The lightweight isometric route strip connects finding, inspecting, and reuse; it has a pause control and a static reduced-motion alternative. No shared Canon component edits, research writes, pricing edits, source/install destination changes, deployments, or production claims.

## Validation

`pnpm --filter @create-something/space check` passed: zero Svelte errors/warnings, 1 sitemap test, 22 workway tests and 5 workshop catalog/search tests. Production build passed; adapter warns that its pre-existing exclude list exceeds Cloudflare route limits and drops 94 exclude rules. This is an invocation-cost warning, not evidence of a new runtime failure.

See `screenshots/browser-evidence.json` and the review task's logs for actual-route, image, overflow, search and reduced-motion evidence. Browser checks cover desktop 1440, tablet 820, and mobile 390 across the five workshop route families. Legacy Worker execution is not established by catalog checks. Production promotion requires independent review and approval.
