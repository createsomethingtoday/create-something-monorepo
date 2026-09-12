# PDL professional-profile enrichment

`enrich_professional_profile` accepts an exact HTTPS LinkedIn profile URL and `confirm_paid_enrichment: true`. It returns vendor-reported name, LinkedIn profile, job title, company name and company website. PDL is supplemental evidence; it never overwrites NPPES, proves active employment/licensure, or makes someone recruiter-ready.

Only `id,full_name,linkedin_url,job_title,job_company_name,job_company_website` are requested through PDL `data_include`. A second output projection excludes unexpected fields before persistence or MCP output. Private phone/email, residential data and raw vendor responses are never retained. A subscription change cannot expand this allowlist.

PDL requires likelihood >=8 and a returned LinkedIn URL equal to the requested URL after normalization. Otherwise no profile is returned. No-match, ambiguous and unavailable outcomes are distinct. No phone/contact availability claim is made by this tool; the existing registry tool continues to label practice contacts separately.

## Credits and reliability

A singleton SQLite Durable Object reserves at most five new attempts per rolling 24 hours across all MCP sessions. Each profile result is cached for seven days. Concurrent repeats see pending or cached results and never dispatch another vendor call. Failed/uncertain requests retain their reservations and are not automatically retried. Request timeout is 15 seconds, redirects are rejected, and vendor error bodies are not surfaced. PDL generally charges one credit per successful match; this cap counts attempts conservatively.

## Deployment

- Bind `PDL_API_KEY` from Infisical prod `/abundance` as a Healthcare Worker secret. Do not put its value in source, Dify, logs or client configuration.
- Deploy Healthcare MCP 1.7.0 with migration v2 adding `PdlProfiles` and the `PDL_PROFILES` binding. Existing MCP_OBJECT remains untouched.
- Deploy the reviewed `enrich_professional_profile` write classification to the NPG Hub while preserving live tenant bindings.
- Refresh Dify's ABUNDANCE HEALTHCARE tool inventory, assign the new tool, update its instructions, publish and verify a professional-profile lookup plus cached repeat.
- Validate unauthenticated access remains denied. Check no PDL raw payload or secret is present in output.

Rollback: remove the PDL tool from Dify and publish; deploy the previous Worker application code while retaining migration v2 and the unused PDL_PROFILES binding. Do not delete the Durable Object namespace or reset reservations to retry uncertain calls. Retain the previous Hub version for rollback.

Reference: https://docs.peopledatalabs.com/docs/reference-person-enrichment-api
