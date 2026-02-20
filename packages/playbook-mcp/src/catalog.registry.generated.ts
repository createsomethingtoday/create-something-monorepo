/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: config/mcp-hub/registry.json
 * Regenerate with: pnpm mcp:registry:generate
 */

export const REGISTRY_CATALOG_ENTRIES = [
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
