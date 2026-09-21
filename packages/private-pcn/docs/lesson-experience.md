# Lesson experience

Each video has a shareable lesson at `/lessons/:id` (default network) or `/n/:slug/lessons/:id`. The library and publishing desk link to it. Library query/series filters are encoded in the URL, carried into the lesson, and restored by browser Back or Back to sessions. Return destinations are constructed locally, never accepted as arbitrary URLs.

Network owners can expand Edit lesson material to add optional outcomes, prerequisites, tool/version notes, a reviewed plain-text transcript, a practice task, and one exact asset release from their network. Save updates the member-facing material immediately; this is not a second draft/publish workflow. Existing videos have no invented learning data. Transcripts may be copied from Descript or another authoring tool, then reviewed by the creator. HTML is escaped, not executed. Maximum request size is 64 KiB; field limits are enforced server-side.

Video visibility, ingestion readiness, network status and current role govern lesson reads. Missing/unauthorized records share an unavailable response. Provider IDs stay server-side. Pages and API responses are private/no-store. Linking a release grants no entitlement: restricted asset metadata is omitted unless the viewer can browse the asset or holds that exact release entitlement. Release pages retain acquisition, license and download controls. Course completion, certification, evidence review and sequencing are not claimed or created by this slice.

Writes require the current network administrator, same origin and an existing scoped video. Updates emit `lesson.updated` receipts. Read/write impersonation does not gain this new mutation automatically; the existing explicit support allowlist still blocks it. This is intentional pending separate support-action review.

Analytics: lesson and library page views, and lesson-to-release primary actions, use existing aggregate impact collection, privacy signals, operator exclusions and retention. Network IDs, lesson IDs, transcript content and search terms are not sent in these events. These counters do not prove practice or competence.

Migration `0014_lesson_material.sql` is additive. Apply before deploying. Rollback the Worker to the previous version while retaining the unused table; do not drop creator-authored data. No payment flags change.

Validation: SQLite-route tests for private/draft/cross-network/suspended reads, admin/same-origin/scoped writes, input bounds, exact-release visibility and revoked entitlements; navigation helper tests; package type checks/build; real preview editor/transcript/filter-return and responsive acceptance. Production acceptance should distinguish public unavailable-state checks from authenticated lesson checks.
