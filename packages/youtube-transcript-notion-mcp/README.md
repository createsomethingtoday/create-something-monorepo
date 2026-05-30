# @create-something/youtube-transcript-notion-mcp

Remote MCP server for Notion-first YouTube transcript enrichment with a Supadata primary path, direct/browser fallbacks, and operator-managed Notion sync.

## What It Exposes

| Tier       | Primitive | Surface                                                                                                      |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| Database   | Resources | `youtube://status`, `youtube://video/{id}/transcript`                                                        |
| Automation | Tools     | `extract_transcript`, `enrich_notion_page`, `sync_video_to_notion`, `get_database_schema`, `search`, `fetch` |
| Judgment   | Prompts   | `transcript_analysis`                                                                                        |

## Runtime Model

- **Read-first transcript flow**: when `SUPADATA_API_KEY` is configured, the server tries Supadata first. If Supadata fails, the runtime continues into the existing direct/browser chain. The direct/browser chain itself can run in `auto` mode (direct transcript fetch first, then Steel) or `browser-first` mode when the runtime should skip server-side direct extraction.
- **Write path**: the primary workflow is `enrich_notion_page`, which reads a YouTube URL or video ID from an existing Notion page/database item and updates that same page in place. `sync_video_to_notion` remains available when the caller starts from a YouTube URL and wants database upsert-by-video instead.
- **Playlist code path**: playlist polling logic still exists internally, but it is not exposed in the current MCP surface while `YOUTUBE_DATA_API_KEY` is out of scope operationally.
- **Remote-first transport**: Cloudflare Worker entrypoint exposes `/mcp` and `/sse`.

## Environment

| Variable                       | Required                                                     | Purpose                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTION_API_KEY`               | for Notion tools                                             | Operator-managed Notion integration token                                                                                                                     |
| `NOTION_DATABASE_ID`           | optional                                                     | Default Notion database/data source ID                                                                                                                        |
| `NOTION_PROPERTY_MAPPING_JSON` | optional                                                     | Default property mapping override                                                                                                                             |
| `SUPADATA_API_KEY`             | optional, recommended for production                         | Hosted transcript provider that avoids most YouTube session-trust failures                                                                                    |
| `SUPADATA_TRANSCRIPT_MODE`     | optional                                                     | `native` (default), `auto`, or `generate`; `native` keeps behavior closest to the original MCP and avoids AI-generated transcripts unless you opt in          |
| `STEEL_API_KEY`                | optional                                                     | Enables browser fallback when direct transcript extraction fails                                                                                              |
| `STEEL_PROFILE_ID`             | optional, strongly recommended for YouTube                   | Reuses a persistent Steel profile so browser fallback is less likely to hit sign-in or anti-bot checks                                                        |
| `YOUTUBE_TRANSCRIPT_LANGUAGE`  | optional                                                     | Default transcript language, defaults to `en`                                                                                                                 |
| `YOUTUBE_DIRECT_PROVIDER_MODE` | optional                                                     | `auto` (default) or `browser-first`; the deployed Worker uses `browser-first` because Cloudflare fetches are currently rate-limited on YouTube watch surfaces |
| `MCP_BEARER_TOKEN`             | optional, strongly recommended for public/shared deployments | Simple bearer protection for remote MCP endpoints                                                                                                             |

To sync runtime secrets from Infisical into the deployed Worker, use:

```bash
pnpm mcp:youtube-transcript-notion:vault:sync
```

This reads the canonical Infisical path `/youtube-transcript-notion-mcp` in `prod` by default and writes Cloudflare Worker secrets via `wrangler secret put`.

For the deployed Worker, the recommended operator order is:

1. Configure `SUPADATA_API_KEY`.
2. Keep `SUPADATA_TRANSCRIPT_MODE=native` unless you explicitly want generated transcripts when native captions are missing.
3. Set `MCP_BEARER_TOKEN` before exposing the remote MCP anywhere public or shared.
4. Treat Steel as a fallback path, not the primary production path.
5. Ignore the dormant `YOUTUBE_*PLAYLIST*` variables unless you intentionally re-enable the internal playlist path later.

If `STEEL_API_KEY` is set without `STEEL_PROFILE_ID`, `youtube://status` reports a config warning because anonymous Steel sessions are more likely to trigger YouTube trust gates. The recommended operator path is to attach a persistent Steel profile and, if needed, sign in to YouTube once inside that profile.

If `SUPADATA_API_KEY`, `STEEL_API_KEY`, or `NOTION_API_KEY` are configured without `MCP_BEARER_TOKEN`, `/health` and `youtube://status` now report explicit warnings because unauthenticated callers could consume billable transcript capacity or invoke Notion-backed tools.

## Primary Notion Workflow

- A user or agent creates or selects a Notion database item/page that already contains a YouTube URL, short URL, or raw video ID.
- `enrich_notion_page` reads that reference from page properties first, then falls back to page content if needed.
- The tool extracts transcript + metadata and rewrites the transcript section on that same page instead of creating a second record.
- `sync_video_to_notion` remains useful when the caller starts from a YouTube URL and wants the MCP to dedupe/create the matching Notion row.
- Notion write tools require `confirmed=true`; callers must ask for explicit user confirmation before passing that input.

## Dormant Playlist Path

- The playlist sync code remains in the package for future re-enable work, but it is not part of the live MCP tool surface.
- The Worker cron is still safe because it exits immediately unless `YOUTUBE_DATA_API_KEY` and `YOUTUBE_PLAYLIST_ID` are configured.
- This keeps the current operator model simpler: Notion page or direct video URL in, transcript enrichment out.

## Agent Legibility Contract

| Field               | Value                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point         | `README.md`, `worker/index.ts`, `src/tools.ts`                                                                                                                                              |
| Boot command        | `pnpm --filter youtube-transcript-notion-mcp-worker dev`                                                                                                                                    |
| Smoke command       | `pnpm --filter @create-something/youtube-transcript-notion-mcp test && pnpm --filter @create-something/youtube-transcript-notion-mcp typecheck`                                             |
| Validation surfaces | vitest output, typecheck output, Worker health JSON at `/`, MCP Inspector against `/mcp`, remote Worker logs/telemetry                                                                      |
| UI validation path  | none                                                                                                                                                                                        |
| Escalation rule     | Stop if direct extraction fails, Steel fallback is unavailable, and the target workflow depends on a live transcript or Notion credentials that are not present in the current environment. |

## Local Workflow

```bash
pnpm install
pnpm --filter @create-something/youtube-transcript-notion-mcp test
pnpm --filter @create-something/youtube-transcript-notion-mcp typecheck
pnpm --filter youtube-transcript-notion-mcp-worker dev
```

After the Worker is running, connect MCP Inspector to `http://127.0.0.1:8787/mcp`.

For a non-Cloudflare local MCP that runs over stdio and tries the direct provider first, use:

```bash
pnpm mcp:youtube-transcript-notion:stdio:auto
```

That keeps the deployed Worker in `browser-first` mode while giving local or other non-Cloudflare runtimes an `auto` path. The stdio entrypoint loads env from `packages/youtube-transcript-notion-mcp/.env.local`, `packages/youtube-transcript-notion-mcp/.env`, then falls back to repo-root `.env.local` and `.env`.

To run a real local MCP smoke against `extract_transcript` on the sample video:

```bash
pnpm mcp:youtube-transcript-notion:smoke:auto
```

To run the same local smoke with production-backed secrets from Infisical:

```bash
pnpm mcp:youtube-transcript-notion:smoke:auto:infisical
```

That command reads `.infisical.json` for the workspace ID by default, injects the canonical `/youtube-transcript-notion-mcp` `prod` secrets, and then runs the local stdio smoke in `auto` mode. With `SUPADATA_API_KEY` configured, the expected production path is Supadata first, with direct/browser only acting as fallbacks.

If the smoke returns `BOT_CHALLENGE` or `BOT_CHALLENGE_SUSPECTED`, inspect `youtube://status` first. The browser provider status now tells you whether a trusted Steel profile is configured and recommends the next operator action.
