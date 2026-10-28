export type QueueRow = {
  assetId: string
  versionId: string
  appName: string
  status: string
  days: number
  reviewType: string
  capability: string
  reviewer: string | null
  submittedAt: string
}

export type TrendMonth = { month: string; rejected: number; approved: number; decided: number; rate: number | null }

export type QueueTrend = { months: TrendMonth[]; fetchedAt: number; error: string | null }

export type QueueSnapshot = {
  counts: Record<string, number>
  rows: QueueRow[]
  fetchedAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'review-queue': { snapshot: QueueSnapshot | null; trend: QueueTrend | null; isBandHidden: boolean }
  }
}
