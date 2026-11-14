# NPG four-provider enrichment and spend tracking — CRE-2451

The owner explicitly removed inherited Dify spend limits on November 13, 2026. The custom implementation tracks spending; it does not enforce a shared $100 allowance, per-lookup dollar ceilings or daily spending caps. Historical uncertainty and missing USD conversion do not prevent enrichment. The historical Dify prompt is preserved only as provenance and is superseded by the current host policy.

`enrich_candidate_complete_profile` prepares one exact-NPI review covering PDL professional/personal data, Clay public professional contacts, Exa public research, and Apify Skip Trace personal-contact candidates. Approval belongs to the current owner, exact candidate and immutable operation ID. Each provider receives an independent attempt; an unavailable provider produces a partial profile without suppressing other providers. Returned fields remain provider-reported evidence, not verified identity, current employment or permission to contact.

## Spending records

The Agency database records each operation and provider attempt before vendor dispatch. Candidate-bound, one-use dispatch grants prevent repeating a paid operation. These are execution records, not financial reservations. Private grants never enter model output, chat evidence or public telemetry. Losing a vendor response preserves an unknown-charge receipt; it does not establish zero spend and does not block unrelated requests.

Confirmed USD, estimates, provider credits and unresolved amounts are distinct. A credit count is never implicitly converted to dollars. Recorded USD is a subtotal for the known ledger coverage, not a claim of lifetime account spending. Unknown pre-ledger history is explicit. Provider data success and charge reconciliation are separate states.

`GET /api/abundance/enrichment-budget?provider=pdl` (also `clay`, `exa`, `apify`) returns tracking availability and the all-provider `spend` summary. `confirmed_usd` sums the latest confirmed amount per tracked operation/provider; `estimated_usd` includes estimates only for operations without confirmed USD. `pending_count` counts operations still lacking a USD receipt. `by_provider` retains separate totals and credit units. `history_complete:false` and `historical_usd:null` explicitly exclude unverified pre-ledger history. The legacy URL is retained for internal compatibility; it does not enforce a budget.

The internal authenticated tracking API records sanitized billing receipts and reads spending summaries. It must not accept credentials, raw contact payloads or a request to erase history. POST accepts only tracking creation, one-use claim and append-only receipt records. An ordinary signed-in session is not sufficient internal API authority. Original accounting evidence stays available when later receipts reconcile an amount.

## Reconciliation

The private CRE-2451 reconciliation record retains historical account evidence and coverage gaps. Credit usage without a verified USD conversion remains unknown in dollars. Earlier allowance recommendations are superseded. Keep billing statements, account usage and real-candidate screenshots out of this public repository. Account invoices/usage exports can later establish attributed historical charges and credit conversions; obtaining them is no longer an activation prerequisite.

Prefer provider-supplied run charges. Preserve receipt identifiers and units. If a provider returns only credits, delivery status or no charge information, show pending USD instead of an invented price. Reconcile an existing operation from exact provider receipts; never run enrichment again to find its bill. Estimates must remain labeled and excluded from confirmed spending until evidence supports them.

For invoice reconciliation after a request has finished, an authorized operator can append a sanitized row to `npg_enrichment_receipts` through the owning D1 workflow. First read the exact `request_id` and provider from `npg_enrichment_requests`/`npg_enrichment_grants`; use a unique evidence event ID, the cumulative confirmed USD for that operation (integer microdollars, not a delta), a private evidence reference and recorded time. Never copy invoice personal data into the row. Preserve prior rows, including corrections; the summary chooses the latest non-null amount per operation. Read back the row and summary after the write. The dispatch grant need not be recovered or exposed to perform an explicitly authorized database reconciliation. Unknown amounts remain null. This procedure is informational reconciliation and never resets or grants a spending allowance.

## Recovery

A complete profile means all provider outcomes are available, not that every requested field exists. Pending, unavailable, ambiguous identity and conflicting contacts remain visible per provider. Read Clay by its existing job ID. Refresh Skip Trace using the exact original receipt and action, owner, conversation and NPI. Replace both stored copies of the nested provider evidence on refresh so stale contacts cannot survive a failed privacy check. Recovery must not launch another complete-profile request or a second paid run.

## Validation and release

The acceptance criteria are: all four providers attempted under one explicit approval; unknown charges/history permitted; no inherited spend gate; durable provider-level tracking; separate confirmed/estimated/unknown amounts; per-operation replay prevention; independent partial outcomes; exact receipt recovery; legible desktop/mobile spend presentation. Tests using fixtures or local workerd establish implementation behavior, not live vendor outcomes.

Deploy through the reviewed production PR, additive Agency migration, Agency API/UI and Healthcare MCP Worker. Verify authenticated tool inventory, tracking availability and live page behavior without a paid QA lookup. A real candidate pilot uses the application's explicit approval flow.

Rollback the deployed code through the previous Worker/Pages artifact. Preserve all ledger, receipt, grant, audit and Skip Trace Durable Object data. Never delete accounting or retry an uncertain operation as a rollback.
