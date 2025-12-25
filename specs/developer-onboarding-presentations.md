# Developer Onboarding Series: Presentations 3-6

## Overview

Complete the CREATE SOMETHING Developer Onboarding Series by creating the remaining four presentations and updating the index.

**Philosophy**: Each presentation follows the Hermeneutic Circle structure (Part→Whole, Whole→Part, Circle Closes, Dwelling). The narration uses the established markup system from heidegger-canon and claude-code-partner.

**Pattern Reference**:
- Structure: `packages/ltd/src/routes/presentations/heidegger-canon/`
- Components: `Presentation.svelte`, `Slide.svelte` with types: title, content, code, quote, ascii, split
- Plan file: `/Users/micahjohnson/.claude/plans/melodic-mapping-horizon.md` (contains full slide outlines and narration style guide)

**Narration Markup**:
- `[PAUSE]`, `[PAUSE 2s]`, `[BEAT]`, `[BREATHE]`
- `[SLOW]...[/SLOW]`, `[QUOTE]...[/QUOTE]`
- `*emphasis*`, `{stage direction}`, `↗` rising, `↘` falling intonation

## Features

### Create BEADS: CONTINUITY presentation (14 slides)
Create presentation at `packages/ltd/src/routes/presentations/beads-continuity/`.
- Create `+page.server.ts` with meta: title "BEADS: CONTINUITY", description about cross-session memory and agent-native tracking
- Create `+page.svelte` with 14 slides covering: The Problem (context resets), Beads Architecture (SQLite + JSONL), Core Commands (bd create/ready/close/sync), Session Workflow, Dependencies, Robot Mode, Labels, Molecules (Proto/Mol/Wisp), Session Protocol
- Create `SCRIPT.md` with full narration script using established markup system, ~20 min duration
- Follow hermeneutic structure: Part→Whole, Whole→Part, Circle Closes, Dwelling

### Create CLOUDFLARE: EDGE presentation (18 slides)
Create presentation at `packages/ltd/src/routes/presentations/cloudflare-edge/`.
- Create `+page.server.ts` with meta: title "CLOUDFLARE: EDGE", description about global infrastructure that disappears
- Create `+page.svelte` with 18 slides covering: Why Edge (<50ms cold starts), Architecture overview, D1 (database), KV (key-value), R2 (storage), Workers, Pages, Project Names mapping, Type Generation, Platform Access patterns, Zuhandenheit applied
- Create `SCRIPT.md` with full narration script using established markup system, ~25 min duration
- Include ASCII diagrams for architecture, code examples for D1/KV/R2 patterns

### Create CANON: DESIGN presentation (15 slides)
Create presentation at `packages/ltd/src/routes/presentations/canon-design/`.
- Create `+page.server.ts` with meta: title "CANON: DESIGN", description about Tailwind for structure, Canon for aesthetics
- Create `+page.svelte` with 15 slides covering: The Principle (design tokens from philosophy), Token Categories, Colors, Spacing (Golden Ratio φ=1.618), Typography, Motion (duration-micro/standard/complex), Tailwind vs Canon split, Hybrid Pattern, The Audit skill
- Create `SCRIPT.md` with full narration script using established markup system, ~20 min duration
- Include code examples showing before/after Canon compliance

### Create DEPLOYMENT: DWELLING presentation (14 slides)
Create presentation at `packages/ltd/src/routes/presentations/deployment-dwelling/`.
- Create `+page.server.ts` with meta: title "DEPLOYMENT: DWELLING", description about shipping to production and ongoing dwelling
- Create `+page.svelte` with 14 slides covering: Dwelling concept (being at home in the system), Deployment Flow, Build Commands, Deploy Commands, Migrations, Verification, Session Close Protocol, Ongoing Practice, Hermeneutic Spiral, "You Are Ready"
- Create `SCRIPT.md` with full narration script using established markup system, ~20 min duration
- Final presentation should synthesize entire series

### Update presentations index
Update `packages/ltd/src/routes/presentations/+page.svelte` to include all 6 new presentations.
- Add heidegger-canon: "HEIDEGGER: CANON", 18 slides, 25 min, Philosophy/Methodology tags, order 1
- Add claude-code-partner: "CLAUDE CODE: PARTNER", 16 slides, 25 min, Claude Code/AI/Setup tags, order 2
- Add beads-continuity: "BEADS: CONTINUITY", 14 slides, 20 min, Beads/Task Management tags, order 3
- Add cloudflare-edge: "CLOUDFLARE: EDGE", 18 slides, 25 min, Cloudflare/Infrastructure tags, order 4
- Add canon-design: "CANON: DESIGN", 15 slides, 20 min, Design/CSS/Canon tags, order 5
- Add deployment-dwelling: "DEPLOYMENT: DWELLING", 14 slides, 20 min, Deployment/Practice tags, order 6
- Ensure existing WORKWAY presentation remains in the array

### Verification
Confirm all presentations build and render correctly.
- Run `pnpm --filter=ltd build` with zero errors
- Verify each presentation route loads: /presentations/beads-continuity, /presentations/cloudflare-edge, /presentations/canon-design, /presentations/deployment-dwelling
- Verify presentations index shows all 7 presentations (6 new + WORKWAY)
- Run `pnpm --filter=ltd exec tsc --noEmit` for type checking
