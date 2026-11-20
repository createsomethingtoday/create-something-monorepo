# Retired enrichment integration

Clay has been removed from the active NPG integration. PDL, Exa and Skip Trace are the three supported providers. The MCP catalog and readiness schema no longer advertise Clay tools or provider options; new combined profiles contain only the three supported provider results.

The former Agency request/read endpoint returns HTTP 410 after internal bearer authentication. The former callback verifies the original job token read-only and returns HTTP 410; it accepts no result writes. No new dispatch, paid request, automatic callback retry, or account upgrade is authorized by retirement.

Existing D1 job, grant, receipt and action records are retained for audit. Their original IDs, statuses, source evidence and unknown charges remain unchanged. Historical pending Clay receipts are identified as retired at the aggregate level, never rewritten as successful retrieval or a completed three-provider approval. No Clay recovery calls are scheduled.

Do not delete the additive historical tables or reinterpret their records. A future restoration requires a separate implementation and authorization; rolling back code could restore the old dispatch surface and must be assessed before promotion.
