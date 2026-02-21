# Webflow Automation

Airtable automation scripts and worker services for Webflow integrations.

## Overview

This package now has two automation surfaces:

1. Airtable-native scripts for existing Mongo workflows.
2. Cloudflare Worker-based partner onboarding sync for Slack -> Airtable -> Codex -> Slack thread loop.

## Structure

```
webflow-automation/
├── airtable-scripts/                  # Scripts that run IN Airtable
│   ├── experts-sync.js                # Syncs Expert profiles to Mongo
│   └── epp-enrollment.js              # Handles EPP enrollment workflow
├── worker/                            # Cloudflare Worker for partner onboarding sync
│   ├── src/
│   │   ├── index.ts                   # HTTP handlers
│   │   ├── parser.ts                  # Slack raw text parser
│   │   ├── airtable.ts                # Airtable upsert/transition logic
│   │   ├── retry.ts                   # Retry + backoff policy
│   │   └── types.ts                   # Shared types and state machine
│   ├── tests/
│   ├── package.json
│   └── wrangler.toml
├── docs/
│   ├── partner-onboarding-sync.md     # Two-way sync contract and runbook
│   ├── airtable-setup.md
│   ├── deployment.md
│   └── api-endpoints.md
└── shared/                            # Shared TS references for legacy scripts
```

## Partner Onboarding Sync

Detailed setup and operations:

- `docs/partner-onboarding-sync.md`

### Worker endpoints

- `GET /health`
- `POST /onboarding/ingest`
- `POST /onboarding/transition`
- `POST /onboarding/outbound-payload`

### Worker development

```bash
cd packages/webflow-automation/worker
pnpm install
pnpm run typecheck
pnpm run test
pnpm run dev
```

## Existing Airtable Scripts

### Experts Sync (`airtable-scripts/experts-sync.js`)

Syncs Expert profiles from Airtable to Webflow's Mongo backend.

### EPP Enrollment (`airtable-scripts/epp-enrollment.js`)

Processes Expanded Partner Program enrollment form submissions.

## Related Packages

- `webflow-dashboard` - SvelteKit dashboard for creators
- `webflow-components` - React components for Webflow sites
