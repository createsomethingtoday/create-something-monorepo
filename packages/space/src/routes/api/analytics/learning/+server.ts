import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { LearningEvent } from '$lib/services/learning-analytics'

/**
 * Learning Analytics API
 *
 * Stores learning events in D1 for mechanism design analysis.
 * DRY: Single endpoint for all learning analytics.
 */

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const event: LearningEvent = await request.json()

    // Validate required fields
    if (!event.paperId || !event.sessionId || event.stepIndex === undefined) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = platform?.env?.DB

    if (!db) {
      // In development, log to console
      console.log('Learning event:', event)
      return json({ success: true }, { status: 200 })
    }

    // Store in D1 for aggregate analysis
    await db
      .prepare(
        `
      INSERT INTO learning_events (
        paper_id, session_id, experiment_type, step_index, step_id,
        action, time_on_step, error_count, retry_count, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        event.paperId,
        event.sessionId,
        event.experimentType,
        event.stepIndex,
        event.stepId || null,
        event.action,
        event.timeOnStep || null,
        event.errorCount || null,
        event.retryCount || null,
        event.timestamp
      )
      .run()

    return json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error storing learning event:', error)
    return json({ error: 'Failed to store learning event' }, { status: 500 })
  }
}

/**
 * Get learning events for a session (for debugging)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    return json({ error: 'Missing sessionId parameter' }, { status: 400 })
  }

  try {
    const db = platform?.env?.DB

    if (!db) {
      return json({ error: 'Database not available' }, { status: 503 })
    }

    const result = await db
      .prepare(
        `
      SELECT * FROM learning_events
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `
      )
      .bind(sessionId)
      .all()

    return json({ events: result.results }, { status: 200 })
  } catch (error) {
    console.error('Error loading learning events:', error)
    return json({ error: 'Failed to load learning events' }, { status: 500 })
  }
}
