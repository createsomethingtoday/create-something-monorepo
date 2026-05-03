# Dify Agent Imports

This directory stores Dify DSL files that can be imported into Studio.

`registry.json` is the non-secret registry for Dify apps and hubs. API keys stay in
Infisical and are referenced by environment, path, and secret key name only.

Validate the registry and live Dify app keys with:

```bash
pnpm dify:registry:validate
```

## Active Jobs

Import `active-jobs.yml` into Dify after the workspace MCP server below is authorized:

- Server ID: `active-jobs`
- Display name: `Active Jobs DB`
- URL: `https://active-jobs-mcp.createsomething.workers.dev/mcp`

The YAML intentionally stores no secrets. Dify resolves the MCP tools from the workspace server card, so keep the server ID stable. The app API key is referenced in `registry.json` at `prod:/dify/active-jobs-agent:DIFY_ACTIVE_JOBS_AGENT_API_KEY`.

The Active Jobs app is an agent-chat app that must be called with Dify streaming mode:

```json
{
  "response_mode": "streaming"
}
```

The expected answer contract for job listings is: title, organization, location, source, posted/indexed/modified timing, application URL, and salary or remote signals when present. Broad requests that omit both role/title and location should ask a follow-up before calling the MCP tools. Provider quota or subscription-limit responses should be stated clearly and should offer a narrower or alternate search.

Run the live evals with:

```bash
pnpm braintrust:eval:dify:active-jobs
infisical run --env=prod --path=/active-jobs-mcp -- pnpm braintrust:eval:mcp:active-jobs-telemetry
```

These evals call the live Active Jobs provider. Run them only when RapidAPI quota is available.

## LinkedIn

Import `linkedin.yml` into Dify after the workspace MCP server below is authorized:

- Server ID: `linkedin`
- Display name: `LinkedIn Data API`
- URL: `https://linkedin-mcp.createsomething.workers.dev/mcp`

The YAML intentionally stores no secrets. Dify resolves the MCP tools from the workspace server card, so keep the server ID stable. Add the LinkedIn Dify app to `registry.json` only after the imported app has a Dify API key stored in Infisical.

The LinkedIn Research app API key is referenced in `registry.json` at `prod:/dify/linkedin-agent:DIFY_LINKEDIN_AGENT_API_KEY`.
