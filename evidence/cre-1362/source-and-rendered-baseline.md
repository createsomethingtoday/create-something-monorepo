# CRE-1362 source and rendered baseline

Date: 2026-07-20

Exact base: `origin/main` at `9de7c0f6f6d8a8458fc1b54dee30c37ec1dfeb40`

Worktree: `/Users/micahjohnson/Code/create-something-worktrees/cre-1362-agent-worktree`

Branch: `codex/CRE-1362-agent-worktree`

Status: baseline only. No production source changed.

## Boundary

The executable `io-experiments` registry group owns 19 checked-in page implementations:

- `experiments/[slug]`
- seventeen dedicated `experiments/*` detail routes
- `visualizations/arena-scale`

The separate `/experiments` index is excluded. CRE-1331 and PR #1017 own that route.

Earlier IO template, catalog, visual, and mobile-overflow issues are completed historical context, not current ownership. No open pull request changes these 19 implementations.

## Preservation inventory

The eighteen `experiments/*/+page.svelte` implementations contain 15,221 lines and 448,532 bytes. `/visualizations/arena-scale/+page.svelte` adds 651 lines and 15,651 bytes. The complete page-source boundary is therefore 15,872 lines and 464,183 bytes before shared Canon components.

Thirteen companion `+page.server.ts` files contain 477 lines and 14,416 bytes. Ten dynamic experiment Markdown files contain 1,660 lines, 7,435 words, and 68,681 bytes.

The current catalog reports:

- 19 static experiment routes
- 21 file-based experiment entries
- 4 static-only catalog entries
- 2 cross-property redirects

The preservation boundary includes all substantive content and behavior. That means every title, description, hypothesis, result, limitation, reference, code sample, diagram, control, generated visual, source link, redirect, completion state, and related-artifact destination.

## Source shape

The cohort is not one page type despite its single `tool` registry contract.

- The dynamic route uses Canon `ResearchArtifactPage` and can render long Markdown research artifacts.
- `agent-operations` is a live status surface.
- `ai-native-filtering`, `ascii-renderer`, `canvas-interactivity`, both Living Arena routes, both render routes, Spritz, and Arena Scale expose interactive controls.
- Agentic Visualization, Awwwards Patterns, Hybrid Scheduling, IC MVP Pipeline, Kinetic Typography, and Text Revelation behave primarily as long editorial reports.
- Data Patterns and Diagrams behave as component or evidence galleries.

Individual Svelte pages range from 261 to 2,775 lines. Rendered pages expose between 2 and 16 H2 headings including the shared newsletter heading. Several page families already include an `ExperimentVisualSummary`, but the summary does not bound the report or repair dead controls.

## Existing automated checks

Baseline commands pass:

```text
pnpm --dir packages/io check
  Research artifact templates OK: shared dynamic routes active,
  40 legacy paper route exceptions, 19 legacy experiment route exceptions.
  Visual communication metadata OK.
  Experiment catalog OK: 19 static routes, 21 file-based entries,
  4 static-only catalog entries, 2 legacy redirects.
  svelte-check found 0 errors and 0 warnings.

pnpm --dir packages/io build
  adapter-cloudflare production build passed.

pnpm performance:pages:check
  229/229 registered, 36 migrated, 181 pending, 12 technical exclusions.
```

These checks prove source integrity, catalog coverage, and buildability. They do not prove whole-page reader clarity or task completion.

## Rendered matrix

The production build was served locally at `http://127.0.0.1:4177`. Playwright loaded one dynamic instance plus every dedicated source at 390x844 and 1440x900.

All 38 successful viewport checks returned HTTP 200 with exactly one H1 and one layout-owned main. No page increased the document scroll width beyond the viewport. The mobile baseline remains materially heavy:

| Route                                   | Mobile height | Rendered H2 count | Main controls with JavaScript |
| --------------------------------------- | ------------: | ----------------: | ----------------------------: |
| `/experiments/webflow-analyzer-lineage` |      13,994px |                16 |    0 visible content controls |
| `/experiments/agent-operations`         |       4,626px |                 5 |                             0 |
| `/experiments/agentic-visualization`    |      16,208px |                13 |                             0 |
| `/experiments/ai-native-filtering`      |      13,893px |                12 |                             7 |
| `/experiments/ascii-renderer`           |       5,590px |                 7 |                 5 plus inputs |
| `/experiments/awwwards-patterns`        |      14,616px |                11 |                             0 |
| `/experiments/canvas-interactivity`     |       7,633px |                 6 |                             7 |
| `/experiments/data-patterns`            |       6,400px |                 6 |                             0 |
| `/experiments/diagrams`                 |       7,988px |                 8 |                             0 |
| `/experiments/hybrid-scheduling`        |      16,563px |                10 |                             0 |
| `/experiments/ic-mvp-pipeline`          |      11,039px |                10 |                             0 |
| `/experiments/kinetic-typography`       |      11,737px |                10 |                             0 |
| `/experiments/living-arena`             |      16,114px |                 6 |                            13 |
| `/experiments/living-arena-gpu`         |       7,849px |                 3 |       11 including seed input |
| `/experiments/render-preview`           |       5,875px |                 5 |                             1 |
| `/experiments/render-studio`            |       5,220px |                 5 |                             1 |
| `/experiments/spritz`                   |      12,373px |                11 |                            11 |
| `/experiments/text-revelation`          |      11,013px |                10 |                             0 |
| `/visualizations/arena-scale`           |       4,451px |                 2 |                             6 |

Baseline screenshots are in `output/playwright/cre-1362-baseline/` and include first-viewport and full-page captures for Agentic Visualization, Hybrid Scheduling, AI-Native Filtering, Living Arena, and Arena Scale.

## Material findings

### 1. The existing pass is a catalog pass, not a reader pass

The IO checker explicitly calls all 19 implementations “legacy experiment route exceptions.” It validates that they exist and remain wired to the catalog. It does not ask whether a junior practitioner can identify the experiment, run it, interpret the result, or continue.

The clearest examples are Agentic Visualization at 13 rendered H2s / 16,208 mobile pixels and Hybrid Scheduling at 10 H2s / 16,563 mobile pixels. Both build cleanly, but both present a report stack rather than a bounded experiment path.

### 2. Ten implementations expose dead controls without JavaScript

With JavaScript disabled at 390x844, complete text remains available, but the following main controls remain visible and inert:

- dynamic Research Artifact: `Copy link`, `Page actions`
- AI-Native Filtering: demo visibility, prompt, filter, structured-filter, and example-query controls
- ASCII Renderer: scene, pause, and rendering inputs
- Canvas Interactivity: canvas controls and PNG/SVG/copy actions
- Living Arena: live/mode/scenario/incident controls
- Living Arena GPU: live/share/scenario controls
- Render Preview and Render Studio: `Load Demo`
- Spritz: playback, navigation, restart, and speed controls
- Arena Scale: six pattern-selection controls

This is false affordance, not graceful no-JavaScript meaning.

### 3. Agent Operations turns missing data into apparent success

The server loader converts failed status, health, or log requests to `null` or empty arrays without setting an error. The page then computes a 100% success rate when `totalRuns === 0`.

The local rendered state says:

```text
Total Runs (7d) 0
Success Rate 100.0%
Total Cost (7d) $0.00
Active Agents 0
```

That state is not proof of healthy operations. The page needs an explicit unavailable or no-data distinction before it can function as evidence.

### 4. Living Arena has a visible-title defect and a console error

The Living Arena H1 exists in the accessibility tree but is visually absent in the first mobile viewport. Its text uses transparent fill over a gradient whose variables do not resolve to a visible result in this context.

Both viewports also emit:

```text
Error: <rect> attribute width: Expected length, "auto".
```

The source contains `<rect width="auto">`, which is invalid SVG.

### 5. Reduced motion is incomplete

In a reduced-motion browser context:

- Living Arena still reported 39 then 26 running Web Animations.
- Arena Scale continued its requestAnimationFrame rotation; the central transform changed from about 4.8 to 10.72 degrees over 300ms and 22 animations remained active.

The information is still present, but the motion preference is not respected.

### 6. Metadata is duplicated or missing

Every `/experiments/*` page renders both the inherited IO-root canonical/OG metadata and its route-specific metadata. Each therefore has two canonical links, two robots directives, two OG URLs, and two descriptions.

Arena Scale supplies only title and description. It inherits the IO-root canonical and OG URL and has no route-specific canonical for `/visualizations/arena-scale`.

This duplicate layout SEO defect is inherited across IO and already recorded by other cohorts. CRE-1362 must not silently claim it is route-local, but its final evidence must not treat the conflicting metadata as a pass.

### 7. Failure and redirect states are inconsistent

Both cross-property redirects correctly return HTTP 301 before navigation:

```text
/experiments/minimal-capture
  -> https://createsomething.space/experiments/minimal-capture

/experiments/motion-ontology
  -> https://createsomething.space/experiments/motion-ontology
```

An invented dynamic slug returns HTTP 500 in the credential-free local production preview. The database lookup fails before the route can establish a not-found result. The route cannot currently demonstrate a local unknown-slug 404 without a database fixture.

### 8. First encounters still assume internal vocabulary

Material examples include:

- “agentic component,” “runtime judgment,” and Tufte principles before a concrete user outcome
- “Modal-deployed agents” and “Subtractive Triad” on Agent Operations
- “IC MVP,” “agentic translation,” and Webflow component internals
- “WORKWAY Pattern Engine,” “compound intelligence effect,” and “arena-scale automation” on Arena Scale
- “AI-native automations orchestrating arena systems through WORKWAY pattern collection” in Living Arena metadata

Some newer model cards are much clearer. Examples include “The best filter interface may be the user saying what they mean” and “A living arena helps, but the human still decides.” Those cards show the right direction. They do not prove that the complete paths pass.

## Target-reader verdict

Verdict: `revise`.

Least-tenured credible reader: a junior designer or developer who can use a browser and ordinary interface controls. They can follow a concrete technical explanation. They do not know CREATE SOMETHING vocabulary or the history of these artifacts.

The reader can usually identify the page topic. They cannot reliably answer all four required questions across the family:

1. What should I try or inspect?
2. What state or result counts as evidence?
3. What limitation changes how I should interpret it?
4. What should I do next?

Material friction remains. It includes report-length section stacks, false no-JavaScript affordances, ambiguous unavailable data, unresolved motion, the missing Living Arena title, conflicting metadata, and unexplained first-encounter vocabulary. Under the durable goal, any one of those findings prevents `pass`.

## Baseline commands

```text
pnpm bootstrap:worktree
pnpm agent:solo-loop:check
pnpm --dir packages/io check
pnpm --dir packages/io build
pnpm performance:pages:check
curl -D - http://127.0.0.1:4177/experiments/minimal-capture
curl -D - http://127.0.0.1:4177/experiments/motion-ontology
curl http://127.0.0.1:4177/experiments/definitely-not-real
Playwright 19-route mobile/desktop matrix
Playwright 19-route no-JavaScript matrix
Playwright metadata, focusable-control, reduced-motion, and screenshot checks
```

## Next contract

The fail-first contract must preserve all 19 implementations and their substantive evidence while requiring:

- a truthful registry split or contract for editorial, gallery, status, and interactive experiment modes
- one plain first encounter per page
- a bounded experiment spine rather than unstructured peer sections
- progressive enhancement for every control
- explicit unavailable, failure, and result states
- visible H1s, valid SVG, reduced-motion equivalence, and route-consistent metadata evidence
- one earned continuation to related research, the next experiment, or a recovery path
