# CRE-2127 real-layout navigation fixture

Imports the current `packages/private-pcn/src/routes/+layout.svelte` directly. Uses an isolated SvelteKit router and SSR with no Cloudflare adapter, D1, secrets, production hooks or provider calls. Only the body content is a clearly labelled navigation fixture. Local `fixtureRole=member` or `fixtureRole=admin` supplies presentation props; this is not real authentication or protected-route acceptance. API writes have no handler and return 405.

From repository root (bootstrap already complete):

```sh
test -e output/public-navigation/fixture/node_modules || ln -s ../../../packages/private-pcn/node_modules output/public-navigation/fixture/node_modules
(cd output/public-navigation/fixture && node ../../../packages/private-pcn/node_modules/vite/bin/vite.js dev)
```

In another terminal:

```sh
ego-browser nodejs < output/public-navigation/navigation-regression.mjs
```

The runner creates and closes its own browser space on success. It checks complete public navigation, role-preserved links, Enter/Space, two-step mobile Escape/focus, client navigation dismissal with preserved document identity, aria-current and widths 320/390/768/1100/1101/1280/1440. `?nojs` applies `Content-Security-Policy: script-src 'none'` in this fixture only; application hydration is blocked while native links/details and trusted browser inspection remain available. No product runtime flags change.

Worker evidence uses its own existing space through an injected global; those logs and screenshots are in the parent output directory. The first full pass reached every enhanced-layout assertion but Ego's CDP script-disable mode also blocked its element-action instrumentation. The final no-JS checks use the explicit CSP response instead; initial failure is retained honestly. A supplemental run covers newly requested 1101px and Space checks, plus all no-JS widths without repeating the entire original matrix.
