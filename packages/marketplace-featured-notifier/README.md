# marketplace-featured-notifier

Cloudflare Worker cron that notifies a Webflow Marketplace creator when their template is selected as a **featured pick for an upcoming month**, including the reviewer's curatorial reason.

Sends via the Knock workflow **`marketplace-template-featured`** (in-app bell + Postmark email), then stamps the period so the same period never re-sends.

## Why a Worker and not an Airtable automation

- Airtable's API cannot create or read `customScript` nodes (`readOnlyNodeType`), so an Airtable-native version has to be hand-built in the UI and can't be reviewed in code.
- The Knock secret would have to live in a base script, readable by every base editor. Here it's a Worker secret.
- Airtable stays a data store. Nothing to maintain inside the base.

## Selection

```
⭐Reviewer pick ✓
  AND ℹ️Is Featured? ✓
  AND asset type = Template (recA2YsPEHSuAHOLD)
  AND ⭐Reviewer Pick Reason is not empty
  AND IS_AFTER(📅Is Featured Period, TODAY())
  AND (🔔Featured Notified For Period is empty OR its month ≠ 📅Is Featured Period)
```

Periods are always the 1st of a month, so the date gate means **next month or later**. This is load-bearing: without it the job would notify ~620 creators about features going back to 2025. The current month's picks are deliberately excluded — notifying those is a one-time deliberate action, not something a recurring job should do quietly.

Idempotency is **per period**, not a boolean, because creators get re-featured (observed up to 16 times). Do not repoint this at `⚙️Has received publishing email?` — that flag is written by the existing Airtable publish-email flow.

A record is skipped (not failed) when it lacks a Pick Reason, listing URL, creator email, or `🎨🔑Creator WF User ID`. The user ID is required rather than optional: without it the bell silently never arrives, the greeting degrades to "Hi there," and Knock production gains a junk duplicate user. Skipped records are retried on the next run once the data lands.

## Safety

- **`DRY_RUN` defaults to `"true"`.** It also forces dry-run whenever `KNOCK_API_KEY` is absent, so a half-configured deploy cannot email creators.
- Knock is called **before** the Airtable stamp. A failed stamp means a visible duplicate next run; stamping first would silently suppress the notification forever.
- 🗳️Reviewer Votes `Note` is never read. That field is internal reviewer rationale (explicitly encouraged for 👎 votes) and must not reach creators. Only `⭐Reviewer Pick Reason` is creator-facing.
- The listing URL is taken from `🔗Listing URL + UTM` (the raw `🔗Listing URL` is empty on 11k+ assets) with the query string stripped, since the stored value carries `utm_source=youtube`.

## Endpoints

All non-health routes require `Authorization: Bearer $ADMIN_TOKEN` — payloads contain creator email addresses.

| Route | Purpose |
|---|---|
| `GET /health` | Config visibility, including whether it's `armed` |
| `GET /preview` | Resolve candidates. **Never sends**, regardless of `DRY_RUN` |
| `POST /run` | Honours `DRY_RUN`; only sends when armed |

## Arming it

```bash
export CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a
pnpm exec wrangler secret put KNOCK_API_KEY      # Knock PRODUCTION secret — ask #help-knock
# then set DRY_RUN to "false" in wrangler.jsonc and redeploy
pnpm run deploy
```

Verify with `GET /health` → `"armed": true`, then `GET /preview` to see the candidate list before the first real send.

## Config

| Secret | |
|---|---|
| `AIRTABLE_API_KEY` | Infisical prod `AIRTABLE_API_KEY`; needs records read+write on `appMoIgXMTTTNIc3p` |
| `KNOCK_API_KEY` | Knock production secret. **Not yet set** |
| `ADMIN_TOKEN` | Bearer token for `/preview` and `/run` |

Note: the Airtable token has no `schema.bases:read` scope, which is why every field ID is hardcoded — field names cannot be resolved at runtime.
