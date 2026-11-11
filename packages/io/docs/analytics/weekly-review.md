# Weekly audience review

Owner: CREATE SOMETHING operator. Tracking: [CRE-2415](https://linear.app/createsomething/issue/CRE-2415/unify-audience-analytics-and-deliver-weekly-cross-property-scorecard).

Open `/admin/analytics` on createsomething.io with the existing Identity admin session. The weekly default is seven **complete UTC days**, ending at today's UTC midnight. Select 30 or 90 days for a longer review; every metric uses the same current/prior boundaries. Ends are exclusive. Refresh explicitly after changing source configuration. No dispatch or scheduling is configured.

1. Check source status and latest read record before interpreting counts. A successful empty read is zero; a failed, absent, incompatible or over-limit source is **Unavailable**. An old last record is a reason to inspect ingestion, not proof of an outage.
2. Read discovery by property and the first observed landing channel. Source categories never expose raw referrer URLs; country context counts page views, not people or personas. Missing/referrer-stripped traffic is unattributed, not proven direct traffic. Read discovery by property. Public sessions include separately visible external and unclassified sessions. External is not guaranteed human. Compare current with prior counts; do not add sessions across properties to count people.
3. Read usefulness as observed resource activity. Copy, content-link click and completion browser actions indicate use, not completed learning or customer success. MCP counts describe operator activity, not audience demand.
4. Read relationship as configured newsletter landings, resource use, independently dated signup requests/confirmations, and a current eligibility snapshot. Active/total subscriber records are not an eligible audience. There is no prior audience snapshot or list-growth estimate.
5. Read verified outcomes as durable records with their limits. Contact receipts prove storage, not email delivery or qualified leads. Completed lesson records are not unique learners. Scheduler bookings come from initial committed receipts, with reschedules/cancellations separate. Accepted map/workflow evidence stays unavailable until its owner defines a safe first-party acceptance contract.
6. Download the Markdown review. Save it with the review date in the owning evidence location and attach a concise decision/source-gap note to CRE-2415. The download performs a fresh read, so its checked timestamp can differ from the page. Do not post to Slack/email or schedule dispatch without separate authorization.

For a failed report, use Retry. For an expired session, use Sign in again. For partial coverage, inspect the individual source, restore its binding/schema/read access, and refresh. Never replace unavailable values with zero in a downstream report.

## Contracts and source coverage

| Source                    | Server binding / canonical owner                                                                     | Evidence used                                                                                            | Limits / recovery                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Agency / io / ltd / space | `DB`, shared create-something-db `a74e70ae-6a94-43da-905e-b90719c8dfd2`                              | `unified_events`                                                                                         | Fixed properties and UTC windows only. Check tracking ingestion and schema.                                                                  |
| Learn                     | `LMS_DB`, lms-db `2ec4ea2e-c25f-4832-b78f-a608ff9f8ad7`                                              | `unified_events`, `lesson_progress`                                                                      | Canonical host `learn.createsomething.space`. Progress timestamps are Unix seconds; no learner identifiers selected.                         |
| Newsletter                | Shared DB; canon `newsletter/audience.ts`, io `newsletter-analytics.ts` and `newsletter-workflow.ts` | Consent eligibility predicate, configured first-party campaign sessions, signup attribution, send ledger | No recipients selected. Confirmations are one attribution row per subscriber. No cohort conversion rate, opens, email click rate or replies. |
| Contact                   | Shared DB; Agency `0058_contact_request_receipts.sql`                                                | Count of idempotent request receipts                                                                     | No payload, owner token, submission, email, IP, or provider ID returned. No traffic-class join; operator/tests may remain.                   |
| Scheduler                 | `SCHEDULER_REPORTS` service binding to scheduler `AudienceReports`                                   | Fixed first-party host lifecycle receipts                                                                | Read-only RPC; unavailable on missing binding/schema/timeout. Browser events and schedule-mcp are not booking counts.                        |
| Accepted maps/workflows   | Agency owning services                                                                               | **Unavailable**                                                                                          | No approved aggregate contract that isolates CREATE SOMETHING accepted evidence from client records. No client data read.                    |
| MCP                       | `TELEMETRY_DB`, cs-telemetry `f710641a-0c85-4a7b-bb73-2c16f8d024c3`                                  | `mcp_tool_invocations` hub/downstream separately; `mcp_hub_routes` routed attempts                       | `account_id = 'operator'` only. Clients and unknown accounts excluded. Tests/retries can remain. No account keys/trace identifiers returned. |
| Cloudflare Web Analytics  | Separate provider measurement                                                                        | **Not ingested into this report**                                                                        | Visits differ from first-party sessions and cannot be summed. No provider API credential added.                                              |

`src/lib/server/analytics-scorecard.ts` is the reusable server reader; `src/lib/admin/weekly-scorecard.ts` owns the typed report and Markdown formatter. The admin endpoint now returns report version 1; the old single-DB response is retired together with its sole in-repo consumer. The same authenticated endpoint supports `?days=7&format=markdown`. It accepts no database selector, arbitrary SQL, private user ID or source URL. Responses, including auth failures, are private/no-store. There is no public cross-property endpoint or new service secret.

D1 does not offer a per-binding SELECT-only SQL grant. These are server-only platform bindings, not client credentials. Least privilege in this application is a fixed aggregate read contract: no mutation methods, arbitrary SQL or individual-record API is reachable from the report. The `.io` runtime capability still includes D1 access; review that platform boundary before promotion. Avoid adding these bindings to any public/user route. Existing `/api/user/analytics` is deliberately not reused.

## Traffic inclusion and privacy

Each source reads at most 20,001 events across the two periods (at most 180 complete days). If more than 20,000 match, the **entire traffic source** is unavailable; do not publish a truncated sample. An indexed broad date prefilter accommodates both UTC formats and ISO offsets; exact inclusion still uses julianday. The event query stops at its cap without sorting the source. Result pages are capped at ten; the daily series is at most 90 rows. Aggregates return a constant number of columns/groups. Queries use `julianday` / `datetime`, avoiding lexical comparisons between ISO and sqlite date strings. No database migration, table creation or write occurs during a read.

Classification takes the most restrictive observed event for each source-local session across both comparison windows. Any internal/test/preview/automated class, recognized automation user agent, noncanonical host, private path or credential-bearing URL excludes the whole observed session. Missing classification stays **unclassified**, not human. Classification does not reconstruct activity outside the two observed windows or across databases. The report does not infer missing consented events.

Apex + www hosts are allowed for agency/io/ltd/space; Learn allows only `learn.createsomething.space`. All URL queries/fragments are discarded. Encoded private routes are decoded before exclusion. Opaque/sensitive paths are redacted before ranking/display; raw URLs, user agents, metadata, session/user/account identifiers and referrers never leave the server reader. No identity join, new identifier or cookie is introduced.

## Newsletter evidence

Eligibility is the exact shared canonical predicate used by dispatch: confirmed subscription, confirmed consent, double opt-in with confirmation-link evidence, reviewed subscriber classification, active status and no unsubscribe suppression. Extracting that predicate did not change dispatch behavior.

Tagged landings use configured `NEWSLETTER_CAMPAIGNS` and `first-party-v1`. Resource use is within 30 minutes of the first tagged landing for each configured campaign in the period, with qualifying sessions unioned once, before period end, after session filtering. Historical untagged traffic is not attributed. Signup requests and confirmations use their own timestamps independently; the attribution table's subscriber primary key makes confirmation once-only.

Period send counts use distinct non-null provider IDs in `kind = 'audience'` rows whose current ledger state is sent/delivered/delayed. `created_at` dates the send attempt record; a later retry acceptance can differ from that creation date. This is a stored ledger signal, not freshly verified provider delivery. `seed` and `historical-audience` rows are excluded. Migration 018 imported historical-delivered rows at import-time CURRENT_TIMESTAMP; **that timestamp is never a send date**. The separate historical count has no weekly placement.

No provider fanout happens at scorecard load. The linked existing newsletter evidence surface uses `readNewsletterDelivery` with reviewed provider IDs, pacing, bounded 429 retries and `delivered: null` on failure. A provider delivery state is not an open/click/reply rate. No newsletter send/import/campaign/consent change is authorized by viewing the scorecard.

## Outcome gaps and next contracts

Scheduler: a narrow named service-binding entrypoint, `AudienceReports.getBookingSummary`, reads only the fixed first-party host Durable Object (`micah-johnson`). The Pages runtime binds `SCHEDULER_REPORTS` to `create-something-scheduler` / `AudienceReports`; deploy the reviewed scheduler export before .io. There is no public HTTP analytics route or shared operator credential. RPC inputs are adjacent equal 7/30/90 complete UTC-day windows. The owning read service validates windows and executes receipt SELECTs without constructing the schema-writing booking store, Calendar providers, or booking command service. New bookings are distinct initial committed booking IDs dated by `receipts.occurred_at`; reschedule/cancel lifecycle events remain separate. The read never refreshes credentials, modifies receipts or schedules alarms, and returns no names, emails, notes, provider links or tokens. The report bounds the RPC wait to five seconds and validates numeric counts before accepting them. Missing/corrupt/over-limit ledger or an unavailable deployment is Unavailable, not zero. Operator/test bookings can remain, so these are verified records, not qualified external demand.

Maps/workflows: the owner must define a first-party scope, explicit acceptance timestamp and evidence criteria independent of client records. Do not count a prepared map, approval intent or browser click as accepted workflow value. Keep this unavailable until that contract is approved.

MCP: raw layers stay separate. Downstream records lack the hub's request/correlation identifiers; correlation may be a progress/task token and JSON-RPC request IDs can repeat. Neither proves global task identity. No global historical deduplication or customers-from-keys claim is valid.

## Promotion and rollback

This implementation is review-only until the parent completes independent Sol 6.1 re-test and authorizes integration/promotion. Validate local tests, full .io check/lint/build, the actual page at mobile/desktop, keyboard scrolling and loading/error/empty/partial recovery before merge. Fixture views are not live production analytics verification.

During authorized promotion, deploy .io with its reviewed `LMS_DB` and `TELEMETRY_DB` bindings. Read back the deployed binding IDs without exposing secrets; verify admin authorization, no-store and source coverage independently. Do not mark CRE-2415 done from a build/PR receipt. Promote the scheduler read entrypoint first, then .io; verify the exact service binding and admin-only report together.

Rollback: revert this focused commit through the normal PR path and redeploy the prior .io artifact. Remove the added analytics D1/service bindings from the restored config if present. No stored data, consent state or campaigns require rollback because the feature performs reads only. Retain the worktree and Linear evidence until parent review/release.

## Design reference record

Initial approach: four outcome stages, equal-window comparisons, separate property/session units, explicit missing-source recovery; preserve the existing Canon operator surface and Tufte trend.

Static Mobbin images actually inspected (no motion claims):

| Reference                    | Why / adopt through Canon                         | Avoid                                                              | Source                                                                       |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Seline dashboard             | Compact period selection and contextual metrics   | Visitor/person semantics unsupported here; its palette/composition | [Seline](https://mobbin.com/screens/31becc74-4060-407f-8102-4516d7cf38b6)    |
| Klaviyo business performance | Explicit dates plus previous period near measures | Attributed conversion rates and campaign assumptions               | [Klaviyo](https://mobbin.com/screens/4ca7b81a-9cb8-497c-a728-e66ae0487f5e)   |
| Plausible analytics          | Side-by-side period counts and direct data access | Unique-visitor claims and automatic growth interpretation          | [Plausible](https://mobbin.com/screens/b6603e7d-2fdd-4e47-9c68-5288dd94c056) |

Decision: adapt comparison clarity and period feedback; use original Canon tables, source rows, typography and disclosure. Reference media is not retained in the repo. The supplied analytics-review.html informed the current/prior comparison and separation of source evidence; it is a static review baseline, not the previous live admin UI.
