# Learning continuity and playback polish

CRE-2257. Micah approved path resume context, caption readiness/playback recovery,
explicit publication effects, and mobile prerequisites/Next placement. This pass
is code and a draft PR only. Storyboarding and course production are separate.

## Behavior

- Progress position writes may carry the selected path ID. The next library
  resume retains that path. Reads revalidate network, publication and every
  lesson's current access; stale context disappears without hiding the saved
  position. Invalid/stale context never grants access or prevents an otherwise
  permitted position save. Direct playback without context preserves a prior
  valid choice; watching from a different path replaces it. Old progress remains
  valid without path context; it is not guessed or backfilled.
- The player waits for media readiness, observes native/HLS failure and stalled
  loading, and offers Retry with a fresh grant and retained in-session position.
  A recovered media event restores saving and grant renewal. Session tests use
  fake media events and grants, never a real provider or saved account progress.
- Caption availability comes only from actual caption/subtitle text tracks.
  No empty caption element implies a source. Missing/unknown tracks are explicit.
  Creator guidance distinguishes video processing, caption review and the separate
  plain-text transcript. This does not generate/upload captions or certify their
  timing, editorial quality, signed delivery or keyboard behavior on a real stream.
- Path actions explain draft/publication/archive effects and return state-specific
  save feedback. Individual video audiences remain unchanged.
- Lesson prerequisites/tools precede the player. Sequence/Next follows progress
  before transcript and practice in DOM order, including narrow layouts.

## Migration and rollback

Migration `0027_progress_path_context.sql` adds nullable `lesson_progress.path_id`.
Apply it to the intended environment before deploying this code. No migrations
were applied to persistent or remote databases in this task. Existing positions,
watched marks and practice notes are unchanged. Roll back the Worker to the prior
version while retaining the additive column; do not delete learner records.

## Validation and local review

Baseline: two API regressions failed before implementation (path context missing;
unrelated path silently accepted as if usable). Final tests distinguish dropping
unavailable context from rejecting authorized position saves. Tests cover legacy
rows, last selected path, cross-network/inaccessible context, publication copy,
reading order, caption track detection, initial/renewal failure retry, stalled
recovery, and disposal races, alongside existing policy/API coverage.

Use the documented opt-in `tests/acceptance/server.mjs` loopback fixture. Its
initial `polish` scenario has two synthetic lessons, a saved path and a long
transcript. Review `/library`, `/lessons/lesson-1?path=path-1`, `/paths/path-1`, and
creator controls via the explicit synthetic role selector. No recorded media is
provided; playback deliberately returns a synthetic failure. External provider
calls are disabled, storage is transient SQLite, and this is not a live preview.

Fresh interactive browser QA remains a release gate: the supported `cua` inventory
returned `[]`, and hidden IAB creation returned `Browser is not available: iab`.
No native desktop or alternative automation route was used. This is unavailable
tooling, not a denied product login. Source/SSR and event tests do not establish
rendered mobile, assistive technology, or real native/HLS acceptance.

The separate course task `01a12dc8-4acd-76bd-b091-14cf02d100df` was notified that
this pass does not change content, captions, uploads, publication, or destinations.
The approved promotional teaser is not lesson acceptance. Narration/assembly and
actual course/caption delivery remain separate release gates. No paid services,
new grants, real progress changes or production deployment were performed.

Worktree disposition: retained at task-8/pcn-polish on codex/pcn-learning-polish
until independent review, exact-head CI and release approval.
