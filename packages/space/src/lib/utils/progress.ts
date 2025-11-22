/**
 * Progress Persistence Utilities
 *
 * Enables users to resume experiments across sessions.
 * Stores progress in Cloudflare KV with 7-day expiration.
 */

export interface ProgressState {
  paperId: string
  sessionId: string
  currentStep: number
  completedSteps: number[]
  codeState?: Record<number, string> // lesson index -> user code
  terminalHistory?: string[]
  timestamp: number
  experimentType: 'terminal' | 'code'
}

const PROGRESS_TTL = 604800 // 7 days in seconds

/**
 * Generate a persistent progress key based on paper ID
 * Uses browser fingerprint + paper ID for consistency
 */
export function getProgressKey(paperId: string): string {
  // Simple browser fingerprint (not for security, just consistency)
  const fingerprint = typeof window !== 'undefined'
    ? btoa(`${navigator.userAgent}-${screen.width}x${screen.height}`)
    : 'server'

  return `progress:${paperId}:${fingerprint.slice(0, 16)}`
}

/**
 * Save progress to KV storage
 */
export async function saveProgress(
  paperId: string,
  state: Omit<ProgressState, 'paperId' | 'timestamp'>
): Promise<void> {
  const progressState: ProgressState = {
    ...state,
    paperId,
    timestamp: Date.now()
  }

  const key = getProgressKey(paperId)

  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, state: progressState, ttl: PROGRESS_TTL })
    })
  } catch (error) {
    console.warn('Failed to save progress:', error)
    // Fail silently - don't interrupt user experience
  }
}

/**
 * Load progress from KV storage
 */
export async function loadProgress(paperId: string): Promise<ProgressState | null> {
  const key = getProgressKey(paperId)

  try {
    const response = await fetch(`/api/progress?key=${encodeURIComponent(key)}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.state as ProgressState
  } catch (error) {
    console.warn('Failed to load progress:', error)
    return null
  }
}

/**
 * Clear progress from KV storage
 */
export async function clearProgress(paperId: string): Promise<void> {
  const key = getProgressKey(paperId)

  try {
    await fetch('/api/progress', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
  } catch (error) {
    console.warn('Failed to clear progress:', error)
  }
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(completedSteps: number[], totalSteps: number): number {
  if (totalSteps === 0) return 0
  return Math.round((completedSteps.length / totalSteps) * 100)
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
