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
