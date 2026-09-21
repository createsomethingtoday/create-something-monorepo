# Guided learning and personal progress

CRE-2030. Database owns creator-ordered paths and member-scoped progress; Automation saves playback position and aggregates engagement; Judgment applies fresh network membership and lesson publication checks. Watching never grants admission, a badge of competence, or asset entitlement.

## Creator and member behavior

- `/paths` and `/n/:slug/paths` list paths. Creators can create/edit title, outcome, prerequisites, estimated effort and a sequence of 1–30 distinct lessons. Networks have a 50-path limit. Draft, published and archived states use the existing PRIVATE state accents.
- Publishing requires ready, published lessons in the same network. An optimistic revision guards stale edits. Path writes and activity receipts commit atomically; the 50-path capacity check is part of the insert. Support workspaces cannot create paths. Impersonation cannot mutate paths or progress.
- Members receive a path only when all its lessons are authorized. Revoking membership, suspending a network or archiving a required lesson hides the path, including next-lesson metadata. Creators may preview drafts. If a lesson is deleted, the creator retains access to the path with a repair warning and can replace or remove the missing entry; members cannot open the path until it is repaired.
- A lesson reached from a path offers the next authorized lesson and a return to the sequence. Exact asset-release links retain their separate entitlement check.
- Playback position saves every 15 seconds, on pause/end, and best-effort during navigation. A network failure can lose the most recent unsaved position; the UI warns and retries. The latest successful write wins across concurrent visits. A lesson saved at its end restarts from the beginning.
- Watched status is explicitly self-reported; practice started is available only with an authored practice task. Neither proves completion or competence. Continue learning shows up to four recent authorized lessons in the current network.

## Data and measurement

`0015_guided_learning.sql` adds `learning_paths` and `lesson_progress`. Progress keys are `(network_id, Identity subject, video_id)`; client-provided subject IDs are ignored. GET responses omit other members' progress. Export schema 4 includes path documents and excludes individual learner progress.

A daily retention worker removes lesson-progress rows after 365 days without an update. Anonymous lesson playback does not create personal progress. DNT/GPC opt out of aggregate measurement but do not disable functional account progress.

`lesson_start`, `lesson_resume` and `practice_start` are client-reported aggregate engagement events on the lesson surface. They are not unique learners or trusted completion outcomes. The payload contains only event and surface; no lesson IDs, queries, content or account identifiers. Existing operator, impersonation and DNT/GPC exclusions apply. Aggregate retention remains 90 days.

## Release and rollback

Apply migration 0015 before deploying the application and retention worker in each environment. The migration is additive. Rollback restores the prior application/retention versions while retaining the new tables; do not delete learner progress to roll back UI code. Production paid flags stay disabled.

Validation: public API tests cover ordered publication, stale revisions, cross-network and suspended access, personal progress separation, impersonation denial, archived/revoked resume denial, aggregate privacy/opt-out, retention and owner export isolation. Complete preview browser editing, pause/reload resume, path navigation, mobile width, keyboard focus and live production readback before recording release completion. Synthetic acceptance paths are preview-only and must remain clearly labeled.
