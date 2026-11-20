# Agency scroll entrances

Tracked work: CRE-2315. Destination: https://createsomething.agency.

## Acceptance and ownership

Canon owns the reusable `scrollEntrance` helper and motion contract (Automation
and Judgment). Agency owns the authored target groups and content (Database).
The page keeps its existing chapter structure, imagery, copy, and native scroll.

Twelve independent groups enter once with 16px upward travel and a partial fade
using Canon's 500ms complex duration and decelerate easing. The hero is immediate.
Content remains visible at rest, in SSR/no-JavaScript, and without browser APIs.
Focus, hash navigation and reduced-motion changes settle immediately. Direct hash
arrivals do not initialize entrances. Existing transforms are preserved.

## Research boundary

CTX located the earlier partner-motion release. Its current index served results
with the refresh daemon unavailable; implementation decisions were corroborated
against current source and the live homepage.

The TASTE motion packet was retrieved on November 1, 2026. Inspected images:

| Reference | Observation | Decision | Source |
| --- | --- | --- | --- |
| Vogue/Archrival editorial GIF | Bright collage and playful graphic layering | Reject its treatment; Agency's existing graphite composition remains authoritative | https://www.are.na/block/42611632 |
| Interface status GIF | Compact file-reading status treatment | Reject as precedent for scroll entrances; useful state feedback belongs to controls | https://www.are.na/block/42459684 |

The remaining packet supplied resource links and principles rather than relevant
scroll sequences. No outside asset, layout, or motion sequence was copied. These
image inspections do not establish temporal quality of the references.

## Validation

- Production build passed. Full Agency check: 0 Svelte errors/warnings and all
  package checks passed.
- Full Canon check passed: type checks, overlay/consumer gates, codification,
  library health, and stable-component depth. Focused scroll tests: 11 passed.
- `verify-scroll-entrances.mjs`: real browser entrances at 320, 390, 768, 1024,
  1025 and 1440px; once-only reverse scroll, live reduced-motion cancellation,
  keyboard focus, no-JavaScript, initial reduced motion and direct hash arrival.
- `verify-team-balance.mjs`: ten responsive widths passed.
- `verify-partner-evidence.mjs`: native keyboard disclosure, reversals,
  reduced motion and no-JavaScript passed.
- `verify-walkthrough-theater.mjs`: real video playback, six viewport geometries,
  native controls, Escape, focus restoration and scroll restoration passed.
- Parent inspected actual desktop, 768px and 390px compositions, including a
  chapter entrance during motion and settled team/proof groups.

Evidence artifacts: `/tmp/cre-2315-evidence`. Browser checks exercise local
production output; synthetic unit fixtures are separate from browser evidence.
Independent Sol 6.1 retest and production readback are recorded in Linear before
closeout. Human acceptance and physical-device testing are not claimed.

## Promotion and rollback

Advance the stylesheet URL revision and server HTML cache revision together.
Deploy the reviewed artifact to the existing Agency Pages project on `main`.
Previous production deployment before this release:
`d25809e1-9238-4240-b3b8-ebf2f5f9dd97`.
Rollback by restoring that Pages deployment; revert the release commit before the
next promotion to restore the prior HTML cache revision as well.

Worktree disposition: retained at `/tmp/cre-2315-agency-scroll` until production
readback and tracked-work closeout; final disposition recorded in Linear.
