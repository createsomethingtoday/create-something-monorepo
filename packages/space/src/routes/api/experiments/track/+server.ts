import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface TrackingRequest {
  action: 'start' | 'command' | 'complete' | 'error'
  paper_id: string
  session_id: string
  command?: string
  error_message?: string
  metrics?: any
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json() as TrackingRequest
    const { action, paper_id, session_id, command, error_message, metrics } = body

    const DB = platform?.env?.DB
    const KV_SESSIONS = platform?.env?.SESSIONS

    if (!DB || !KV_SESSIONS) {
      return json({ error: 'Database not available' }, { status: 503 })
    }

    // Get or create session metrics in KV (fast, temporary storage)
    const sessionKey = `experiment:${session_id}`
    let sessionData = await KV_SESSIONS.get(sessionKey, 'json') as any

    if (!sessionData) {
      sessionData = {
        paper_id,
        session_id,
        start_time: Date.now(),
        commands_executed: [],
        errors_count: 0,
        completed: false
      }
    }

    // Update session based on action
    switch (action) {
      case 'start':
        // Session already initialized above
        break

      case 'command':
        sessionData.commands_executed.push({
          command,
          timestamp: Date.now(),
          success: true
        })
        break

      case 'error':
        sessionData.errors_count++
        sessionData.last_error = {
          message: error_message,
          timestamp: Date.now()
        }
        // Also record the failed command
        if (command) {
          sessionData.commands_executed.push({
            command,
            timestamp: Date.now(),
            success: false,
            error: error_message
          })
        }
        break

      case 'complete':
        sessionData.completed = true
        sessionData.end_time = Date.now()

        // Save to D1 for long-term analytics
        await DB.prepare(`
          INSERT INTO experiment_executions (
            paper_id, user_session_id, commands_executed,
            time_spent_seconds, errors_encountered, completed, metrics
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          paper_id,
          session_id,
          JSON.stringify(sessionData.commands_executed),
          Math.floor((sessionData.end_time - sessionData.start_time) / 1000),
          sessionData.errors_count,
          1,
          JSON.stringify(metrics || sessionData)
        ).run()
        break
    }

    // Update KV with session data (expires in 24 hours)
    await KV_SESSIONS.put(sessionKey, JSON.stringify(sessionData), {
      expirationTtl: 86400 // 24 hours
    })

    return json({
      success: true,
      session: sessionData,
      action
    })

  } catch (error) {
    console.error('Tracking error:', error)
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
