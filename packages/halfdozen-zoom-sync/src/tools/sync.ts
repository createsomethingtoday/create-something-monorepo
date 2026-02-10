/**
 * Sync Tools — sync_clips, extract_clip
 * Three-Tier Framework: Automation tier (MCP Tools)
 *
 * Core browser automation logic ported from modal_sync.py.
 * Uses Steel.dev sessions + CDP-over-WebSocket for Zoom Clips extraction,
 * then syncs extracted clips to Notion.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { CdpClient } from '../lib/cdp-client.js';
import { SteelClient } from '../lib/steel.js';
import type { SteelSessionContext } from '../lib/steel.js';
import {
  syncClipsToNotion,
  syncClipToNotion,
  type NotionConfig,
  type ClipData,
} from '../lib/notion.js';
import type { D1Database } from '../lib/db.js';
import {
  createSyncRun,
  completeSyncRun,
  cacheClip,
  setSessionState,
} from '../lib/db.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CLIPS_LIBRARY_URL = 'https://zoom.us/clips/mine';
const MAX_CLIPS_DEFAULT = 20;

// ---------------------------------------------------------------------------
// JavaScript snippets for CDP evaluate (ported from Python)
// ---------------------------------------------------------------------------

/** Discover clip URLs from the clips library page. */
const JS_DISCOVER_CLIPS = (maxClips: number) => `
(() => {
  const links = [];
  document.querySelectorAll('a[href*="/clips/share/"]').forEach(link => {
    if (links.length < ${maxClips}) {
      const href = link.getAttribute('href');
      if (href && !links.includes(href)) {
        links.push(href.startsWith('http') ? href : 'https://zoom.us' + href);
      }
    }
  });
  return links;
})()
`;

/** Extract metadata from a clip detail page. */
const JS_EXTRACT_METADATA = `
(() => {
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const title = ogTitle || document.title.replace(' | Zoom Clips', '').replace('Clips', '').trim() || 'Untitled';

  const speakerEl = document.querySelector('[class*="user-name"], [class*="owner"], [class*="speaker"]');
  const speaker = speakerEl?.textContent?.trim() || '';

  const dateEl = document.querySelector('.start-time-str, [class*="start-time"], [class*="created"]');
  const createdAt = dateEl?.textContent?.trim() || '';

  const summaryEl = document.querySelector('.summary-text');
  const summary = summaryEl?.textContent?.trim() || '';

  return { title, speaker, createdAt, summary };
})()
`;

/** Click the Transcript tab. Returns true if successful. */
const JS_CLICK_TRANSCRIPT_TAB = `
(() => {
  const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent?.trim() === 'Transcript') {
      tab.click();
      return true;
    }
  }
  return false;
})()
`;

/** Extract transcript text from transcript list items. */
const JS_EXTRACT_TRANSCRIPT = `
(() => {
  const segments = [];
  document.querySelectorAll('.transcript-list-item').forEach(item => {
    const text = item.textContent?.trim();
    if (text) segments.push(text);
  });
  return segments.join('\\n');
})()
`;

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

interface ExtractedClip {
  url: string;
  title: string;
  speaker: string;
  createdAt: string;
  transcript: string | null;
  summary: string;
}

/**
 * Extract a single clip from its detail page via CDP.
 */
async function extractClipViaCdp(cdp: CdpClient, url: string): Promise<ExtractedClip> {
  await cdp.navigate(url);
  await cdp.sleep(2000);

  // Extract metadata
  const metadata = await cdp.evaluate<{
    title: string;
    speaker: string;
    createdAt: string;
    summary: string;
  }>(JS_EXTRACT_METADATA);

  // Try to click the Transcript tab
  let transcript: string | null = null;
  const tabClicked = await cdp.evaluate<boolean>(JS_CLICK_TRANSCRIPT_TAB);

  if (tabClicked) {
    await cdp.sleep(3000);
    const rawTranscript = await cdp.evaluate<string>(JS_EXTRACT_TRANSCRIPT);
    if (rawTranscript && rawTranscript.length > 0) {
      transcript = rawTranscript;
    }
  }

  return {
    url,
    title: metadata.title,
    speaker: metadata.speaker,
    createdAt: metadata.createdAt,
    transcript,
    summary: metadata.summary,
  };
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export interface SyncToolDeps {
  steelApiKey: string;
  notionConfig: NotionConfig;
  getDb: () => D1Database;
  getSessionContext: () => Promise<SteelSessionContext | null>;
}

export function registerSyncTools(
  server: McpServer,
  deps: SyncToolDeps,
): void {
  // --- sync_clips -----------------------------------------------------------
  server.tool(
    'sync_clips',
    {
      max_clips: z
        .number()
        .optional()
        .describe('Maximum number of clips to process (default: 20)'),
    },
    async ({ max_clips }) => {
      const maxClips = max_clips ?? MAX_CLIPS_DEFAULT;
      const db = deps.getDb();
      const runId = await createSyncRun(db);

      try {
        // Load session context
        const sessionContext = await deps.getSessionContext();
        if (!sessionContext) {
          await completeSyncRun(db, runId, 'failed', {
            error: 'No session context found. Upload cookies via upload_session_context tool.',
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'No session context available. Use the upload_session_context tool to provide Zoom cookies.',
                run_id: runId,
              }),
            }],
          };
        }

        // Create Steel session
        const steel = new SteelClient(deps.steelApiKey);
        const session = await steel.createSession({
          timeout: 15 * 60 * 1000,
          sessionContext,
        });

        let cdp: CdpClient | null = null;

        try {
          // Connect CDP
          cdp = new CdpClient(steel.getCdpUrl(session.id));
          await cdp.connect();
          await cdp.enableDomains();

          // Navigate to clips library
          await cdp.navigate(CLIPS_LIBRARY_URL);
          await cdp.sleep(3000);

          // Check for auth failure
          const currentUrl = await cdp.getCurrentUrl();
          if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
            await setSessionState(db, 'session_valid', 'false');
            await completeSyncRun(db, runId, 'session_expired', {
              error: 'Session cookies are expired. Zoom redirected to login page.',
            });
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'SESSION EXPIRED: Zoom cookies are no longer valid. Use upload_session_context to refresh.',
                  run_id: runId,
                  session_viewer: session.sessionViewerUrl,
                }),
              }],
            };
          }

          await setSessionState(db, 'session_valid', 'true');

          // Discover clip URLs
          const clipUrls = await cdp.evaluate<string[]>(
            JS_DISCOVER_CLIPS(maxClips),
          );

          await completeSyncRun(db, runId, 'running', {
            clips_found: clipUrls.length,
          });

          // Extract each clip
          const extracted: ExtractedClip[] = [];
          for (const url of clipUrls) {
            try {
              const clip = await extractClipViaCdp(cdp, url);
              extracted.push(clip);
              await cdp.sleep(1000);
            } catch (e) {
              console.error(`Failed to extract clip ${url}: ${e}`);
            }
          }

          // Filter to clips with transcripts
          const clipsWithTranscript = extracted.filter((c) => c.transcript);

          // Sync to Notion
          const clipData: ClipData[] = clipsWithTranscript.map((c) => ({
            url: c.url,
            title: c.title,
            speaker: c.speaker || undefined,
            createdAt: c.createdAt || undefined,
            transcript: c.transcript || undefined,
            summary: c.summary || undefined,
          }));

          const stats = await syncClipsToNotion(deps.notionConfig, clipData);

          // Cache synced clips in D1
          for (const clip of clipsWithTranscript) {
            await cacheClip(db, {
              zoom_url: clip.url,
              title: clip.title,
              speaker: clip.speaker,
              created_at: clip.createdAt,
            });
          }

          // Complete the sync run
          await completeSyncRun(db, runId, 'success', {
            clips_found: clipUrls.length,
            clips_synced: stats.synced,
            clips_skipped: stats.skipped,
          });

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                run_id: runId,
                clips_found: clipUrls.length,
                clips_extracted: extracted.length,
                clips_with_transcript: clipsWithTranscript.length,
                clips_synced: stats.synced,
                clips_skipped: stats.skipped,
                clips_failed: stats.failed,
              }, null, 2),
            }],
          };
        } finally {
          // Cleanup
          if (cdp) cdp.close();
          await steel.releaseSession(session.id);
        }
      } catch (e) {
        const errorMsg = String(e);
        await completeSyncRun(db, runId, 'failed', { error: errorMsg });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: errorMsg, run_id: runId }),
          }],
        };
      }
    },
  );

  // --- extract_clip ---------------------------------------------------------
  server.tool(
    'extract_clip',
    {
      clip_url: z
        .string()
        .url()
        .describe('URL of the Zoom clip to extract (e.g. https://zoom.us/clips/share/...)'),
    },
    async ({ clip_url }) => {
      try {
        // Load session context
        const sessionContext = await deps.getSessionContext();
        if (!sessionContext) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'No session context available. Use upload_session_context to provide Zoom cookies.',
              }),
            }],
          };
        }

        // Create Steel session
        const steel = new SteelClient(deps.steelApiKey);
        const session = await steel.createSession({
          timeout: 5 * 60 * 1000,
          sessionContext,
        });

        let cdp: CdpClient | null = null;

        try {
          cdp = new CdpClient(steel.getCdpUrl(session.id));
          await cdp.connect();
          await cdp.enableDomains();

          const clip = await extractClipViaCdp(cdp, clip_url);

          // Optionally sync to Notion
          let notionPageId: string | undefined;
          try {
            notionPageId = await syncClipToNotion(deps.notionConfig, {
              url: clip.url,
              title: clip.title,
              speaker: clip.speaker || undefined,
              createdAt: clip.createdAt || undefined,
              transcript: clip.transcript || undefined,
              summary: clip.summary || undefined,
            });

            // Cache in D1
            const db = deps.getDb();
            await cacheClip(db, {
              zoom_url: clip.url,
              title: clip.title,
              speaker: clip.speaker,
              created_at: clip.createdAt,
              notion_page_id: notionPageId,
            });
          } catch (e) {
            console.error(`Notion sync failed for extracted clip: ${e}`);
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                clip: {
                  url: clip.url,
                  title: clip.title,
                  speaker: clip.speaker,
                  created_at: clip.createdAt,
                  transcript_length: clip.transcript?.length ?? 0,
                  summary: clip.summary,
                },
                notion_page_id: notionPageId,
                session_viewer: session.sessionViewerUrl,
              }, null, 2),
            }],
          };
        } finally {
          if (cdp) cdp.close();
          await steel.releaseSession(session.id);
        }
      } catch (e) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(e) }),
          }],
        };
      }
    },
  );
}
