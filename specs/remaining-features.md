# Remaining Features

## Overview

Complete the three remaining open issues in the CREATE SOMETHING monorepo.

## Features

### Are.na Channel Contribution Pathway
Status: paused.

Do not add blocks to Are.na channels from CREATE SOMETHING properties. Are.na
remains the human curation surface; `.ltd` should sync approved channel contents
and turn them into agent/client context. See
`docs/guides/ARENA_TASTE_INTEGRATION.md`.
- Support image URLs, text blocks, and link blocks

### Apply Plugin Catalog Pattern to LMS
Apply the plugin marketplace pattern to the LMS: treat learning modules as installable units.
- Create module manifest format (similar to plugin.json)
- Add /modules route to LMS with catalog view
- Create ModuleCard component matching PluginCard design
- Add module install/enable tracking per user
- Reuse category filtering pattern from plugins page

### Add Newsletter Bounce Handling Webhook
Implement webhook endpoint to handle email bounces from newsletter service.
- Create POST /api/newsletter/webhooks/bounce endpoint
- Parse bounce event payload (hard bounce vs soft bounce)
- Update subscriber status in D1 database
- Add bounce_count and last_bounce_at fields to subscribers table
- Auto-unsubscribe after 3 hard bounces

### Verification
Confirm all features work correctly.
- Build succeeds for all affected packages
- API endpoints return correct responses
- Database migrations applied successfully
