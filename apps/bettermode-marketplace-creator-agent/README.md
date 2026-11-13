# Bettermode Marketplace Creator Agent

Cloudflare Worker for the **Marketplace Creator Agent** Bettermode app. Drafts admin replies for posts and replies in `community.webflow.com/marketplace-creators`, then renders an admin-only dynamic block on each post so the admin can edit and send the draft as themselves.

## Behavior

| Phase | What happens |
|---|---|
| Webhook (`post.published` / `reply.published` / `*.updated`) | Verify Bettermode signature → send a `thread.sync` message to the `bettermode-creator-events` queue |
| Thread sync (queue consumer) | Read the whole thread from Bettermode (root, replies, nested replies) → derive the state → write the thread row → draft a reply when a creator is waiting and no current draft exists |
| Scheduled sweep (every 30 min) | List the 30 most recently active threads in the space → enqueue each one whose stored state is behind, plus open items nothing refreshed in a day. Covers webhooks that never arrive. Also re-enqueues `reply.verify` for a reply sent 15 minutes to 24 hours ago that has no recorded moderation outcome. |
| Dynamic block render | On admin view of a post, return a Slate UI: post excerpt, editable draft textarea, [Send / Regenerate / Dismiss]. Non-admins see a small hint block. |
| Send | Claim the draft (`sending`) so a second submit cannot post twice → mint a member-context Bettermode token using the admin's `actorId` → `createReply` → mark queue row `sent` and the thread `responded` → enqueue a `reply.verify` message |
| Reply verify (queue consumer, 15 s later) | Check the reply status. If moderation holds it, release that one reply. Record the outcome on the queue row. |
| Regenerate | Send a `thread.sync` message with `regenerate` |
| Dismiss | Mark queue row `rejected` and the thread `dismissed`. A creator message after the dismissal reopens it. |

## Response queue

A queue item is a thread, not a post. Its state comes from the live thread, so a duplicate or late event cannot corrupt it.

| Thread status (`community_signals.status`) | Meaning |
|---|---|
| `new` | A creator spoke last. No current draft (not drafted yet, or drafting failed: see `metadata.last_error`). |
| `queued` | A creator spoke last. A draft is ready for review. |
| `responded` | Staff spoke last. Open drafts become `expired`. |
| `dismissed` | An admin decided no reply is needed. A creator message after the dismissal reopens the item. |

Staff are members with an email domain in `BETTERMODE_STAFF_AUTHOR_DOMAINS`, members in `BETTERMODE_ADMIN_USER_IDS`, and the app identity. A reply sent through the API is owned by the app (`APP::<id>`), not by the admin who approved it.

The thread row is written before the draft step. If the model call fails, the item stays in the queue with the error, and the queue retries with backoff (30 s, 60 s, 120 s, 240 s).

Bettermode limits query cost to 20,000 per 10 seconds. Nested connections multiply the cost, so the Worker reads a thread as one post with direct replies and then one small query for each reply chain. Do not nest `replies` two levels deep in one query.

Agents work the queue through `packages/bettermode-creator-mcp` (`list_response_queue`, `save_draft`, `dismiss_queue_item`). Only the Send action in Bettermode posts to the community.

## Endpoints

- `GET /` — status page
- `GET /health` — JSON smoke check
- `POST /webhook` — Bettermode lifecycle and content events (signature required)
- `POST /webhook/interaction` — dynamic block render + button callbacks (signature required)

## Storage

Reuses the `create-something-agency` D1 database (`a74e70ae-…-b90719c8dfd2`) and the existing `community_signals` + `community_queue` tables:

- `community_signals.platform = 'bettermode'`
- `community_signals.source_id = <bettermode root post ID>` (one row for each thread)
- `community_signals.metadata` (JSON) — thread author fields plus queue state: `waiting_since`, `last_staff_reply_at`, `latest_creator_post_id`, `drafted_for_post_id`, `dismissed_at`, `sent_reply_at`, `last_activity_at`, `synced_at`, `last_error`
- `community_queue` — `draft_content` is the draft; `approved_content` is the (possibly edited) text the admin actually sent; `result` holds the reply ID and the moderation outcome.
- `community_monitor_runs` — row `bettermode-reconcile` holds the latest sweep: when it ran, how many threads the webhooks missed, and any error.

Indexes added by `packages/agency/migrations/0021_bettermode_creator_agent_indexes.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_signals_platform_source ON community_signals(platform, source_id);
CREATE INDEX IF NOT EXISTS idx_queue_signal_status ON community_queue(signal_id, status);
```

Apply once before first deploy:

```bash
wrangler d1 migrations apply create-something-db
```

## Secrets (via Infisical)

Stored in Infisical workspace `e1532079-…-cf7a025eb803` under `dev`:

| Infisical name | Worker secret name |
|---|---|
| `WEBFLOW_BETTERMODE_CLIENT_ID` | `BETTERMODE_CLIENT_ID` |
| `WEBFLOW_BETTERMODE_CLIENT_SECRET` | `BETTERMODE_CLIENT_SECRET` |
| `WEBFLOW_BETTERMODE_SIGNING_SECRET` | `BETTERMODE_SIGNING_SECRET` |
| `WEBFLOW_OPENAI_API_KEY` | `OPENAI_API_KEY` |
| `AIRTABLE_API_KEY` (existing in repo) | `AIRTABLE_API_KEY` |
| `WEBFLOW_BETTERMODE_REPLY_POST_TYPE_ID` | `BETTERMODE_REPLY_POST_TYPE_ID` |

`BETTERMODE_REPLY_POST_TYPE_ID` is the post type ID for replies in the space. Bettermode requires it to create a reply. It is a secret only to keep the ID out of this public repo. Without it, Send returns an error and posts nothing.

Push secrets to the Worker:

```bash
pnpm --filter @create-something/bettermode-marketplace-creator-agent secrets:push
# or
infisical run --env=dev -- bash apps/bettermode-marketplace-creator-agent/scripts/push-secrets.sh
```

The script never echoes secret values; it pipes them straight into `wrangler secret put` over stdin.

> **Rotation reminder.** The OpenAI key, Bettermode Client Secret, and Bettermode Signing Secret were transmitted via chat plaintext during initial provisioning. Rotate all three (OpenAI dashboard + Bettermode app settings) before letting the Worker carry production traffic. Update Infisical, then re-run `secrets:push`. Bettermode Client ID generally cannot be rotated without recreating the app.

## Public vars (in `wrangler.jsonc`)

| Var | Purpose |
|---|---|
| `BETTERMODE_DEFAULT_NETWORK_ID` | `BuRv7sR1po` (Webflow Community network) |
| `BETTERMODE_MARKETPLACE_SPACE_ID` | The Bettermode space ID for `/marketplace-creators`. Leave empty to handle every space until you capture the real ID from the first webhook payload (visible in Worker logs). |
| `BETTERMODE_MARKETPLACE_SPACE_SLUG` | `marketplace-creators` (informational) |
| `BETTERMODE_ADMIN_USER_IDS` | Comma-separated Bettermode user IDs allowed to send drafts. **Leave empty to fail closed** (no one can send). |
| `BETTERMODE_STAFF_AUTHOR_DOMAINS` | Comma-separated email domains whose messages count as staff responses. Default `webflow.com`. |
| `BETTERMODE_RECONCILE_LOOKBACK_DAYS` | The sweep ignores threads with no activity in this many days. Default `30`. |
| `AIRTABLE_BASE_ID` | `appMoIgXMTTTNIc3p` |
| `AIRTABLE_CREATORS_TABLE` | `tbljt0plqxdMARZXb` |
| `AIRTABLE_ASSETS_TABLE` | `tblRwzpWoLgE9MrUm` |
| `AIRTABLE_CREATORS_EMAIL_FIELD` | `Email` (override if your column is named differently) |
| `AIRTABLE_CREATORS_ASSETS_LINK_FIELD` | `Assets` (override if your linked-record column is named differently) |
| `OPENAI_MODEL_DEFAULT` | `gpt-4o-mini` (used for replies) |
| `OPENAI_MODEL_RICH` | `gpt-4o` (used for top-level posts) |
| `ALLOWED_ORIGINS` | CORS allowlist for `OPTIONS` requests |

## Deploy

```bash
# One-time: apply the index migration
wrangler d1 migrations apply create-something-db

# One-time: create the event queue and its dead-letter queue
wrangler queues create bettermode-creator-events
wrangler queues create bettermode-creator-events-dlq

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
5. **Scopes** — at minimum: read posts/replies/members/spaces, and create replies on behalf of users (member-context tokens). Without the latter the **Send** button cannot post as the admin.

## Tests

```bash
pnpm --filter @create-something/bettermode-marketplace-creator-agent test
```

Covers the thread-state rules (who spoke last, nested replies, held replies, staff identity).

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
- **Replies post as the app, not as the admin.** The `MEMBER`-context `limitedToken` signs in as the app identity, so a sent reply shows the app name. `CreatePostInput` has an `ownerId` field that may set the author; it is untested.
- **The Send and reply-verify paths have no live test yet.** The GraphQL shapes match the scripts used for manual posting. Verify on the first real send: the reply appears, and `community_queue.result` shows `moderation: published` or `released`.
- **Messages in `bettermode-creator-events-dlq` have no consumer.** They arrive there only when the consumer itself crashes. Check the queue depth in the Cloudflare dashboard.
