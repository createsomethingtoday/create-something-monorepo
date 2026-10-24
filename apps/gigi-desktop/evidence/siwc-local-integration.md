# Optional app-owned ChatGPT connection — local OSS implementation

User confirmed GiGi itself is free and open source. Existing repository is public/MIT; no visibility/license change was made. This supports the documented OSS/local route, not blanket admission for paid/private/hosted offerings. Those require separate review. This follow-up supersedes the disabled-only implementation scope in the historical fixture checkpoint.

GiGi's separate optional text connection uses one persistent native Rust controller, distinct Keychain namespace and separate `ai.connection.*` operations. macOS only. System browser OAuth, account selection/reconnect/disconnect, cancellation, account-specific model catalog and explicit typed-text inference are exposed through sanitized IPC. App exit cancels work. No credentials reach the renderer. Existing installed-Codex Ask GiGi, CREATE SOMETHING Identity/source authorization, local MCP and write approvals remain unchanged. The new text request has no record context or tools and no automatic billing fallback.

UI escapes account/model/draft/reply content, keeps typed drafts on failure, ignores late cancelled output, clears old models/replies on account changes, refreshes terminal connection status, and displays remote-revocation warnings immediately. Incomplete registrations are resumable sign-ins, not revocation receipts. Manage usage/access opens a fixed ChatGPT settings URL through the native system browser.

No app launch, OAuth grant, provider inference or credential access was performed during implementation/tests. No live provider entitlement or native browser acceptance is claimed. Independent review and coordinated live grant/native installer checks are required before release. Draft PR is review-only.
