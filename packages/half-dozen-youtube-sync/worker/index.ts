/**
 * Half Dozen YouTube Sync - MCP Worker (Production)
 * 
 * Cloudflare Worker with Streamable HTTP transport for Codex, Claude Desktop,
 * and other MCP clients. Pure API — no browser automation needed.
 * 
 * Tools (7):
 *   sync_playlist      — Full workflow: playlist → transcripts → Notion (main tool)
 *   extract_transcript  — Get transcript for a single video
 *   sync_to_notion      — Sync video data array to Notion
 *   get_database_schema — Inspect Notion database properties
 *   list_playlist       — List videos in a YouTube playlist
 *   search              — ChatGPT connector: search synced videos
 *   fetch               — ChatGPT connector: get video details
 * 
 * Cron: Daily scheduled sync of configured playlist(s)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';

// =============================================================================
// Types
// =============================================================================

interface Env {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  RESEND_API_KEY?: string;
  SYNC_PLAYLIST_URLS?: string;  // Comma-separated playlist URLs for cron
  ALERT_EMAIL?: string;
  FEEDBACK_DB: any;  // D1Database — shared feedback across Half Dozen MCPs
  MCP_OBJECT: DurableObjectNamespace;
}

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'half-dozen-youtube-sync';
const SERVER_VERSION = '2.0.0';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const CHUNK_SIZE = 1900;
const MAX_BLOCKS_PER_REQUEST = 100;

const ANDROID_CLIENT_VERSION = '19.29.37';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_CLIENT_VERSION} (Linux; U; Android 11) gzip`;
const WEB_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// =============================================================================
// YouTube: Innertube API (ANDROID client + visitorData)
// =============================================================================

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) { bytes.push((value & 0x7f) | 0x80); value >>>= 7; }
  bytes.push(value);
  return bytes;
}

function bufferFrom(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function toBase64(bytes: Uint8Array | number[]): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr));
}

function buildTranscriptParams(videoId: string, lang: string = 'en'): string {
  const vidBytes = bufferFrom(videoId);
  const langBytes = bufferFrom(lang);
  const asrBytes = bufferFrom('asr');
  const inner = [0x0a, 0x03, ...asrBytes, 0x12, ...encodeVarint(lang.length), ...langBytes, 0x1a, 0x00];
  const innerB64 = toBase64(inner);
  const innerEncoded = encodeURIComponent(innerB64);
  const innerEncodedBytes = bufferFrom(innerEncoded);
  const panelName = 'engagement-panel-searchable-transcript-search-panel';
  const panelBytes = bufferFrom(panelName);
  const outer = [
    0x0a, ...encodeVarint(videoId.length), ...vidBytes,
    0x12, ...encodeVarint(innerEncoded.length), ...innerEncodedBytes,
    0x18, 0x01,
    0x2a, ...encodeVarint(panelName.length), ...panelBytes,
    0x30, 0x01, 0x38, 0x01, 0x40, 0x01,
  ];
  return toBase64(outer);
}

async function getVisitorData(videoId: string): Promise<string> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': WEB_USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!resp.ok) return '';
  const html = await resp.text();
  return html.match(/"visitorData":"([^"]+)"/)?.[1] || '';
}

async function fetchTranscript(videoId: string, lang: string = 'en'): Promise<{
  transcript: string;
  segments: Array<{ text: string; start: number; duration: number }>;
} | null> {
  const visitorData = await getVisitorData(videoId);
  const params = buildTranscriptParams(videoId, lang);

  const resp = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_USER_AGENT,
      'Origin': 'https://www.youtube.com',
    },
    body: JSON.stringify({
      context: { client: { hl: lang, gl: 'US', clientName: 'ANDROID', clientVersion: ANDROID_CLIENT_VERSION, androidSdkVersion: 30, visitorData } },
      params,
    }),
  });

  if (!resp.ok) return null;
  const json = await resp.json() as any;
  if (json.error) return null;

  const action = json.actions?.[0];
  const webSegs = action?.updateEngagementPanelAction?.content?.transcriptRenderer?.content
    ?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
  const androidSegs = action?.elementsCommand?.transformEntityCommand
    ?.arguments?.transformTranscriptSegmentListArguments?.overwrite?.initialSegments;
  const rawSegments = webSegs || androidSegs || [];

  const segments: Array<{ text: string; start: number; duration: number }> = [];
  for (const seg of rawSegments) {
    const r = seg?.transcriptSegmentRenderer;
    if (!r) continue;
    const text = r.snippet?.elementsAttributedString?.content ||
                 r.snippet?.runs?.map((x: any) => x.text).join('') ||
                 r.snippet?.simpleText || '';
    const startMs = parseInt(r.startMs || '0', 10);
    const endMs = parseInt(r.endMs || '0', 10);
    if (text.trim()) segments.push({ text: text.trim(), start: startMs / 1000, duration: (endMs - startMs) / 1000 });
  }

  if (segments.length === 0) return null;
  return { transcript: segments.map(s => s.text).join(' '), segments };
}

// =============================================================================
// YouTube: Innertube Playlist Extraction (no browser)
// =============================================================================

interface PlaylistVideo {
  videoId: string;
  title: string;
  url: string;
  channelName?: string;
  duration?: string;
  thumbnailUrl?: string;
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

async function fetchPlaylistVideos(playlistId: string): Promise<{
  title: string;
  videos: PlaylistVideo[];
}> {
  // Fetch playlist page (also extracts videos as fallback)
  const pageResp = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: { 'User-Agent': WEB_USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!pageResp.ok) throw new Error(`Failed to fetch playlist page: ${pageResp.status}`);
  const html = await pageResp.text();

  const visitorData = html.match(/"visitorData":"([^"]+)"/)?.[1] || '';

  // Call innertube browse API with ANDROID client
  const resp = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_USER_AGENT,
      'Origin': 'https://www.youtube.com',
    },
    body: JSON.stringify({
      context: { client: { hl: 'en', gl: 'US', clientName: 'ANDROID', clientVersion: ANDROID_CLIENT_VERSION, androidSdkVersion: 30, visitorData } },
      browseId: `VL${playlistId}`,
    }),
  });

  if (!resp.ok) throw new Error(`Browse API error: ${resp.status}`);
  const json = await resp.json() as any;

  // Extract playlist title (multiple possible paths)
  const title = json?.header?.playlistHeaderRenderer?.title?.simpleText ||
                json?.header?.pageHeaderRenderer?.pageTitle ||
                json?.metadata?.playlistMetadataRenderer?.title || 'Untitled Playlist';

  // Extract videos — check multiple response format paths
  const videos: PlaylistVideo[] = [];

  const tabs = json?.contents?.singleColumnBrowseResultsRenderer?.tabs ||
               json?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

  for (const tab of tabs) {
    const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      // ANDROID format: playlistVideoListRenderer directly in section
      const directList = section?.playlistVideoListRenderer?.contents;
      // WEB format: inside itemSectionRenderer
      const nestedList = section?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;

      const items = directList || nestedList || [];
      for (const item of items) {
        const renderer = item?.playlistVideoRenderer;
        if (!renderer?.videoId) continue;

        videos.push({
          videoId: renderer.videoId,
          title: renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || `Video ${renderer.videoId}`,
          url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
          channelName: renderer.shortBylineText?.runs?.[0]?.text || '',
          duration: renderer.lengthText?.simpleText || '',
          thumbnailUrl: renderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url,
        });
      }
    }
  }

  // Fallback: extract video IDs from the playlist page HTML
  if (videos.length === 0) {
    const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const seen = new Set<string>();
    for (const m of videoIdMatches) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        // Try to get title from HTML too
        const titlePattern = new RegExp(`"videoId":"${m[1]}"[^}]*"title":\\{[^}]*"runs":\\[\\{"text":"([^"]+)"`, 'g');
        const titleMatch = titlePattern.exec(html);
        videos.push({
          videoId: m[1],
          title: titleMatch?.[1] || `Video ${m[1]}`,
          url: `https://www.youtube.com/watch?v=${m[1]}`,
        });
      }
    }
  }

  return { title, videos };
}

// =============================================================================
// Notion API helpers
// =============================================================================

async function notionFetch(env: Env, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.NOTION_API_KEY}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Notion (${r.status}): ${e}`); }
  return r.json();
}

async function notionQuery(env: Env, dbId: string, filter: unknown, pageSize = 10) {
  return notionFetch(env, `/databases/${dbId}/query`, 'POST', { filter, page_size: pageSize }) as Promise<{ results: Array<{ id: string; properties: Record<string, any> }> }>;
}

async function notionCreatePage(env: Env, dbId: string, props: Record<string, unknown>) {
  return notionFetch(env, '/pages', 'POST', { parent: { database_id: dbId }, properties: props }) as Promise<{ id: string; url?: string }>;
}

async function notionAppendBlocks(env: Env, blockId: string, children: unknown[]) {
  return notionFetch(env, `/blocks/${blockId}/children`, 'PATCH', { children }) as Promise<{ results: Array<{ id: string }> }>;
}

// =============================================================================
// Notion: Sync videos with dedup + transcript toggle blocks
// =============================================================================

function chunkText(text: string, max = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let rem = text.trim();
  while (rem.length > 0) {
    if (rem.length <= max) { chunks.push(rem); break; }
    const i = rem.lastIndexOf('. ', max);
    const at = i > max * 0.5 ? i + 2 : max;
    chunks.push(rem.substring(0, at).trim());
    rem = rem.substring(at).trim();
  }
  return chunks;
}

async function syncVideosToNotion(
  env: Env,
  videos: Array<{ videoId?: string; url: string; title: string; transcript?: string; channelName?: string; duration?: string; publishedAt?: string }>,
  databaseId?: string
): Promise<{ total: number; successful: number; skipped: number; failed: number; results: Array<{ title: string; status: string; pageId?: string; error?: string }> }> {
  const dbId = databaseId || env.NOTION_DATABASE_ID;
  if (!dbId) throw new Error('No database ID');

  // Batch dedup
  const urls = videos.map(v => v.url);
  const existing = new Set<string>();
  if (urls.length > 0) {
    try {
      const filter = urls.length === 1
        ? { property: 'Source URL', url: { equals: urls[0] } }
        : { or: urls.map(u => ({ property: 'Source URL', url: { equals: u } })) };
      const res = await notionQuery(env, dbId, filter, 100);
      for (const p of res.results) { const u = p.properties['Source URL']?.url; if (u) existing.add(u); }
    } catch { /* continue without dedup */ }
  }

  let successful = 0, skipped = 0, failed = 0;
  const results: Array<{ title: string; status: string; pageId?: string; error?: string }> = [];

  for (const video of videos) {
    if (existing.has(video.url)) { skipped++; results.push({ title: video.title, status: 'skipped' }); continue; }

    try {
      const page = await notionCreatePage(env, dbId, {
        Item: { title: [{ text: { content: video.title } }] },
        'Source URL': { url: video.url },
        Status: { select: { name: 'Active' } },
        Source: { select: { name: 'Internal' } },
        Type: { select: { name: 'Video' } },
        Date: { date: { start: new Date().toISOString().split('T')[0] } },
      });

      // Metadata blocks
      const meta: string[] = [];
      if (video.channelName) meta.push(`Channel: ${video.channelName}`);
      if (video.duration) meta.push(`Duration: ${video.duration}`);
      if (video.publishedAt) meta.push(`Published: ${video.publishedAt}`);

      const blocks: unknown[] = [{ type: 'bookmark', bookmark: { url: video.url } }];
      if (meta.length > 0) blocks.push({ type: 'callout', callout: { icon: { emoji: 'ℹ️' }, rich_text: [{ type: 'text', text: { content: meta.join('\n') } }] } });
      blocks.push({ type: 'divider', divider: {} });
      await notionAppendBlocks(env, page.id, blocks);

      // Transcript toggle
      if (video.transcript) {
        const chunks = chunkText(video.transcript);
        const paragraphs = chunks.map(c => ({ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: c } }] } }));
        const firstBatch = paragraphs.slice(0, MAX_BLOCKS_PER_REQUEST - 1);
        const toggle = { type: 'toggle', toggle: { rich_text: [{ type: 'text', text: { content: 'Transcript' } }], children: firstBatch } };
        const appendRes = await notionAppendBlocks(env, page.id, [toggle]);
        for (let i = MAX_BLOCKS_PER_REQUEST - 1; i < paragraphs.length; i += MAX_BLOCKS_PER_REQUEST) {
          await notionAppendBlocks(env, appendRes.results[0].id, paragraphs.slice(i, i + MAX_BLOCKS_PER_REQUEST));
        }
      }

      successful++;
      results.push({ title: video.title, status: 'synced', pageId: page.id });
      await new Promise(r => setTimeout(r, 350));
    } catch (error) {
      failed++;
      results.push({ title: video.title, status: 'failed', error: String(error) });
    }
  }

  return { total: videos.length, successful, skipped, failed, results };
}

// =============================================================================
// Email Notification (Resend)
// =============================================================================

async function sendSyncEmail(env: Env, subject: string, html: string) {
  if (!env.RESEND_API_KEY) return;
  const to = env.ALERT_EMAIL || 'micah@createsomething.io';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Half Dozen Sync <notifications@createsomething.io>', to: [to], subject, html }),
  }).catch(() => {});
}

function buildSyncEmailHtml(playlist: string, stats: { total: number; successful: number; skipped: number; failed: number; withTranscript: number }): string {
  const statusColor = stats.failed > 0 ? '#f59e0b' : '#22c55e';
  const statusText = stats.failed > 0 ? 'Completed with warnings' : 'Sync complete';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#000;font-family:-apple-system,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="font-size:13px;color:#666;letter-spacing:0.08em;text-transform:uppercase;padding:0 0 32px">HALF DOZEN &middot; YOUTUBE SYNC</td></tr>
<tr><td style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:32px">
<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};margin-right:8px;vertical-align:middle"></span>
<span style="font-size:13px;color:${statusColor};font-weight:500;vertical-align:middle">${statusText}</span>
<h1 style="margin:16px 0 4px;font-size:22px;color:#fff">${playlist}</h1>
<table width="100%" style="margin:20px 0"><tr><td style="padding:6px 0;font-size:14px;color:#888">Videos found</td><td style="padding:6px 0;font-size:14px;color:#e5e5e5;text-align:right">${stats.total}</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#888">Transcripts</td><td style="padding:6px 0;font-size:14px;color:#e5e5e5;text-align:right">${stats.withTranscript}</td></tr>
<tr><td colspan="2" style="padding:8px 0"><div style="border-top:1px solid #1a1a1a"></div></td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#888">Synced</td><td style="padding:6px 0;font-size:14px;color:#22c55e;text-align:right">${stats.successful}</td></tr>
${stats.skipped > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#888">Skipped</td><td style="padding:6px 0;font-size:14px;color:#666;text-align:right">${stats.skipped}</td></tr>` : ''}
${stats.failed > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#888">Failed</td><td style="padding:6px 0;font-size:14px;color:#ef4444;text-align:right">${stats.failed}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:24px 0 0;font-size:11px;color:#444">Sent by CREATE SOMETHING automation infrastructure<br>${new Date().toISOString()}</td></tr>
</table></td></tr></table></body></html>`;
}

// =============================================================================
// Full Playlist Sync Pipeline
// =============================================================================

async function syncPlaylistPipeline(env: Env, playlistUrl: string, databaseId?: string): Promise<{
  playlist: { title: string; videoCount: number };
  extraction: { total: number; withTranscript: number };
  sync: { total: number; successful: number; skipped: number; failed: number };
}> {
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) throw new Error(`Invalid playlist URL: ${playlistUrl}`);

  // 1. Fetch playlist videos via innertube
  const { title, videos } = await fetchPlaylistVideos(playlistId);

  // 2. Extract transcripts for each video
  const videosWithTranscripts: Array<{ videoId: string; url: string; title: string; transcript?: string; channelName?: string; duration?: string }> = [];

  for (const v of videos) {
    const result = await fetchTranscript(v.videoId);
    videosWithTranscripts.push({
      ...v,
      transcript: result?.transcript,
    });
    // Rate limit between transcript fetches
    await new Promise(r => setTimeout(r, 500));
  }

  const withTranscript = videosWithTranscripts.filter(v => v.transcript).length;

  // 3. Sync to Notion (dedup built in)
  const syncResult = await syncVideosToNotion(env, videosWithTranscripts, databaseId);

  // 4. Send email notification
  await sendSyncEmail(env,
    `YouTube Sync: ${title} (${syncResult.successful} synced)`,
    buildSyncEmailHtml(title, { ...syncResult, withTranscript })
  );

  return {
    playlist: { title, videoCount: videos.length },
    extraction: { total: videos.length, withTranscript },
    sync: syncResult,
  };
}

// =============================================================================
// MCP Agent
// =============================================================================

export class YouTubeSyncMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME, undefined, {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
      });
    }

    // ── Resources ──────────────────────────────────────────────────────
    this.server.resource('server-status', 'youtube://status',
      { description: 'Server status', mimeType: 'application/json' },
      async () => ({
        contents: [{ uri: 'youtube://status', mimeType: 'application/json',
          text: JSON.stringify({ server: { name: SERVER_NAME, version: SERVER_VERSION }, transport: 'http', tools: 7 }, null, 2) }],
      })
    );

    // ── Prompts ────────────────────────────────────────────────────────

    this.server.prompt('get_started', {},
      () => ({
        messages: [{ role: 'user' as const, content: { type: 'text' as const,
          text: `Paste a YouTube playlist or video URL and I'll extract the transcripts and sync them to your Notion database.\n\nJust say: sync <URL>` } }],
      })
    );

    this.server.prompt('sync_playlist',
      { url: z.string().describe('YouTube playlist or video URL') },
      ({ url }) => ({
        messages: [{ role: 'user' as const, content: { type: 'text' as const,
          text: `Sync this to Notion: ${url}\n\nUse the sync tool.` } }],
      })
    );

    this.server.prompt('transcript_analysis',
      { videoUrl: z.string().describe('YouTube video URL') },
      ({ videoUrl }) => ({
        messages: [{ role: 'user' as const, content: { type: 'text' as const,
          text: `Analyze the transcript of: ${videoUrl}\n\n1. Use extract_transcript\n2. Provide: Summary, Key Themes, Key Quotes, Action Items` } }],
      })
    );

    // ── Tool: sync (primary — accepts any YouTube URL) ─────────────────
    this.server.tool('sync',
      'Sync a YouTube playlist or video to Notion. Just paste the URL. Extracts transcripts and creates Notion pages with dedup.',
      {
        url: z.string().describe('YouTube playlist URL, video URL, or video ID'),
      },
      async ({ url }) => {
        try {
          // Auto-detect: playlist or single video
          const playlistId = extractPlaylistId(url);

          if (playlistId) {
            // Playlist sync
            const result = await syncPlaylistPipeline(this.env, url);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }

          // Single video sync
          const videoId = extractVideoId(url);
          if (!videoId) return { content: [{ type: 'text', text: JSON.stringify({ error: `Not a valid YouTube URL: ${url}` }) }] };

          const transcript = await fetchTranscript(videoId);

          // Get video title from visitor data page fetch
          const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: { 'User-Agent': WEB_USER_AGENT },
          });
          const html = await pageResp.text();
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          const title = titleMatch?.[1]?.replace(' - YouTube', '').trim() || `Video ${videoId}`;

          const syncResult = await syncVideosToNotion(this.env, [{
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title,
            transcript: transcript?.transcript,
          }]);

          return { content: [{ type: 'text', text: JSON.stringify({
            video: { videoId, title, hasTranscript: !!transcript, transcriptLength: transcript?.transcript.length || 0 },
            sync: syncResult,
          }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: extract_transcript ───────────────────────────────────────
    this.server.tool('extract_transcript',
      'Get transcript from a YouTube video. Returns text and timestamps.',
      { videoUrl: z.string().describe('YouTube video URL or video ID') },
      async ({ videoUrl }) => {
        try {
          const videoId = extractVideoId(videoUrl);
          if (!videoId) return { content: [{ type: 'text', text: JSON.stringify({ error: `Invalid URL: ${videoUrl}` }) }] };
          const result = await fetchTranscript(videoId);
          if (!result) return { content: [{ type: 'text', text: JSON.stringify({ success: false, videoId, error: 'No transcript available' }) }] };
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, videoId, transcript: result.transcript, segmentCount: result.segments.length, characterCount: result.transcript.length }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: list_playlist ────────────────────────────────────────────
    this.server.tool('list_playlist',
      'Preview videos in a YouTube playlist without syncing.',
      { playlistUrl: z.string().describe('YouTube playlist URL') },
      async ({ playlistUrl }) => {
        try {
          const playlistId = extractPlaylistId(playlistUrl);
          if (!playlistId) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid playlist URL' }) }] };
          const { title, videos } = await fetchPlaylistVideos(playlistId);
          return { content: [{ type: 'text', text: JSON.stringify({ title, videoCount: videos.length, videos }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: sync_to_notion ───────────────────────────────────────────
    this.server.tool('sync_to_notion',
      'Sync a custom video data array to Notion with dedup.',
      {
        videos: z.array(z.object({
          videoId: z.string().optional(), url: z.string(), title: z.string(),
          transcript: z.string().optional(), channelName: z.string().optional(),
          duration: z.string().optional(), publishedAt: z.string().optional(),
        })).describe('Video data array'),
        databaseId: z.string().optional().describe('Notion database ID'),
      },
      async ({ videos, databaseId }) => {
        try {
          const result = await syncVideosToNotion(this.env, videos, databaseId);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: get_database_schema ──────────────────────────────────────
    this.server.tool('get_database_schema',
      'Inspect the Notion database schema.',
      { databaseId: z.string().optional().describe('Notion database ID') },
      async ({ databaseId }) => {
        try {
          const dbId = databaseId || this.env.NOTION_DATABASE_ID;
          if (!dbId) return { content: [{ type: 'text', text: JSON.stringify({ error: 'No database ID' }) }] };
          const r = await notionFetch(this.env, `/databases/${dbId}`) as any;
          const props: Record<string, { type: string; name: string }> = {};
          for (const [n, p] of Object.entries(r.properties as Record<string, { type: string }>)) props[n] = { type: p.type, name: n };
          return { content: [{ type: 'text', text: JSON.stringify({ id: r.id, title: r.title?.[0]?.plain_text || 'Untitled', properties: props }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: search ───────────────────────────────────────────────────
    this.server.tool('search',
      'Search synced videos by title.',
      { query: z.string().describe('Search query') },
      async ({ query }) => {
        try {
          const dbId = this.env.NOTION_DATABASE_ID;
          if (!dbId) return { content: [{ type: 'text', text: JSON.stringify({ error: 'No database ID' }) }] };
          const r = await notionQuery(this.env, dbId, { property: 'Item', title: { contains: query } }, 10);
          const results = r.results.map(p => ({
            id: p.id,
            title: p.properties['Item']?.title?.[0]?.plain_text || 'Untitled',
            url: p.properties['Source URL']?.url || `https://notion.so/${p.id.replace(/-/g, '')}`,
          }));
          return { content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Tool: fetch ────────────────────────────────────────────────────
    this.server.tool('fetch',
      'Get full video details and transcript from Notion.',
      { id: z.string().describe('Notion page ID') },
      async ({ id }) => {
        try {
          const page = await notionFetch(this.env, `/pages/${id}`) as any;
          const title = page.properties['Item']?.title?.[0]?.plain_text || 'Untitled';
          const sourceUrl = page.properties['Source URL']?.url || '';
          const blocks = await notionFetch(this.env, `/blocks/${id}/children`) as any;
          let transcript = '', metadata = '';
          for (const b of blocks.results) {
            if (b.type === 'callout') metadata = b.callout?.rich_text?.map((t: any) => t.plain_text).join('') || '';
            if (b.type === 'toggle') {
              try {
                const children = await notionFetch(this.env, `/blocks/${b.id}/children`) as any;
                transcript = children.results.map((c: any) => c.paragraph?.rich_text?.map((t: any) => t.plain_text).join('') || '').filter(Boolean).join(' ');
              } catch {}
            }
          }
          return { content: [{ type: 'text', text: JSON.stringify({
            id: page.id, title, url: sourceUrl || page.url,
            text: `${title}\n${sourceUrl}\n${metadata ? `\n${metadata}` : ''}${transcript ? `\n\nTranscript:\n${transcript}` : ''}`,
            metadata: { title, sourceUrl },
          }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      }
    );

    // ── Feedback (cross-cutting — support ticket pathway) ────────────
    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), SERVER_NAME);
    }
  }
}

// =============================================================================
// Worker entry point + Cron
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return YouTubeSyncMCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return YouTubeSyncMCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: SERVER_NAME, version: SERVER_VERSION,
        usage: 'Connect via /mcp or /sse, then say: sync <YouTube URL>',
        endpoints: { mcp: '/mcp', sse: '/sse' },
        tools: ['sync', 'extract_transcript', 'list_playlist', 'sync_to_notion', 'get_database_schema', 'search', 'fetch'],
        resources: ['youtube://status'],
        prompts: ['get_started', 'sync_playlist', 'transcript_analysis'],
      }, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Cron: sync configured playlist(s)
    const playlistUrls = (env.SYNC_PLAYLIST_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
    if (playlistUrls.length === 0) return;

    for (const url of playlistUrls) {
      try {
        await syncPlaylistPipeline(env, url);
      } catch (error) {
        await sendSyncEmail(env, `YouTube Sync Failed: ${url}`,
          `<div style="background:#0a0a0a;color:#ef4444;padding:20px;border-radius:8px;font-family:monospace">${String(error)}</div>`);
      }
    }
  },
};
