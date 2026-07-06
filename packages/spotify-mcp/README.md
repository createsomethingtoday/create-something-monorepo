# Spotify MCP

Governed Spotify MCP wrapper over RapidAPI for Dify agents and other MCP clients.

This package keeps the current Dify Spotify tool surface intact while moving the execution path under CREATE SOMETHING control:

- Dify or another customer client calls `/mcp`.
- The Worker validates the MCP API key and records the request account.
- The MCP tool calls RapidAPI with `SPOTIFY_RAPIDAPI_KEY` or `RAPIDAPI_KEY`.
- `@create-something/mcp-core` records D1 telemetry and optional Langfuse traces.

Langfuse can execute evals and Langfuse-hosted functions, but in this integration it is the observability and evaluation layer, not the primary customer job runner. Customers should run production jobs through the Dify API or the MCP endpoint; Langfuse should run regression evals, experiments, review workflows, and trace analysis against those same surfaces unless we explicitly productize a Langfuse-backed job API.

## Runtime

Worker package: `packages/spotify-mcp/worker`

Required secrets:

- `SPOTIFY_MCP_API_KEY` or `MCP_API_KEY`
- `SPOTIFY_RAPIDAPI_KEY` or `RAPIDAPI_KEY`

Optional telemetry secrets:

- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_PROJECT_NAME`

Optional provider config:

- `SPOTIFY_RAPIDAPI_HOST` defaults to `spotify23.p.rapidapi.com`
- `SPOTIFY_RAPIDAPI_BASE_URL` defaults to `https://${SPOTIFY_RAPIDAPI_HOST}`
- `SPOTIFY_RAPIDAPI_TIMEOUT_MS` defaults to `30000`
- `SPOTIFY_RAPIDAPI_MAX_RESPONSE_BYTES` defaults to `262144`

## Deployment

```bash
pnpm --filter @create-something/spotify-mcp typecheck
pnpm --filter spotify-mcp-worker typecheck
pnpm --dir packages/spotify-mcp/worker exec wrangler deploy
```

Set Worker secrets through Infisical or Wrangler before live deploy. Do not commit provider keys.

## Dify Migration

The tool names intentionally match the imported RapidAPI-backed Dify provider:

- `Artist_discography_overview`
- `Track_lyrics`
- `Genre_View`
- `Get_playlist`
- `Get_radio_playlist`
- `Artist_appears_on`
- `Get_tracks`
- `Get_albums`
- `Get_artists`
- `Get_Episode`
- `User_followers`
- `Artist_related`
- `User_profile`
- `Playlist_tracks`
- `Artist_singles`
- `Explore`
- `Album_tracks`
- `Track_recommendations`
- `Search`
- `Get_Concert`
- `Album_metadata`
- `Artist_albums`
- `Artist_overview`
- `Track_credits`
- `Concerts`
- `Podcast_Episodes`
- `Episode_Sound`
- `Artist_featuring`
- `Artist_discovered_on`

Once deployed, add a Dify MCP card pointing at `/mcp`, then republish the Spotify Dify agent with this server enabled instead of the Dify marketplace RapidAPI server.
