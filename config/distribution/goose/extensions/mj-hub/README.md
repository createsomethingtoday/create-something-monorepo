# MJ Hub Goose Bridge

This package configures Goose Desktop around the authenticated MJ hub lane:

- MCP URL: `https://mj.mcp.createsomething.agency/mcp`
- Bearer token secret: `CS_HUB_MJ_API_TOKEN`
- Token source: Infisical

Design rule:

- Goose should not store the MJ bearer token in its own config.
- The Goose extension should launch through `infisical run` so the token is injected at process start.
- The local bridge then forwards Goose tool calls to the MJ hub over authenticated Streamable HTTP.

Local desktop flow:

1. Build and export the Goose bundle:

   ```bash
   pnpm distribution:goose:export -- --artifact mj-hub-extension
   ```

2. Open the generated bundle README under `.goose-bundles/mj-hub-extension/README.md`.

3. In Goose Desktop, add a **Command-line Extension** using the exported command. It will look like:

   ```bash
   infisical run --env=prod --path=/ -- node /ABSOLUTE/PATH/TO/.goose-bundles/mj-hub-extension/packages/playbook-mcp/dist/goose-mcp-bridge.js --url https://mj.mcp.createsomething.agency/mcp --bearer-env-var CS_HUB_MJ_API_TOKEN --server-name mj-hub
   ```

4. If Infisical is not already authenticated, run:

   ```bash
   infisical login --interactive
   ```

5. Start Goose and verify the bridge by calling `hub_status` or `hub_list_proxy_tools`.

Notes:

- The bridge reads `CS_HUB_MJ_API_TOKEN` from the process environment first.
- If the variable is absent, the bridge falls back to `infisical export` using `INFISICAL_ENV`, `INFISICAL_PATH`, and `INFISICAL_PROJECT_ID` if they are set.
- No bearer token is stored in this repo or in the generated bundle.
