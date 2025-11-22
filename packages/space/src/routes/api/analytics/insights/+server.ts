import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { AggregateInsights } from '$lib/services/learning-analytics'

/**
 * Aggregate Insights API
 *
 * Returns collective learning patterns for mechanism design.
 * Used to determine optimal intervention timing.
 */

export const GET: RequestHandler = async ({ url, platform }) => {
  const paperId = url.searchParams.get('paperId')
  const stepIndex = url.searchParams.get('stepIndex')

  if (!paperId || stepIndex === null) {
    return json({ error: 'Missing paperId or stepIndex' }, { status: 400 })
  }

  try {
    const db = platform?.env?.DB

    if (!db) {
      // Return default insights in development
      const defaultInsights: AggregateInsights = {
        paperId,
        stepIndex: parseInt(stepIndex),
        totalAttempts: 0,
        successRate: 0.75,
        medianTimeToComplete: 60000, // 60 seconds default
        commonErrors: [],
        struggleRate: 0.25
      }
      return json(defaultInsights, { status: 200 })
    }

    // Get aggregate statistics for this step
    const stats = await db
      .prepare(
        `
      SELECT
        COUNT(DISTINCT session_id) as total_attempts,
        AVG(CASE WHEN action = 'step_complete' THEN 1 ELSE 0 END) as success_rate,
        AVG(time_on_step) as avg_time,
        COUNT(CASE WHEN action = 'step_error' THEN 1 END) /
          COUNT(DISTINCT session_id) as struggle_rate
      FROM learning_events
      WHERE paper_id = ? AND step_index = ?
      GROUP BY paper_id, step_index
    `
      )
      .bind(paperId, parseInt(stepIndex))
      .first()

    // Get median time (more accurate than average for skewed distributions)
    const medianResult = await db
      .prepare(
        `
      SELECT time_on_step
      FROM learning_events
      WHERE paper_id = ? AND step_index = ? AND time_on_step IS NOT NULL
      ORDER BY time_on_step
      LIMIT 1 OFFSET (
        SELECT COUNT(*) / 2
        FROM learning_events
        WHERE paper_id = ? AND step_index = ? AND time_on_step IS NOT NULL
      )
    `
      )
      .bind(paperId, parseInt(stepIndex), paperId, parseInt(stepIndex))
      .first()

    // Get common error patterns (if we're tracking error messages)
    const errorPatterns = await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM learning_events
      WHERE paper_id = ? AND step_index = ? AND action = 'step_error'
    `
      )
      .bind(paperId, parseInt(stepIndex))
      .first()

    const insights: AggregateInsights = {
      paperId,
      stepIndex: parseInt(stepIndex),
      totalAttempts: (stats?.total_attempts as number) || 0,
      successRate: (stats?.success_rate as number) || 0.75,
      medianTimeToComplete: (medianResult?.time_on_step as number) || 60000,
      commonErrors: [], // Could extract from error messages if stored
      struggleRate: (stats?.struggle_rate as number) || 0.25
    }

    return json(insights, { status: 200 })
  } catch (error) {
    console.error('Error calculating insights:', error)
    return json({ error: 'Failed to calculate insights' }, { status: 500 })
  }
}
