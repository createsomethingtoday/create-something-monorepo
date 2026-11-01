import type { QueueRow, TrendMonth } from '../types'

export const OPEN_STATUSES = ['ready_to_review', 'in_review', 'changes_requested', 'on_hold'] as const

type McpLike = { content?: Array<{ type?: string; text?: string }>; structuredContent?: unknown; isError?: boolean }

/** The JSON an App Review MCP tool returns, from structuredContent or the first text block. */
export function mcpJson(result: McpLike): unknown {
  if (result.structuredContent !== undefined && result.structuredContent !== null) return result.structuredContent
  const text = (result.content ?? []).find(block => block.type === 'text' && typeof block.text === 'string')?.text
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function parseStats(payload: unknown): Record<string, number> {
  const counts: Record<string, number> = {}
  const groups = (payload as { data?: { groups?: Array<{ key?: unknown; count?: unknown }> } })?.data?.groups
  if (!Array.isArray(groups)) return counts
  for (const g of groups) if (typeof g.key === 'string') counts[g.key] = Number(g.count ?? 0)
  return counts
}

export function parseQueue(payload: unknown): QueueRow[] {
  const records = (payload as { data?: { records?: unknown[] } })?.data?.records
  if (!Array.isArray(records)) return []
  return records.map(raw => {
    const r = raw as Record<string, unknown>
    const reviewer = r.reviewer as { name?: unknown; email?: unknown } | null | undefined
    return {
      assetId: String(r.assetId ?? ''),
      versionId: String(r.assignableVersionId ?? ''),
      appName: String(r.appName ?? '(unnamed)'),
      status: String(r.normalizedStatus ?? ''),
      days: Number(r.daysInCurrentReviewStage ?? 0),
      reviewType: String(r.reviewType ?? ''),
      capability: String(r.appCapabilities ?? ''),
      reviewer: reviewer && typeof reviewer.name === 'string' ? reviewer.name : reviewer && typeof reviewer.email === 'string' ? reviewer.email : null,
      submittedAt: String(r.submissionDatetime ?? ''),
    }
  })
}

export function statusLabel(status: string): string {
  return { ready_to_review: 'ready', in_review: 'in review', changes_requested: 'changes requested', on_hold: 'on hold' }[status] ?? status
}

export function countsLine(counts: Record<string, number>): string {
  return OPEN_STATUSES.map(s => `${counts[s] ?? 0} ${statusLabel(s)}`).join(' · ')
}

export function shortCapability(capability: string): string {
  if (/hybrid/i.test(capability)) return 'Hybrid'
  if (/data client/i.test(capability)) return 'Data Client'
  if (/designer/i.test(capability)) return 'DE'
  return capability || '—'
}

/** One pane row, fitted to the column budget. */
export function formatRow(row: QueueRow, columns: number): string {
  const age = `${String(row.days).padStart(3)}d`
  const who = row.reviewer ? row.reviewer.split(' ')[0] ?? row.reviewer : 'unassigned'
  const tail = ` ${shortCapability(row.capability).padEnd(11)} ${row.reviewType.padEnd(12)} ${who}`
  const room = Math.max(8, columns - age.length - tail.length - 2)
  const name = row.appName.length > room ? `${row.appName.slice(0, room - 1)}…` : row.appName.padEnd(room)
  return `${age} ${name}${tail}`
}

/** Monthly rejection rate from queue_stats grouped by month then status. */
export function parseTrend(payload: unknown): TrendMonth[] {
  const groups = (payload as { data?: { groups?: Array<{ key?: unknown; breakdown?: Array<{ key?: unknown; count?: unknown }> }> } })?.data?.groups
  if (!Array.isArray(groups)) return []
  return groups
    .filter(g => typeof g.key === 'string')
    .map(g => {
      const by: Record<string, number> = {}
      for (const b of g.breakdown ?? []) if (typeof b.key === 'string') by[b.key] = Number(b.count ?? 0)
      const rejected = by.rejected ?? 0
      const approved = by.approved ?? 0
      const decided = rejected + approved
      return { month: String(g.key), rejected, approved, decided, rate: decided > 0 ? rejected / decided : null }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export function sparkline(months: TrendMonth[]): string {
  return months.map(m => (m.rate === null ? '·' : BARS[Math.min(BARS.length - 1, Math.floor(m.rate * BARS.length))])).join('')
}

export function monthLabel(month: string): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = Number(month.slice(5, 7)) - 1
  return names[idx] ?? month
}

export function trendLine(months: TrendMonth[]): string {
  if (months.length === 0) return 'rejection rate: no data'
  const tail = months.slice(-3).map(m => `${monthLabel(m.month)} ${m.rate === null ? '—' : `${Math.round(m.rate * 100)}%`}${m.decided < 20 ? '*' : ''}`).join('  ')
  return `rejection rate ${sparkline(months)}  ${tail}`
}

/** The first day of the month `count` months before the one holding `nowMs`, as YYYY-MM-DD. */
export function windowStart(nowMs: number, count: number): string {
  const d = new Date(nowMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() - count
  const start = new Date(Date.UTC(y, m, 1))
  return start.toISOString().slice(0, 10)
}
