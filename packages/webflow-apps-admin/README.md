# Webflow Apps Admin

Tools for Webflow Apps Marketplace administration. Includes console scripts for auditing app listings, with plans to grow into a browser extension.

## Overview

This package provides tooling for the **Webflow Apps Marketplace** admin interface at `https://webflow.com/apps`. It helps the team:

- Audit app listings for duplicate Client IDs
- Identify misconfigured apps
- Track workspace ownership
- Generate compliance reports

## Console Scripts

Scripts designed to run in the browser console while logged into the Webflow Apps admin.

### Client ID Audit

Scans all apps in the Webflow Marketplace to detect duplicate Client IDs.

**Usage:**
1. Log in to Webflow (via Okta)
2. Navigate to `https://webflow.com/apps`
3. Open DevTools Console (F12 → Console)
4. Copy/paste the script from `src/console/client-id-audit.js`
5. Press Enter to run

**What it does:**
1. Clicks "Show more" until all apps are loaded
2. Fetches each app's edit page (`/apps/detail/{slug}/edit`)
3. Extracts `clientId` and `workspaceId` from the form
4. Groups apps by Client ID to find duplicates
5. Highlights cross-workspace duplicates (high risk)

**Output:**
- Console summary with duplicate groups
- `window.clientIdResults` — Full results object
- `downloadReport()` — Downloads JSON audit file

**Key Selectors:**
| Element | Selector |
|---------|----------|
| Load More Button | `[data-automation-id="collection-list-load-more"]` |
| App Links | `a[href^="/apps/detail/"]` |
| Client ID Input | `#clientId` |
| Workspace ID Input | `#workspaceId` |
| Edit Button | `a[data-automation-id="edit-app-button"]` |

## Directory Structure

```
webflow-apps-admin/
├── src/
│   ├── console/           # Browser console scripts
│   │   └── client-id-audit.js
│   ├── extension/         # Future: Chrome extension
│   │   ├── manifest.json
│   │   ├── popup/
│   │   ├── background/
│   │   └── content/
│   └── shared/            # Shared utilities & types
├── reports/               # Audit reports
│   ├── webflow-apps-audit-2026-01-26.json
│   └── webflow-apps-audit-2026-01-26.md
└── README.md
```

## Reports

### 2026-01-26 Audit Summary

| Metric | Value |
|--------|-------|
| Total Apps | 590 |
| Unique Client IDs | 572 |
| Duplicate Groups | 8 |
| Apps with Duplicates | 26 |

**Critical Finding:** One Client ID (`bf25dd81...`) is shared across 11 apps in 8 different workspaces — likely a placeholder ID from documentation.

See `reports/webflow-apps-audit-2026-01-26.md` for full analysis.

## Future: Browser Extension

The console scripts will evolve into a browser extension with:

- [ ] One-click Client ID audit from toolbar
- [ ] Real-time duplicate detection warnings on app cards
- [ ] Badge showing duplicate count
- [ ] Workspace management dashboard
- [ ] App submission validation
- [ ] Bulk operations support

## Related Packages

- `@create-something/webflow-mcp` — MCP server for plagiarism detection
- `@create-something/webflow-dashboard` — Dashboard for Webflow management
