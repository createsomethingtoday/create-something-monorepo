# Synthetic local component acceptance

Opt-in fixture only. Nothing here is imported by production `src/` or deployed as
an application route. Server binds `127.0.0.1:5185` and uses transient SQLite with
the same schema bootstrap used by `tests/api.test.ts`. It never applies migrations
to a persistent/local/remote D1 database and has no production bindings.

Uses actual PCN pages, shared layout and content GET/progress handlers. Fixture
roles are explicit test inputs, not Identity authentication. Sign-in success, TUS
transport/readiness and media failure are mocked. No real recording is provided.
The test profile blocks non-loopback browser requests. Server operations beyond
local reads, progress and test setup are disabled. Do not expose this server or
use it as proof of provider authorization, signed playback or native ChatGPT.

With workspace dependencies already available and the pinned Node runtime:

```sh
node packages/private-pcn/tests/acceptance/server.mjs
PCN_EVIDENCE_DIR=/absolute/writable/evidence node packages/private-pcn/tests/acceptance/run.mjs
```

The runner reuses workspace Playwright; it does not install dependencies. It
launches installed Google Chrome headlessly in a disposable profile. Override
`CHROME_BIN` on other hosts. Default output is ignored `tests/acceptance/evidence/`.
Do not run scenarios concurrently: they share the fixture's transient state.

Assertions cover 1440px desktop/390px mobile overflow, reduced-motion rendering,
skip-link focus, menu Escape/focus restoration, progress loading/failure/retry,
saved-position reload and library filters, anonymous/member/blocked creator denial,
existing-account lesson/path return, empty next actions, guide disclosure/anchors,
transfer-success/readiness-failure copy and interrupted reservations across return.
Screenshots are viewport frames because installed Chrome produced corrupted stitched
full-page mobile captures. They are synthetic product evidence, not real accounts.

The existing API/Identity-hook suite remains the authority for synthetic access,
tenant, revocation, publication and progress-policy assertions. Browser tests here
exercise UI responses to those states; they do not exercise actual Identity or Stream.
