# Release acceptance — CRE-2259

Status: not ready to merge or deploy. Production promotion authorized; required acceptance is incomplete.

## Required native checks

Use the candidate preview on the exact release head. Record tester, device, OS, browser/assistive-technology version, date, URL and commit. A Mac Ego viewport pass is desktop browser evidence, not physical-mobile acceptance.

1. Physical phone: select each stage by touch; inspect and close records; rotate portrait/landscape; verify controls clear the fixed header, no horizontal overflow, and no search overlay blocks content.
2. Phone: select Handoff; open search, submit two queries, Back/Forward, close and reload. Handoff and meaningful focus/context must survive.
3. Phone: submit incomplete sample, correct errors, complete, edit, reload. Receipt must remain explicitly local/synthetic; no message or booking occurs.
4. Actual screen reader: navigate headings/landmarks and stage links. Hear selected stage, expanded record and meaningful control names. All keyboard controls work without trapping focus.
5. Screen reader: validate missing destination/review; errors are associated, focus moves to the invalid control, completion is announced once, edit returns to destination.
6. Screen reader: open search, traverse controls, Back/Forward between queries, close and restore trigger. No focus or announcement escapes behind modal.
7. Reduced motion enabled at OS level: same content and focus behavior; no motion dependency.

## Current evidence

Final continuity-fix validation: Agency check passes (0 Svelte errors/warnings), site-search 18/18 tests pass, production build passes. Canon unchanged since integration validation: check and 680 tests pass. Sandbox-denied workerd loopback test execution was rerun successfully with localhost allowed.

Automated local browser: eight groups pass at 1440/390/320, keyboard, emulated touch/orientation, reduced motion, search/history, no JavaScript and blocked storage; no page errors. See browser-results.json. This does not claim VoiceOver or physical-device acceptance.

Native Ego: pending desktop coordination. Physical device: not available; user suggested Ego browser. Actual screen-reader pass: pending. No acceptance gate waived.

## Promotion and rollback

Create reviewed draft PR, retain required exact-head checks (Require immutable action references, Public Distribution GA), then complete acceptance before merge. Normal Agency Pages workflow owns deployment; do not bypass checks.

Prior successful main workflow: https://github.com/createsomethingtoday/create-something-monorepo/actions/runs/38199580411 at commit 2b5bb7e10c9b39416c388e28e85b9ac65465a479, deployment https://6403287e.create-something-agency.pages.dev. Verify the current production deployment before promoting and retain it as the rollback target; this older workflow receipt alone is not proof of current production.

Post-deploy: verify live homepage journey, deep link, search/history, sample and reload; record deployment ID/URL and exact commit. Roll back to the verified prior production deployment on a blocking regression and record the result.
