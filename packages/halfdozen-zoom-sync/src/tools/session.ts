/**
 * Session Management Tools — get_session_status, upload_session_context
 * Three-Tier Framework: Automation tier (MCP Tools)
 *
 * Manages the Steel.dev browser session context (Zoom cookies).
 * Sessions expire every 1-2 weeks and need manual refresh via
 * the watch-session.ts script.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { SteelClient } from '../lib/steel.js';
import type { SteelSessionContext } from '../lib/steel.js';
import type { D1Database } from '../lib/db.js';
import { getSessionState, setSessionState } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionToolDeps {
  steelApiKey: string;
  getDb: () => D1Database;
  getSessionContext: () => Promise<SteelSessionContext | null>;
  setSessionContext: (context: SteelSessionContext) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerSessionTools(
  server: McpServer,
  deps: SessionToolDeps,
): void {
  // --- get_session_status ---------------------------------------------------
  server.tool(
    'get_session_status',
    {},
    async () => {
      try {
        const db = deps.getDb();

        // Check stored session validity
        const validState = await getSessionState(db, 'session_valid');
        const lastCheckState = await getSessionState(db, 'last_session_check');

        // Check if session context exists
        const sessionContext = await deps.getSessionContext();
        const hasContext = sessionContext !== null;
        const cookieCount = sessionContext?.cookies?.length ?? 0;

        // Try a quick validation with Steel
        let liveCheck: { valid: boolean; error?: string } | null = null;

        if (hasContext) {
          try {
            const steel = new SteelClient(deps.steelApiKey);
            const session = await steel.createSession({
              timeout: 2 * 60 * 1000, // 2 minute session just for checking
              sessionContext: sessionContext!,
            });

            // We successfully created a session — cookies are at least parseable
            await steel.releaseSession(session.id);
            liveCheck = { valid: true };

            await setSessionState(db, 'session_valid', 'true');
            await setSessionState(db, 'last_session_check', new Date().toISOString());
          } catch (e) {
            liveCheck = { valid: false, error: String(e) };
            await setSessionState(db, 'session_valid', 'false');
          }
        }

        const needsSetup = !hasContext || validState?.value === 'false';

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              has_context: hasContext,
              cookie_count: cookieCount,
              last_known_valid: validState?.value === 'true',
              last_validity_check: validState?.updated_at ?? null,
              last_session_check: lastCheckState?.value ?? null,
              live_check: liveCheck,
              instructions: !needsSetup
                ? 'Session context is available.'
                : 'Zoom Clips auth is operator-managed. Session is invalid or expired. Tell the user that Clips features are temporarily unavailable and their MCP administrator will refresh the Zoom session. Do not ask the user to run any script or paste session data.',
            }, null, 2),
          }],
        };
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

  // --- upload_session_context -----------------------------------------------
  server.tool(
    'upload_session_context',
    {
      session_context_json: z
        .string()
        .describe(
          'JSON string of the session context object (with cookies array). Admin/operator only — Zoom Clips auth is operator-managed. Do not prompt the end user for this.',
        ),
    },
    async ({ session_context_json }) => {
      try {
        // Parse and validate
        let context: SteelSessionContext;
        try {
          context = JSON.parse(session_context_json);
        } catch {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'Invalid JSON. Provide a valid session context object.' }),
            }],
          };
        }

        if (!context.cookies || !Array.isArray(context.cookies)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Invalid session context: missing "cookies" array.',
              }),
            }],
          };
        }

        // Store the context
        await deps.setSessionContext(context);

        // Update session state in D1
        const db = deps.getDb();
        await setSessionState(db, 'session_valid', 'unknown');
        await setSessionState(db, 'context_uploaded_at', new Date().toISOString());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              cookie_count: context.cookies.length,
              message: 'Session context uploaded. Run sync_clips or get_session_status to verify.',
            }, null, 2),
          }],
        };
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
