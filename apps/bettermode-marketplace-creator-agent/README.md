# Bettermode Marketplace Creator Agent

Cloudflare Worker for the **Marketplace Creator Agent** Bettermode app. Drafts admin replies for posts and replies in `community.webflow.com/marketplace-creators`, then renders an admin-only dynamic block on each post so the admin can edit and publish an app-authored reply.

## Behavior

| Phase                                                        | What happens                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook (`post.published` / `reply.published` / `*.updated`) | Verify Bettermode signature → enqueue draft generation in `ctx.waitUntil`                                                                                                                                                     |
| Notification webhook                                          | Verify Bettermode signature → record observe-only `community_events` + upsert a normalized `community_work_items` row when a post ID is present. No drafts or replies are created directly from notifications.              |
| Scheduled sweep                                               | Every 15 minutes, list recent Marketplace Creator posts, normalize `community_work_items`, and backfill drafts for creator-authored posts with no queue row.                                                                 |
| Draft generation (async)                                     | Fetch post + thread via Bettermode GraphQL → call the published Dify agent with post metadata → Dify uses the BetterMode Creator MCP + Marketplace policy knowledge base → upsert `community_signals` + `community_queue` row |
| Dynamic block render                                         | On admin view of a post, return a Slate UI: post excerpt, editable draft textarea, [Send / Regenerate / Dismiss]. Non-admins see a small hint block.                                                                          |
| Send                                                         | Mint a member-context Bettermode token using the admin's `actorId` → `createReply` with the Comment post type → `publishPost` → mark queue row `sent`. Bettermode currently records the published comment as authored by the app account. |
| Regenerate                                                   | Re-run draft generation in `ctx.waitUntil`                                                                                                                                                                                    |
| Dismiss                                                      | Mark queue row `rejected`                                                                                                                                                                                                     |

## Endpoints

- `GET /` — status page
- `GET /health` — JSON smoke check
- `POST /webhook` — Bettermode lifecycle and content events (signature required)
- `POST /webhook/notification` or `/webhook/notifications` — Bettermode notification events (signature required, observe-only)
- `POST /webhook/interaction` — dynamic block render + button callbacks (signature required)

## Storage

Reuses the `create-something-agency` D1 database (`a74e70ae-…-b90719c8dfd2`) and the existing `community_signals` + `community_queue` tables:

- `community_signals.platform = 'bettermode'`
- `community_signals.source_id = <bettermode post ID>`
- `community_signals.metadata` (JSON) — `{ network_id, space_id, parent_post_id, is_top_level, author_member_id, author_email, author_name }`
- `community_queue` — `draft_content` is the AI-generated draft; `approved_content` is the (possibly edited) text the admin actually sent.
- `community_events` — raw attention signals from content webhooks, notification webhooks, and scheduled sweeps.
- `community_work_items` — normalized operator cockpit state: lane, status, priority, urgency, due time, draft linkage, and next action.

Core indexes added by `packages/agency/migrations/0021_bettermode_creator_agent_indexes.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_signals_platform_source ON community_signals(platform, source_id);
CREATE INDEX IF NOT EXISTS idx_queue_signal_status ON community_queue(signal_id, status);
```

Apply pending agency D1 migrations before deploy:

```bash
wrangler d1 migrations apply create-something-db
```

## Secrets (via Infisical)

Stored in Infisical workspace `e1532079-…-cf7a025eb803` under `dev`:

| Infisical name                      | Worker secret name          |
| ----------------------------------- | --------------------------- |
| `WEBFLOW_BETTERMODE_CLIENT_ID`      | `BETTERMODE_CLIENT_ID`      |
| `WEBFLOW_BETTERMODE_CLIENT_SECRET`  | `BETTERMODE_CLIENT_SECRET`  |
| `WEBFLOW_BETTERMODE_SIGNING_SECRET` | `BETTERMODE_SIGNING_SECRET` |
| `WEBFLOW_DIFY_AGENT_API_KEY`        | `DIFY_AGENT_API_KEY`        |

Push secrets to the Worker:

```bash
pnpm --filter @create-something/bettermode-marketplace-creator-agent secrets:push
# or
infisical run --env=dev -- bash apps/bettermode-marketplace-creator-agent/scripts/push-secrets.sh
```

The script never echoes secret values; it pipes them straight into `wrangler secret put` over stdin.

> **Rotation reminder.** Bettermode Client Secret and Bettermode Signing Secret were transmitted via chat plaintext during initial provisioning. Rotate both in Bettermode app settings before letting the Worker carry production traffic. Update Infisical, then re-run `secrets:push`. Bettermode Client ID generally cannot be rotated without recreating the app.

## Public vars (in `wrangler.jsonc`)

| Var                                 | Purpose                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTERMODE_DEFAULT_NETWORK_ID`     | `BuRv7sR1po` (Webflow Community network)                                                                                                                                      |
| `BETTERMODE_MARKETPLACE_SPACE_ID`   | The Bettermode space ID for `/marketplace-creators`. Leave empty to handle every space until you capture the real ID from the first webhook payload (visible in Worker logs). |
| `BETTERMODE_MARKETPLACE_SPACE_SLUG` | `marketplace-creators` (informational)                                                                                                                                        |
| `BETTERMODE_REPLY_POST_TYPE_ID`      | Bettermode Comment post type ID used for replies. Current Webflow Community value: `xrkGxJPY9j4QOCB`.                                                                          |
| `BETTERMODE_ADMIN_USER_IDS`         | Comma-separated Bettermode user IDs allowed to send drafts. **Leave empty to fail closed** (no one can send).                                                                 |
| `COMMUNITY_SWEEP_ENABLED`           | Set to `false` to pause the scheduled sweep without removing the cron trigger.                                                                                                 |
| `COMMUNITY_SWEEP_LIMIT`             | Number of recent BetterMode rows to inspect on each sweep. Default `50`, max `100`.                                                                                            |
| `DIFY_API_BASE`                     | `https://api.dify.ai/v1`                                                                                                                                                      |
| `DIFY_AGENT_USER`                   | Stable Service API user id for Worker calls                                                                                                                                   |
| `ALLOWED_ORIGINS`                   | CORS allowlist for `OPTIONS` requests                                                                                                                                         |

## Deploy

```bash
# Apply pending D1 migrations
wrangler d1 migrations apply create-something-db

# Push secrets from Infisical
pnpm --filter @create-something/bettermode-marketplace-creator-agent secrets:push

# Deploy
pnpm --filter @create-something/bettermode-marketplace-creator-agent deploy
```

The deploy script wraps `wrangler deploy` in `infisical run` so any `vars` referencing Infisical (none currently) would resolve. Because secrets are already pushed, this is mostly belt-and-suspenders.

## Bettermode app configuration

In the Bettermode app admin (https://app.bettermode.com → Apps → Marketplace Creator Agent → **for Devs**):

1. **Webhook URL** → `https://bettermode-marketplace-creator-agent.<account-subdomain>.workers.dev/webhook`
2. **Interaction URL** → `https://bettermode-marketplace-creator-agent.<account-subdomain>.workers.dev/webhook/interaction`
3. **Webhook events** — enable: `post.published`, `post.updated`, `reply.published`, `reply.updated`, plus `TEST` (for the challenge handshake).
4. **Dynamic block** — register a block that mounts on post detail pages. Bettermode will call `/webhook/interaction` with `dynamicBlockKey` and the post ID in `target.id`.
5. **Scopes** — at minimum: read posts/replies/members/spaces, create replies, and publish posts. Without create/publish scopes the **Send** button cannot publish the approved reply.

## Smoke test

Health:

```bash
curl https://bettermode-marketplace-creator-agent.<subdomain>.workers.dev/health
```

Signed `TEST` webhook (loop back through Bettermode's "Send test" button in the app dev panel). The Worker echoes the `challenge`.

## Known follow-ups

- **Confirm full Client ID** (`WEBFLOW_BETTERMODE_CLIENT_ID` is currently 21 chars; UUIDs are 36). Copy via the copy button in Bettermode and run `infisical secrets set WEBFLOW_BETTERMODE_CLIENT_ID="<full>" --env=dev`, then `secrets:push`.
- **Capture the marketplace-creators space ID** from the first webhook payload (Worker logs) and set `BETTERMODE_MARKETPLACE_SPACE_ID` in `wrangler.jsonc`.
- **Set `BETTERMODE_ADMIN_USER_IDS`** before going live — empty means nobody can send a draft.
- **Verify `MEMBER`-context `limitedToken` permissions** on the Bettermode app. Current API behavior publishes comments as the Marketplace Creator Agent app account, even when the request uses a member-context admin token.
