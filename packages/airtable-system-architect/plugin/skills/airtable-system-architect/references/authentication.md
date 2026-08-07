# Authentication and access

## PAT delivery

The plugin declares:

```json
{
  "type": "http",
  "url": "https://mcp.airtable.com/mcp",
  "bearer_token_env_var": "AIRTABLE_API_TOKEN"
}
```

Codex reads the value from the environment at runtime. `AIRTABLE_API_TOKEN` is the existing CREATE SOMETHING secret name; its value is an Airtable PAT. The plugin never contains the token value.

Store the PAT in Infisical or another approved secret manager. Inject it into the process that launches Codex. Do not place it in `.env` files committed to a repository, plugin JSON, task prompts, screenshots, shell history, test fixtures, logs, or Linear comments.

## Required scopes

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write`
- `data.recordComments:read`
- `data.recordComments:write`
- `workspacesAndBases:read`

Scopes are necessary but not sufficient. The PAT also needs the intended resource grants, and the owning Airtable user needs the Airtable permission required by the operation.

## Diagnostic order

1. Confirm that `AIRTABLE_API_TOKEN` is present without printing its value.
2. Call `ping`.
3. Call `list_workspaces` or `list_bases`.
4. Confirm the intended base appears.
5. Confirm the user permission and token resource grant.
6. Confirm field/table permissions for the exact target.
7. Only then diagnose the requested write tool.

An empty base list can reflect an organization API restriction or missing resource grant. Do not respond by widening the PAT to all resources without operator approval.

## OAuth alternative

Airtable recommends OAuth for interactive use. A manual Codex connection can use:

```toml
[mcp_servers.airtable]
url = "https://mcp.airtable.com/mcp"
```

and then authenticate through Codex. Do not configure OAuth and PAT versions of the same server simultaneously unless the client makes their identities unambiguous.

## Revocation

Disable the plugin, remove the MCP entry, and revoke or narrow the PAT in Airtable's developer hub. Revoking a PAT does not reverse Airtable changes already made with it.
