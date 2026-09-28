# CRE-2151 source-generated email alignment

Canonical scope: Linear CRE-2151. Execution: create-something Paperclip CRE-112;
independent review: CRE-113. Source review only; no merge, deployment or provider
publication is authorized by this handoff.

## Candidate and preservation

Base: `c6921a7e2c19968c0a79c70448e92af3e56d8e03`.
Branch: `codex/CRE-2151-agent-worktree`.

Seven source-generated messages use the inline Canon document: IO and Agency
contact replies and owner notifications, newsletter confirmation, welcome, and
subscriber re-engagement. Compact 28px sans headings, 16px body text, readable mono
metadata, square actions, precise borders and 20px content insets translate the
shared Draw/client workspace hierarchy without importing application layout.
The shell adds an Outlook conditional width wrapper and fixed table layout for
long content. Literal email tokens remain unchanged; no global palette changes.

Property-local pure contact renderers replace stylesheet-dependent HTML. Sender,
recipient, subject, reply-to, fetch calls, validation, database writes, analytics,
consent lifecycle and response handling remain in their existing routes. AST
comparison against the base proves that the route code outside HTML payloads and
renderer-only imports/helper removal is unchanged. All four contact messages retain
their normal-fixture visible transactional copy (apart from the new brand metadata
and hidden preheader); Agency retains service/intent/lane and its 24-hour promise,
while IO retains the 24–48-hour promise. Owner notifications remain separate.
User-provided names and notification headings are now escaped as text. Existing
ampersand entities in IO user input are likewise rendered literally.

Newsletter visible copy, ordered URLs/media attributes, re-engagement subject,
preheader and plain text match the base. Confirmation remains double opt-in;
welcome unsubscribe remains central createsomething.io with encoded token. Media
URLs and descriptive alt text are retained. Image blocking leaves all essential
copy, actions and unsubscribe visible, although Chromium clips the long image alt
inside its reserved image area. No unsubscribe link was activated.

## Validation

- Worktree bootstrap completed with the pinned cached toolchain and lockfile-matched
  dependencies. No full install, lockfile or dependency-manifest change.
- Focused Vitest suite: 5 files / 8 tests pass. Run after package SvelteKit sync:
  `node packages/canon/node_modules/vitest/vitest.mjs run --config scripts/email-review.vitest.config.mjs`.
- Canon package generation and publint pass. Canon and IO svelte-check: zero
  errors/warnings. Focused strict TypeScript check of the pure email modules passes.
- Agency svelte-check reports three missing dependencies in unmodified files:
  oso-cloud in lib/authz/oso.ts and auth-platform in two identity-worker files.
  This is a check limitation, not a claimed full Agency pass.
- Ego Chromium: 63 cases, seven messages × normal/long/fallback-font-with-images-blocked
  × 320/390/1440px. No horizontal overflow, unresolved placeholders or scripts;
  minimum measured text contrast 6.14:1. 35 screenshots and 21 HTML previews retained.
- Long fixtures include long unbroken names/service metadata and escaped script-like
  text. Rendering calls pure functions; fetch is disabled in the preview harness.
  The existing subscription test mocks delivery. No test emails were sent.

Chromium is not Outlook, Gmail or Apple Mail delivery proof. MSO behavior and
client dark-mode/CSS transformations remain unverified. Full package workflow
checks beyond the above are not claimed.

## Review, rollback and separate hosted track

Review the exact source commit plus the source review bundle linked from CRE-112.
The earlier four offline hosted-template candidates and their hashes are unchanged.
Their independent offline pass does not approve this new source candidate.

Hosted access remains blocked at Resend login. Current provider IDs/versions,
metadata, merge semantics, rollback exports and provider drafts are still unknown;
no provider update is claimed. Source rollback is a revert of this candidate commit
before any later deployment. Base source exports are included in the evidence bundle;
they are not hosted rollback exports. Outerfields client-update remains excluded.

Worktree disposition: preserved at the assigned temporary `cre-2151-agent-worktree`
on `codex/CRE-2151-agent-worktree` until independent source review and subsequent
promotion decision. Local dependency links reuse the main checkout's matching cache;
remove only worktree-local links if retiring the checkout. Do not delete their targets.
Engineer and reviewer offline artifacts remain in the Paperclip project workspace.
