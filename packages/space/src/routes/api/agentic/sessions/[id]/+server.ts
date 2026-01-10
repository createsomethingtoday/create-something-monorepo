// Get session status (real-time budget tracking)

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
  const sessionId = params.id;

  try {
    // Get session details
    const session = await platform!.env.DB.prepare(`
      SELECT
        s.*,
        m.preview_url,
        m.quality_reports,
        m.review_status,
        (SELECT COUNT(*) FROM agentic_iterations WHERE session_id = s.id) as iteration_count,
        (SELECT SUM(cost) FROM agentic_iterations WHERE session_id = s.id) as verified_cost
      FROM agentic_sessions s
      LEFT JOIN agentic_metadata m ON s.issue_id = m.issue_id
      WHERE s.id = ?
    `).bind(sessionId).first();

    if (!session) {
      throw error(404, 'Session not found');
    }

    // Calculate budget status
    const budgetValue = session.budget as number;
    const costConsumed = session.cost_consumed as number;
    const budget = {
      allocated: budgetValue,
      consumed: costConsumed,
      verified: (session.verified_cost as number) || costConsumed,
      remaining: budgetValue - costConsumed,
      percentUsed: (costConsumed / budgetValue) * 100,
      atWarningThreshold: (costConsumed / budgetValue) >= 0.80,
      exhausted: session.status === 'budget_exhausted'
    };

    // Get recent iterations
    const iterations = await platform!.env.DB.prepare(`
      SELECT iteration, cost, input_tokens, output_tokens, files_modified, created_at
      FROM agentic_iterations
      WHERE session_id = ?
      ORDER BY iteration DESC
      LIMIT 10
    `).bind(sessionId).all();

    // Get recent events
    const events = await platform!.env.DB.prepare(`
      SELECT event_type, event_data, created_at
      FROM agentic_events
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(sessionId).all();

    // Get checkpoints
    const checkpoints = await platform!.env.DB.prepare(`
      SELECT iteration, cost_consumed, files_modified, conversation_length, created_at
      FROM agentic_checkpoints
      WHERE session_id = ?
      ORDER BY iteration DESC
      LIMIT 5
    `).bind(sessionId).all();

    return json({
      session: {
        id: session.id,
        issueId: session.issue_id,
        epicId: session.epic_id,
        convoyId: session.convoy_id,
        status: session.status,
        iteration: session.iteration,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        terminationReason: session.termination_reason
      },
      budget,
      preview: session.preview_url,
      qualityReports: session.quality_reports ? JSON.parse(session.quality_reports as string) : null,
      reviewStatus: session.review_status,
      iterations: iterations.results.map((i: any) => ({
        iteration: i.iteration,
        cost: i.cost,
        tokens: {
          input: i.input_tokens,
          output: i.output_tokens,
          total: i.input_tokens + i.output_tokens
        },
        filesModified: i.files_modified,
        createdAt: i.created_at
      })),
      events: events.results.map((e: any) => ({
        type: e.event_type,
        data: e.event_data ? JSON.parse(e.event_data) : null,
        createdAt: e.created_at
      })),
      checkpoints: checkpoints.results.map((c: any) => ({
        iteration: c.iteration,
        costConsumed: c.cost_consumed,
        filesModified: c.files_modified ? JSON.parse(c.files_modified) : [],
        conversationLength: c.conversation_length,
        createdAt: c.created_at
      }))
    });

  } catch (err: any) {
    console.error('Session status fetch failed', err);
    if (err.status) throw err;
    throw error(500, `Failed to fetch session status: ${err.message}`);
  }
};
