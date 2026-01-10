// Agentic Queue Worker
// Receives tasks from queue and spawns Durable Object sessions

import { AgenticSession } from './session';
import type { Env, AgenticTask } from './types';

export { AgenticSession };

// ============================================================================
// HTTP Fetch Handler (for direct task submission)
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // POST /submit - Submit task to queue
    if (url.pathname === '/submit' && request.method === 'POST') {
      try {
        const task: AgenticTask = await request.json();

        // Validate task
        if (!task.issueId || !task.budget) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Send to queue
        await env.AGENTIC_QUEUE.send(task);

        return new Response(JSON.stringify({
          success: true,
          taskId: task.issueId,
          status: 'queued'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },

  async queue(batch: MessageBatch<AgenticTask>, env: Env): Promise<void> {
    // Debug: Check API key in multiple ways
    const apiKey1 = env.ANTHROPIC_API_KEY;
    const apiKey2 = (env as any)['ANTHROPIC_API_KEY'];
    const apiKey3 = Reflect.get(env, 'ANTHROPIC_API_KEY');

    console.log('Queue consumer env check', {
      hasApiKey: !!apiKey1,
      typeof1: typeof apiKey1,
      typeof2: typeof apiKey2,
      typeof3: typeof apiKey3,
      preview1: apiKey1?.substring(0, 10) || String(apiKey1),
      preview2: apiKey2?.substring(0, 10) || String(apiKey2),
      preview3: apiKey3?.substring(0, 10) || String(apiKey3),
      envKeys: Object.keys(env)
    });

    for (const message of batch.messages) {
      const task = message.body;

      try {
        console.log('Starting agentic task', {
          issueId: task.issueId,
          budget: task.budget,
          convoyId: task.convoyId
        });

        // Create or get Durable Object session
        // Use issueId as the name for idempotency (same issue = same session)
        const sessionId = env.AGENTIC_SESSION.idFromName(task.issueId);
        const session = env.AGENTIC_SESSION.get(sessionId);

        // Start session - pass API key explicitly since secrets aren't inherited by Durable Objects
        const response = await session.fetch('https://session/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': env.ANTHROPIC_API_KEY  // Pass API key via header
          },
          body: JSON.stringify(task)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Session start failed: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();

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
          issueId: task.issueId,
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
          await markTaskFailed(env, task.issueId, err.message);
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
