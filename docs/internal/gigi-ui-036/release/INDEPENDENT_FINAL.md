# Independent final acceptance — CRE-2406 / GiGi 0.3.6

Reviewed source: `6c9fd1900464ab8dfa9a6436879f3a78f85b5add`. Reviewed actual app:
`../GiGi.app`. Exact DMG: `../GiGi-0.3.6-arm64-private-beta.dmg`, **105,472,346
bytes**, SHA-256 `5aa9873905fb76f72ca3c5d1c39de62b7f4fad36db3631b87fd5c00e71d17190`.

**No remaining source or artifact blocker was found. The local candidate is
cleared to advance through the parent's reviewed promotion, immutable delivery,
download verification and installation gates.** This review does not perform or
assert those external outcomes.

## Independent functional evidence

- Re-ran the actual React/controller refinement suite: **15/15 checks pass**.
  The preserved regression now has native-equivalent finance pagination and
  verifies all 25 successfully loaded rows remain after a failed view change.
  Source of evidence: `refinement.txt`, `refinement/result.json`.
- Independently exercised another public-renderer sequence at 880×620: load 31
  Payable rows through two successful pages, fail a Receivable view change,
  retain all 31 rows and the explicit previous-Payable label, then retry and
  replace the retained view with the successful zero-row Receivable result.
  Passed. No page errors or external requests occurred. `renderer.mjs`,
  `renderer.json`, `money-retains-31-after-failure-880.png`.
- Release-verifier unit suite: **19/19 pass**, including missing/nonexecutable,
  ad-hoc, wrong-team and missing-hardened-runtime Maps helper cases.
  `verifier-tests.txt`. These unit signing cases are mocks, separate from the
  following real artifact verification.
- Ran the production `verify-release.mjs` on the exact app and DMG:
  **qualified=true**. It checked all first-party executable/signature/runtime
  identities, preserved upstream CTX signature, app Gatekeeper/notarization
  staple, DMG signature/integrity/staple, and mounted app equality. The actual
  app and mounted app bundle hashes both equal
  `c44061db1b57fc23bf7f6d0cd0888662353eed3dc0c95aa7850dd46e6d1f225d`.
  `full-release-verifier.json`.
- Independently ran the **actual signed Maps helper** with only `PATH` in its
  environment and the fixed public query `Madison Square Park, New York, NY`.
  Exit 0; matched Madison Square Park; `verified:false`; real 640×320 PNG.
  The image was directly viewed. No current-location input/API was used.
  `native-map.json`, `native-map.png`.
- Static source inspection confirms full-workspace Money filtering before
  pagination, workspace-scoped saved-place re-read before Maps operations,
  fixed Apple Maps host with query encoding, scoped preview invalidation and
  parameterized Social title/caption substring search. The parent's Money fix
  refreshes the successful workspace/view snapshot on pagination. Current app,
  integration and ChatGPT connection source has no diff from frozen 6c9fd190.
  Parent's concurrent dirty files are release metadata, page copy/tests and CI
  workflow only; they do not change this qualified runtime.

## Independent provenance

`verify-provenance.py` independently checks the original inventory, current
compiler markers, artifact identity and signature-only changes:

- Both recorded compiler-marker files match their recorded SHA-256, exact 6c9
  source and `GIGI_BUILD_SOURCE_DIRTY=false`; source tree matches the recorded
  committed tree. All eight original executable/library inventory hashes and
  sizes match their build receipt.
- Main executable contains exact 6c9 source identity in original and signed
  forms. MCP binaries do not embed that SHA because `diagnostics::build` is not
  referenced by their tool path. MCP provenance is corroborated by clean
  compiler markers and original inventory, rather than an embedded-SHA claim.
- Seven changed Mach-O files have identical non-signature payloads after
  normalizing only LC_CODE_SIGNATURE size and __LINKEDIT signature-envelope size
  fields; signature offsets and all remaining bytes match. Non-Mach-O resources
  and modes match, apart from expected CodeResources/notarization resources.
  CTX remains byte-identical. Originals were read only by this review.
- The exact DMG size and full-file SHA-256 match the supplied identity.

Receipts: `source-provenance.json`, `signature-payload-equivalence.json`.

## Perceptual assessment

Directly viewed the parent's exact signed-native WebKit captures
`../native-maps.png`, `../native-money.png` and `../native-social.png`, plus their
native environment receipt. The native Maps result is visible with Apple
attribution and an explicit instruction to check the destination; Payable shows
the outgoing row, and caption search shows its saved draft. The approved green
frame, grouped navigation, Astryx typography and clear action hierarchy remain
coherent. No decorative or layout regression requiring a source fix was found.

Independently captured and viewed current-renderer Paper Settings, Midnight
Profile, Studio Gigs/Places and Money error retention at **880×620**. Document
width equals viewport width in all sampled pages. The calendar retains its
existing internal horizontal-scroll behavior. Settings and Profile remain
readable, and the failed Money view visibly labels retained data and presents a
clear retry action. Fresh captures and `renderer.json` are in this directory.

The reviewer did not launch or operate the native GUI; the parent owns that
session. The native screenshots are actual packaged-app evidence that was
independently viewed, while responsive/theme interactions here use synthetic
Chromium. A real preview success was independently executed in the signed helper.
The Open in Maps OS command returned no native error in the parent's test, but
the browser destination was not visually verified.

## Three gates and limits

| Gate | Assessment |
| --- | --- |
| Functional correctness | **Passed** for the independently exercised current renderer, corrected retention, real signed Maps helper and exact local app/DMG verifier. |
| Perceptual/product quality | **Passed** for directly viewed actual native captures and fresh 880×620/theme/error states. Native minimum-window interaction was not independently driven. |
| Release readiness | **Passed for this local signed candidate**. Normal PR/CI/review, immutable upload, full downloaded-artifact verification, live page delivery and target installation remain the parent's separate gates. |

No new macOS 13 floor, VoiceOver, fresh OS-user installation, live Google
consent/import, real Instagram publication or human acceptance qualification is
claimed. No source/app/DMG edits, GUI app launch, installation, publishing,
profile changes or external messages were performed. Only external evidence in
this directory was created by this review. `result.json` records the clearance.
