# Slack #help Request Triage Runbook

Use this runbook to work the creator help queue in Airtable: base **Asset
Operations Scratch**, table **Slack #help**, view **Grid view** (grouped by
Status).

The queue is small (single digits of New items per week) but every item is a
creator waiting on money, visibility, or a policy answer. The job is to
**verify, fix what is demonstrably fixable, route the judgment calls, and leave
a dated trail** so the next pass does not redo the work.

This document consolidates the triage passes from 2026-07-02 onward that
previously lived only in agent memory. The pass log at the end is current. Where a lever needs operator
approval it says so.

## Completion contract

A pass is complete only when:

- every row in **New** has a dated `🤖 Triage YYYY-MM-DD:` note and a status
  other than New;
- every row in **Waiting for More Info** has been re-checked against its
  external thread (Zendesk or Slack) and the note says what changed, or that
  nothing changed and what the deadline is;
- every row in **In Progress** has been re-checked the same way: its note says
  what changed, who owns the next step, and by when. Carried-over levers,
  approvals and review-team decisions live here, so skipping this status
  hides the active payout, plagiarism and brand cases;
- **#triage-marketplace-templates** (Slack) has been searched for
  open threads tagging the Templates team, because an empty Airtable view is
  not an empty queue;
- every row marked **Resolved** has a Resolution Description, a Resolution
  Timestamp, and live readback evidence (a 200, a search-API value, a Snowflake
  row, a screenshot), not a "we changed the field" claim;
- every creator-facing reply was approved by a human before it was sent.

A successful Airtable write, a CMS publish, or a "should propagate" is never a
substitute for the readback.

## Where things live

### The table

| Field | Use |
| --- | --- |
| Request ID | Autonumber, primary field. Numbers skip when rows are handled or deleted elsewhere. |
| Request Number | Formula `Request ID + 100`. This is the number creators and Support quote. |
| Status | New → In Progress → Waiting for More Info → Resolved / Closed. See conventions below. |
| Type | Template or Library. Form label is "Asset Type". |
| Issue Category | Creator-chosen. Twelve options, two generations (see Known gaps). |
| Name / Email | Requester. Email is the key for the Zendesk cross-check. |
| Description | The ask, verbatim. |
| Related Asset / Relevant Links | Template name and public listing URL. Often the URL is in both. |
| Attachments | Screenshots. Do not trust a validator screenshot; pull the real run (see Validator class). |
| Submission Timestamp | Created time. `CRT` is a duplicate created-time field. |
| Notes | Append-only triage log. One dated `🤖 Triage` block per pass. |
| Resolution Description | What was done and how it was verified. Required to mark Resolved. |
| Resolution Timestamp | Date only. Required to mark Resolved. |
| Support | Legacy internal sub-category (22 options: Pricing Adjustments, Delist Request, Re-categorize, Stripe, ...). Optional; set it when it helps reporting. |
| Thread TS | Slack message `ts`. Idempotency key for the Slack-thread intake agent. |

### Intake paths

1. **Help Request form** (standalone Airtable form). Sets
   Status = New. Requires Name, Email, Asset Type, Description. This is where
   almost every current row comes from.
2. **Slack-thread triage agent.** Creates a row from a Slack thread and writes
   `Thread TS`. If a row already carries that `ts`, the thread was already
   processed. There are **no Airtable automations** on this base as of
   2026-09-08, so this agent runs outside Airtable.
3. **Manual.** Operators occasionally add rows from Support handoffs.

### Companion tables in the same base

| Table | When you touch it |
| --- | --- |
| 🏗️Templates Sync | Every template item. Read Marketplace Status, Latest Review Status, open versions, listing and preview URLs, creator email. |
| DMCA & Plagirism | Plagiarism and copyright reports. File the intake here; link the Template to its sync row. Public form feeds it too. |
| Issue | 2024-era internal issue log with Slack links. Historical; useful for precedent, not for new work. |
| Slack Invitation Request | Creator Slack invites. Rows with Support = "Slack Invitation" belong here. |
| John test (responses) | Abandoned saved-replies prototype (3 rows, empty). Ignore. |

### Systems you will read or write

| System | Access | Notes |
| --- | --- | --- |
| 👛Marketplace Assets base | Airtable, table 👛Assets | Source of truth for price, categories, featured flags, status. Writes here are production writes. |
| Marketplace search API | `https://templates.webflow.com/templates-api/api/templates/search?query=X` | Returns live price, `published_date`, `is_featured`, `reviewer_pick_reason`. |
| Public listing | `https://webflow.com/templates/html/{slug}-website-template` | 200 = live. Slugs are case-sensitive and lowercase. |
| Template Review MCP | `template_review_*` tools | Asset and version records, quality rating, review context. Call `template_review_get_review_context` before any write. |
| Zendesk | claude.ai Zendesk MCP (read); Zapier `ticket_comment` or Zendesk API (write) | Search by `requester:email`. Closed tickets are immutable: open a new one. |
| Snowflake | `snow sql` / Snowflake MCP, `ANALYTICS.WEBFLOW` | Run `USE WAREHOUSE SNOWFLAKE_REPORTING` first. `MARKETPLACE_PRODUCTS`, `MARKETPLACE_ORDERS` for price and order truth. |
| Slack | `#triage-marketplace-templates` | Support posts creator asks here with Zendesk links. A ✅ reaction on the parent means the Templates team considers it closed. |
| Webflow Admin | `webflow.com/admin/templates/{id}` | Price and decision-date overrides. Operator only. |

## Prerequisites

- Airtable access to both bases above.
- Zendesk agent access (read via MCP; write via Zapier connection
  `webflow2579` or the API token in Infisical).
- Snowflake access with the `SNOWFLAKE_REPORTING` warehouse.
- Slack membership in `#triage-marketplace-templates`.
- Template Review MCP connected (for asset records and quality ratings).
- A human available to approve outbound replies and production writes. Do not
  start a pass you cannot close.

## The pass

### 0. Open all three channels before reading a single row

Load in parallel:

- the Airtable Grid view filtered to New, In Progress and Waiting for More Info;
- Zendesk search for each requester email (do this per item in step 4, but
  confirm access now);
- `#triage-marketplace-templates` search for **every** unresolved thread that
  tags the Templates team, with no date cutoff. When the Slack intake agent
  misses a thread, no Airtable row exists, so an age window would drop that
  creator from every later pass.

The **dual-channel gotcha** drives most wasted work: a form row can sit in New
for ten days while the same creator has already been answered by the Decagon
bot, a Support agent in Zendesk, or a teammate in the Slack channel. Read
before you draft.

### 1. Classify the ask

Map the creator's Issue Category and Description to one of the resolution
classes below. The creator's category is a hint, not truth: "Issues with
library review or publishing" was used for a template preview bug (#1783), and
"Other" was used for a price mismatch (#1789).

Batch by creator. One operator often owns several brands and several rows (one creator filed
five price requests in four minutes on 2026-09-02).
Answer once.

### 2. Pull the template's sync row

In 🏗️Templates Sync, read Marketplace Status, Latest Review Status, Open
Versions, Listing URL, Preview URL, and Creator Email. Mismatches here explain
most "my template is missing" reports.

### 3. Verify externally, cheaply, before touching anything

| Claim | Check |
| --- | --- |
| "Not live" / "404" | `curl -I` the listing URL. 200 means live. Persistent 404 with Airtable saying Published = Whalesync "MRP ID missing"; see the CMS class. |
| "Wrong price" | Search API `price` is the **display** price. Checkout charges `MARKETPLACE_PRODUCTS.PRICE_VALUE`. Read both. |
| "Not in New Templates" | The rail holds the 8 most recent listings (a 2 to 3 day window). Read search API `published_date` and `MARKETPLACE_PRODUCTS.TS_CREATED_ON`. |
| "Last position in category" | Scrape the named category and profile pages. Complaints filed within an hour of go-live self-correct after re-index. |
| "Not featured" | Search API `is_featured`; 👛Assets `Is Featured?`, `⭐Reviewer pick`, `🔔Featured Notified For Period`. |
| "Validator says pages missing SEO" | Crawl the published site for `<title>` and `meta name=description`. Pull the creator's actual run from the R2 artifact store, not the screenshot. |
| "No quality score" | Template Review MCP asset record `qualityRating`. Absent means the reviewer never set it. |
| "Stripe / payout broken" | Snowflake `MARKETPLACE_PRODUCTS.ENABLED` for the creator's workspace and whether recent `MARKETPLACE_ORDERS` carry `MARKETPLACE_PAYOUT_METHOD_ID`. The Airtable `ℹ️Stripe Status` field is the beta flag and does not reflect a payout recreate. |

### 4. Cross-check Zendesk and Slack

Search Zendesk by `requester:{email}`. Decagon escalations create tickets within
minutes of a form submission, so the ask is often already active. Read the
ticket: it holds the creator's own words, the bot's first answers (often
wrong), and whatever Support already promised. Then search
`#triage-marketplace-templates` for the creator or template name.

If the item is already answered in either place, **check the answer before
closing the row**: it must be correct, and any action it promised must be done
and verified with the same live readback as any other resolution. Decagon's
first answers are often wrong, and Support often acknowledges without acting.
If both hold, note where and by whom, then mark Resolved (or Closed if no action
was ever needed). If not, keep the row **In Progress** and note what is wrong or
still owed.

### 5. Decide and act

Split every item into three buckets:

- **Fix now.** Verifiable defect with a known lever you are authorized to pull
  (see class table). Pull it, then verify the live flip on the next pass
  before marking Resolved.
- **Operator lever.** Production write or outbound message. Prepare the exact
  change, hand it over, mark In Progress.
- **Review-team judgment.** Rating disputes, plagiarism evaluation, category
  additions beyond two, featured placement. File the evidence, flag it, do not
  decide it.

### 6. Write the note

Append to Notes, never overwrite:

```
🤖 Triage 2026-09-08: <VERDICT in caps> — <what was checked, with values>.
<What was done or handed off>. <What the next pass should verify>.
```

Verdicts in use: CONFIRMED, RESOLVED, NO MOVEMENT, STILL NO EVIDENCE,
Creator reply SENT, Nudge SENT. Second actions the same day get a
`(2nd pass)` suffix.

### 7. Set status

| Status | Meaning |
| --- | --- |
| New | Untouched. Should be empty at the end of a pass. |
| In Progress | A lever is pulled or handed off and awaits live verification, or a reply awaits approval. |
| Waiting for More Info | We asked the creator for something. Note carries the ticket and the response-by date. |
| Resolved | Fixed and verified live, or answered and confirmed. Resolution Description and Timestamp set. |
| Closed | No action was needed or possible (duplicate, out of scope, creator withdrew, policy answer already given). |

### 8. Reply

Creator-facing replies need human approval before send. Draft in the note or
in the session, get the approval, then send:

- **Existing open ticket:** Zapier `ticket_comment` (public, `comment_format:
  "html"`), or a public agent comment via the API.
- **No ticket, or the old one is closed:** create a new ticket. Create with a
  private comment (Zapier `zendesk_create_ticket` with
  `first_comment_public: no`, requester name and email set), then add the
  creator-facing text with `zendesk_add_comment_to_ticket`, `public: yes`. The
  public comment is authored by the connection agent and fires the email; the
  update also re-routes the ticket to the Marketplace Review Team group and
  brand. A public comment on create is attributed to the **requester** and
  sends nothing: a 2026-08-31 price confirmation went out this way and likely
  never reached the creator. Read the comments back
  and confirm the author is the agent before reporting "emailed." The API
  path fails the same way: a create call without `comment.author_id` puts our
  text under the requester's name and sends nothing (a 2026-08-21 payout-recreate
  notice: the creator never got the onboarding instructions, and their
  reply sat unanswered for a month). Check `/tickets/{id}/audits.json` for a
  `Notification` event that lists the requester.
- **Slack thread:** reply in `#triage-marketplace-templates` only when the ask
  originated there.

Never put raw angle-bracket tags in a reply body. Never quote a Request ID to
a creator; quote the Request Number if you must.

### 9. Close out

Log the pass as a comment on the owning Linear issue: date, row count,
Request Numbers, outcomes, and any lever details the next pass needs. Linear is
the record a fresh operator can find; each row's own state stays in Airtable.
Update this runbook when a new resolution class appears.

## Resolution classes

Levers marked **operator** are production writes and require explicit approval
in the session before execution.

| Class | How it presents | Verify | Lever | Decides |
| --- | --- | --- | --- | --- |
| Approved but not live | "Approved days ago, still not on marketplace" | Listing 200? In search API? | Usually self-resolves within days as the daily publish job runs. Re-check next pass. | Triage |
| Persistent 404 after approval | Airtable says Published, listing 404s | Sync row shows `MRP ID missing` or no CMS record | Manual CMS item creation in the Templates collection (site `5e593fb060cf87bbaf75dd20`); Whalesync pulls it and flips status within a minute. **Operator.** | Triage prepares, operator executes |
| Price change request | "Change X from $59 to $49", "make it Free" | Current live price via search API and `MARKETPLACE_PRODUCTS.PRICE_VALUE` | Two writes, in order: (1) 👛Assets `ℹ️💲Set Price`, which mirrors the live price. **Free needs three fields**: Set Price `0`, `ℹ️💲Price` `0`, and `ℹ️💲Payment Types` = `Free`. The price formulas treat `0` as empty and fall back to the creator-submitted Price, so a Set Price of 0 alone leaves the search index and price string on the old paid value (two free-template requests, 2026-09-08). Read back `🥞💲Template Price String` = `Free` and `🥞💲Is Free?` = 1 before moving on. (2) Operator sets the same price in Admin (`webflow.com/admin/templates/{MRP ID}`); the MRP ID is the asset's rollup and the `rid` in the search API `purchase_url`. For paid changes do not touch `ℹ️💲Price`, a creator-submitted field. Valid tiers under $60: $24, $29, $39, $49, $59; $19 exists but is rare. **Operator.** | Operator |
| Price mismatch (listing vs checkout) | "Shows $49, charges $79" or the reverse | Search API price vs `PRICE_VALUE` (`DOCUMENT_ID` = product id, `RESOURCE_ID` = template MRP id) | Fix forward with the Set Price lever. Already-delivered overcharged orders stand; no partial refund is issued (decision 2026-08-12). | Operator |
| Category change | "Move to X", "add categories A, B, C" | Current `ℹ️🪣Categories` | Link field into 🪣Categories. Hard ceiling of **two** categories. Three-category asks become keep-one-add-one or a swap. **Operator.** | Review team for the pick, operator for the write |
| Not in "New Templates" | "My template dropped off new" | Search API `published_date`; `TS_CREATED_ON` on the product | It is a recency rail of 8, not a category. If the creator missed their window, the decision-date override to today re-surfaces the listing on the homepage (verified 2026-08-24); the search API does not follow until re-index. **Operator.** | Operator |
| Stale sort / last position | "Last in my category and profile" | Scrape the named surfaces | Within an hour of go-live: self-corrects after re-index, resolve with position evidence. Older: compare `TS_CREATED_ON` vs `TS_UPDATED_ON` for a genuine backdated sort. | Triage |
| Featured placement | "Exceptional but not featured" | `is_featured`, reviewer pick fields | Eligibility is not selection. Picks rotate monthly, reviewers vote and justify each. Canonical Support answer recorded 2026-08-20 (ticket reference kept out of this public repo). An "eligible = 1, everything else empty" row means no featured email was ever sent. | Review team |
| Quality score missing | "No quality score shown" | Asset `qualityRating` via Template Review MCP | Reviewer approved without setting it. Review owner assigns the rating; it surfaces on the dashboard. Never infer a rating from agent evidence. | Review owner |
| Quality score dispute | "Got Good, wanted Exceptional" | Version feedback | Policy answer; no re-review on request. Close with the rubric pointer. | Review team |
| Validator false positive | "Validator says N pages missing SEO title" while pages are configured | Crawl published pages for `<title>` and `meta description`; pull the R2 run | Answer: close and reopen the Validator panel in the Designer, re-run. No template change needed. Root cause tracked in the validator worker. | Triage |
| Validator expired loop | "Validation expired, can't submit" | Did a version land in the review queue anyway? | It clears on retry. Confirm the version exists and resolve. | Triage |
| Preview or thumbnail not updating | "Changed thumbnail a week ago, old one shows" (#1790); "clients can't open preview" (#1783) | Listing `og:image`, fulfillment link, search API `thumbnail_image_url`; preview URL returns 200 | Check the Airtable→Webflow Whalesync connection for a failing `Update Record` on that item (one unresolvable reference rejects the whole PATCH). Search thumbnails: see `WEBFLOW_TEMPLATE_SEARCH_IMAGE_REFRESH_RUNBOOK.md`. **Operator** for any D1 or CMS write. | Triage diagnoses, operator writes |
| Dashboard advisory cannot be cleared | "Recommended Next Steps shows Refresh stale listing assets and republishing does not remove it" (#1693) | Listing 200, preview 200, publish date | The card comes from the creator dashboard's template-health rules (`packages/webflow-dashboard/src/lib/utils/template-health.ts`): it fires for any published template live more than 180 days, keyed on first publish date, so no creator action clears it. Answer: advice, not a requirement, nothing is blocked; a Meta Update refreshes assets if they want to. Product gap: make it dismissible or key it on last listing update. | Triage |
| Publication date reset | "Change my publish date so I can start fresh" | `createdOn` is immutable | Cannot backdate or reset. Offer the decision-date override only if the template genuinely missed its window through our fault; otherwise a policy no. | Operator |
| Stripe / payout problems | "Payments section empty", "change payout country" | Snowflake `ENABLED`, orders with `MARKETPLACE_PAYOUT_METHOD_ID`; active ZD ticket? | Supported-to-supported country change: payout-method recreate with `?country={NEW}` (Admin console, **operator**). Tell the creator plainly the old Stripe account cannot be re-attached and purchases pause until onboarding finishes. Unsupported countries (Bangladesh, Indonesia): tracked as exceptions, do not recreate. Onboarding stuck at `Bad Workspace ID`: write the Workspace ID Override first, then flip status to New. **A recreate is not a resolution.** It pauses checkout until the creator finishes the new Stripe onboarding, so resolve only once `MARKETPLACE_PAYOUT_METHODS` shows `ENABLED = true` for the new `PAYMENT_PROVIDER_ACCOUNT_ID` (or a new order carries the payout method). Zero orders of any status since the recreate date, with the method still `false`, means onboarding never finished (#1698, 2026-10-01). Do not recreate again: each one mints another Stripe account. | Operator |
| Fulfillment-link sales missing from dashboard | "Sold via my own site, dashboard shows $0" | `MARKETPLACE_ORDERS` rows exist with `TEMPLATE_FULFILLMENT_CODE_ID` | By design: dashboard revenue is Stripe-only. Explain; no fix. | Triage |
| Plagiarism or copyright report | "Template X copied my logos and sections" | Existing DMCA row? Existing ZD ticket? | File intake in DMCA & Plagirism (Type, Template link, offender and offended URLs, evidence). Acknowledge the reporter via new ZD ticket and request source files and side-by-sides. Evaluation (extent, transformation, importance, impact) is review-team judgment. No suspension without that evaluation. Set a response-by date and do not let an unanswered evidence request die quietly. | Review team |
| Designer-blocking element in a purchased template | Support reports a buyer opened the template and a preloader, overlay, or fixed element covers the canvas; the published site hides it with a page-load script that never runs in the Designer | Fetch the published home page and count the offending elements; check the Instructions page for a documented workaround; check whether the same buyer is already answered in Zendesk | This is a review-team call. Documented or not, a template must be editable when it opens. Temporary delist: 👛Assets Marketplace Status → `4️⃣Delisted☠️`, CMS Status → `Archived`, **leave Delist Reason blank and do not rename** (the relist reverts these). Take the page down with the live CMS `DELETE` + staged `isArchived:true`; if the `DELETE` 409s, **save each referencer's `related-assets` to a file before stripping** so the relist can restore them. Leave the Admin template record alone. New ZD ticket to the creator asking for a fix that ships the element hidden by default in the Designer (precedent: #1696). **No new version needed**: the creator replies on the ticket when the fix is published, the review team re-reviews the live site, then relist by reverting the three Airtable fields, un-archiving the staged item, `POST /items/publish`. **Operator.** | Review team decides, operator executes |
| Delist request | "Remove my template" | Creator owns the asset? | 👛Assets: Marketplace Status → `4️⃣Delisted☠️`, Delist Reason → Creator request, CMS Status → Archived, rename `{Name} Archived {YYYYMMDD}`. Immediate takedown needs the live CMS item DELETE. **Operator.** | Operator |
| Re-list request | "Bring my archived template back" | Why it was delisted | Policy delists stay down. Creator-request delists can be re-listed via review team. | Review team |
| Account or workspace transfer | "Move my templates to another account" | Which path: new owner takes the workspace, or templates move | Templates cannot move; duplicate, transfer the duplicate, publish, then the team adds it in Admin under the new owner and archives the original. Ask which path first. | Operator |
| Profile merge | "Merge my two creator profiles" | | Not supported. Per-site reassignment via Made in Webflow settings keeps likes, clones, and views (Support canonical answer, 2026-08-10). | Triage |
| Rejected with no email | "Dashboard says rejected, no email" | Version status and the ZD thread the status automation creates | Status sync gap; point the creator at the ticket or resend the feedback. | Triage |
| Slack invitation | "Add me to the creator Slack" | | Belongs in Slack Invitation Request; move it and close. | Triage |
| Policy question | "Can I do X" | | Answer from the guidelines, cite the page, close. | Triage |

## Response channel rules

- Human approval before any creator-facing send. No exceptions.
- Prefer the channel the creator is already in. Zendesk ticket beats new
  ticket beats Slack beats email.
- Zendesk writes: Zapier `ticket_comment` on open tickets; API create-then-update
  for new tickets, with `author_id` set to the agent on the public comment.
- Route new tickets to group `1500002744702` (Marketplace Review Team) on the
  update; create-time triggers move them to Programs Support otherwise.
- Park a ticket you are not ready to send on `hold`, not `pending`. The
  Pending automation emails the requester after about four days.
- Plain language, outcome first, no internal names (no "Whalesync", no
  "MRP", no Airtable field names).

## Gotchas collected across passes

- **Empty Airtable view is not an empty queue.** On 2026-08-24 every live item
  was in `#triage-marketplace-templates`.
- **Community channels are a third answer surface.** Some creator issues are
  fixed and communicated in the Marketplace creator community (Bettermode)
  without touching this table (#1783, 2026-09-08). Ask the
  operator whether an item was closed there before drafting a reply, and
  record "resolved via community channels" in the Resolution Description.
- **Decagon answers first and is often wrong.** Read the ticket before you
  repeat or contradict it.
- **Display price and charged price are different fields in different
  systems.** Never resolve a price item on the search API alone.
- **Whalesync is one-way per connection.** Webflow → Airtable for CMS records;
  Airtable → Webflow for asset updates. A stale live description means the
  whole record PATCH is failing, not that one field is unmapped.
- **`createdOn` is immutable.** Align Airtable to Webflow, never the reverse.
- **Slugs are case-sensitive and lowercased on create.** An uppercase CMS slug
  in Airtable yields a permanently 404ing Admin link.
- **Scrapes truncate.** The New Templates section spans roughly 90k characters;
  take the extraction window to the next heading, not a fixed byte count.
- **The `ℹ️Stripe Status` field is the beta flag**, not the payout state.
- **Processing receipts are untraceable.** Match on template name, submission
  date, and creator email.
- **Airtable Notes updates replace the field.** `update_records_for_table`
  overwrites Notes; paste the prior log plus the new block (lost and restored
  by hand on #1660, 2026-09-26).
- **Guessed listing slugs 404.** Use the `url` from the search API, not
  `{name}-website-template`; many slugs carry a category word
  (`esther-photography-website-template`).
- **Slack-thread intake can miss threads.** Support-bot threads do not always
  get a row (#1696 and #1697 were created by hand). Create the row
  manually with the Thread TS so the next pass sees it.
- **One operator, many brands.** Search Zendesk by the operator's email and
  by each brand's email.

## Known gaps in the table (recommend, do not change without owner sign-off)

1. **Issue Category has two generations of options.** Five legacy labels
   (Marketplace Policies, Template Review/Publishing, Template Listing Updates,
   Stripe Account/Payouts, Other) and seven newer sentence-style labels
   (Update or edit my template listing, Problems with Stripe account or
   payouts, ...). Both sets are live on the form. Reporting by category is
   unreliable until one set is retired and back-filled.
2. **No automations on the base.** Nothing acknowledges the creator, nothing
   alerts the team on New, nothing enforces Resolution fields on Resolved. A
   Slack notification on New and a required-field check on Resolved would
   remove the ten-day intake gap.
3. **`Support` is unused on recent rows.** Either retire it or make it the
   internal class field this runbook uses, so the resolution-class table can
   be reported on.
4. **`CRT` duplicates `Submission Timestamp`.** Hide or delete.
5. **No SLA field.** Add a formula for days-in-New so the pass can sort by age.
6. **`John test` tables** are an abandoned saved-replies prototype. Delete or
   repurpose as the canned-reply library this runbook implies.

## Pass log

| Date | New items | IDs | Outcome |
| --- | --- | --- | --- |
| 2026-07-02 | 38 | #1609 to #1646 | Backlog clear; Gmail drafts for human review |
| 2026-08-10 | 9 | #1660 to #1669 | Plagiarism intake filed (#1660) |
| 2026-08-12 | 3 | #1670 to #1672 | Price-mismatch decision (delivered orders stand) |
| 2026-08-21 | 4 | #1773 to #1776 | Validator false-positive class; featured canonical answer |
| 2026-08-24 | 0 | carryovers | All live work was in Slack; transfer asks answered |
| 2026-08-31 | 6 | #1777 to #1782 (+#1760 carryover) | All six resolved same day; #1760 nudged with 2026-09-08 response-by |
| 2026-09-08 | 8 | #1683 to #1690 | Six price items resolved same day (one creator's five-template batch plus one display/checkout mismatch) via Set Price + Admin, confirmations sent on new tickets; free-template toggle found; #1683, #1690 (thumbnail propagation) and #1660 (plagiarism) still open |
| 2026-09-24 | 1 (Slack-only; row #1696 created manually) | #1696 | New class: Designer-blocking preloader. Delisted 04:59 CT, creator fixed twice same day (second pass caught a 479px `display:block` override), relisted 14:42 UTC, all three channels closed. Resolved |
| 2026-09-26 | 4 (+#1660 carryover) | #1691, #1693, #1694, #1695 | #1691 resolved (validator mismatch cleared on retry; submission landed 9/12, rejected 9/21). #1694/#1695 price drops resolved same day: Set Price + Admin, listing structured data verified, reply on the creator's open ticket. #1693 resolved: new class, un-clearable dashboard advisory; answered on a new ticket. #1660: response-by date passed with no evidence; handed to the review team in the DMCA triage thread, now In Progress. Slack channel: all open threads already answered |
| 2026-09-28 | 0 (1 Slack-only; row #1697 created manually) | #1697 | New class: off-platform sales by a former creator using Webflow branding. Marketplace lever exhausted; routed as a brand question. Creator outreach sent 2026-10-01 with a 14-day deadline |
| 2026-10-01 | 1 (+#1660, #1697 carryovers) | #1698 | #1698: Stripe onboarding never completed after a 2026-08-21 payout recreate; payout method still disabled, zero orders since 8/20. Root cause of the month-long silence: the 8/21 ticket message was posted as the requester and never emailed. In Progress pending a Stripe-side check and an approved reply. #1660: no review-team reply in 5 days, escalation to the review owner drafted. #1692 was resolved outside this pass (form update). Slack channel: 5 threads since 9/28, all marked done |

### Open queue

Per-item state (creator, ticket, account and record IDs) lives in the Airtable
table and the owning Linear issue, not here. As of 2026-10-01 three rows are
In Progress: #1698 (Stripe onboarding after recreate), #1697 (brand use by a
former creator, deadline ~2026-10-15) and #1660 (plagiarism evaluation with the
review team).

## Related

- `WEBFLOW_TEMPLATE_SEARCH_IMAGE_REFRESH_RUNBOOK.md` for search thumbnail repair.
- `MARKETPLACE_SUBMISSION_GOVERNANCE_PLAYBOOK.md` for the review-side process.
- Per-pass evidence lives as comments on the owning Linear issue. Airtable
  field and record IDs for the levers above are kept out of this public repo.
