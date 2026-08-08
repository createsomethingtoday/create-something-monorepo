# Authentication and access

## Transport token delivery

The plugin declares the remote MCP through an environment-delivered bearer token:

```json
{
  "type": "http",
  "url": "https://zendesk-mcp.createsomething.workers.dev/mcp",
  "bearer_token_env_var": "ZENDESK_MCP_API_KEY"
}
```

Codex reads `ZENDESK_MCP_API_KEY` from its process environment. Store the value in Infisical or another approved secret manager and inject it into the process that launches Codex. Never put the value in the plugin, repository files, `.env` files committed to Git, prompts, screenshots, logs, shell history, test fixtures, or Linear comments.

The transport token authenticates Codex to the MCP Worker. It is distinct from the Zendesk service credentials stored in the Worker environment. Plugin users must never receive or handle `WEBFLOW_ZENDESK_API_TOKEN`, `WEBFLOW_ZENDESK_PASSWORD`, or `WEBFLOW_ZENDESK_OAUTH_TOKEN`.

## Diagnostic order

1. Confirm that `ZENDESK_MCP_API_KEY` is present without printing its value.
2. Confirm `https://zendesk-mcp.createsomething.workers.dev/health` returns HTTP 200.
3. Start a fresh Codex task after plugin activation or token-environment changes.
4. Call `zendesk_health` through the plugin MCP.
5. Search or read one exact authorized ticket without writing.
6. If access fails, distinguish transport authentication from Zendesk account permissions and ticket visibility.

Do not probe possible tokens, paste credentials into an Authorization header shown in task output, or bypass transport authentication with undocumented query parameters.

## Revocation and rollback

Disable or remove the plugin to stop client discovery. Revoke or replace `ZENDESK_MCP_API_KEY` at the Worker boundary when transport access must be invalidated. Credential revocation does not reverse ticket updates already made through the MCP.
