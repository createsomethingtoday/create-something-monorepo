import type { Review, ReviewStep } from '../types'

const TOOL_RE = /template_review_([a-z_]+)$/
const PROXY_RE = /hub_execute_proxy_tool$/

type Args = Record<string, unknown>
export type Call = { name: string; args: Args }

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export function resolveCall(e: { tool: string } & Args): Call | null {
  const direct = TOOL_RE.exec(String(e.tool))
  if (direct?.[1]) return { name: direct[1], args: e }
  if (!PROXY_RE.test(String(e.tool))) return null
  const proxied = TOOL_RE.exec(str(e.proxyToolName) ?? '')
  if (!proxied?.[1]) return null
  const raw = e.arguments ?? e.args ?? e.input ?? e.params
  return { name: proxied[1], args: raw !== null && typeof raw === 'object' ? (raw as Args) : {} }
}

const STEP_OF: Record<string, ReviewStep> = {
  get_review_context: 'context',
  assign_self: 'assigned',
  run_published_site_validation: 'validated',
  capture_published_site_screenshots: 'screenshots',
  run_published_site_sandbox: 'sandbox',
  fetch_published_site_stylesheet: 'stylesheet',
  get_ticket_thread: 'ticket',
  save_draft_feedback: 'draft',
  save_agent_feedback: 'notes',
}

function decisionOf({ name, args }: Call): string | null {
  switch (name) {
    case 'request_changes':
      return 'Changes Requested'
    case 'approve_version':
      return 'Approved'
    case 'reject_version':
      return 'Rejected'
    case 'complete_publishing':
      return args.approve_version === true ? 'Approved + release' : 'Release attached'
    case 'update_version_review':
      return str(args.review_status)
    default:
      return null
  }
}

function pick(text: string, keys: readonly string[], valueRe = '[^"\\n]+'): string | null {
  for (const key of keys) {
    const m = new RegExp(`"${key}"\\s*:\\s*"(${valueRe})"`).exec(text)
    if (m?.[1]) return m[1]
  }
  return null
}

export type Observed = {
  versionId: string | null
  step: ReviewStep | null
  decision: string | null
  name: string | null
  url: string | null
  gallery: string | null
  notes: boolean
  /** The context says the current reviewer already owns this version. */
  owned: boolean
}

/** What one successful call tells us about a review. `text` is the result as the model read it. */
export function observe(call: Call, text: string): Observed {
  const step = STEP_OF[call.name] ?? null
  // Never the Preview URL: review evidence comes from the published site only.
  const url = str(call.args.published_url) ?? pick(text, ['published_url', 'publishedUrl', 'websiteUrl', 'website_url', 'live_url'], 'https?://[^"\\s]+')
  const owned = call.name === 'get_review_context' && /"isAssignedToCurrentReviewer"\s*:\s*true/.test(text)
  return {
    versionId: str(call.args.version_id),
    step,
    owned,
    decision: decisionOf(call),
    name: call.name === 'get_review_context' ? pick(text, ['template_name', 'templateName', 'asset_name', 'assetName', 'name']) : null,
    url,
    gallery: call.name === 'capture_published_site_screenshots' ? pick(text, ['gallery_url', 'galleryUrl'], 'https?://[^"\\s]+') : null,
    notes: call.name === 'update_version_review' && str(call.args.agent_review_feedback) !== null,
  }
}

export function apply(reviews: Review[], current: string | null, seen: Observed, now: number): { reviews: Review[]; current: string | null } {
  const id = seen.versionId ?? current
  if (id === null) return { reviews, current }
  const existing = reviews.find(r => r.id === id)
  const base: Review = existing ?? { id, name: null, url: null, gallery: null, steps: [], decision: null, updatedAt: now }
  const steps = new Set<ReviewStep>(base.steps)
  if (seen.step !== null) steps.add(seen.step)
  if (seen.notes) steps.add('notes')
  if (seen.owned) steps.add('assigned')
  const next: Review = {
    ...base,
    name: seen.name ?? base.name,
    url: seen.url ?? base.url,
    gallery: seen.gallery ?? base.gallery,
    steps: [...steps],
    decision: seen.decision ?? base.decision,
    updatedAt: now,
  }
  const rest = reviews.filter(r => r.id !== id)
  return { reviews: [...rest, next].slice(-30), current: id }
}

export const STEP_LABELS: readonly { step: ReviewStep; short: string }[] = [
  { step: 'context', short: 'ctx' },
  { step: 'assigned', short: 'own' },
  { step: 'validated', short: 'val' },
  { step: 'screenshots', short: 'shots' },
  { step: 'sandbox', short: 'dom' },
  { step: 'ticket', short: 'zd' },
  { step: 'draft', short: 'draft' },
  { step: 'notes', short: 'notes' },
]

export function summarize(review: Review): string {
  const steps = STEP_LABELS.map(({ step, short }) => `${short} ${review.steps.includes(step) ? '✓' : '·'}`).join('  ')
  const decision = review.decision === null ? 'decision ·' : `decision ${review.decision}`
  return `${steps}  ${decision}`
}

export function label(review: Review): string {
  return review.name === null ? review.id : `${review.name} (${review.id.slice(0, 7)}…)`
}
