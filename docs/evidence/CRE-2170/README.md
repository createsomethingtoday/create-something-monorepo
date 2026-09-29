# Agency wayfinding continuation

Tracked work: [Linear CRE-2170](https://linear.app/createsomething/issue/CRE-2170/extend-agency-isometric-wayfinding-through-method-and-control-handoffs). This is a continuation of [CRE-2168's original, independently authored sign system](../CRE-2168/README.md); it adds no vendor artwork or new sign meanings.

## Placement decisions

| Surface | Reader question | Sign and destination | Why here |
| --- | --- | --- | --- |
| Methodology | How do I use this method or inspect a result? | Map one real task → `/map`; Read the Template Review report → `/field-reports/template-review` | Connect the editorial method to a plan and a bounded report before the booking handoff. |
| Security | Where are access and approval rules defined, and what happens after launch? | Define the access boundary → `/map`; Explore Control → `/control` | Put the next choice beside the security checks without implying that a token alone authorizes action. |
| Workflow Compiler Integration | Is this a Build project, and what if the task is still unclear? | See the Build path → `/services`; Still defining the task? → `/map` | Replace two plain links with the same labeled sign vocabulary and preserve their destinations. |
| Signal, Decision, and Proof product views | How does this view relate to the service? | Explore Control → `/control` | A single contextual sign in their shared page component states the commercial container without turning the operating loop into a purchase sequence. |

The sign glyph remains supplementary to a visible label and ordinary link. Map, Build, and Control are independent commercial paths; Signal, Decision, and Proof describe the operating loop inside Control. Booking and contact forms keep their existing task focus. Existing hero imagery, the homepage ASCII band, core positioning, pricing, and primary CTAs remain unchanged. This slice does not claim that a conceptual Control page is a live product demo.

## Local verification

`pnpm --dir packages/agency check`, `pnpm --dir packages/agency build`, `pnpm performance:pages:check`, and `git diff --check` passed. The Agency package check includes its copy and Canon gates; Svelte reported zero errors and zero warnings. In Ego browser TaskSpace 11 on the local dev server, all six surfaces rendered at 1440, 390, and 320 CSS pixels with no measured horizontal overflow. Each sign resolved to its expected destination; keyboard Tab showed a visible 2px outline and Enter followed the proof sign. A 320px reduced-motion check kept labels and links visible, and a no-JavaScript server render retained the Control sign. Local screenshots are preserved under `output/cre-2170-wayfinding/` in the worktree.

This record describes local source and browser proof. PR, immutable preview, merged revision, and production readback are recorded separately in Linear when completed.

The independent [Paperclip create-something CRE-206 review](https://paperclip.createsomething.agency/CRE/issues/CRE-206) confirmed the placement pattern and recommended naming the Template Review report precisely and avoiding “live operation” language for the Control explanation. Both refinements are applied here. That agent's browser captures cover the pre-change live pages; the new signs were verified separately in the coordinator's local browser.
