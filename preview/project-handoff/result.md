# Reviewable Agency project tour and handoff draft

Base: origin/main at 914cd4ef8ce7204c33113ce082264f7f837da5ea.
Branch: codex/agency-project-handoff. No push, merge or deployment.

## Preview
- http://127.0.0.1:4178/products#cato-tour
- http://127.0.0.1:4178/stack#stack-ownership-story-ownership

The preview runs on Micah-W4FJPH. Browser QA used isolated headless Google Chrome, not the user's personal browser profile.

## Changes
- Products: three visitor-controlled Cato chapters, marked regions on actual recorded frames, explanation of visible interface value, full-size still links, original captioned recording. Closing the recording pauses playback when JavaScript is enabled.
- Stack: four native disclosures show the public pi-policy-os package's actual installation command, repository assertions, MIT license and a clearly labeled summary of its debugging method. Immutable source links and public distribution allowlist included. This is explicitly not a client handoff.
- Existing homepage, hero, pricing, booking attribution and .io/.ltd/.space source unchanged.

## Validation
- Agency full check: passed; Svelte zero errors and warnings. Includes copy, Canon and package test suites.
- Agency production build: passed using pinned Node22.21.1 toolchain.
- Browser checks: passed desktop1440, mobile390, narrow320, reduced motion and JavaScript disabled. Keyboard Enter/Space, repeated selection, exclusive disclosure state, zero horizontal overflow, visible handoff material and interrupted video playback checked. No page errors.
- Existing exact hero and booking destination/attribution verified; booking page opened without submitting a lead form.
- Independent source/provenance review completed. Recording date verified in the existing recording's visible label.
- Final rendered desktop/mobile images inspected after fixing inherited section spacing and a utility-class collision.

Evidence: ../evidence/project-handoff/browser-results.json (relative to worktree root); ../evidence/tour-check.log; ../evidence/tour-build.log. Screenshots in ../evidence/project-handoff/.

## Limits
No conversion uplift is claimed. Public source example demonstrates inspectable materials, not a client's full operating runbook or exclusive ownership. The original recording remains a September2026 snapshot; no new client results or design-decision claims are invented. A no-JavaScript visitor retains native video controls and can pause before closing its disclosure; the close-to-pause enhancement requires JavaScript. External source pages were not modified. Production approval remains outstanding by design.

## Library delivery blocker
The required Library batch helper could not discover Library prepare_uploads on this host after network access was granted. No upload was prepared or finalized, and no Library screenshot IDs were created. This is a capability failure, not an approval denial. Local PNGs remain available. Per the Library skill, the started helper workflow was not switched to direct writes.
