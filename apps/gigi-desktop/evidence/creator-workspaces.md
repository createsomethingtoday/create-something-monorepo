# Creator workspace acceptance

Candidate: GiGi 0.2.0, branch `codex/gigi-creator-workspaces`, based on `23b846913`.

## Native checks on 2026-10-20

The candidate ran with disposable profile `/tmp/gigi-creator-acceptance-20261020`. The installed app and its real data were not modified.

- Created the synthetic “Creator acceptance” workspace through onboarding.
- Selected `/tmp/gigi-synthetic-media` through the native folder picker. The receipt reported five indexed entries and no upload.
- Confirmed separate Audio, Music video, Project file and Other / unsupported labels.
- Played a generated three-second WAV and a generated three-second H.264 MP4 through the indexed local media protocol. Native controls showed the three-second duration; the video reached its final frame.
- Saved artist, project, collection, version and tags for the synthetic WAV. Searching the project returned that recording alone.
- Moved only the generated WAV fixture outside the selected folder. The library showed “Original unavailable · reconnect” and removed its preview action. Selecting the moved original through the reconnect picker restored availability and preserved its organization.
- Created and saved an Instagram draft without an account connection. The app showed revision 1 and “Draft saved locally. Nothing was published.”
- An incomplete publish review stopped with missing verified image, account and HTTPS JPEG requirements.

These checks do not establish a real Instagram publication. No OAuth grant or post was created. Native restart and final signed artifact qualification are separate release gates.

## Provider boundary

Read-only Composio inspection found the existing enabled `instagram-prod` auth configuration and zero connected Instagram accounts. The existing configuration requests profile, content publishing, messages, comments and insights access. GiGi uses only identity and publication operations and discloses the broader provider grant before consent. Deployment preserves that scope snapshot; it does not create a user grant.

Only one publicly hosted JPEG is supported. Carousels, Reels, Stories, scheduling and private local photo uploads are outside this release. Mock tests cover account ownership, scope rejection, exact media identity, confirmation, duplicate fencing and uncertain receipts. An authorized connected account and a separately authorized real post are needed to establish live provider publication.

## Storage changes and rollback

Desktop tables are additive and included in the existing SQLite backup. Media originals remain outside the backup and are never moved or copied by importing.

Connector migration `0004_instagram_workspace.sql` adds separate consent and publication journals. It does not modify existing Google tables or grants. Temporary copies of already-public JPEGs use a dedicated R2 bucket with ten-minute application expiry and one-day lifecycle deletion. The prior connector deployment and prior immutable desktop download remain the rollback targets. Do not delete publication journals when rolling back: they retain duplicate-prevention evidence.

PR review follow-up: pending Instagram containers retain staged JPEG bytes until the ten-minute expiry and are journaled before readiness checks. Explicit continuation checks readiness once and claims the prior confirmed publication atomically; GET receipts never publish. Tests cover competing continuations, expiry without publication and exact prepublication-error recovery. Ambiguous errors remain fenced.
