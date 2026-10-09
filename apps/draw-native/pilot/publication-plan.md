# Proposed publication actions — approval required

Everything here is prepared locally. No merge, push, release upload, web deploy, outreach or launch has happened.

## Existing infrastructure

Draw already uses Cloudflare Pages project `create-something-mapping-canvas` for `draw.createsomething.agency`. The repository already uses GitHub Releases for native candidates. There is no existing binary R2 binding in the Draw Pages configuration. Prefer an immutable GitHub Release asset rather than adding a new storage service or shipping a 9 MB binary inside the web build.

Proposed release tag: `draw-v0.1.1-mac-pilot` (Mac-only, not the existing combined Mac/iPhone release workflow).
Proposed asset: `Draw-0.1.1-arm64-notarized.dmg`.
Proposed public URL: `https://github.com/createsomethingtoday/create-something-monorepo/releases/download/draw-v0.1.1-mac-pilot/Draw-0.1.1-arm64-notarized.dmg`.
This is a proposal, not an existing verified URL. Draft release assets require authentication and must not be linked as a public download.

The exact accepted file is 9,152,911 bytes, SHA-256 `25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141`. App source is `659ca02c3300f70f6bc549f4896df989debf9ff2`. Later commits add verification evidence, download-page copy and pilot materials; no native rebuild is required for this pilot. Keep the original signed/notarized candidate unchanged.

## Approval bundle

1. Review and merge the isolated Draw changes to the intended main branch after checks. Review any intervening main changes before merging. This is a public source change if the repository is public.
2. Create the Mac-only release/tag at the verified application source (once that commit is in the published history), initially draft. Upload only the accepted DMG, checksum text, sanitized qualification receipt and pilot onboarding. Read back all assets and compare hashes. Do not run the existing combined native workflow: it includes iPhone/TestFlight actions outside this approval.
3. Publish that release as a macOS pilot prerelease. This makes the assets publicly downloadable; it is not a ProductHunt or App Store launch. Verify unauthenticated download bytes and checksum before enabling the page link.
4. Replace the page’s request-only pilot CTA with the verified immutable download URL, retain compatibility, backup and release boundaries, and deploy the reviewed website through the existing manually dispatched Draw Pages workflow. Verify live desktop/narrow page, asset response and checksum. No unrelated website changes.
5. If separately approved, host the synthetic demo MP4/poster and pilot onboarding/feedback guide alongside the release, then link them from the download page. No recordings of client work are included.

Outreach is separate: the kit has unsent drafts and no chosen recipients. Approval must identify the recipients and delivery/feedback destinations before any messages, invitations or third-party sharing. ProductHunt publication is not proposed in this bundle.

## Pilot limits and privacy

Five automation consultants/technical leads use one synthetic or redacted workflow. Local JSON is the editable backup. SVG/PNG communicate the map; recipients edit a JSON copy independently. Optional web cloud snapshots are a separate sharing path and are not used in this pilot. Agent edits shown in the demo use the actual browser-local tool implementation via a registration capture harness; no AI generation, native-shell agent mutation or physical iPhone acceptance is claimed.
