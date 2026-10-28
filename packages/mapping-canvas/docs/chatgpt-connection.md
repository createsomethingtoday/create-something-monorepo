# Optional native ChatGPT connection

This development branch adds an app-owned ChatGPT connection for the free local Mac app. It is separate from the signed 0.1.3 candidate and the focused-revision prototype; it is not a release qualification or an approved web/paid integration.

Drawing remains available without signing in. Open **ChatGPT** in the native header, then **Continue with ChatGPT**. Existing connections have an explicit saved-account reconnect; interrupted registrations have an explicit retry. Adding another account starts a new registration. Identity sign-in and permission to use the ChatGPT plan are shown separately. Same-email registrations remain distinct.

**Load available models** retrieves the selected account's catalog. **Send text to ChatGPT** sends only the text explicitly entered in that panel to OpenAI. It never attaches the canvas, issues a local-agent capability, executes tools or edits the drawing. Requests use eligible ChatGPT plan/credits; there is no silent API-key billing fallback. **Manage usage** opens the fixed official https://chatgpt.com/settings/usage address through a no-argument native command. Usage-limit messages make this action available directly.

Cancel sign-in/request invalidates the in-flight UI result; late responses cannot replace the selected connection's output. Disconnect cancels work before ending the connection. An unconfirmed remote revocation remains visible, with instructions to disconnect Draw in ChatGPT Settings. Closing the non-modal panel restores its trigger focus and does not revoke access. Text responses are rendered as text, never HTML. The panel contains canvas keyboard/clipboard shortcuts while editing its controls.

Rust owns the shared `create-something-chatgpt-connection` controller and its protected credential storage. The Draw service namespace is `agency.createsomething.draw.chatgpt`, distinct from pairing credentials. No token or authorization URL is returned to Svelte. Only the official OpenAI authorization endpoint can be opened by the Rust callback, with argument-based `/usr/bin/open` and suppressed subprocess diagnostics. Drawing initialization survives unavailable connection storage. Web and iPhone roles do not expose this UI.

This independently implemented protocol adapter does not vendor the Electron DevKit. The shared controller owns PKCE, callback/ID-token verification, refresh, account isolation, model discovery, request cancellation and revocation. See [official sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [accounts/security](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), [models](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations), and [usage action](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).

## Local validation

Run repository `pnpm bootstrap:worktree` with pinned Node22.23.4/pnpm9.15.0. Then:

```sh
pnpm --dir packages/mapping-canvas test
pnpm --dir packages/mapping-canvas check
pnpm --dir packages/mapping-canvas build:native
cargo test --manifest-path apps/draw-native/src-tauri/Cargo.toml --lib
CANVAS_URL=http://127.0.0.1:5288 PLAYWRIGHT_CHANNEL=chrome node packages/mapping-canvas/scripts/verify-chatgpt-connection.mjs
```

The browser verifier runs the real Svelte UI in isolated contexts with a synthetic native bridge, including explicit retry/reconnect IDs, no automatic inference, plan gating across same-email accounts, cancellation/late results, account switch resets, text-only request payload, usage-limit recovery, remote revocation warning, focus, minimum native width and web/iPhone exclusion. It asserts document equality and absence of native grant/edit calls. No OAuth, Keychain or provider account is touched by these fixtures. Generated screenshots/results are under ignored `output/chatgpt-connection`.

Live sign-in/consent, actual Keychain persistence, account entitlements, real inference and native system-browser behavior remain separate authorized acceptance steps. A successful mock does not qualify them or prove release readiness.
