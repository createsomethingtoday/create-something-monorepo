# Human Ink product motion — CRE-2053

Promotes the approved CRE-2051 design and CRE-2052 motion study into the existing
SvelteKit product. Automation owns playback and lifecycle cleanup; Judgment owns
motion preferences and the publication/access boundaries. No database changes.

## Production scope

- Landing page: ink library illustration, once-only section reveals, format/access
  preview feedback, and a three-second handoff with explicit replay.
- Start page: practice illustration and quiet entrance for the two existing paths.
- Creator publishing desk: a first-walkthrough empty state only after a successful
  catalog load, with no lessons or uncertain upload reservations. Its link targets
  the real upload form; it never creates a pretend outline or changes publishing.
- Member lesson pages retain creator branding and their existing behavior.
- The existing hero video and its playback policy are unchanged.

## Motion contract

Svelte actions use browser Web Animations; no router replacement or motion library.
SSR content is always readable and in its final state. Reveals take 520ms, translate
10px, and begin at 65% opacity. Keyboard focus immediately finishes the reveal.
Preview changes use 180ms opacity feedback without moving or remounting inputs.

The handoff plays once at 35% visibility, after every layer has loaded. Its frames
come from 7.5–10.5 seconds of the approved organic Draw source:
https://draw.createsomething.agency/animate?project=0dbb19b2-4fda-40ce-8298-e67225c2638e

Offscreen handoff, hidden document, page departure, and live reduced-motion changes
settle active work. Reduced motion and missing JavaScript preserve the complete
still. Failed layer loading also retains that still and does not offer replay.
Navigation destroys observers, animations and event listeners. No perpetual drift,
parallax, scroll scrubbing, or automatic repeat.

Art is the approved anonymous Human Ink artwork, compressed as WebP. Decorative
images have empty alternative text; meaningful scenes have descriptive text.

## Verification and promotion

Package `check`, `test`, and `build` passed; 200 tests include interruption,
teardown, focused reveal, and rapid feedback tests. Browser evidence and production
version/rollback are recorded in CRE-2053. The earlier hidden-tab prototype check
was separately confirmed by the user; it is not a claim of production acceptance.

Deploy only the merged commit after CI, using `scripts/run-wrangler.mjs`. Record
the immediately preceding Worker version for rollback. There are no schema,
authentication, commerce flag, or provider configuration changes in this release.
