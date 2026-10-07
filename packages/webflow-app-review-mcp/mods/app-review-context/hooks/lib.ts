import type { ContextExceptionItem, ContextSnapshot, ContextTicket, ContextVersionRow } from '../types'

type McpLike = { content?: Array<{ type?: string; text?: string }>; structuredContent?: unknown; isError?: boolean }
type Obj = Record<string, unknown>

export function mcpJson(result: McpLike): unknown {
  if (result.structuredContent !== undefined && result.structuredContent !== null) return result.structuredContent
  const text = (result.content ?? []).find(b => b.type === 'text' && typeof b.text === 'string')?.text
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** JSON from a tool.call result the model saw (text or record). */
export function resultJson(ran: { text?: string; result?: unknown }): unknown {
  const raw = ran.text ?? (typeof ran.result === 'string' ? ran.result : null)
  if (raw !== null) {
    const start = raw.indexOf('{')
    if (start < 0) return null
    try {
      return JSON.parse(raw.slice(start))
    } catch {
      return null
    }
  }
  return ran.result ?? null
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const obj = (v: unknown): Obj => (v !== null && typeof v === 'object' ? (v as Obj) : {})

export function reviewerName(v: unknown): string | null {
  const r = obj(v)
  return str(r.name) || str(r.email) || null
}

export const HISTORY_WINDOW = 12

/** The context part of a snapshot from an app_review_get_review_context payload. */
export function parseContext(payload: unknown, fetchedAt: number): ContextSnapshot | null {
  const ctx = obj(obj(obj(payload).data).context)
  if (!ctx.versionId) return null
  const asset = obj(ctx.asset)
  const version = obj(ctx.version)
  const notes = str(asset.notes)
  const notesHint = /api[\s_-]?key|password|token|credential|login/i.test(notes) ? 'Creator notes carry credentials for the reviewer' : null
  const payment = Array.isArray(asset.paymentTimes) ? asset.paymentTimes.map(String).join(', ') : str(asset.paymentTimes)
  const urls: Record<string, string> = {}
  const urlFields: Array<[string, string]> = [
    ['website', 'websiteUrl'],
    ['privacy', 'privacyPolicyUrl'],
    ['terms', 'termsAndConditionsUrl'],
    ['support', 'supportEmailOrUrl'],
    ['demo video', 'demoVideoUrl'],
    ['install', 'installUrl'],
    ['listing', 'previewSiteUrl'],
    ['workspace', 'workspaceDashboardUrl'],
  ]
  for (const [label, key] of urlFields) if (str(asset[key])) urls[label] = str(asset[key])
  return {
    versionId: str(ctx.versionId),
    assetId: str(ctx.assetId) || str(asset.assetId),
    appName: str(ctx.appName) || str(asset.appName) || '(unnamed)',
    capability: str(asset.appCapabilities, '—'),
    versionNumber: num(version.versionNumber),
    reviewType: str(ctx.reviewType) || str(version.reviewType),
    reviewStatus: str(ctx.reviewStatus) || str(version.reviewStatus),
    days: num(version.daysInCurrentStage ?? asset.daysInCurrentReviewStage),
    reviewer: reviewerName(ctx.reviewer ?? version.reviewer),
    marketplaceStatus: str(asset.marketplaceStatus),
    visibility: str(asset.visibilityStatus),
    payment,
    submittedAt: str(version.submissionDatetime),
    clientId: str(asset.clientId),
    zendeskTicketId: str(version.zendeskTicketId) || null,
    urls,
    iconAlt: str(asset.iconImageAltText),
    carouselCount: Array.isArray(asset.carouselImageUrls) ? asset.carouselImageUrls.length : 0,
    notesHint,
    history: null,
    exceptions: {
      undecided: num(version.undecidedExceptionItems),
      denied: num(version.deniedExceptionItems),
      assetUndecided: num(version.assetUndecidedExceptions),
      assetApproved: num(version.assetApprovedExceptions),
      items: [],
    },
    tickets: null,
    flags: [],
    fetchedAt,
    error: null,
  }
}

export function parseHistory(payload: unknown): { total: number; rejectedRecent: number; window: number; rows: ContextVersionRow[] } {
  const versions = obj(obj(payload).data).versions
  const list = Array.isArray(versions) ? versions.map(obj) : []
  const sorted = [...list].sort((a, b) => Date.parse(str(b.submissionDatetime)) - Date.parse(str(a.submissionDatetime)))
  const recent = sorted.slice(0, HISTORY_WINDOW)
  return {
    total: num(obj(obj(payload).data).count) || list.length,
    rejectedRecent: recent.filter(v => /rejected/i.test(str(v.reviewStatus))).length,
    window: recent.length,
    rows: recent.slice(0, 6).map(v => ({
      n: num(v.versionNumber),
      type: str(v.reviewType),
      status: str(v.reviewStatus).replace(/^[^\w]+/, ''),
      reason: str(v.rejectionReason) || null,
      date: str(v.submissionDatetime).slice(0, 10),
    })),
  }
}

export function parseExceptionItems(payload: unknown): ContextExceptionItem[] {
  const items = obj(obj(payload).data).exception_items
  if (!Array.isArray(items)) return []
  return items.map(raw => {
    const r = obj(raw)
    const fields = obj(r.fields)
    const label = str(r.title) || str(r.name) || str(r.summary) || str(fields.Title) || str(fields.Name) || str(r.id) || 'item'
    const status = str(r.status) || str(r.decision) || str(fields.Status) || str(fields.Decision) || 'undecided'
    return { label: label.slice(0, 80), status }
  })
}

export function parseTickets(payload: unknown): ContextTicket[] {
  const tickets = obj(obj(payload).data).tickets
  if (!Array.isArray(tickets)) return []
  return tickets.map(obj).map(t => ({ id: str(t.ticketId), status: str(t.status), updatedAt: str(t.updatedAt).slice(0, 10) }))
}

/** Versions in the queue whose app name matches, newest first. */
export function matchQueue(payload: unknown, needle: string): Array<{ versionId: string; appName: string; status: string; submittedAt: string }> {
  const records = obj(obj(payload).data).records
  if (!Array.isArray(records)) return []
  const q = needle.trim().toLowerCase()
  return records
    .map(obj)
    .filter(r => str(r.appName).toLowerCase().includes(q))
    .map(r => ({ versionId: str(r.assignableVersionId), appName: str(r.appName), status: str(r.normalizedStatus), submittedAt: str(r.submissionDatetime) }))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
}

export function isRecordId(s: string): boolean {
  return /^rec[A-Za-z0-9]{14}$/.test(s.trim())
}

/** What a reviewer should notice first. */
export function computeFlags(s: ContextSnapshot): string[] {
  const flags: string[] = []
  if (s.exceptions.undecided > 0 || s.exceptions.assetUndecided > 0) flags.push(`Cannot approve: ${s.exceptions.undecided || s.exceptions.assetUndecided} undecided exception item(s)`)
  if (s.days >= 10) flags.push(`Aging: ${s.days} days in ${s.reviewStatus.replace(/^[^\w]+/, '')}`)
  if (s.history && s.history.rejectedRecent >= 3) flags.push(`Repeat: ${s.history.rejectedRecent} of the last ${s.history.window} versions were rejected`)
  if (/hybrid|data client/i.test(s.capability)) flags.push('Data Client surface: scopes, Install URL state, backend auth, uninstall cleanup are in scope')
  if (/paid/i.test(s.payment)) flags.push('Paid: pricing must be disclosed in notes or listing')
  if (/published/i.test(s.marketplaceStatus) && /update/i.test(s.reviewType)) flags.push('Live app: customers run the current version while this one is reviewed')
  if (s.notesHint) flags.push(s.notesHint)
  if (!s.urls.privacy || !s.urls.terms) flags.push('Legal URL missing on the listing')
  if (s.urls.privacy && s.urls.terms && s.urls.privacy.replace(/\/+$/, '') === s.urls.terms.replace(/\/+$/, '')) flags.push('Privacy and terms share one URL')
  if (!s.urls['demo video']) flags.push('No demo video URL')
  if (s.carouselCount < 3) flags.push(`${s.carouselCount} screenshots on the listing`)
  return flags
}

export function statusLine(s: ContextSnapshot): string {
  const who = s.reviewer ? s.reviewer.split(' ')[0] : 'unassigned'
  return `${s.appName} v${s.versionNumber} · ${s.reviewType} · ${s.days}d · ${who}${s.flags.length ? ` · ${s.flags.length} flag${s.flags.length === 1 ? '' : 's'}` : ''}`
}
