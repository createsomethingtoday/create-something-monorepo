# PRIVATE rendered component fixtures

Local presentation evidence for CRE-2115 / CRE-2117. Imports the real application components and layout. No application hooks, provider credentials, identity, production database or production flags are used. `selfServiceEnabled: true` is a fixture prop to expose pricing; `identity: null` and `canEdit: false` remain explicit. The local `/api/videos` response is empty and all other API calls fail closed with HTTP 405.

From the repository root, with workspace bootstrap and dependency builds complete:

```sh
test -e output/production-polish/fixture/node_modules || ln -s ../../../packages/private-pcn/node_modules output/production-polish/fixture/node_modules
pnpm --filter @create-something/private-pcn exec svelte-kit sync
pnpm --filter @create-something/private-pcn exec vite --force --config ../../output/production-polish/fixture/vite.config.mjs
```

In another terminal, run the rendered behavioral regression:

```sh
ego-browser nodejs < output/production-polish/error-title-regression.mjs
```

The runner creates its own browser space, verifies actual document titles and rendered headings for 403/404/500, fails on a mismatch and closes the space on success. Desktop browser access may need automatic approval review outside the filesystem sandbox. No sign-in or provider mutations occur.

Views: `http://127.0.0.1:43115/?view=home`, `library`, `paths`, `detail-unavailable`, or `error&status=403`. These are component fixtures, not authenticated route acceptance. The baseline-library view uses layout/library/CSS copied verbatim from base 447b2af5f151fb690c2765cb0aa0832f3c514c18, with only the layout CSS import redirected to the baseline copy, for the preserved keyboard comparison. Restart the fixture server after source changes: file watching did not invalidate cached compilations reliably in this worker environment.
