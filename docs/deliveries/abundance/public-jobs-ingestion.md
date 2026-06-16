# Abundance Public Jobs Ingestion

This is the provider-facing contract underneath the existing Abundance Jobs MCP and Dify job funnel.

The serving surface stays stable:

- Dify users call `list_public_jobs`, `search_public_jobs`, `get_job`, and confirmation-gated `send_job_to_funnel`.
- The normalized database contract stores public job records independently of the upstream provider.
- Bright Data was the first direct provider adapter.
- RapidAPI Active Jobs is now the delivery refresh adapter through the source-controlled `packages/abundance-jobs-mcp` Worker.

## Database

Migration:

```bash
pnpm --filter @create-something/agency db:migrate:local
```

Schema:

- `abundance_public_jobs`: normalized public jobs plus provider/source identity, provenance, raw payload hash, raw payload JSON, and freshness timestamps.
- `abundance_public_job_ingestion_runs`: every provider pull or import attempt, including requested filters, snapshot IDs, status, result counts, and error text.

Provider identity is intentionally split:

- `provider`: collection provider, for example `bright_data`, `rapidapi`, `manual`.
- `source_system`: upstream board or source, for example `linkedin_jobs`, `indeed_jobs`, `glassdoor_jobs`.
- `external_job_id`: provider/source job identifier.

The uniqueness boundary is:

```text
provider + source_system + external_job_id
```

## API

Read normalized jobs:

```bash
curl "$AGENCY_URL/api/abundance/public-jobs?status=open&query=nurse&state=CA" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY"
```

Import direct records, useful for a Bright Data webhook, snapshot download, or manual smoke:

```bash
curl "$AGENCY_URL/api/abundance/public-jobs" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "bright_data",
    "source_system": "linkedin_jobs",
    "records": [
      {
        "url": "https://www.linkedin.com/jobs/view/4416048502/",
        "job_posting_id": "4416048502",
        "job_title": "Travel Nurse RN - Med Surg",
        "company_name": "Example Health",
        "job_location": "Fremont, CA",
        "job_type": "Contract",
        "posted_date": "2026-05-17"
      }
    ]
  }'
```

Trigger a bounded Bright Data filter run:

```bash
curl "$AGENCY_URL/api/abundance/public-jobs" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "bright_data",
    "query": "nurse",
    "state": "CA",
    "posted_after": "2026-05-01",
    "wait_for_snapshot": true,
    "limit": 50
  }'
```

The route requires at least one Bright Data filter before starting a live provider request. This prevents accidental unbounded paid collection.

Bright Data's filter endpoint creates an async snapshot. When `wait_for_snapshot` is false or the snapshot is not downloadable before the bounded wait expires, this route records the ingestion run as `snapshot_pending` and returns HTTP 202.

Complete an existing snapshot without starting another Bright Data collection:

```bash
curl "$AGENCY_URL/api/abundance/public-jobs" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "bright_data",
    "snapshot_id": "snap_example",
    "wait_for_snapshot": true,
    "snapshot_timeout_ms": 180000
  }'
```

The snapshot download path retries HTTP 202 download responses because Bright Data can report snapshot metadata as `ready` before the content endpoint is downloadable.

## Secrets

Keep provider credentials outside repo files.

Expected runtime values:

- `AGENCY_INTERNAL_API_KEY`
- `BRIGHT_DATA_API_TOKEN`
- `ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID` or `BRIGHT_DATA_JOBS_DATASET_ID`
- `ABUNDANCE_MCP_BEARER_TOKEN`
- `ACTIVE_JOBS_RAPIDAPI_HOST`
- `ACTIVE_JOBS_RAPIDAPI_KEY`

Suggested Infisical path:

```text
/abundance/jobs
```

Observed Infisical state:

- `/abundance/jobs` exists.
- `/abundance/jobs` has `BRIGHT_DATA_API_TOKEN`, copied from the existing `/kickstand` token.
- `/abundance/jobs` has `ABUNDANCE_BRIGHT_DATA_JOBS_DATASET_ID` set to the Bright Data `Indeed job listings information` dataset.
- `/active-jobs-mcp` has `ACTIVE_JOBS_MCP_API_KEY`, `ACTIVE_JOBS_RAPIDAPI_HOST`, and `ACTIVE_JOBS_RAPIDAPI_KEY`.
- On 2026-06-03, direct read-only RapidAPI probes for `/active-ats-7d` and `/modified-ats-24h` returned HTTP 200 with fresh nursing job records.
- `/active-ats-expired` returned HTTP 200 but exceeded a 512 KB capped read even with `limit=10`, nursing/location filters, and a date filter; keep it manual/probed until pagination and filtering are bounded.

Operationally, use RapidAPI Active Jobs for delivery refreshes and keep Bright Data as a provider-compatible fallback.

## RapidAPI Worker Refresh

The source-controlled Jobs MCP Worker exposes the stable Dify tool surface at:

```text
https://abundance-jobs-mcp.createsomething.workers.dev/mcp
```

It also exposes an authenticated operator endpoint:

```bash
curl "$ABUNDANCE_JOBS_MCP_URL/admin/ingest/rapidapi" \
  -H "Authorization: Bearer $ABUNDANCE_MCP_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title_filter": "nurse",
    "location_filter": "United States",
    "limit": 100,
    "endpoints": ["/active-ats-7d", "/modified-ats-24h"]
  }'
```

The endpoint writes normalized `provider=rapidapi` rows into `abundance_public_jobs` and records a row in `abundance_public_job_ingestion_runs`.

Do not schedule `/active-ats-expired` until the provider returns bounded responses for filtered requests. The Worker exposes `/admin/probe/rapidapi-expired` for capped operator checks, but expired job ingestion should stay disabled unless the response shape is proven safe.

## Live Smoke

Executed on 2026-05-22 with Infisical `/abundance/jobs` and `records_limit=1`:

- `job_title includes Nurse` with `date_posted_parsed >= 2025-01-01T00:00:00.000Z` completed as snapshot `snap_mphhnt5z1pr6awm4et` with zero records.
- A date-only smoke with `date_posted_parsed >= 2025-01-01T00:00:00.000Z` completed as snapshot `snap_mphhuhkk1c1cqx8om1` and downloaded one normalized Indeed record.
- The downloaded sample normalized to `source_system=indeed_jobs`, `status=open`, title `Controls & Robotic Specialist - Vehicle Process Engineering`, employer `Stellantis`, location `Auburn Hills, MI 48326`.

The normalizer maps Bright Data Indeed `is_expired=true` records to `status=expired`; expired listings should remain stored for provenance but should not be sent into the active Abundance funnel unless explicitly requested.

## Handoff

The remote `abundance-jobs-mcp` reads from `abundance_public_jobs` through the source-controlled Worker package. Keep Dify tool names stable when refreshing or redeploying the Worker.
