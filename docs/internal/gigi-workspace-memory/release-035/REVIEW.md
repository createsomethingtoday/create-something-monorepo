# GiGi 0.3.5 memory and navigation release packet

CRE-2382 / CRE-2384 / PR #2222. Prepared for normal reviewed promotion.
No publication, merge or live-page acceptance is claimed by this packet.

## Exact artifact and source

Compiled from clean `df51d22a257a1e053cb8d6a37acd3ba5c25908fd`, including
memory pending-save/staging/invalidation recovery and reviewed navigation
alignment. Agency release metadata and this packet do not change app,
integration or agent-skill source. The runtime compile SHA remains `df51d22`.

- Filename: `GiGi-0.3.5-arm64-private-beta.dmg`.
- Bytes: **129,864,987**.
- SHA-256: `8350e78b0a896ad0d98a508a3c8328a132f328ac090e0b2ccc6d8f8a93c28d77`.
- Signed main: `3bca1d9dc9b031d6d87e8d7f5405e2fb5c7f59c34b1187e4423b3657124e8120`.
- Local candidate: `.cache/gigi-release-035-final/GiGi.app` and the DMG beside it.
- Intended immutable key: `releases/gigi/0.3.5/GiGi-0.3.5-arm64-private-beta.dmg`
  in `create-something-assets`. Check absence again immediately before upload.

Apple accepted the separately submitted app and DMG. Developer ID signatures,
hardened runtime, staples, Gatekeeper, disk-image integrity and contained payload
verification pass. Signature-only payload equivalence preserves original compiled
code/resources. See the JSON receipts in this directory. All earlier 0.3.5
candidates remain superseded; they are not this release.

## Validation and remaining gates

Runtime source passed all nine GitHub checks and exact-head Codex review without
findings. Parent combined verification passed 419 desktop checks (2 installed
artifact skips), web build, actual React/native-domain memory lifecycle and loss
recovery, nine review-regression cases/108 navigation geometry states and 19
routes/24 appearance combinations with keyboard navigation. Native memory
lifecycle and real stdio tests pass. Final signed stdio checks cover both MCP
locations, proposal-only access, idempotency, Unicode/citations, workspace
isolation, explicit absent receipt, correction invalidation and forgotten-entry
exclusion. This uses an isolated native fixture for review; it is not installed
external-host or provider acceptance.

Agency release-page tests pass 23/23. Full Agency check and build passed. The
page was rendered without JavaScript at 320,390,768,1024,1025,1440 with no overflow;
the parent directly viewed the normal-width output. Existing Canon styling,
private/noindex/no-store headers and earlier-footage labels are retained.
Memory copy states provenance/confidence, exact native review, advisory status,
no automatic history ingestion and honest forget/conversation/backup limits.

Functional correctness: passed within the recorded source/domain/signed-stdio
scope. Perceptual/product quality: passed within combined Chromium evidence;
fresh final signed native acceptance is assigned independently. Release
readiness: cryptographic/packaging qualification passed, promotion held for that
independent review plus final metadata-head review/CI and public-download proof.
The signed native report is preserved separately by its reviewer; parent records
its final result before promotion. External-host reads passed on isolated prior
QA; proposal acceptance was blocked by that host's `never` approval policy.
VoiceOver, older macOS floor, Google/phone/fresh-user and human acceptance remain
outside these automated and bounded native checks.

## Promotion, rollback and ownership

After final gates, check backend-key absence and anonymous URL 404 immediately
before a single no-overwrite upload. Read backend state, completely redownload
anonymous bytes, verify size/hash, and rerun the unchanged production verifier.
Then merge the reviewed exact head normally and read the Agency main deployment
by merge SHA. Repeatedly verify canonical `/gigi` and `/gigi/beta` version, URL,
filename, checksum/size, no-store/noindex and rollback. A deploy receipt alone is
not live acceptance.

Current public rollback is verified 0.3.4: 91,823,696 bytes, SHA-256
`2abef152aea7f751080efaac9a79a8ddbfc02de58d5a93222d3acc53d9be62af`.
Keep that immutable artifact and local app data. Revert canonical metadata if
needed; never drop memory tables or restore old backups just to roll back UI,
because forgotten text could reappear.

Public source/build/promotion belongs to this parent. The original release
thread owns separate Grantbot DEV 0.3.5 port/distribution from canonical
`96b938d7401c08f9998bc3640dfc0e5cdb4fede5` and final Danny handoff after both
shipping destinations verify. No installed public/DEV app is replaced by this
release process. Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-0597f042`, branch
`t3/gigi-workspace-agent-memory`, until live promotion and tracked closeout.

Independent Sol 6.1 page review passed all 23 tests and independently matched
DMG bytes/hash against metadata. It directly viewed fresh 320px and 1440px top
and memory sections with readable Canon styling and preserved review/forget
limits. No blocker was found; publication and signed-native acceptance remain
separate gates.
