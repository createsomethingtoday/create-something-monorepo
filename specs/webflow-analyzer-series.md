# Webflow Analyzer Series Review

## Purpose

Review the repository history around the Webflow analyzer work and define what a full multi-artifact story should look like across:

- `experiments`
- `papers`
- `remotion`
- `social`
- `lms`
- `marketing`

This is a story-planning document, not a product spec.

## Short Answer

The strongest story is **not** "we built a site analyzer."

The stronger story is:

> We started with narrow Webflow analysis problems, discovered that review actually spans multiple truth surfaces, and turned the analyzer into a governed review system that now reaches both reviewers and creators.

That gives the series a clean arc:

1. **Origin**: plagiarism and similarity analysis
2. **Expansion**: browser-backed MCP review tooling
3. **Governance**: policy snapshots, manual boundaries, queues, feedback
4. **Productization**: reviewer hubs, validation app, creator autofill, submission UX

## Git History Review

### Phase 1: Origin in analysis and experiments

- `52878ccf` on `2026-01-31`
  - Added `packages/io/content/experiments/webflow-plagiarism-detection.md`
  - Framed the problem as agent-native template analysis using classic algorithms plus AI
  - This is the first clear "why does this exist?" artifact

### Phase 2: Analyzer becomes an MCP server

- `bc8b5a9e` on `2026-02-06`
  - Added `packages/webflow-site-analyzer-mcp/`
  - Introduced browser-backed extraction, Designer metadata collection, observability, versioned scripts, and the self-improvement layer
  - This is the first point where the work becomes infrastructure, not just research

### Phase 3: Review becomes policy-grounded

- `c574e212` on `2026-02-18`
  - Added the canonical policy context pipeline
  - Moved the system from "collecting evidence" to "reviewing against a live external policy artifact"

- `a7758624` plus the `2026-03-02` cluster
  - Coverage analysis, checklist analysis, Archipro review runs, human-vs-automated boundary work
  - This is where the real review story hardens

### Phase 4: Reviewer operations and remote execution

- `1fa19860` on `2026-03-27`
  - Added remote deployment, job queueing, Airtable feedback pipeline, DOM fallback coverage, and broader production review flows
  - This is the "operating system for review" moment

### Phase 5: Public articulation and capability expansion

- `963f0487` on `2026-04-13`
  - Published `packages/io/content/papers/analyzer-mcp-review-architecture.md`
  - This is the flagship architecture explanation already in the repo

- `919aefb0` on `2026-04-13`
  - Added 43 analyzer improvements, Worker deployment, hub connectivity, new review checks, and name validation
  - This is the "production hardening + distribution" moment

- `7033af53` on `2026-04-13`
  - Imported `packages/webflow-template-validation/`
  - This opens a creator-facing validator story alongside the reviewer story

### Phase 6: Submission UX and autofill

- `95921a7e` on `2026-04-21`
  - Added analyzer autofill to `apps/webflow-dashboard-cloud`

- `c41e2988` on `2026-04-21`
  - Added analyzer autofill to `apps/marketplace-template-submission-cloud`

- `2026-04-22` to `2026-04-23` commit cluster
  - Polished summary UX, upload behavior, validation flow, iframe behavior, webhook mapping, success states
  - This is where the analyzer clearly becomes a creator-facing submission copilot

## Existing Artifacts Already in the Repo

### Existing anchor artifacts

- Experiment:
  - `packages/io/content/experiments/webflow-plagiarism-detection.md`

- Paper:
  - `packages/io/content/papers/analyzer-mcp-review-architecture.md`

- Core product / platform docs:
  - `packages/webflow-site-analyzer-mcp/README.md`
  - `packages/webflow-template-validation/README.md`
  - `packages/webflow-template-analyzer/cloudflare/README.md`
  - `apps/marketplace-template-submission-cloud/README.md`

### What is missing

- A single artifact that explains the **full lineage** from experiment -> MCP -> governed review -> creator copilot
- A series slate that treats reviewer-side and creator-side surfaces as one system
- Social / motion / LMS / marketing assets that are explicitly organized around the analyzer story

## Recommended Core Narrative

Use one sentence across every surface:

> The Webflow analyzer became valuable when it stopped being a crawler and became a governed review system.

Then tailor each artifact to one audience:

- `experiments`: how the idea emerged
- `papers`: what architecture was actually built
- `remotion`: what changed visually and operationally
- `social`: the sharp ideas in public-friendly form
- `lms`: the reusable pattern others can learn from
- `marketing`: what the buyer or operator should understand quickly

## Recommended Series Structure

### Series title

`From Webflow Analyzer to Governed Review System`

### Suggested episode arc

1. `The Problem Was Never Just the Website`
2. `Why Browser Automation Was Not Enough`
3. `Policy Had to Become Data`
4. `Manual Review Is a Feature, Not a Failure`
5. `The Analyzer Moved Upstream Into Submission`

## Proposed Artifact Slate

### 1. Experiment

#### Goal

Bridge the existing plagiarism-detection experiment to the later review system.

#### Recommended artifact

- New experiment:
  - `packages/io/content/experiments/webflow-analyzer-lineage.md`

#### Suggested angle

`How a narrow Webflow analysis problem grew into a two-sided review system`

#### Suggested contents

- Jan -> Apr timeline
- what the original experiment got right
- what it could not explain yet
- why review required more than similarity or page crawling
- how the problem widened from detection to governance

### 2. Papers

#### Keep

- `packages/io/content/papers/analyzer-mcp-review-architecture.md`
  - This should remain the flagship architecture paper

#### Add

- New paper:
  - `packages/io/content/papers/webflow-analyzer-productization.md`

#### Suggested angle

`How the analyzer became a creator-facing submission copilot`

#### Suggested contents

- difference between reviewer tooling and creator autofill
- why April mattered more than "another analyzer feature"
- dashboard and submission integrations
- screenshots, autofill, validation summary, and name checks as productization steps
- the shift from internal system to user-visible workflow

### 3. Remotion

#### Goal

Show the analyzer in motion without overexplaining it.

#### Recommended assets

- Short product commercial:
  - `packages/motion-studio/src/commercials/webflow-analyzer/`
  - files should mirror existing patterns:
    - `SCRIPT.md`
    - `spec.ts`
    - `index.ts`
    - `WebflowAnalyzerCommercial.tsx`

- Longer explainer:
  - `packages/motion-studio/src/commercials/webflow-analyzer-timeline/`

#### Recommended cuts

- `30s commercial`
  - Hook: paste published URL
  - show validation pass
  - show autofill fields land
  - end on: `review faster, keep judgment human`

- `60-90s explainer`
  - show the three surfaces:
    - published site
    - Designer state
    - policy snapshot
  - then show the final submission UX

### 4. Social

#### Goal

Turn the series into sharp, separate public claims.

#### Recommended assets

- `packages/agency/content/social/linkedin-webflow-analyzer-01.md`
- `packages/agency/content/social/linkedin-webflow-analyzer-02.md`
- `packages/agency/content/social/linkedin-webflow-analyzer-03.md`
- `packages/agency/content/social/linkedin-webflow-analyzer-04.md`

#### Suggested post sequence

1. `The website was only one source of truth`
2. `Manual is a first-class review state`
3. `Policy should be fetched, hashed, and named`
4. `The interesting move was turning review into creator autofill`

#### Tone guidance

- low-jargon
- builder-led
- avoid "AI replaces reviewers"
- stress bounded automation and trust surfaces

### 5. LMS

#### Goal

Teach the reusable architecture, not just describe the project.

#### Recommended path

- Add a new path in `packages/lms/src/lib/content/paths.ts`
  - id: `webflow-analyzer`

- Add lessons in:
  - `packages/lms/src/lib/content/lessons/webflow-analyzer/`

#### Suggested lessons

1. `Why review spans multiple truth surfaces`
2. `How browser-backed MCP extraction works`
3. `Policy snapshots, provenance, and manual boundaries`
4. `Turning review output into creator-facing autofill`

#### Positioning

This should teach a reusable CREATE SOMETHING pattern:

`Database / Automation / Judgment applied to a real review workflow`

### 6. Marketing

#### Goal

Package the analyzer for operator, partner, or buyer understanding.

#### Recommended directory

- `packages/webflow-site-analyzer-mcp/marketing/`

#### Suggested files

- `README.md`
- `VALUE_PROPOSITION.md`
- `FAQ.md`
- `DEMO_FLOW.md`
- `COMPETITIVE_POSITIONING.md`

#### Suggested messaging

- not a generic QA crawler
- not a full-autonomy reviewer
- a governed review system with evidence, provenance, and bounded automation
- reviewer-side and creator-side value in one narrative

## Recommended Production Order

### Minimal viable series

Ship these first:

1. new experiment lineage piece
2. new productization paper
3. one 30-second Remotion commercial
4. four-post LinkedIn sequence

### Full series

Then add:

5. LMS mini-path
6. marketing collateral pack
7. longer Remotion explainer

## What To Avoid

- Do not create another generic architecture paper that repeats the existing paper
- Do not tell the story as "AI fully automated Webflow review"
- Do not collapse `webflow-site-analyzer-mcp`, `webflow-template-validation`, and `template-analyzer` into one undifferentiated tool
- Do not lead with plagiarism detection in every artifact; it is the origin, not the final identity

## Best Framing

If there is one phrase the whole series should repeat, it is this:

> The analyzer became useful when it learned to respect evidence boundaries.

That is the through-line that makes the git history coherent.
