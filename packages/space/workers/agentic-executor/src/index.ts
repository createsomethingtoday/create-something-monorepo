// Agentic Queue Worker
// Receives tasks from queue and spawns Durable Object sessions

import { AgenticSession } from './session';
import { authorized, guardResponse, readPolicy, validateTask } from './guards.ts';
import { quota } from './quota.ts';
export { AgenticQuota } from './quota.ts';
import type { Env, AgenticTask } from './types';

export { AgenticSession };

// ============================================================================
// HTTP Fetch Handler (for direct task submission)
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/submit' && request.method === 'POST') {
      if (!env.AGENTIC_ADMISSION_TOKEN || env.AGENTIC_ADMISSION_TOKEN.length < 32) {
        return Response.json({error:'Admission authentication is not configured'}, {status:503});
      }
      if (!await authorized(request, env.AGENTIC_ADMISSION_TOKEN)) {
        return Response.json({error:'Unauthorized'}, {status:401});
      }
      try {
        const policy = readPolicy(env);
        const body = await request.text();
        if (new TextEncoder().encode(body).length > policy.maxRequestBytes) {
          return Response.json({error:'Task payload too large'}, {status:413});
        }
        const task = validateTask(JSON.parse(body), policy);
        return await quota(env).fetch('https://quota/admit', {method:'POST',body:JSON.stringify(task)});
      } catch (error) { return guardResponse(error); }
    }

    return new Response('Not Found', { status: 404 });
  },

  async queue(batch: MessageBatch<AgenticTask>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      let task = message.body;

      try {
        task = validateTask(task, readPolicy(env));
        const admission = await quota(env).fetch('https://quota/verify', {method:'POST', body:JSON.stringify(task)});
        if (!admission.ok) { message.ack(); continue; }
        console.log('Starting agentic task', {
          issueId: task.issueId,
          budget: task.budget,
          convoyId: task.convoyId
        });

        // Create or get Durable Object session
        // Use issueId as the name for idempotency (same issue = same session)
        const sessionId = env.AGENTIC_SESSION.idFromName(task.issueId);
        const session = env.AGENTIC_SESSION.get(sessionId);

        // DO bindings inherit this worker's environment; never forward or log credentials.
        const response = await session.fetch('https://session/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(task)
        });

        if ([400, 402, 403, 409, 410].includes(response.status)) { message.ack(); continue; }
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Session start failed: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json() as {sessionId: string; budget: unknown};

        console.log('Session started', {
          issueId: task.issueId,
          sessionId: result.sessionId,
          budget: result.budget
        });

        // Update session status to running (already handled by Durable Object)
        // If part of convoy, update convoy task status
        if (task.convoyId) {
          await env.DB.prepare(`
            UPDATE convoy_tasks
            SET status = ?, session_id = ?, started_at = ?
            WHERE convoy_id = ? AND issue_id = ?
          `).bind(
            'in_progress',
            result.sessionId,
            Date.now(),
            task.convoyId,
            task.issueId
          ).run();
        }

        message.ack();

      } catch (err: any) {
        console.error('Agentic task failed', {
          issueId: task?.issueId,
          error: err.message,
          attempts: message.attempts
        });

        // Retry logic
        if (message.attempts < 3) {
          // Retry with exponential backoff
          const delaySeconds = Math.pow(2, message.attempts) * 60;  // 1min, 2min, 4min
          message.retry({ delaySeconds });
        } else {
          // Max retries exceeded, mark as failed
          if (typeof task?.issueId === 'string') await markTaskFailed(env, task.issueId, err.message);
          message.ack();
        }
      }
    }
  }
};

// ============================================================================
// Helpers
// ============================================================================

async function markTaskFailed(env: Env, issueId: string, errorMessage: string): Promise<void> {
  // Update agentic session status
  // (issues table doesn't exist - session status is handled by Durable Object)

  // Update agentic metadata
  await env.DB.prepare(`
    UPDATE agentic_metadata
    SET review_status = 'failed'
    WHERE issue_id = ?
  `).bind(issueId).run();

  // Log event
  await env.DB.prepare(`
    INSERT INTO agentic_events (issue_id, event_type, event_data, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    issueId,
    'task_failed',
    JSON.stringify({ error: errorMessage }),
    Date.now()
  ).run();
}
