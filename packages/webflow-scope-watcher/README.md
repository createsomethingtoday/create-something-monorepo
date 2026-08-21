# webflow-scope-watcher

Cloudflare Worker that watches Webflow's OAuth scope registry and alerts the
marketplace/review team when the API surface changes — before the changes show
up unexplained in app submissions.

**Why**: `entrypoints/server/lib/logic/oauth/scopes.ts` in `webflow/webflow` is
the single source of truth for OAuth scopes (route files may not invent keys).
Scopes without a Statsig `featureFlag` go GA the moment their PR deploys, and
the coordination step that used to announce them belonged to the dissolved
Developer Platform team. In August 2026 the review team discovered five scope
groups (Agent Instructions, AI, Branches, Cloud Apps, Page Client) only via a
developer's consent-screen screenshot — months after some of them shipped, with
hundreds of apps already requesting them.

## What it does

Hourly cron (`7 * * * *`):

1. Fetches `scopes.ts` from `webflow/webflow@dev` via the GitHub contents API.
2. Parses `SCOPE_CATEGORIES` + `SCOPES` (keys, consent-screen descriptions,
   resource types, Statsig gating). A sanity check (≥30 scopes / ≥15
   categories) makes a file-format change fail loudly instead of diffing the
   registry to zero.
3. Diffs against the last-seen inventory in KV. Detects: scope added, scope
   removed, **un-gated (feature flag removed = GA moment)**, gated, description
   or resource-type changed, new category.
4. For added/un-gated scopes, looks up **which endpoints the scope guards**
   (Scope Probe Increment 1, SCA-152): a GitHub code search for the scope
   constant, then per-registration extraction of `app.<method>(path)` from each
   hit — handling string, array, and `{path: ...}` registration shapes. Files
   that reference the constant without an extractable route (MCP tools, shared
   middleware) are listed as "also referenced in" rather than guessed at.
   Capped at 8 lookups/run (code-search rate limit); overflow scopes still
   alert without the map.
5. On changes: posts to Slack with the consent-screen wording, gating status,
   guarded endpoints, and source commits (PR links + Linear ticket links), and
   records the event in KV history. History is written even when Slack is
   unconfigured or fails.

First run seeds silently (no announcement of pre-existing scopes).

## Endpoints

Deployed at `https://webflow-scope-watcher.createsomething.workers.dev`.
All `/api/*` routes require `Authorization: Bearer <ADMIN_TOKEN>`
(local copy in `.admin-token`, gitignored).

| Route | Purpose |
| --- | --- |
| `GET /` | Health: seeded, scope/category counts, last check, Slack configured |
| `POST /api/check` | Run a check now (`?dryRun=1` computes the diff without saving/posting) |
| `GET /api/scopes` | Current parsed inventory |
| `GET /api/history` | Last 20 recorded events (seed + changes, incl. rendered Slack text) |
| `GET /api/scope-endpoints?constant=X` | On-demand scope→endpoint map for any `SCOPES` constant (e.g. `AI_WRITE`) |
| `POST /api/probe-capture?scopes=a,b&post=1` | Capture the OAuth consent screen for the given scopes via Browser Rendering; `post=1` also posts it to the channel (`client_id=` overrides `PROBE_CLIENT_ID` for testing) |
| `GET /consent/<id>.png` | Serves a stored capture (unguessable 32-hex id; public so Slack image blocks can fetch it; 90-day TTL) |

### Consent capture (Scope Probe Increment 2)

`POST /api/probe-capture` builds the authorize URL for the standing Scope
Probe app, renders it through Cloudflare Browser Rendering (`/snapshot`: one
call → HTML + screenshot) with the probe account's session cookie, stores the
PNG in KV, and (with `post=1`) posts it to the channel as an image block. The
rendered HTML is checked for the login page first — an expired or missing
`PROBE_SESSION_COOKIE` is reported with a remediation message, and a login
page is **never** posted as if it were a consent screen.

Flow when a new scope GAs: alert arrives → add the scope to the Scope Probe
app in the dashboard (30 seconds; app updates have no API-token path) →
`POST /api/probe-capture?scopes=<new scope>&post=1`.

Cookie refresh: log in as the probe account, copy the `Cookie` request header
from devtools on any dashboard request, then
`pnpm exec wrangler secret put PROBE_SESSION_COOKIE` and paste.
| `POST /api/test-slack` | Send a connection-test message to the channel |
| `POST /api/announce` | Post arbitrary text to the channel as the bot (`{"text": "..."}`); recorded in history |

## Secrets

| Secret | Value |
| --- | --- |
| `GITHUB_TOKEN` | GitHub token with read access to `webflow/webflow` (currently the `micahwithwf` gh CLI OAuth token — **rotates if you re-auth gh**; refresh with `gh auth token -u micahwithwf \| pnpm exec wrangler secret put GITHUB_TOKEN`) |
| `ADMIN_TOKEN` | Bearer token for `/api/*` (generated; local copy in `.admin-token`) |
| `SLACK_BOT_TOKEN` | **Marketplace Asset Bot** bot token (1Password → Marketplace vault; same Slack app the app-review exception loop posts with). Posts via `chat.postMessage`. |
| `SLACK_WEBHOOK_URL` | Optional incoming-webhook fallback; unused while the bot token works |

Delivery: posts as **Marketplace Asset Bot** to `#wg-app-marketplace`
(`SLACK_CHANNEL_ID` var, `C0B9XS5SZ7X`). The bot must be a member of the
channel — it was added 2026-08-18. To point alerts elsewhere, change
`SLACK_CHANNEL_ID` in `wrangler.toml` and invite the bot to the new channel.
Verify delivery any time:

```bash
curl -X POST https://webflow-scope-watcher.createsomething.workers.dev/api/test-slack \
  -H "Authorization: Bearer $(cat .admin-token)"
```

## The wider detection stack

This worker is the **precision trigger** (fires on merge, before or at GA).
Two complementary layers:

**Adoption safety net (Snowflake, on-demand or weekly)** — which apps already
request a scope; `OAUTH_APPLICATIONS` is a current-state Fivetran snapshot, so
run this when a new scope alert fires to size the blast radius:

```sql
USE WAREHOUSE SNOWFLAKE_REPORTING;
SELECT s.value::string AS scope,
       COUNT(DISTINCT a.APPLICATION_ID) AS apps_with_scope
FROM ANALYTICS.WEBFLOW.OAUTH_APPLICATIONS a,
     LATERAL FLATTEN(input => a.SCOPES) s
WHERE s.value::string IN ('<new scope key>')
GROUP BY 1 ORDER BY 2 DESC;
```

(`OAUTH_AUTHORIZATIONS.GRANTED_SCOPES` holds per-authorization grants if you
need install-level counts.)

**Planning-stage awareness (Linear, native — no code)** — Paige's ask: in
Slack, `/linear subscribe` in `#wg-app-marketplace`, or in Linear open the team
/ initiative (e.g. the pillar teams that shipped scopes recently: WORK, PION,
CLD, GOV, OPT) → ⋯ → Subscribe → Slack channel → `#wg-app-marketplace`, filtered
to projects/initiatives. This is a heuristic feed (depends on teams' labeling);
the worker above remains the reliable detector.

## Development

```bash
pnpm --filter=@create-something/webflow-scope-watcher test        # parser + diff + formatting tests
pnpm --filter=@create-something/webflow-scope-watcher typecheck
pnpm --filter=@create-something/webflow-scope-watcher deploy
```

The parser test fixture (`test/fixtures/scopes-snapshot-2026-08-18.ts.txt`) is
a point-in-time copy of the upstream file; refresh it if the format evolves.
