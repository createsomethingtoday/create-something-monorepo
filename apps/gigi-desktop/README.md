# GiGi desktop beta

## Selected source proposals (candidate)

Open an already imported Gmail interaction or Google Calendar schedule record and choose **Create task from source** or **Create gig from source**. Review the title and optional date, then approve the local save. Ask GiGi supports the same operation when a conversation starts with that source selected. Source text is reference material, never authority to execute instructions. This feature neither sends email nor creates or updates Google Calendar events, and requires no new Google scopes.

The save atomically creates the local record and its source relation. Workspace, account, provider and source identity are validated again against the reviewed snapshot. Repeating a conversion returns the existing task or gig and preserves user edits. Tasks have no inferred deadline. Calendar gigs retain their explicit date range; all-day end dates remain exclusive. Newly imported events can retain their original time zone, offsets and provider reference. Older imports may lack that metadata.

Chat reconciles uncertain saves using an exact, read-only receipt lookup. An absent receipt, or a created record edited before recovery, can remain unresolved and block another chat mutation; do not interpret this as proof that nothing was saved. Inspect local records before attempting another proposal. The direct form retries its identical idempotent request. Import remains the existing explicit, bounded page operation; this feature does not add inbox browsing or live provider selection.

Acceptance for this candidate covers synthetic Gmail/Calendar proposals, cancellation, stale snapshots, cross-workspace/account rejection, atomic links, duplicates, lost replies, all-day dates and offset-aware times. An isolated ad-hoc QA bundle passed native cancellation, Gmail task save/duplicate preservation, Calendar all-day gig save and restart/reopen with source links. Missing receipts and mismatch rejection were exercised deterministically, not through native fault injection. Production release qualification and actual provider-backed chat acceptance remain separate gates; the installed production app and real records were untouched.

A Rust/Tauri desktop workspace for music-related work. Each installation owns a private SQLite database. The UI and local MCP companion use the same validated domain operations. CTX supplies supporting history; current records and calculations remain in SQLite.

The local functional beta passed connected desktop and physical cellular-phone acceptance; current receipts and artifact hashes are in `evidence/local-checkpoint.md`. Developer ID signing, notarization and installation of the qualified release remain required before production distribution. See `evidence/tdd.md` for checks and failures; a successful build alone does not prove acceptance.

## Local flyers and artwork (0.2.8)

Today combines dated gigs and Calendar schedule entries, ordered across the complete workspace before showing five. Ongoing events are included. Only verified source-derived duplicates collapse; matching titles alone stay separate. A Calendar import supplies event details, not flyer bytes.

Open a gig or schedule entry and choose **Add artwork**, or use **Add artwork** beside a music entry. Select one static JPEG/PNG, describe the image, and record its provenance and rights status. Images are copied into the private SQLite workspace; original files remain unchanged. Limits are 8 MiB per input, 24 megapixels, an 8,192-pixel edge, and 100 stored images or 128 MiB including thumbnails. Reuse saved artwork across records. Identical bytes deduplicate only when provenance matches; conflicting rights, purpose or attribution are rejected so reviewed metadata is never silently discarded. Explicit reuse retains the saved provenance. **Remove cover** detaches an image; **Remove unused saved image** frees an image only when no record or draft references it. Images are included in database backups; audio, video and DAW project originals remain external references. The image quota counts live asset bytes, not SQLite file size or accumulated backups; SQLite can retain freed pages and backups need their own disk space.

Cards fit the whole image so portrait flyers retain their edges. Open a record's image or a music thumbnail for the full original. Missing or damaged images retain the record's text. “Official flyer · user supplied” records the user's attribution and source URL; GiGi does not verify an issuer. Generated illustrations remain labelled separately. Unknown rights stay unknown, and no image is uploaded automatically.

In Instagram drafts, **Choose saved local artwork** reuses a workspace image and saves an immutable image snapshot with the caption. Local artwork supports private preview only and has no publish control. Changing a record's cover does not change an existing draft. The existing public-JPEG publication workflow remains a separate option with its existing human approval boundary.

The bundled **gigi-artwork** skill uses an external Codex host's built-in/default image generation when the user asks for it and the host actually supplies that capability. Generation consumes host usage. The host inspects and copies the selected output into an exact expiring GiGi import slot; typed MCP validates, attaches and returns a receipt, then the skill reads the target back. Image bytes never enter MCP prompts as base64. Embedded Ask GiGi cannot generate images. Remote hosts need actual access to the same bytes and this Mac's MCP; a connection alone does not establish that. There is no automatic API fallback, flyer discovery, account linking or local-image publishing.

## Organize music on this Mac

Open **Music library** under Creative work to organize demos, final bounces, session files and music videos. You need a local GiGi workspace and the original files on this Mac. No source sign-in or agent subscription is required.

1. Choose **Add files** and select a file in the native picker. The import result reports how many entries were added, duplicated or skipped. Files stay in their original locations; GiGi does not upload or copy them.
2. Choose **Organize** beside the entry. Give related files the same **Project** name, label a bounce with **Version**, and use **Collection** for listening references. Artist and tags are optional. Choose **Save organization**; the saved fields appear in the library and can be searched.
3. Choose **Preview** on an available audio or video entry. Playback stays local. If its format or codec cannot play on this Mac, GiGi shows a preview error; use the file's own application instead. Session files and other formats remain indexed references without an in-app preview.

**Add folder** indexes only the folder you select and its descendants. Hidden files and symbolic links are skipped. Imports stop at 1,000 entries, 10,000 visited entries, or 16 folder levels; the library holds up to 10,000 entries per workspace. A limit notice means some files were not indexed. Select a smaller folder to continue. **Cancel import** requests cancellation. An “Import cancelled” receipt confirms that no new entries were saved; an import that already finished reports its added entries. Search covers title, artist, project, collection, version and tags; the media filter separates audio, music video, project files and other formats.

If an original becomes unavailable, choose **Reconnect** and select that original in its current location. Reconnection requires the same filename and file identity on the same device. A changed file or a copy on another volume must be added separately. Importing an edited file creates a new entry; the old entry stays marked changed. Give each entry a version label to distinguish it. GiGi does not keep earlier media bytes or restore an overwritten bounce.

**Remove entry** removes its organization from GiGi after confirmation. It never deletes the original. Organization is saved in the selected workspace's local database and included in GiGi's database backups. The media itself is not included: keep your own backup of recordings and project folders.

## Draft an Instagram post

Open **Instagram drafts** under Creative work, then choose **New draft**. Add a title and caption and choose **Save draft**. “Saved locally” confirms the draft was saved on this Mac; it does not mean the post was published. Drafting works without an Instagram connection, and an unfinished draft can omit its image and account.

This release's publishing flow supports one JPEG image and a caption within the displayed 2,200-character limit. The image needs a direct public HTTPS URL on an operator-approved image host. It does not upload local library media or photos. It does not offer carousels, Reels, Stories, scheduling, music overlays or personal-account publishing. Keep private files private; only use an image URL you intend to share publicly.

When you want to publish:

1. Choose **Check connection**. Publishing needs a verified Instagram Business or Creator account and its required publishing permissions. **Connection setup** explains sign-in and consent. If Instagram is not configured for this release, ask the GiGi operator to configure the existing Composio integration; your local drafts remain available. Starting browser consent is a separate, explicit choice. An unfinished consent attempt should be completed and verified rather than restarted.
2. Enter the **Public JPEG image URL**, then choose **Load verified image preview**. The connector fetches and validates that public image without publishing it. GiGi requires a JPEG no larger than 8 MiB, at least 320 pixels wide, with an aspect ratio from 4:5 through 1.91:1. A rejected image needs correction before review. If its host is not allowed, ask the operator which image host this release accepts. The preview layout is approximate.
3. Select the verified **Publishing account** and choose **Save draft** again. This saves the exact image identity with the caption and account. If the public image changes later, load its preview and review it again before publishing.
4. Choose **Review & publish**. Check the account, image and caption in the confirmation dialog. **Keep as draft** closes the dialog without publishing. **Publish on Instagram** authorizes that exact saved post.
5. Read the receipt. **Published on Instagram** means GiGi verified Instagram's post readback. **Publish returned · verification pending** means a post ID was returned but not yet verified. **Publishing outcome unknown** means the result is uncertain. For either uncertain state, use **Check publish receipt** and inspect Instagram; do not publish again. **Not published** preserves the failed attempt and allows **Copy into a new draft** after correcting its requirements.

Connection verification, a saved draft and a preview do not establish that a real post was published. Native playback and provider publishing acceptance require their own release evidence; this guide makes no acceptance claim.

### Why these workspaces use these patterns

The recommended structure draws on familiar creative tools:

- [Ableton Collections](https://help.ableton.com/hc/en-us/articles/360000268570-Using-Collections) organizes mixed music assets through collections. GiGi uses project, collection and version labels so a musician can keep related work together while a listener can organize reference tracks and MP4s.
- [Apple Music's file-reference option](https://support.apple.com/guide/music-windows/change-where-music-files-are-stored-mus69248042d/windows) keeps a library entry while leaving the original file in place. GiGi follows that non-destructive reference pattern, with explicit recovery when the original changes or disappears.
- [Buffer's draft workflow](https://support.buffer.com/articles/managing-and-approving-draft-posts-57li7M8tDA) separates saved work from publishing. GiGi pairs that separation with an image preview, account verification, a final confirmation and distinct outcome receipts.

These comparisons explain the interaction choices. They do not imply feature parity with those products or change Instagram's API restrictions.

## Development

From the monorepo root, run `pnpm bootstrap:worktree` first.

- `pnpm --filter @create-something/gigi-desktop test`
- `pnpm --filter @create-something/gigi-desktop test:domain`
- `pnpm --filter @create-something/gigi-integrations test`
- `pnpm --filter @create-something/gigi-integrations typecheck`
- `pnpm --filter @create-something/gigi-desktop build:local`

The local build uses a separate ad-hoc signing configuration, requires macOS 13 or later, and currently targets Apple Silicon. It does not require Grant’s Apple credentials. Production packaging uses `pnpm --filter @create-something/gigi-desktop build` after release signing is configured. An app bundle alone does not establish a signed/notarized production release. Run `verify:release` with the absolute app and DMG paths after production packaging; it exits nonzero for an unqualified pair. Qualification is separate from installing that exact release and repeating the native workflow. The verifier is read-only and must reject the local ad-hoc build. It checks the signed GiGi identifier, Developer ID executable signatures, Gatekeeper and stapled notarization, DMG integrity, and the byte/mode identity of the app mounted read-only from that DMG. An optional `--source-sha` is recorded as a caller assertion, not verified build provenance.

## Local state and agent access

### Source connection diagnostics

In Settings → Source connection support, choose **Start local capture**, repeat the failing source action, then **Stop capture** and **Review diagnostics**. Export is available only for that stopped, reviewed report. The app saves a private local JSON file and shows its path; nothing is uploaded automatically. Share it deliberately with the GiGi operator, alongside the steps that failed, without adding account details or source content. Pending consent or operator-review states must be reconciled before another consent attempt.

Capture records only compiled build identity, platform, timestamps, random correlation IDs, provider/stage, safe outcome codes, transitions and retry indicators. It excludes credentials, account identities, URLs, message/event content and record payloads. Capture stops after one hour or app restart, retains at most 200 events, and prunes events older than seven days when diagnostics are accessed. **Delete diagnostics** removes the app-owned capture and export, including unreadable captures; it cannot recall copies a user has shared. Diagnostic failures do not change the result of source operations.

The default macOS state directory is `~/Library/Application Support/agency.createsomething.gigi`. `GIGI_DATA_DIR` selects an isolated test profile for both the desktop and MCP companion. Never point acceptance tests at an existing person's database.

The app's `gigi-mcp` companion exposes bounded typed tools over stdio. The bundled `agent/gigi` skill teaches domain relationships and progressive retrieval. Generate install-specific connector configuration with `scripts/package-agent.mjs`, passing the installed app bundle, a new output directory, and the absolute data root for the reviewed GiGi workspace. The workspace must already exist with its `gigi.sqlite` database. The generated MCP configuration binds that exact profile; an omitted or invalid data root fails before packaging. Provider connection acceptance is separate from generating configuration.

Use an existing subscribed Codex or Claude Code session. Phone access uses that provider's remote connection to the running desktop session. There is no automatic model API fallback. Manual database use remains available when the agent cannot run.

Composio's developer credential belongs in the authenticated broker, never in the distributed desktop app. Each user's connected-account ownership and scopes must be read back before import. CTX must use a workspace-specific data root and explicit source imports.

## Release acceptance

A fresh local install must complete onboarding, linked record creation and correction, source consent/import, agent read/write, restart persistence, backup restoration and disconnected recovery. Verify two independent user profiles cannot cross-link records or source bindings. Micah owns physical phone-on-cellular acceptance after the installed candidate is ready. Capture the exact artifact identity and separate local acceptance from Developer ID/notarization and production distribution receipts.

## Implemented beta scope

The reviewed catalog preserves all 13 entity types and named relationship roles. The beta implements typed record editing, validated links, integer-cent money summaries for USD/CAD/EUR/GBP, source provenance/deduplication, mutation history, and SQLite backup/restore. It does not yet reproduce every Notion formula/rollup. Binary attachments are limited to the bounded local artwork described above; other catalog file fields remain text. Empty or incomplete financial inputs are marked incomplete; the catalog alone is not formula parity.

Imports read bounded Gmail metadata and Calendar event pages. Each saved record is transactional; a failed page returns an explicit retry cursor and preserves completed records. Repeating the page deduplicates by provider, connected account, collection, and external ID and preserves local corrections. It does not send email or modify calendars.

Agent setup generates exact Codex MCP registration and Claude plugin launch commands. Preparing files is not installing a plugin or verifying a session. The user must approve writes in their provider's session; read-only automation cannot supply that acceptance. Use the compact bundled skill and retrieve full details only for selected records.

## Guided onboarding

Source setup now shows six stages: local workspace, GiGi source sign-in, source choice, Google consent, verification, and explicit bounded import. An expired GiGi session asks for sign-in; admission/resource denial asks the operator to check app access; an unavailable identity/connector service asks for a later status check. None of those errors grants access or releases a pending consent attempt.

After ownership and active-connection verification, the connector reads a display label through that same Google connection: Gmail's profile address or Calendar's primary-calendar identifier. The GiGi sign-in email is never used as the Google label. Missing, malformed or slow optional labels stay unavailable without inventing an account identity. Existing approved Google grants are broader than read-only; GiGi's fixed source proxy uses only GET operations. Each explicit import reads at most two Gmail metadata/snippet records or ten primary-calendar events. Open an imported record to review a linked local task or gig.

The dedicated `GiGi regression` workflow covers desktop, integrations, native domain, explicit MCP and CTX fixtures, and source conversion process acceptance. These synthetic checks do not replace fresh admitted-user consent/import acceptance or signed/notarized artifact qualification.


First launch explains the local workspace, optional Google sources and optional subscribed agent. Creating a workspace leads to Setup & safety, with a manual-work action and links to the source, agent and phone steps. Local records need no sign-in. Connecting sources uses the GiGi connector account and separate Google consent; verification and page imports stay separate.

Choose Codex or Claude Code, prepare the workspace-specific connector, and copy its exact command. Codex registration applies to future local sessions; Claude's launch flag loads GiGi for that session and must be used for future sessions too. A copyable read-only prompt asks for an actual `gigi_workspace_get` call. Prepared files, a recorded local tool call and physical phone acceptance remain separate states. Limits or provider outages leave manual GiGi work available.

The in-app setup buttons open fixed official guides in the system browser: [Codex CLI](https://learn.chatgpt.com/docs/codex/cli), [Claude Code](https://code.claude.com/docs/en/quickstart), [Codex remote connections](https://learn.chatgpt.com/docs/remote-connections), and [Claude Remote Control](https://code.claude.com/docs/en/remote-control). Choose provider subscription sign-in. Remote access depends on account eligibility and a running, awake, online host; normal phone chat does not supply a local connection.

### Icons

GiGi bundles a Lucide 0.562.0 SVG subset from the same installed library used by `packages/agency`. These assets work offline, inherit the app's foreground colors and remain decorative alongside visible labels. The desktop frontend needs no Svelte runtime. Lucide's ISC/Feather MIT notices ship in `web/lucide-LICENSE.txt`.

After bootstrapping the worktree, verify exact upstream geometry and license with `node apps/gigi-desktop/scripts/sync-icons.mjs --check`; regenerate with the same command without `--check`. Version changes require review.

CTX provenance: Codex session `5cd548a5`, event `26b16ef1` records Agency's Lucide dependency; current `packages/agency/package.json` and installed package version independently confirm 0.562.0. Isocons was visually reviewed at https://www.isocons.app/; Lucide was selected for readability in compact navigation/actions.

### Daily-work experience

Overview queries the whole private workspace through the read-only `workspace.overview` operation. It shows up to five upcoming active gigs, five unfinished tasks (due date, then planned date), and five Expected/Invoiced/Overdue financial records. Counts describe all matching records; income and expenses remain distinct rather than being netted into a balance. Missing or invalid gig dates are called out. The desktop supplies today's local calendar date; invalid date candidates fall back to a valid alternate, otherwise sort last.

Daily navigation remains visible; Library expands for supporting records. Record details prioritize actionable fields without removing supporting data. Dates retain their original calendar day, booleans use Yes/No, and empty sections explain their purpose with a first action. Settings uses connection receipts to explain the next step. Preparing an agent connector, using a local tool, and verifying phone access remain separate evidence levels. Technical source details and completed-agent setup steps are available through disclosures.

## Embedded Codex chat

Ask GiGi slides out as a right-side overlay for a selected record or the workspace. It preserves the underlying page and scroll position; Escape closes the drawer. The opening motion respects reduced-motion settings and does not replay during conversation polling. This beta uses a locally installed Codex CLI signed in with ChatGPT; it does not offer a separate GiGi ChatGPT sign-in or a paid model API fallback. The app locates the executable and checks the provider account. Account presence is distinct from a successful model turn, and subscription limits still apply.

The bundled `gigi-codex` companion drives Codex app-server. It verifies a restricted configuration, presents GiGi reads, existing-record saves and reviewed task/gig creation from a selected imported source, and routes them through the existing local MCP/domain boundary. Saves require an explicit in-app approval, a fresh expected record and a verified readback. Other record creation, relation changes and backups remain available through the manual or external-agent workflows. A completed reply triggers a fresh record read; cancelling or restarting must not silently replay a mutation. Other provider tools, shell execution, permission expansion and external MCP connections are outside this embedded workflow.

GiGi stores conversation ownership metadata under the selected profile's `codex-chat` directory. Codex stores its own local thread history and processes selected record context through the user's provider account. SQLite remains the source of truth for business records. Existing SQLite backups do not include Codex-owned transcripts or the chat metadata; provider session history is separate from a record backup. Embedded conversations do not automatically appear in the ChatGPT mobile app. The existing external MCP/remote-session route remains available separately.

The installed runtime's app-server protocol is a versioned integration boundary. An unsupported protocol, unavailable runtime, unauthenticated/API-key account or configuration that cannot be restricted must fail closed. Signing/notarization is still a separate release gate.

If delivery of a turn is uncertain and the provider cannot identify the matching turn, that conversation remains blocked rather than resending automatically. An uncertain save blocks embedded writes across the workspace until the affected record has a matching readback. Manual GiGi use remains available.

For isolated native acceptance, build the companions and run `cargo run --manifest-path apps/gigi-desktop/src-tauri/Cargo.toml --example verify_codex_chat -- <built-app-resources-directory> <new-absolute-disposable-profile-path>`. The verifier seeds synthetic records, performs a real subscribed read, approves one exact task rename, rejects another and checks restart/readback. It refuses an existing profile. Provider acceptance requires the actual bundled runtime, not fixture tests alone.

### 0.2.1 usability pass

Working pages use compact headers and keep record save actions in reach. Leaving an unsaved ordinary record asks whether to keep editing or discard; it does not silently save incomplete input. Schedule includes dated gigs alongside schedule entries, with their record type identified. This does not create or modify external calendar events.

When embedded chat is unavailable, **Check status** performs read-only reconciliation and **Open setup** explains the local Codex requirements. Status checks never resend a message or approve a write. Music keeps recovery actions contextual and its player separate from the list; Instagram keeps Save/Review visible, links validation to relevant fields and supports Command-S for local saving. Explicit publishing confirmation and uncertain-outcome protections remain unchanged.

## Agent access to Your music

The installed `gigi-mcp` companion exposes six typed tools over its existing stdio connection: `gigi_music_list`, `gigi_music_get`, `gigi_music_import`, `gigi_music_import_status` `gigi_music_organize` and `gigi_music_organize_status`. They use the same workspace `music_items` index as the desktop. List supports a bounded query, media-kind filter, limit and offset; get reads one entry; organize merges only supplied title/artist/project/collection/version/tags and requires `expectedRevision` from the current entry’s `organizationRevision`, rejecting stale UI or agent edits. `gigi_music_import_status` recovers a completed receipt or reports `unknown`/`not_started` using a read-only database connection, without a picker or schema changes. Import requests are claimed durably before opening the picker; a retry of an unfinished claim reports an unverified outcome without opening another picker. No tool moves, deletes, uploads or edits an original media/project file.

Import opens the existing native file/folder picker on this Mac. The user must select files or one folder each time; the tool accepts no filesystem paths or roots and grants no persistent directory access. An unattended agent cannot silently scan a music folder. A UUID request ID identifies the import receipt; repeating it returns that receipt without opening another picker. Results distinguish added IDs, duplicate IDs, skipped entries, cancellation and limits. A permission failure is not a successful import. Folder indexing remains bounded to 1,000 entries per selection and the existing 10,000-entry library limit; symlinks, traversal paths, hidden folder entries and unreadable files are excluded. Unsupported media can remain an honest non-playable reference.

Example agent flow: get the workspace ID → `gigi_music_list` with `query: "Night Drive"` → explain and request `gigi_music_import` with `mode: "files"` and a new UUID → wait for user selection → organize one returned `addedIds` entry using `fields: {"project":"Night Drive","version":"Mix 03"}` → read it back. The music list refreshes when the desktop regains focus unless organization editing is active; reopen Your music or finish editing to see subsequent changes. Existing media playback is left undisturbed.

Validation distinguishes (1) synthetic selected-path injection into the shared import service, (2) a real subprocess stdio MCP test for discovery/search/read/organization and desktop-store visibility, and (3) a real native picker/agent-host acceptance run. Unit and protocol tests alone do not establish a human picker interaction or actual Codex-host connection. No HTTP server or listener is added.

Organization MCP edits require a stable UUID `requestId`. The metadata edit and exact-input result receipt commit atomically. Identical retries return the original result; changed input cannot reuse the UUID. `gigi_music_organize_status` reads the workspace-scoped historical receipt after later edits or removal without changing data or replaying the edit. Unknown receipt outcomes stay blocked.

## Sources update in 0.2.6

Sources now distinguish verified provider identity, app sign-in recovery and import readiness. Preview a bounded page with an optional UTC date window before importing its reviewed records locally. UI and agents share source status, preview, commit, receipt and cancellation interfaces. Scope-bound cursors and frozen revisions prevent a changed account or date window from silently broadening an import. Date filtering applies to scanned pages; coverage may remain partial, and undated/all-day events without a usable UTC instant are counted as excluded for a date window. Only the primary calendar is supported.

Receipts distinguish new, existing and failed records, preserve manual corrections, and reconcile interrupted writes without blindly replaying them. Stopping prevents future row saves and keeps records already committed. Sign out of GiGi sources clears the local session on this Mac; it does not revoke Google/Composio consent or remove imported records. Live account, Grant-access, phone and provider publication acceptance are separate from synthetic release checks.

## Gigs collection (0.2.7)

Gigs opens to Upcoming (today and ongoing ranges, soonest first), with Past (latest first), All and Needs date views. Search covers full gig titles and linked people/place names with case and accent normalization. Status, Type and inclusive date-range filters, stable date sorting and matching counts apply across one complete workspace snapshot before each 20-record page. Filter values come from saved records; Not set matches absent values. Missing or invalid dates stay inspectable in Needs date and sort last in All. Recently updated remains an explicit alternate sort.

Date-only values keep their calendar day; timestamp values use the viewer's named time zone, as Schedule does. All-day/date-only range ends are exclusive. Gigs without a time do not claim midnight or all-day availability. A changed dataset invalidates the pagination cursor and asks for refresh rather than silently shifting later pages. Filters are remembered per workspace on this Mac; returning from a gig restores the current list and position. Escape clears Gigs search, Command-F focuses it, and Command-Shift-F retains People search. Reads never rewrite business records or change external connections.
