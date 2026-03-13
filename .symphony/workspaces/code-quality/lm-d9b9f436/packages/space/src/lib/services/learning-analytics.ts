/**
 * Learning Analytics Service
 *
 * Game-theoretic mechanism design: Detect struggle patterns and optimize learning flow.
 * DRY: Single source of truth for analytics across terminal and code experiments.
 */

export interface LearningEvent {
  paperId: string
  sessionId: string
  experimentType: 'terminal' | 'code'
  stepIndex: number
  stepId?: string
  action: 'step_start' | 'step_complete' | 'step_error' | 'hint_shown' | 'hint_helpful'
  timeOnStep?: number // milliseconds
  errorCount?: number
  retryCount?: number
  timestamp: number
}

export interface StruggleSignals {
  isStruggling: boolean
  confidence: number // 0-1
  signals: {
    timeExceeded: boolean
    errorThreshold: boolean
    multipleRetries: boolean
  }
  recommendation: 'wait' | 'hint' | 'alternative_approach'
}

export interface AggregateInsights {
  paperId: string
  stepIndex: number
  totalAttempts: number
  successRate: number
  medianTimeToComplete: number
  commonErrors: string[]
  struggleRate: number
}

/**
 * Track learning event to analytics endpoint
 */
export async function trackLearningEvent(event: Omit<LearningEvent, 'timestamp'>): Promise<void> {
  try {
    await fetch('/api/analytics/learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: Date.now()
      })
    })
  } catch (error) {
    // Fail silently - don't interrupt learning experience
    console.warn('Failed to track learning event:', error)
  }
}

/**
 * Detect struggle signals using game-theoretic thresholds
 *
 * Nash equilibrium: When should we intervene to maximize learning outcome?
 * - Too early: User doesn't get productive struggle
 * - Too late: User gives up
 *
 * Optimal strategy: Intervene when P(giving up) > P(breakthrough)
 */
export function detectStruggle(
  timeOnStep: number,
  errorCount: number,
  retryCount: number,
  medianTime: number = 60000, // Default 60s median
  maxErrors: number = 3,
  maxRetries: number = 2
): StruggleSignals {
  // Time-based signal: Exceeding 2x median suggests struggle
  const timeExceeded = timeOnStep > medianTime * 2

  // Error-based signal: Multiple errors indicate confusion
  const errorThreshold = errorCount >= maxErrors

  // Retry-based signal: Repeated resets show lack of direction
  const multipleRetries = retryCount >= maxRetries

  // Count active signals
  const signalCount = [timeExceeded, errorThreshold, multipleRetries].filter(Boolean).length

  // Confidence in struggle detection (0-1)
  const confidence = signalCount / 3

  // Game-theoretic decision: What's the optimal intervention?
  let recommendation: StruggleSignals['recommendation'] = 'wait'

  if (signalCount >= 2) {
    // High confidence struggle: Show contextual hint
    recommendation = 'hint'
  } else if (signalCount === 1 && timeExceeded) {
    // Just slow, not necessarily stuck: Suggest alternative approach
    recommendation = 'alternative_approach'
  }

  return {
    isStruggling: signalCount >= 2,
    confidence,
    signals: {
      timeExceeded,
      errorThreshold,
      multipleRetries
    },
    recommendation
  }
}

/**
 * Calculate optimal hint timing (game-theoretic)
 *
 * Returns delay in milliseconds before showing hint
 */
export function calculateHintDelay(
  currentTime: number,
  medianTime: number,
  errorCount: number
): number {
  // Base delay: 1.5x median time (allow productive struggle)
  let delay = medianTime * 1.5

  // Adjust based on errors (more errors = faster hint)
  if (errorCount > 0) {
    delay = delay * (1 - (errorCount * 0.2)) // Reduce by 20% per error
  }

  // Minimum delay: 30 seconds (always allow initial attempt)
  delay = Math.max(delay, 30000)

  // Maximum delay: 5 minutes (prevent abandonment)
  delay = Math.min(delay, 300000)

  return delay - currentTime
}

/**
 * Aggregate insights from KV analytics data
 * This would typically query a D1 database or KV namespace
 */
export async function getAggregateInsights(
  paperId: string,
  stepIndex: number
): Promise<AggregateInsights | null> {
  try {
    const response = await fetch(
      `/api/analytics/insights?paperId=${paperId}&stepIndex=${stepIndex}`
    )

    if (!response.ok) return null

    return await response.json()
  } catch (error) {
    console.warn('Failed to load aggregate insights:', error)
    return null
  }
}

/**
 * Get personalized difficulty assessment
 * Compares user's performance to aggregate data
 */
export function assessDifficulty(
  userTime: number,
  userErrors: number,
  aggregateData: AggregateInsights | null
): 'easy' | 'medium' | 'hard' {
  if (!aggregateData) return 'medium' // Default if no data

  const relativeTime = userTime / aggregateData.medianTimeToComplete
  const relativeErrors = userErrors

  // Game theory: Classify based on deviation from median
  if (relativeTime < 0.75 && relativeErrors === 0) return 'easy'
  if (relativeTime > 1.5 || relativeErrors >= 2) return 'hard'
  return 'medium'
}
