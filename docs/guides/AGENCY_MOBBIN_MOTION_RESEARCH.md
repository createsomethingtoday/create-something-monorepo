# Agency handoff motion: Mobbin research

Date: 2026-11-05. Tracked work: CRE-2362.

## Decision and acceptance

Help a visitor connect the selected Build / Test / Validate step with its concept
illustration without delaying the copy, controls, or focus. Keep the existing
native-scroll tour, original artwork, public claims, navigation, and responsive
stacked layout. Canon / Performance Lab remains the visual authority; Mobbin is
the primary comparative reference source.

The incoming illustration should resolve briefly inside a stable frame, and one
selection rail should connect the waypoint states. Repeated selection must not
restart motion. Reversal must cancel the previous animation. System or explicit
reduced motion, overlays, resize, hash navigation, printing, and hidden documents
must settle immediately. No JavaScript must retain the complete stacked story.
Verify at 320, 390, 768, 1024, 1025, and 1440 pixels with keyboard and pointer input.

## Authenticated research

The official MCP endpoint is `https://api.mobbin.com/mcp`. Global Codex setup and
OAuth login succeeded. An authenticated tool inventory returned eight tools,
`authStatus: oAuth`, and no tool-list error. Two bounded `search_sections` calls
returned nine references. This existing session did not hot-load the newly added
server into its tool inventory, so the searches used Codex's app-server MCP
transport with the existing OAuth credential store; no model turn was run and
no credentials were exported. Fresh sessions can load the configured server
normally.

Queries:

- `product walkthrough section with numbered steps` (5 results)
- `feature section with tabs and product preview` (4 results)

The same non-sensitive task intent and `output_destination: code` were supplied.
No collections, saves, comments, deep search, or corpus changes were performed.
Seven returned preview images were visually inspected: Adaline, Grammarly,
Runway, Framer, Plain, Maze, and Aino Agency. FOLLOW.ART and Squarespace were
returned but not inspected or used. Research media stayed outside the repository.

| Reference | Why                                                        | Adapt                                                                      | Avoid                                              | Source                                                                           |
| --------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framer    | A selected feature is visibly tied to one preview          | Keep one selected step and one stable artifact frame                       | Purple styling, icons, product layout              | [Mobbin](https://mobbin.com/sites/sections/556c62ee-b2af-4993-b400-187d98f1fd72) |
| Maze      | The selected label remains readable alongside its evidence | Keep the selected label, concept caption, and artifact in agreement        | Bright campaign palette, map and card composition  | [Mobbin](https://mobbin.com/sites/sections/2aab052c-921a-421b-a4a0-5aa155ebe09c) |
| Runway    | Numbered stages and a shared rail establish sequence       | Translate the rail into feedback for Agency's existing waypoint navigation | Finance claims, boxed page composition             | [Mobbin](https://mobbin.com/sites/sections/bcbe23c6-95ea-467d-abc5-d913d2bc3667) |
| Grammarly | Numbered steps can be read without animated sequencing     | Preserve all three static explanations as the fallback                     | Treating simultaneous columns as temporal evidence | [Mobbin](https://mobbin.com/sites/sections/1db9aea8-a59f-4359-9e58-d46d4d73b84a) |

Adaline, Plain, and Aino Agency did not resolve the selected-step transition
question and were not adopted. The independently derived alternative is the
existing immediate cut. It remains appropriate for stacked layouts and reduced
motion. The animated enhancement is a local experiment for the desktop tour.

All references are **static evidence**. They establish visible hierarchy and
selection states, not timing, easing, animation continuity, or performance. The
brief incoming-artwork movement and rail transition are original Canon
implementation choices to be evaluated in the actual Agency page. No reference
assets, text, layout, or product-specific sequence were copied.

## Verification receipts

The browser regression first failed on the baseline abrupt scene switch, then
passed with actual intermediate opacity and translation samples. The final
browser pass covers 12 width/preference combinations, keyboard focus, rapid
reversal, repeat selection, in-flight motion-off, OS reduction after explicit
opt-in, print, resize, and native no-JavaScript links/disclosures. The fixture
loads lazy images before decoding and distinguishes artwork/rail effects from
an existing inherited 0.01ms CSS visibility transition under reduced motion.

Five controller lifecycle tests and three existing guide tests pass. The full
Agency check passed with zero Svelte errors or warnings; the agent-skill suite
passes 15 tests. Retired identity-provider and whitespace checks pass. Original
artwork and static fallback remain the comparison baseline. Independent Sol 6.1
review exercises the rendered output, including dialog interruption, changed
hash, and short-height stacked layout, before promotion.

The production HTML revision and stylesheet query are both
`mobbin-handoff-motion-20261105`. Previous production baseline: commit
`3e488e49a08012c8c33a8817ce6d205f16df758e`, deployment
`cc0c8bf8.create-something-agency.pages.dev`. Revert the scoped release commit
through the normal Agency workflow if rollback is required; do not promote a
checkout containing unrelated edits.
