# Agency property journey study

This is a reusable, local-only MatrAIx evaluation pattern for an Agency reader
journey. It tests the sequence of route decisions and handoffs, not a real
conversion. The initial journey is the core spine:

```text
/ -> /services -> /map
```

The journey manifest comes from `src/lib/data/marketingPages.ts`, so route
intent, primary action, required terms, and required links stay route-owned.

## Safety boundary

- Read-only task-owned `agency-bridge` URLs only.
- Every candidate must affirm that its route contract is preserved and provide
  a distinct reviewed content fingerprint.
- No form submission, booking/calendar action, payment, CRM or analytics write,
  external browser navigation, or production deployment.
- Results are qualitative synthetic signals. They are not conversion, demand,
  or human-research metrics.

## Inspect the journey contract

```bash
node --import tsx evals/property-journey-study/print-journey.mjs --journey core-spine
```

## Candidate file

Create this outside the repository beside the disposable MatrAIx checkout. A
candidate URL must render the reviewed content variant; a query parameter alone
is not evidence of a different candidate.

```json
{
  "journey_id": "core-spine",
  "candidates": [
    {
      "candidate_id": "baseline",
      "content_fingerprint": "reviewed-source-or-render-hash",
      "contract_preserved": true,
      "routes": [
        { "path": "/", "url": "http://agency-bridge:8080/" },
        { "path": "/services", "url": "http://agency-bridge:8080/services" },
        { "path": "/map", "url": "http://agency-bridge:8080/map" }
      ]
    }
  ]
}
```

At least two candidates with distinct route URLs and content fingerprints are
required before the runner or aggregator will report a winner.

## Run a study

```bash
node --import tsx evals/property-journey-study/run-study.mjs \
  --matraix-root /absolute/path/to/MatrAIx-Persona-8B \
  --jobs-dir /absolute/path/to/jobs \
  --candidates-file /absolute/path/to/candidates.json

node --import tsx evals/property-journey-study/aggregate-study.mjs \
  --job-dir /absolute/path/to/jobs/cre-1765-local-property-journey-core-spine \
  --candidates-file /absolute/path/to/candidates.json \
  --output-dir /absolute/path/to/report
```

The runner uses a disposable MatrAIx checkout and copies no credentials into
this repository. Review a reported winner before any public route change.
