# CRE-2147 Agency UI candidate

Canonical work: https://linear.app/createsomething/issue/CRE-2147
Execution: https://paperclip.createsomething.agency/CRE/issues/CRE-104

Candidate only. Independent reviewer and coordinator own integration and promotion.

## Design and scope

This Judgment-tier presentation pass adapts the Canon workspace contract and Performance Lab hierarchy. It preserves current offer/pricing, proof content, four inquiry intents, navigation destinations, request/response handling, authentication, payments, and Map actions.

- Home now leads with “Apps, workflows and agents your team owns.” The first desktop viewport pairs that proposition with the existing Agent Foundation repository contract, explicitly labeled as a handoff example. It reuses `agentFoundationRepository` rather than inventing delivered client work. Scope/cost, technical review, product inspection and ownership links remain direct; the shared $900/month price and separate usage/hosting costs are visible. Inspectable BuiltWork now precedes the retained films, which keep their evidence labels and motion preference. The existing OpenAI Select Partner link still points to the qualifications and claim boundaries on `/stack`. No Paperclip branding or integration claim was added.
- Services uses scoped compact sans proposition type while retaining the offer, proof labels and CTA destinations. Booking uses a compact introduction and places incoming context beside the scheduler on wide screens.
- Contact replaces duplicate path cards with a compact introduction, a first-viewport form anchor, and four intact radio options in a native disclosure. Desktop fields use two columns. At 390×844 the name field is visible; at 320×640 the form anchor is visible without scrolling. First-load privacy remains open, at the lower corner rather than over the heading. Form controls reserve scroll margin for it.
- Map list opts into Canon `workspace.css`; compact headings, wrapping saved/archive rows, paired button colors and focus rings replace custom visual values. Optional JSON import uses a native disclosure. No persistence or authorization changes.

This is a positioning and usability hypothesis, not measured conversion improvement. Outcome, scope and cost remain in the existing membership and services content; Map → Build → Control packaging is unchanged.

## Verification

- `pnpm bootstrap:worktree`: passed with Node 22.21.1 / pnpm 9.15.0. Run Bash startup reset PATH; a run-scratch wrapper retained the harness Git wrapper and added installed runtime tools. No host configuration changed.
- `pnpm --filter @create-something/agency check`: passed, including Svelte 0 errors/0 warnings, Agency Canon/copy contracts and auth/Map/control suites.
- `pnpm --filter @create-something/agency build`: passed with Cloudflare adapter.
- `pnpm performance:pages:check`: passed, 257/257 registered.
- `pnpm performance:pages:test`: baseline failures in 3/6 tests: stale route counts (248 expected vs 257), old Space Paper media and old Agency `playbookHomeHeroMedia` expectations. The earlier candidate proved these failures against unchanged base inputs; the new home ordering does not restore the obsolete hero-media expectation. Registry and test files remain unchanged.
- Canon targeted Performance page/token tests: 6/7 passed; legacy-token scan found 21 uses in unchanged Agency InspectionScrollStory, ProjectReviewEntry, TechnicalReviewVisual, technical-review route, and Space workshop files. See baseline comparisons and logs. No shared Canon runtime was changed.
- `git diff --check`: passed.

Ego browser space 27: rendered home/services/contact/book and an explicitly labeled Map component fixture at 1440×900, 390×844 and 320×640, with no horizontal overflow. Screenshot files and geometry JSON are in `output/cre-2147`. Public captures retain privacy controls; contact captures retain the expanded first-load prompt. Home reduced-motion emulation paused the film with a non-sticky hero. Contact radio and input focus have visible outlines. Four intent options remain keyboard selectable. Local browser-intercepted contact 503 retained the draft; intercepted success announced receipt and reset fields. No actual inquiry was sent.

The temporary Map route rendered populated, empty and error states with sample data; its source is retained as evidence text, and the route was removed before final build. It is NOT authenticated acceptance. The actual Map workspace redirects to login without a session. No auth was fabricated. Scheduler framing/fallback was inspected, but no availability or booking was accepted and no booking was submitted.

## Review and integration notes

Contact scope was recorded before editing in Paperclip comment `40c68d1c-f965-4a8e-a2ab-6353b9397979`. This candidate leaves `handleSubmit`, request IDs, server code and response handling untouched. Coordinator must reconcile any Effect agent contact-page additions in the same file.

Source-based contracts were adapted for the new opening, including reuse of the approved handoff data, production boundary, shared pricing, and proof before films. In the earlier pass, two source-based tests were adapted: contact is no longer required to use an editorial campaign hero; Map is required to opt into the shared workspace contract instead of pinning old color strings. Rendered evidence supplies the visual checks.

Remaining promotion gates: independent source review, authenticated Map acceptance, scheduler/live contact acceptance under the coordinator's authorized workflow, and disposition of baseline cross-repository gate failures. No push, merge, deployment or publication was performed.

Worktree disposition: preserved at `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-2147-agent-worktree`, branch `codex/CRE-2147-agent-worktree`. Evidence remains in `output/cre-2147`; temporary preview processes are stopped at closeout. Rollback candidate: omit/revert this candidate commit before promotion.

## Builder revision after coordinator review

The original `afbb14609` home preview is superseded. This follow-up addresses all three pending comments: contact first-load privacy remains visible without covering its next action; engineering evaluators get an explicit deliverable and fast inspection links; decision makers retain price, scope, ownership and a defined engagement path. No contact code was changed in this follow-up.

Revision evidence is prefixed `revision-` in `output/cre-2147`: home at 1440×900, 390×844, 320×640; contact with a fresh-origin first-load privacy prompt at all three sizes; keyboard/reduced-motion, no-JavaScript opening, and the working inspection anchor. No horizontal overflow. Contact action top is 303px on desktop and 343px on both phones; the name field starts at 673px at 390px and 721px at 320px. The 320px first viewport intentionally offers the form anchor rather than fitting the form fields.

Reduced motion removes no essential information: the new hero is static, and its motion toggle still controls the retained films. Keyboard focus on Scope & cost has a visible solid outline. The inspection anchor reaches actual source-linked work. Authenticated Map, booking submission and real contact delivery remain the promotion limitations described above; previous fixture evidence is retained, not represented as a new authenticated test.

Revalidation: `revision-check.log` passed Svelte diagnostics and preceding Agency suites, then failed three Control fixtures when the host ran out of disk space (SQLite open errors / ENOSPC). With disk available, the affected Control suite passed 10/10 in `revision-control-recheck.log`, and the remaining inspection suite passed 2/2 in `revision-inspection.log`. This is a failed full invocation plus successful targeted recovery, not a claim that the failed invocation passed. The revision production build passed with the Cloudflare adapter (`revision-build.log`). Performance registry remains 257/257. Canon page contract passes 2/2; token contract remains 4/5 with the same 21 pre-existing legacy references. Performance tests retain the same 3/6 baseline failures.

## Services navigation clearance correction

Independent reviewer create-something CRE-107 found a P3 overlap in the Services opening on phones. The scoped compact padding now retains the layout's `max(128px, 10svh)` top clearance and changes only bottom spacing. At 390×844 and 320×640, rendered label top is 128px versus navigation bottom 76.8px; at 1440×900, label top is 170.25px versus navigation bottom 84.8px. All three have no horizontal overflow. Evidence: `services-clearance-{1440,390,320}.png` and `services-clearance-geometry.json` in `output/cre-2147`. Svelte check passes with 0 errors/0 warnings; the pinned Agency Vite production build passes with the Cloudflare adapter (`services-clearance-check.log`, `services-clearance-build.log`). No contact or Canon source changed.

The coordinator's added palette request is pending the Canon owner in Linear CRE-2149 / create-something Paperclip CRE-108 (`5aaf6cbc-8ff0-4ee9-81fc-87c0b60f6831`). At this checkpoint that issue is in progress with no posted export contract. The Agency integration boundary will be the route-selected shell for home/products/services/contact/book and appropriate Map operator wrappers, using the published opt-in stylesheet/class rather than editing global Canon token source. No guessed export or local copy of the palette is introduced. This correction is independently reviewable; palette consumption remains unfinished.


## Opt-in operator palette integration

Coordinator supplied Canon commit `2f802de97` (source `fad8dda9a`). Agency imports the published `@create-something/canon/styles/operator.css` contract and opts in only the exact home, products, services, contact, book and Map workspace-list routes. Agency-owned bindings map existing Performance/workspace roles to Canon neutrals, accessible focus and status text colors. Media-led openings, navigation/logo, inverted CTAs, contact choices, the Services preview and conversion handoff have explicit bindings. No Canon source or offers, destinations, authentication, payments, contact request/server behavior changed.

Validation: Canon package/publint and 26-token parity/contrast gate passed. Agency full package check passed (including Svelte 0 errors/0 warnings). Final production build and Performance page registry results are in the attached `operator-*` logs. Browser captures cover public home/products/services/contact/book at 1440×900, 390×844 and 320×640 with no horizontal overflow. Keyboard traversal reaches email with a visible 2px accessible focus ring; contact retains four intents. Fresh privacy, forced-color focus, reduced motion and excluded login-route scope were checked. Scoped reduced motion disables the Services diagram rail animation. Below-fold handoff/funnel captures document corrected inverted CTA colors.

Map evidence is a labelled local component fixture with populated/archive states at all three sizes, not authenticated acceptance. The real workspace route still redirects to login. No real contact submission, scheduler booking, payment or authenticated Map mutation was performed. Third-party scheduler iframe internals are outside the palette scope. A nearest-solid-background contrast diagnostic helped find inverted colors but is not a complete accessibility audit. Earlier unrelated broad Performance test baseline failures remain documented above.

The temporary fixture route was removed. Worktree disposition: preserved on `codex/CRE-2147-agent-worktree` at the assigned isolated path, with local evidence under `output/cre-2147/`; no push, merge, deploy or publish. Independent reviewer/coordinator owns promotion.

## Coordinator privacy contrast correction

An independent browser pass found the first-load privacy prompt's “Allow analytics” label was white on a near-white button after the route palette remap. The Agency-scoped primary privacy button now binds dark text to the operator foreground fill. Ego browser readback on the local preview returned foreground `oklch(0.205 0 0)` and background `oklch(0.985 0 0)` for that button; the contact submit button had the same legible pairing. Contact first viewport screenshots at 390×844 and 320×640 show no horizontal overflow. These are local preview checks, not deployed evidence.


## Products opening follow-up

Coordinator requested a bounded copy revision after integrated review of `988bc2a6b`. Products now leads with “Build systems your team can own” and Map → Build → Control. The capabilities introduction names inspectable implementations/scenarios, owned source/instructions/tests/handoff, human approval and separately agreed production launch. Existing proof entries, media, SKU/pricing data, routes, and purchase actions remain unchanged. Only Products copy and this evidence document changed.

Validation: `pnpm bootstrap:worktree`, full Agency `check`, Agency Cloudflare `build`, `pnpm performance:pages:check` (257/257), Canon operator-token gate, and `git diff --check` passed. Evidence is under `output/cre-2147/products-copy-*`: desktop 1440×900, mobile 390×844 and 320×640, reduced-motion keyboard focus/activation and a settled desktop handoff capture. No horizontal overflow; opening action visible at all sizes. Keyboard traversal produces a visible 3px focus outline on the opening action and Enter reaches `#capabilities`. Settled handoff shows no label overlap. No layout/runtime correction was necessary.

Limitations: this run could not refresh canonical Linear CRE-2147 because `LINEAR_API_KEY` was absent and no Paperclip-granted secrets were available. Scope came from the explicit latest create-something CRE-104 coordinator request; coordinator must mirror the final evidence to Linear. The ctx search did not return before cancellation; current source and issue comments grounded this pass. Browser evidence is local development rendering, not production, authenticated Map, payment or submission acceptance. Previously documented broad Performance-test baseline failures remain outside this copy-only revision.

Worktree disposition: preserved at `/private/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-2147-agent-worktree`, branch `codex/CRE-2147-agent-worktree`, for independent review/coordinator promotion. No push, merge, deploy or publish.
