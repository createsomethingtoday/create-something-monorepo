# NPG on-demand professional contact enrichment

This integration researches contact points explicitly published for professional use. It does not retrieve private personal phone numbers, personal email addresses, or home addresses. A returned contact is a candidate for operator review, not proof of ownership, current employment, or permission to contact someone.

## Request and result

The agent requests one exact NPI with `request_professional_contact_enrichment` and `confirm_paid_enrichment: true`. The backend takes identity fields from the latest successful broad NP registry snapshot. It reserves at most five jobs per rolling 24 hours, sends an authenticated Clay webhook, and returns a job ID. Repeat requests for the same NPI and source hash within the same seven-day calendar bucket return the existing job without dispatching another lookup.

Use `get_professional_contact_enrichment` to poll that ID. Statuses are `pending`, `delivery_unknown`, `review_required`, `no_match`, and `ambiguous`. A failed or uncertain webhook delivery is retained and never automatically resent. A valid candidate includes a source URL, an exact professional-use quote, and identity evidence. All candidates remain unverified. The system does not overwrite registry contact fields or send outreach.

## Clay table contract

The intake is the authenticated NPG Professional Contact Enrichment workbook webhook. Only these four scalar fields may enter the research prompt: `name`, `npi`, `city`, `state`. Never interpolate the entire webhook object: it also contains a scoped callback credential.

Research runs only for `enrichment_requested === true`, `scope === "public_professional_only"`, and an exact ten-digit NPI. It uses official professional pages, no personal-data broker waterfalls, and a configured maximum of three Clay credits per row. The HTTP callback must depend on completed valid research and POST only to `https://createsomething.agency/api/webhooks/npg-clay` with `{request_id, callback_token, result}`. Keep auto-runs disabled until these settings have been inspected and the backend release is live.

`result` is a JSON object with `outcome` (`candidate`, `no_match`, `ambiguous`), `identity_evidence`, and `contacts`. Each contact contains `type` (`phone` or `email`), `value`, `source_url` (HTTPS), `publication_context` (`professional_contact`), and `evidence_quote`. At most one phone and one email are accepted. Non-candidate outcomes require empty contacts. Validation does not independently prove that a cited page supports a contact; an operator must review it.

## Release and rollback

Apply Agency migration `0054_abundance_clay_jobs.sql`. Bind `CLAY_NPG_WEBHOOK_URL` and `CLAY_NPG_WEBHOOK_AUTH_TOKEN` to the Agency production environment from Infisical prod `/abundance`; do not put their values in source, logs, or prompts. Both Agency request/read endpoints require the existing internal service bearer. The callback instead requires the unique job credential, whose SHA-256 digest is stored in D1. First callbacks expire after 24 hours; an identical accepted callback can be safely repeated, and a conflicting result is rejected.

Deploy Agency and Healthcare MCP, refresh the NPG Dify tool catalog, assign both Clay tools, and update the agent prompt with paid-request and review rules. Verify one bounded live roundtrip, a duplicate cache hit, and unauthorized intake/callback denial before enabling the workflow for demonstrations.

To stop new enrichment, disable Clay auto-runs and remove the Agency Clay integration bindings. Keep job records for reconciliation. Roll back the app/worker to the recorded previous deployment if needed; the additive jobs table can remain. Unknown-delivery jobs must be reconciled in Clay before any manual retry.
