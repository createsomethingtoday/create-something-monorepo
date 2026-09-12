# PDL candidate enrichment

`enrich_candidate_profile` looks one candidate up in People Data Labs (PDL) and returns two labeled blocks:

| Block | Fields | Source semantics |
|---|---|---|
| `professional` | `full_name`, `linkedin_url`, `job_title`, `job_title_role`, `job_company_name`, `job_company_website`, `job_company_industry`, `job_company_location_name`, `job_start_date`, `job_last_changed`, `work_email`, `industry` | Vendor-reported current employment. Not proof of active employment or licensure. |
| `personal_contact` | `mobile_phone`, `phone_numbers`, `recommended_personal_email`, `personal_emails`, `home_locality`, `home_region`, `home_country` | PDL contact-data bundle. `mobile_phone` is documented by PDL as the individual's personal mobile. Home fields are city/state only; street address and postal code are never requested. |
| `registry` (NPI mode only) | `npi`, `name`, `practice_city`, `practice_state`, `practice_phone`, `contact_route_status` | NPPES public registry, labeled `public_registry_unverified`. Never overwritten by PDL values. |

The candidate is identified by exactly one of:

- `npi` (+ optional `market_id`): NPPES first/last name and practice city/state become the PDL match input. Default likelihood floor 6.
- `profile_url`: exact HTTPS LinkedIn profile URL. Default likelihood floor 8; the returned `linkedin_url` must equal the requested one.
- `name` + at least one of `locality`, `region`, `company`. Default likelihood floor 6.

Every call requires `confirm_paid_enrichment: true`. Optional: `include_personal_contact` (default true), `require_contact` (PDL `required: mobile_phone OR phone_numbers OR personal_emails`, so a credit is only spent on matches that carry a contact value), `min_likelihood`.

## Identity and provenance

PDL is asked for `include_if_matched`. A result is `matched` only when likelihood meets the floor and identity is confirmed: same LinkedIn URL (profile mode) or vendor `matched` includes `name` and the returned name contains the requested last name plus a first-name token (name/NPI mode). Anything else is `ambiguous` and returns no profile or contact values. `no_match` (HTTP 404) and `unavailable` (other errors, timeouts) are distinct.

`personal_contact_access` reports `returned`, `none_on_record`, `masked_by_plan` (account lacks the contact bundle; PDL then returns `true`/`false` instead of values), or `not_requested`.

Every result carries `provenance`: `source`, `retrieved_at`, `vendor_dataset_version`, `contact_type: vendor_reported_personal_contact`, `verification: unverified`, `consent_basis: not_recorded`, plus `subject_npi` when the lookup started from a registry record. Phones are kept only in E.164 form; emails are lowercased and syntax-checked; only allowlisted fields are projected, and the raw vendor payload is never persisted.

## Outreach boundary

PDL data establishes a probable contact route, not permission. The `limitation` string returned with every result states the operating rule for NPG recruiters: confirm identity first; manual recruiter calls and personal emails are the supported use; autodialed calls or SMS to a mobile number need prior express consent under TCPA; honor opt-outs. The recruiting-evidence gates (`contact_route`, `outreach_authority`, `recruiter_approval`) are unchanged and still decide `recruiter_ready`.

## Credits and reliability

A singleton SQLite Durable Object (`PdlProfiles`) reserves attempts across all MCP sessions: at most `PDL_DAILY_LIMIT` new lookups per rolling 24 hours (default 25). Each distinct request is cached for seven days, including `no_match`, `ambiguous` and `unavailable` outcomes, so repeats never spend a second credit. Failed or uncertain requests keep their reservation and are not retried automatically. Request timeout is 15 seconds, redirects are rejected, and vendor error bodies are never surfaced. PDL charges per match; `require_contact` narrows what counts as a match.

## Deployment

- Bind `PDL_API_KEY` from Infisical prod `/abundance` as a Healthcare Worker secret. Never place its value in source, Dify, logs or client configuration. Set `PDL_DAILY_LIMIT` in `wrangler.toml` `[vars]` to change the cap.
- Deploy Healthcare MCP 1.7.0 with migration v2 adding `PdlProfiles` and the `PDL_PROFILES` binding. Existing `MCP_OBJECT` remains untouched.
- Release the `enrich_candidate_profile` write classification to the NPG Hub (`cs-hub-abundance-thenpgroup`) while preserving live vars, secrets and routes.
- Refresh Dify's ABUNDANCE HEALTHCARE tool inventory, assign `enrich_candidate_profile`, update the agent instructions, publish, and verify one NPI lookup plus a cached repeat.
- Confirm unauthenticated access is still denied and no PDL raw payload or secret appears in output.

Rollback: remove the tool from Dify and publish; redeploy the previous Worker code while retaining migration v2 and the unused `PDL_PROFILES` binding. Do not delete the Durable Object namespace or reset reservations to retry uncertain calls. Keep the previous Hub version available for rollback.

Reference: https://docs.peopledatalabs.com/docs/reference-person-enrichment-api and https://docs.peopledatalabs.com/docs/fields
