import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { ExperimentStats } from '$lib/types/paper'

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { paper_id } = params
    const DB = platform?.env?.DB

    if (!DB) {
      return json({ error: 'Database not available' }, { status: 503 })
    }

    // Get aggregate stats for this experiment
    const stats = await DB.prepare(`
      SELECT
        COUNT(*) as total_executions,
        SUM(completed) as completed_count,
        AVG(time_spent_seconds) as avg_time_seconds,
        AVG(errors_encountered) as avg_errors,
        SUM(errors_encountered) as total_errors,
        MIN(time_spent_seconds) as fastest_time,
        MAX(time_spent_seconds) as slowest_time
      FROM experiment_executions
      WHERE paper_id = ?
    `).bind(paper_id).first() as ExperimentStats & { fastest_time: number; slowest_time: number }

    // Get recent executions (last 10)
    const recentExecutions = await DB.prepare(`
      SELECT
        user_session_id,
        time_spent_seconds,
        errors_encountered,
        completed,
        executed_at
      FROM experiment_executions
      WHERE paper_id = ?
      ORDER BY executed_at DESC
      LIMIT 10
    `).bind(paper_id).all()

    // Calculate completion rate
    const completionRate = stats.total_executions > 0
      ? Math.round((stats.completed_count / stats.total_executions) * 100)
      : 0

    return json({
      success: true,
      paper_id,
      stats: {
        ...stats,
        completion_rate: completionRate,
        avg_time_seconds: Math.round(stats.avg_time_seconds || 0),
        avg_errors: Math.round(stats.avg_errors || 0)
      },
      recent_executions: recentExecutions.results
    })

  } catch (error) {
    console.error('Stats error:', error)
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
