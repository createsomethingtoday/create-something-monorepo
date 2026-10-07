export type ContextVersionRow = { n: number; type: string; status: string; reason: string | null; date: string }
export type ContextTicket = { id: string; status: string; updatedAt: string }
export type ContextExceptionItem = { label: string; status: string }

export type ContextSnapshot = {
  versionId: string
  assetId: string
  appName: string
  capability: string
  versionNumber: number
  reviewType: string
  reviewStatus: string
  days: number
  reviewer: string | null
  marketplaceStatus: string
  visibility: string
  payment: string
  submittedAt: string
  clientId: string
  zendeskTicketId: string | null
  urls: Record<string, string>
  iconAlt: string
  carouselCount: number
  notesHint: string | null
  history: { total: number; rejectedRecent: number; window: number; rows: ContextVersionRow[] } | null
  exceptions: { undecided: number; denied: number; assetUndecided: number; assetApproved: number; items: ContextExceptionItem[] }
  tickets: ContextTicket[] | null
  flags: string[]
  fetchedAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'app-review-context': { current: ContextSnapshot | null }
  }
}
