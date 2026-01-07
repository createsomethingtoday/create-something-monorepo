# Webflow Automation

Airtable automation scripts and shared utilities for Webflow integrations with Mongo APIs.

## Overview

This package contains automation scripts that run inside Airtable to sync data between Airtable bases and Webflow's Mongo backend APIs. Scripts are triggered by record changes in Airtable and make authenticated API calls to create/update profiles and handle enrollment workflows.

## Structure

```
webflow-automation/
├── airtable-scripts/          # Scripts that run IN Airtable
│   ├── experts-sync.js        # Syncs Expert profiles to Mongo
│   └── epp-enrollment.js      # Handles EPP enrollment workflow
├── shared/                    # Shared utilities (for reference/testing)
│   ├── validators.ts          # Validation helpers
│   ├── api-helpers.ts         # API call patterns
│   └── types.ts               # TypeScript types
└── docs/                      # Documentation
    ├── airtable-setup.md      # Base configuration
    ├── deployment.md          # How to deploy scripts
    └── api-endpoints.md       # Mongo API documentation
```

## Scripts

### Experts Sync (`experts-sync.js`)

Syncs Expert profiles from Airtable to Webflow's Mongo backend.

**Trigger:** Record update in Experts table  
**Environment:** Production/Acceptance  
**API Endpoint:** `/api/v1/marketplace/profile`  
**Methods:** POST (create), PUT (update)

### EPP Enrollment (`epp-enrollment.js`)

Processes Expanded Partner Program enrollment form submissions.

**Trigger:** New record in EPP Enrollment table  
**Workflow:**
1. Validate workspace slug format
2. Call Mongo API to enroll workspace
3. Handle errors (send email if invalid slug)
4. Report results to Iterable and Marketo
5. Log response in Airtable

## Deployment

1. Open Airtable base → Automations tab
2. Create new automation or edit existing
3. Set trigger (e.g., "When record created")
4. Add "Run script" action
5. Copy/paste script from `airtable-scripts/`
6. Configure input variables
7. Test and activate

See `docs/deployment.md` for detailed instructions.

## Environment Variables

Scripts use Airtable's "secrets" feature for sensitive values:

- `apiKeyAcceptance` - Acceptance environment API key
- `apiKeyProduction` - Production environment API key
- `baseURLAcceptance` - Acceptance API base URL
- `baseURLProduction` - Production API base URL

## Development

These scripts are written in plain JavaScript for Airtable's runtime. The `shared/` directory contains TypeScript utilities for reference and local testing only.

## Related Packages

- `webflow-dashboard` - SvelteKit dashboard for creators
- `webflow-components` - React components for Webflow sites

