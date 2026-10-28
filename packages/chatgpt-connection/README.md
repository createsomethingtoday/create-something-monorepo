# Native ChatGPT connection

Independent Rust implementation of OpenAI's documented Sign in with ChatGPT local-client protocol. This is an optional model-provider connection, not CREATE SOMETHING Identity or permission to read application records, approve proposals or access source services. No DevKit implementation code is incorporated.

`Controller` owns OAuth, loopback callbacks, native-only credentials, model discovery and text-only Responses requests. Callers supply a distinct application Keychain service and native system-browser opener. Public DTOs contain no tokens or authorization URLs. Drawing and existing Codex integration must remain available without this connection. Model discovery and typed-text requests require the renderer’s expected client registration ID. Under the existing gate and process lock, the controller reloads the native vault and rejects a changed account before credential renewal or provider access. Callers refresh identity and require a new explicit request after a mismatch.

The admission gate must be false for a paid/private offering without provider approval. The open-source/local client route does not establish commercial eligibility. Do not let renderer data or an environment flag override a distribution decision.

Accounts are keyed by issued client registration, not email. Add account starts a fresh registration; incomplete registrations are explicitly exposed for retry. One host UUID is retained per application's installation. Sign-out clears local tokens and retains registration/host mapping. Its response includes an ephemeral, non-secret `disconnectOutcome`: local removal plus `no_refresh_token`, `not_attempted_unverifiable`, `request_succeeded`, or `request_failed_or_unverifiable`. A request is attempted only when a refresh token and a trusted discovery-derived endpoint are available; retry is bounded. HTTP acknowledgement is not proof of server-side token invalidation. Later status reads omit this receipt, so clients must not infer a historical remote outcome from a signed-out account. Refreshes serialize with all account changes. Account switching and cancellation invalidate old model catalogs and in-flight output. No automatic billing fallback exists.

Credentials are serialized atomically into a separate macOS Keychain item. Non-macOS credential storage fails closed. Unit tests use an in-memory store; they never access Keychain, open a browser, register a client or infer with a provider. RSA fixtures are intentionally public synthetic test keys, not user or service credentials.

## Validation and release boundary

`cargo test --manifest-path packages/chatgpt-connection/Cargo.toml`

Unit fixtures are not live-login evidence. Before shipping: independent security review, actual app UI tests, owner-approved app-specific OAuth consent and bounded synthetic inference, reconnect/refresh/account-switch/sign-out checks, native Keychain protection checks, exact release source/version, signing/notarization and download readback. Keep Draw 0.1.3 acceptance separate; do not replace its signed installer with this source.

Official contract sources checked 2026-10-24:
- https://developers.openai.com/siwc/quickstart
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
