# wf-template-validate

Creator CLI for the Webflow Way template validator. It signs in to Webflow's remote MCP server, reads a template site's Designer data without the Designer open, runs the same validation worker the Template Validator app uses, and can record the result for the Marketplace submission form.

Status: not published to npm. Creators install the package that the validation worker serves.

## Install

Node 20 or later.

```sh
npm install -g https://validation-worker.createsomething.workers.dev/cli/wf-template-validate.tgz
wf-template-validate --version
```

Run the same command again to update. To remove the CLI: `npm uninstall -g @create-something/webflow-template-validation-cli`.

`scripts/pack.mjs` builds that package (`dist/cli.js` and a `package.json` with no scripts and no dependencies) into `../worker/public/cli/`, which the worker serves as a static asset. Wrangler runs the script before `dev` and `deploy` (`build.command` in `worker/wrangler.jsonc`), so each worker deploy ships the CLI built from the same commit. The Asset Dashboard Validation page, the template submission form, and the submission guidelines show this install command.

## Run from the monorepo

```sh
pnpm --filter @create-something/webflow-template-validation-cli build
node packages/webflow-template-validation/cli/dist/cli.js --help
```

`build` bundles `src/cli.ts` and its relative imports (including `spike/headless-collector/` and the shared worker and extension modules it uses) into one ESM file, `dist/cli.js`, with no runtime dependencies. To put `wf-template-validate` on your PATH:

```sh
cd packages/webflow-template-validation/cli
pnpm link --global
wf-template-validate --help
```

`pnpm --filter @create-something/webflow-template-validation-cli check` runs `tsc --noEmit`.

## Commands

### `login`

Runs OAuth 2.1 authorization code + PKCE (S256) against `https://mcp.webflow.com/mcp`. The first run registers a public client through dynamic client registration and caches the client id. The CLI prints a consent URL and listens on `http://localhost:8976/callback`.

On the consent page, Webflow shows a workspace and site picker. Choose the workspace that owns the template and select only the template site you will submit. The CLI can read only what you select there. To change the selection, run `logout`, then `login` again.

The token is stored with mode 0600 at `~/.config/webflow-template-cli/mcp-token.json`. Access tokens last about 1 hour; the CLI refreshes them with the stored refresh token. Tokens and client ids are never printed.

Environment overrides: `WEBFLOW_MCP_URL`, `WEBFLOW_MCP_CALLBACK_PORT`, `WEBFLOW_MCP_CLIENT_ID` (use a Webflow-issued client id instead of registering one), `WEBFLOW_MCP_SCOPE`.

### `logout`

Deletes the token file only. The cached client registration (`~/.config/webflow-template-cli/mcp-client.json`) stays, so the next `login` does not register a new client.

### `sites [--json]`

Lists the sites the stored token can read, with id and name. Use the id as `--site` for `validate`.

### `validate <https://<site>.webflow.io> [options]`

| Option | Meaning |
| --- | --- |
| `--site <siteId>` | Read Designer data for this site through MCP. With a stored token this turns on `--designer-source mcp`. Without a token the CLI stops and tells you to run `login`. |
| `--page <pageId>` | Page for the canvas checks (heading order, image alt text), the headless stand-in for the page open in the Validator app. Default: the home page. |
| `--designer-source mcp` | Explicit form of the default above. Needs `--site`. |
| `--no-record` | Run everything, but do not record the result with the worker. |
| `--checks <list>` | Published-site checks: any of `assets,content,accessibility`. Default: all. |
| `--worker <base-url>` | Validation worker. Default `https://validation-worker.createsomething.workers.dev`. |
| `--timeout <seconds>` | Worker job timeout. Default 480. |
| `--json` | Machine-readable output. |

Exit codes: `0` no blockers, `1` one or more blockers, `2` network, worker, login, or argument failure. A blocker is any `error` issue or any issue with `details.policy` (for example `ix2-rejected`), the same rule as the extension. A category that the worker marks as failed without an error (the canvas checks fail on warnings) also gives exit 1, because the submission form needs every category to pass. Exit 2 also covers a worker result with no categories, and a record that the worker did not confirm (stored, site access verified, and read back). Exit 2 also covers an incomplete run: the GSAP crawl came back unavailable or the recording step failed, so a clean worker result is not reported as a pass.

What runs:

- Without `--site`: the worker's published-site checks (assets, content, accessibility, interactions and IX2 policy, custom code) on the homepage plus up to 50 discovered pages, and the GSAP crawl worker. Nothing is recorded.
- With `--site`: the published-site checks run on the home page and every published page in the Designer page list (no drafts, no CMS template pages), the same list the Validator app sends. Page discovery is not used, because it finds only pages that the home page links to. The run also includes the worker's Designer checks (variables, modes, components, styles, required pages, page structure, SEO metadata) on data collected through MCP, and the Validator app's canvas checks on one page (`--page`, default the home page). The canvas checks read that page's element tree with `data_element_tool` (saved Designer state, including unpublished changes; no Designer needed) and apply the app's rules: the first heading is H1, no heading level is skipped, every image has alt text. Like the app, they do not look inside component instances. If the tree cannot be read in full, the run is incomplete (exit 2) and is not recorded. After a completed async run, the CLI posts the result to `POST /app-validator/submit` with `oauth_site_access` evidence (the access token) unless `--no-record` is set. The worker verifies the token can read `--site` and stores a SHA-256 of the token, not the token.

## What `validate` proves, and what it does not

It proves:

- The published site and the Designer data the token can read pass or fail the same worker rules the Template Validator app runs.
- When a record succeeds with `evidence verified`, the holder of a Webflow OAuth token could read that site id at that time.

It does not prove:

- That the submission gate is satisfied. The Marketplace submission form decides whether a recorded result counts, including whether it accepts CLI records with `oauth_site_access` evidence.
- That the creator owns the template. Site access is not ownership: anyone the site is shared with can read it.
- That the published URL belongs to `--site`. The CLI does not cross-check the `*.webflow.io` host against the site's short name; the worker records the published host it validated.
- Full Designer parity. MCP data differs from the Designer API in places (for example, breakpoint overrides and component flags). See `spike/headless-collector/README.md`.
- Anything when the async job falls back to `POST /validate`. That path does not run the Designer checks, so the CLI does not record it.
- Evidence on production until the worker's `oauth_site_access` support is deployed. Until then a record line reads `evidence NOT recorded`.

## Open policy items

- **Self-registered OAuth client.** `login` uses dynamic client registration on Webflow's production auth server, under the name "Webflow Template Validate CLI". There is no documented way to delete a registered client and no documented DCR policy. Before creators use this, the MCP owners should decide between a Webflow-issued client id (`WEBFLOW_MCP_CLIENT_ID`) and per-install registration.
- **Shared production workers.** `validate` calls the production validation worker and the GSAP crawl worker with no authentication. The validation worker limits one network address to 10 validation starts per minute (a strict count in a Durable Object). The GSAP crawl worker has no such limit.
- **Token as evidence.** The record step sends the creator's access token to the validation worker so it can verify site access. That needs Security review before external use.
- **Consent scope.** The consent screen is the "Webflow MCP Bridge App" with a fixed scope list that includes write scopes. The CLI only reads, but the token can write.

## Layout

- `src/cli.ts`: command dispatch, report formatting, record step.
- `src/decisions.ts`: issue buckets, `--checks` parsing, when a result may be recorded, and exit codes.
- `src/worker-client.ts`, `src/gsap-client.ts`: validation worker and GSAP crawl worker clients.
- `test/`: offline Vitest suites (`pnpm --filter @create-something/webflow-template-validation-cli test`). No network calls; the login tests use a temporary home directory. CI runs them, with the extension's tests, in `.github/workflows/webflow-template-validation.yml`.
- `src/mcp/login.ts`: PKCE login, token storage, refresh, logout.
- `src/mcp/client.ts`: minimal MCP Streamable HTTP client. `spike/mcp-client/client.ts` re-exports it for the headless collector.
- `src/mcp/call.ts`, `src/mcp/discover.ts`: diagnostic scripts from the spike. Not part of the bundle.
- Designer data comes from `spike/headless-collector/collect.ts` (canvas element tree: `canvas.ts`), and the extension's client-side enhancements (Style System, canvas checks, Page Structure, Variable Modes, summary totals) from `spike/headless-collector/enhance.ts`. Both are imported by relative path until they move into this package.


## What the worker records

The record request names the validation run (`jobId`). The worker does not store the result in the request. It takes the result of its own run, applies the same Designer enhancements the clients apply (Style System, canvas checks, Page Structure, Variable Modes, totals), and stores that. It refuses the record (HTTP 409) when the run is unknown, not complete, older than 30 minutes, not full in scope (every check, every page, canvas data present), or for a host that is not a published address of the site the token can read. It also refuses a CLI below its minimum version (HTTP 426).

What stays under the client's control is the Designer data and the canvas data that the CLI sends at the start of the run. The published-site checks and the browser check are the worker's own observations.

## Custom workers and the access token

Recording a result sends the stored Webflow access token to the validation worker as `oauth_site_access` evidence. The CLI only does this for the default production worker. With `--worker <base-url>` it validates but skips recording unless you also pass `--trust-worker`.
