# Webflow Reviewer Exceptions MCP

Standalone read/write MCP for reviewer exception memory.

This service is intentionally separate from `webflow-template-review-mcp` and `webflow-app-review-mcp`. It gives template-review agents a small AI-native surface for creating, updating, deleting, publishing, unpublishing, and retrieving reviewer exceptions without changing official review status.

## Production

- MCP URL: `https://webflow-reviewer-exceptions-mcp.createsomething.workers.dev/mcp`
- Dify External Knowledge URL: `https://webflow-reviewer-exceptions-mcp.createsomething.workers.dev/retrieval`
- Knowledge ID: `reviewer-exceptions`
- Airtable base: `appXfYXnivsUT1kLg`
- Airtable table: `tblqkbW0SptshgPiw`
- Secrets: Infisical `prod:/webflow-reviewer-exceptions-mcp`

## Tools

- `reviewer_exceptions_health`
- `reviewer_exceptions_get_field_map`
- `reviewer_exceptions_list`
- `reviewer_exceptions_create`
- `reviewer_exceptions_update`
- `reviewer_exceptions_delete`
- `reviewer_exceptions_preview_knowledge`

Create, update, and delete are write-capable. Use delete only after listing or searching to confirm the Airtable record ID. To make an exception immediately available to Dify retrieval, set:

```json
{
  "knowledge_status": "Active",
  "include_in_dify_retrieval": true
}
```

The retrieval endpoint only returns records where:

- `Include in Dify Retrieval` is true
- `Knowledge Status` is `Approved` or `Active`
- `Expires At` is blank or not expired

## Local

```bash
pnpm --filter @create-something/webflow-reviewer-exceptions-mcp build
pnpm --filter @create-something/webflow-reviewer-exceptions-mcp test
```

Required env for stdio:

```bash
AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY=...
AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID=appXfYXnivsUT1kLg
AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID=tblqkbW0SptshgPiw
```

## Worker Deploy

```bash
cd packages/webflow-reviewer-exceptions-mcp/worker
pnpm deploy
```

Worker secrets:

- `MCP_API_KEY`
- `AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY`
- `DIFY_EXTERNAL_KNOWLEDGE_API_KEY`

Template-review Hub Workers also need the downstream bearer as:

- `WEBFLOW_REVIEWER_EXCEPTIONS_MCP_API_KEY`
