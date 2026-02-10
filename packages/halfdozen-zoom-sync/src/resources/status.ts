/**
 * Status Resources — clips://status, clips://session
 * Three-Tier Framework: Database tier (MCP Resources)
 *
 * Exposes sync run status and session health as read-only resources.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { D1Database } from '../lib/db.js';
import {
  getLatestSyncRun,
  listSyncRuns,
  getSessionState,
} from '../lib/db.js';
import type { SteelSessionContext } from '../lib/steel.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerStatusResources(
  server: McpServer,
  getDb: () => D1Database,
  getSessionContext: () => Promise<SteelSessionContext | null>,
): void {
  // --- clips://status -------------------------------------------------------
  server.resource(
    'status',
    'clips://status',
    {
      description: 'Latest sync run status, clip counts, and recent history',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const db = getDb();
      const latest = await getLatestSyncRun(db);
      const history = await listSyncRuns(db, 5);

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            latest_run: latest
              ? {
                  id: latest.id,
                  status: latest.status,
                  started_at: latest.started_at,
                  completed_at: latest.completed_at,
                  clips_found: latest.clips_found,
                  clips_synced: latest.clips_synced,
                  clips_skipped: latest.clips_skipped,
                  error: latest.error,
                }
              : null,
            recent_runs: history.map((run) => ({
              id: run.id,
              status: run.status,
              started_at: run.started_at,
              clips_synced: run.clips_synced,
            })),
          }, null, 2),
        }],
      };
    },
  );

  // --- clips://session ------------------------------------------------------
  server.resource(
    'session',
    'clips://session',
    {
      description: 'Session health: cookie age, last auth check, expiry estimate',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const db = getDb();

      const validState = await getSessionState(db, 'session_valid');
      const lastCheck = await getSessionState(db, 'last_session_check');
      const uploadedAt = await getSessionState(db, 'context_uploaded_at');

      const sessionContext = await getSessionContext();
      const hasContext = sessionContext !== null;
      const cookieCount = sessionContext?.cookies?.length ?? 0;

      // Estimate cookie age
      let cookieAge: string | null = null;
      if (uploadedAt?.value) {
        const uploadDate = new Date(uploadedAt.value);
        const now = new Date();
        const daysSinceUpload = Math.floor(
          (now.getTime() - uploadDate.getTime()) / 86_400_000,
        );
        cookieAge = `${daysSinceUpload} days since upload`;
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            has_context: hasContext,
            cookie_count: cookieCount,
            session_valid: validState?.value ?? 'unknown',
            session_valid_checked_at: validState?.updated_at ?? null,
            last_live_check: lastCheck?.value ?? null,
            context_uploaded_at: uploadedAt?.value ?? null,
            cookie_age: cookieAge,
            estimated_expiry:
              cookieAge && parseInt(cookieAge) > 10
                ? 'Cookies may be nearing expiration (typical lifespan: 1-2 weeks)'
                : null,
          }, null, 2),
        }],
      };
    },
  );
}
