# Independent final acceptance — CRE-2406 / corrective GiGi 0.3.7

Reviewed frozen runtime: `2c43119370898042816182522537698a2c279ca0`.
Actual app: `../GiGi.app`. Exact DMG: `../GiGi-0.3.7-arm64-private-beta.dmg`,
**105,457,594 bytes**, SHA-256
`a3d811b479fb36edbc2f0ed307a53d549cb45273334aca138b6f66a254c56bc4`.

**No remaining blocker was found within this local source/artifact review.
The corrective candidate is cleared to advance through the parent's final
GitHub review/CI, immutable delivery, full downloaded-artifact verification,
installation and canonical live-page gates.** This review does not perform or
assert those external outcomes. The superseded 0.3.6 artifact was not used as
qualification for this replacement.

## Unicode correction and actual signed MCP

I independently exercised the actual signed 0.3.7 `Contents/Resources/gigi-mcp`
through the real SDK/stdio protocol against a newly created disposable profile,
with isolated HOME, GIGI_DATA_DIR and CODEX_HOME and no account configuration.
The fixture contains60 local drafts in the primary workspace,55 matching drafts,
and a separate valid workspace with one matching foreign draft.

Seven queries — `été`, decomposed `ÉTÉ`, `ÉTÉ`, `привет`, `ПРИВЕТ`, `ångström`
and `ÅNGSTRÖM` — each returned total55, page sizes50+5 and55 unique identifiers.
The foreign draft never appeared in the primary results; querying its own
workspace returned exactly that one draft. Empty/omitted search returned60;
literal `%` and a nonmatch returned0; an offset beyond the matches retained
correct total55 with no items/continuation.160-character input passed;
161-character input, a numeric query, excessive offset and unknown workspace
were rejected.

All24 logical SQLite tables were hashed before and after these reads and
rejections: unchanged. Incomplete publication approval was rejected without a
mutation, unsupported `confirmed`/`continueConfirmed` bypass inputs were rejected,
and the catalog exposes no direct publication tool. No broker session was
created. These are local tool checks, not live Instagram/provider acceptance.
See `native-mcp.mjs`, `native-mcp.json` and `native-mcp.txt`.

Static inspection confirms the correction uses the same existing
`domain::search_fold` on query and searchable title/caption. One workspace-scoped
ordered scan counts every matching row and retains at most50 page identifiers.
It preserves literal substring semantics under the existing normalization,
workspace ownership, response fields and native publishing/revision gates.
No new schema or normalization dependency was introduced.

Five focused existing native tests were independently re-executed: the new
Unicode/pagination native+MCP regression and four publication/approval/unknown-
outcome guard tests. All passed. `native-focused.json` records the binary/hash.
These tests use the existing source-test executable without recompilation to
preserve compiler-manifest evidence; exact current product behavior is separately
established by the signed0.3.7 MCP checks above.

## Renderer and prior regression

The actual React/controller refinement suite passed **15/15 checks**. The
release-verifier unit suite passed **19/19 tests**, including Maps helper
absence, executable, signature team and hardened-runtime rejection.
Unit signing tests are mocks and are distinct from the actual verification below.

A separate fresh renderer pass at880×620 covered Paper Settings, Midnight
Profile, Studio Places/Gigs and Money error retention. It loaded31 Payable rows
through two pages, failed a Receivable read, retained all31 with the explicit
previous-Payable label, and then retried successfully to replace them with the
zero-row Receivable result. No page errors or external requests occurred.
All sampled document widths equal880; the calendar retains its existing internal
horizontal scrolling. Evidence: `refinement.txt`, `renderer.mjs`, `renderer.json`
and the fresh880px captures.

## Exact artifact and provenance

The production `verify-release.mjs` returned **qualified=true** for this exact
app and DMG. All first-party executable/signature/runtime identities passed,
including `gigi-map-preview`; upstream CTX signature, app Gatekeeper/staple,
DMG signature/integrity/staple and mounted-app equality passed. Both app bundle
hashes equal `fad79a04f4f4efb9f5b1a5007a048fd23dbcfbe809b43e165a526da35fdde70d`.
See `full-release-verifier.json`.

Independent provenance verification matched all8 original executable/library
inventory hashes and sizes, both current clean2c431193 compiler-marker hashes,
source tree and exact DMG hash/size. The main app embeds the frozen source SHA.
MCP binaries do not reference diagnostics::build, so MCP provenance rests on
clean compiler output, original inventory and signature-only comparison rather
than an embedded-SHA assertion. Seven changed Mach-O files normalize equal to
their untouched originals after masking only code-signature and LINKEDIT envelope
size fields; remaining resources/modes match apart from signing/notarization
resources. CTX bytes are unchanged. `verify-provenance.py`, `source-provenance.json`
and `signature-payload-equivalence.json` record the method and results.

I also ran the real signed Maps helper with only PATH in its environment and
the fixed public query Madison Square Park, New York, NY. It returned exit0,
matched Madison Square Park, `verified:false`, and a real640×320 PNG, which I
viewed. No current-location request was made. See `native-map.json`/PNG.

At final readback, app/integration/ChatGPT-connection runtime files have no diff
from frozen2c431193. Concurrent dirty files are Agency release metadata, page
copy and tests only. The complete UI tree is byte-identical to the previously
qualified6c9fd190 UI tree. `source-scope.json` records the observation.

## Perceptual assessment and limits

I directly viewed the parent's actual signed-native WebKit captures
`../native-unicode-title.png` and `../native-unicode-caption.png` and their
isolated environment receipt. The accented title and Cyrillic caption remain
readable, and each lowercase query visibly retains the saved matching draft.
The explicit disconnected publishing state, draft-only actions, grouped green
navigation and Astryx type hierarchy remain clear and consistent with the
approved Danny baseline. I also directly viewed fresh Paper Settings, Midnight
Profile, Studio Gigs and the Money error-retention capture at880×620, plus the
actual helper map. No visual blocker or new decorative drift was found.

This review did not drive native GUI controls; the parent did that exact-app
exercise and supplied the captures. Synthetic Chromium does not establish native
minimum-window behavior. Open-in-Maps browser destination, fresh OS-user setup,
older macOS, VoiceOver/screen-reader speech, OS IME, live Google/social providers,
audible media quality and human acceptance remain unverified here.

## Three gates

- Functional correctness: **passed** for the independent signed native/MCP,
  focused native, renderer and actual app/DMG checks above. Live provider and
  installed-host behavior are outside this evidence.
- Perceptual/product quality: **passed** for directly viewed actual signed-native
  captures and fresh renderer/map output, with the observation limits above.
- Release readiness: **passed for the local candidate** — exact identity,
  provenance, signing/notarization and installer equality are established.
  **Production promotion remains untested by this review**, pending the parent's
  GitHub/CI, upload/download, installation and live-page gates.

No source, app, DMG, installed application, operator profile, PR or external
service was changed. Only disposable local test records and this external
review-evidence directory were written. Parent owns promotion and final closeout.
