# Replay and private-media acceptance

This follow-up supersedes the outstanding live-media limitations in the earlier
onboarding polish review. Scope remains the existing preview acceptance lab;
production promotion is separate.

## Change

Library and learning-path actions use the player's existing end-position rule:
positive saved positions within two seconds of the end offer Replay and open at
zero. Earlier positions offer Resume. Zero or unknown-duration positions offer
Play. Watched and practice statuses remain explicit user actions, separate from
playback position. No authorization, billing, provider settings or schema change.

## Evidence

- Package: 259 passing tests, including nine playback-position boundary cases.
- Svelte: zero errors and warnings. Build and preview dry run pass.
- Local synthetic browser suite: 14 passing checks, including Replay in library
  and paths without inferring watched status. Fixture controls precede the
  product skip link; the keyboard test now accounts for that existing fixture UI.
- Independent source and screenshot review: no blocking findings. Desktop Replay
  and mobile mid-video Resume inspected; no exhaustive assistive-technology claim.
- Real preview: synthetic 130-second clip uploaded, processing/readiness checked,
  published to members only. Creator and independent member playback crossed
  renewal intervals, saved exact positions across reload, and reached the end.
- Anonymous and uninvited accounts could not see private content. Active member
  could play but received 403 at creator studio. Normal logout denied the lesson.
  Temporary membership was revoked; fresh sign-in hid the library content and
  denied the direct lesson with no video element.
- Tokenless provider HLS manifest and MP4 download endpoint both returned 401.
  No signed tokens were captured or published; no download generation or provider
  setting changes were made. This does not prove an MP4 derivative was generated.

## Limits and release boundary

Tokenless denial is distinct from expired-token denial. Revocation denies new
access under the existing fresh-membership policy, but already issued grants can
remain usable until their 60-second expiry; buffered media cannot be recalled.
This run proves revoked UI/metadata denial, not an authenticated direct playback
API probe, an expired-token probe, or active in-flight revocation. Synthetic API
tests remain separate evidence for those policy paths.

The synthetic clip remains stored and published to members in preview. The test
membership remains revoked. No accounts, new grants or production mutations are
part of this follow-up. Preserve current deployed billing/commerce flags rather
than treating historical launch prose as configuration authority.

Final source review/CI and immutable preview readback precede normal PR merge and
production promotion. These bounded onboarding checks do not close unrelated
commerce, payments or support launch gates. Detailed local receipts and screenshots
are retained in the task's `preview/` directory, including
`real-media-acceptance.json` and `tokenless-provider-checks.json`.

Worktree disposition: preserved at `task-4/pcn-onboarding`, branch
`codex/pcn-onboarding-release`, through the review/promotion checkpoint.
