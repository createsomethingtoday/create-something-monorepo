/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: config/mcp-hub/registry.json
 * Regenerate with: pnpm mcp:registry:generate
 */

export const REGISTRY_CATALOG_ENTRIES = [
  {
    "name": "Bettermode Creator",
    "slug": "bettermode-creator",
    "url": "https://bettermode-creator.mcp.createsomething.agency",
    "description": "Bettermode Marketplace Creator drafting MCP — read-only Bettermode + Airtable + community queue helpers consumed by the Dify drafter agent.",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "CREATE SOMETHING Content",
    "slug": "create-something",
    "url": "https://mcp.createsomething.ltd",
    "description": "CREATE SOMETHING content MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": false
  },
  {
    "name": "Hydra DB Recall",
    "slug": "hydra-db-recall",
    "url": "https://hydra-db-recall-mcp.createsomething.workers.dev",
    "description": "CREATE SOMETHING governed read-only HydraDB recall wrapper with D1 and Braintrust telemetry",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Outerfields PCN",
    "slug": "outerfields",
    "url": "https://outerfields.mcp.createsomething.agency",
    "description": "OUTERFIELDS remote MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": false
  },
  {
    "name": "Playbook",
    "slug": "playbook",
    "url": "https://playbook.mcp.createsomething.ltd",
    "description": "Workflow playbooks MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": false
  },
  {
    "name": "Schedule",
    "slug": "schedule",
    "url": "https://schedule.mcp.createsomething.agency",
    "description": "Scheduling MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": false
  },
  {
    "name": "Spotify",
    "slug": "spotify",
    "url": "https://spotify-mcp.createsomething.workers.dev",
    "description": "CREATE SOMETHING governed Spotify MCP wrapper over RapidAPI with D1 and Braintrust telemetry",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Substrate",
    "slug": "substrate",
    "url": "https://substrate.mcp.createsomething.agency",
    "description": "Substrate execution/storage MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Three-Tier Framework",
    "slug": "three-tier-framework",
    "url": "https://framework.mcp.createsomething.agency",
    "description": "Three-Tier Framework MCP",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": false
  },
  {
    "name": "Webflow App Review",
    "slug": "webflow-app-review",
    "url": "https://webflow-app-review-mcp.createsomething.workers.dev",
    "description": "Webflow App Review MCP for app asset, version, and governance database workflows",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Webflow Template Review",
    "slug": "webflow-template-review",
    "url": "https://webflow-template-review-mcp.createsomething.workers.dev",
    "description": "Webflow Template Review MCP for template asset and version workflows",
    "category": "create-something",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Webflow Zendesk",
    "slug": "webflow-zendesk",
    "url": "https://zendesk-mcp.createsomething.workers.dev",
    "description": "Zendesk MCP for Webflow asset reviewer ticket search, comments, and status workflows",
    "category": "create-something",
    "transports": [
      "http"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "YouTube Transcript Notion",
    "slug": "youtube-transcript-notion",
    "url": "https://youtube-transcript-notion-mcp.createsomething.workers.dev",
    "description": "YouTube transcript extraction and Notion transcript enrichment MCP used by Dify client agents",
    "category": "create-something",
    "transports": [
      "http"
    ],
    "requiresAuth": true,
    "authType": "bearer"
  },
  {
    "name": "Gmail Sync",
    "slug": "gmail-sync",
    "url": "https://gmail.mcp.workway.co",
    "description": "Half Dozen Gmail sync MCP (Danny)",
    "category": "workway",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true
  },
  {
    "name": "QuickBooks Notion Sync",
    "slug": "quickbooks-notion",
    "url": "https://quickbooks.mcp.workway.co",
    "description": "QuickBooks to Notion MCP server",
    "category": "workway",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true,
    "authType": "oauth"
  },
  {
    "name": "YouTube Sync",
    "slug": "youtube-sync",
    "url": "https://youtube.mcp.workway.co",
    "description": "Half Dozen YouTube sync MCP",
    "category": "workway",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true
  },
  {
    "name": "Zoom Sync",
    "slug": "zoom-sync",
    "url": "https://zoom.mcp.workway.co",
    "description": "Half Dozen Zoom sync MCP",
    "category": "workway",
    "transports": [
      "http",
      "sse"
    ],
    "requiresAuth": true
  }
] as const;
