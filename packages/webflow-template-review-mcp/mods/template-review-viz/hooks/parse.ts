/** Pure readers over Template Review MCP results. No engine access. */
import type { VizCapture, VizSegment } from '../types'

export type Json = Record<string, unknown>

export function suffixOf(tool: string): string | null {
  return /template_review_([a-z_]+)$/.exec(tool)?.[1] ?? null
}

/** Hub tool identity and arguments live inside the proxy envelope. */
export function resolveCall(tool: string, input: unknown): { name: string; args: Json } | null {
  const args = input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Json : {}
  const direct = suffixOf(tool)
  if (direct !== null) return { name: direct, args }
  if (!/hub_execute_proxy_tool$/.test(tool)) return null
  const name = suffixOf(str(args.proxyToolName) ?? '')
  if (name === null) return null
  const raw = args.arguments ?? args.args ?? args.input ?? args.params
  return { name, args: raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Json : {} }
}

/** The text of a tool result however the row carries it: a string, MCP content blocks, or an object. */
export function textOf(output: unknown): string | null {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    const parts = output.map(block => (block !== null && typeof block === 'object' && typeof (block as Json).text === 'string' ? ((block as Json).text as string) : ''))
    const joined = parts.join('\n').trim()
    return joined.length > 0 ? joined : null
  }
  if (output !== null && typeof output === 'object') {
    const content = (output as Json).content
    if (Array.isArray(content)) return textOf(content)
    try {
      return JSON.stringify(output)
    } catch {
      return null
    }
  }
  return null
}

export function jsonOf(output: unknown): Json | null {
  if (output !== null && typeof output === 'object' && !Array.isArray(output) && !('content' in (output as Json))) return output as Json
  const text = textOf(output)
  if (text === null) return null
  const start = text.indexOf('{')
  if (start < 0) return null
  try {
    const parsed: unknown = JSON.parse(text.slice(start))
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Json) : null
  } catch {
    return null
  }
}

/** First value under `key`, breadth-first, so a wrapper like `{ ok, data }` never matters. */
export function find(root: unknown, key: string, depth = 6): unknown {
  const queue: { node: unknown; d: number }[] = [{ node: root, d: 0 }]
  while (queue.length > 0) {
    const { node, d } = queue.shift() as { node: unknown; d: number }
    if (node === null || typeof node !== 'object' || d > depth) continue
    if (!Array.isArray(node) && key in (node as Json)) return (node as Json)[key]
    for (const child of Array.isArray(node) ? node : Object.values(node as Json)) queue.push({ node: child, d: d + 1 })
  }
  return undefined
}

export function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}
export function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export type ValidationCategory = { key: string; issues: number; errors: number; warnings: number }
export type ValidationSample = { severity: string; message: string; url: string | null }
export type ValidationSummary = {
  url: string | null
  quality: string | null
  totalIssues: number | null
  critical: number | null
  categories: ValidationCategory[]
  samples: ValidationSample[]
  gsap: { pages: number | null; passed: number | null; failed: number | null; gsap: boolean; flagged: number; security: number; legacyIx2: boolean; unicorn: boolean } | null
}

export function validationSummary(j: Json): ValidationSummary | null {
  const validation = find(j, 'validation')
  if (validation === null || typeof validation !== 'object') return null
  const way = find(validation, 'webflow_way')
  const gsap = find(validation, 'gsap_custom_code')
  const categories: ValidationCategory[] = []
  const samples: ValidationSample[] = []
  const rawCategories = find(way, 'categories')
  if (Array.isArray(rawCategories)) {
    for (const c of rawCategories) {
      if (c === null || typeof c !== 'object') continue
      const cat = c as Json
      categories.push({ key: str(cat.key) ?? '?', issues: num(cat.issueCount) ?? 0, errors: num(cat.errorCount) ?? 0, warnings: num(cat.warningCount) ?? 0 })
      const issues = cat.sampleIssues
      if (Array.isArray(issues)) {
        for (const i of issues) {
          if (i === null || typeof i !== 'object') continue
          const issue = i as Json
          samples.push({ severity: str(issue.severity) ?? 'info', message: str(issue.message) ?? '', url: str(find(issue, 'url')) })
        }
      }
    }
  }
  const summary = find(way, 'summary')
  const site = find(gsap, 'siteResults')
  const det = find(gsap, 'detections')
  return {
    url: str(find(validation, 'publishedUrl')),
    quality: str(find(validation, 'evidenceQuality')),
    totalIssues: num(find(summary, 'totalIssues')),
    critical: num(find(summary, 'criticalErrors')),
    categories,
    samples,
    gsap:
      gsap === null || typeof gsap !== 'object'
        ? null
        : {
            pages: num(find(site, 'analyzedCount')),
            passed: num(find(site, 'passedCount')),
            failed: num(find(site, 'failedCount')),
            gsap: find(det, 'gsapDetected') === true,
            flagged: num(find(det, 'flaggedCodeCount')) ?? 0,
            security: num(find(det, 'securityRiskCount')) ?? 0,
            legacyIx2: find(det, 'legacyIx2Detected') === true,
            unicorn: find(det, 'unicornStudioDetected') === true,
          },
  }
}

export function captureOf(j: Json, id: string, at: number): VizCapture | null {
  const shots = find(j, 'screenshots')
  if (!Array.isArray(shots) || shots.length === 0) return null
  const segments: VizSegment[] = []
  for (const s of shots) {
    if (s === null || typeof s !== 'object') continue
    const shot = s as Json
    const viewport = str(shot.viewport)
    const viewUrl = str(shot.view_url)
    if ((viewport !== 'desktop' && viewport !== 'tablet' && viewport !== 'mobile') || viewUrl === null) continue
    segments.push({
      viewport,
      segment: num(shot.segment) ?? 0,
      viewUrl,
      width: num(shot.width) ?? 1,
      height: num(shot.height) ?? 1,
      pageHeight: num(shot.page_height_px) ?? num(shot.height) ?? 1,
    })
  }
  if (segments.length === 0) return null
  return { id, title: str(find(j, 'page_title')) ?? str(find(j, 'final_url')) ?? id, url: str(find(j, 'final_url')) ?? '', gallery: str(find(j, 'gallery_url')), at, segments }
}

export function segmentsOf(capture: VizCapture, viewport: VizSegment['viewport']): VizSegment[] {
  return capture.segments.filter(s => s.viewport === viewport).sort((a, b) => a.segment - b.segment)
}

export function maxSegments(capture: VizCapture): number {
  return Math.max(0, ...(['desktop', 'tablet', 'mobile'] as const).map(v => segmentsOf(capture, v).length))
}

export type ContextSummary = {
  versionId: string | null
  name: string | null
  status: string | null
  marketplace: string | null
  creator: string | null
  url: string | null
  submitted: string | null
  lastReview: string | null
  phase0: string | null
  canAssign: boolean | null
  canReview: boolean | null
  canPublish: boolean | null
  feedbackChars: number
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}

export function contextSummary(j: Json): ContextSummary | null {
  const name = str(find(j, 'templateName'))
  if (name === null) return null
  const feedback = str(find(j, 'latestReviewFeedback'))
  return {
    versionId: str(find(j, 'versionId')) ?? str(find(j, 'version_id')),
    name,
    status: str(find(j, 'reviewStatus')),
    marketplace: str(find(j, 'marketplaceStatus')),
    creator: str(find(j, 'creatorName')),
    url: str(find(j, 'websiteUrl')),
    submitted: str(find(j, 'submittedDate')),
    lastReview: str(find(j, 'latestReviewDate')),
    phase0: str(find(find(j, 'phase0'), 'kind')),
    canAssign: bool(find(j, 'canAssign')),
    canReview: bool(find(j, 'canReview')),
    canPublish: bool(find(j, 'canPublish')),
    feedbackChars: feedback === null ? 0 : feedback.length,
  }
}

export type QueueRow = { name: string; status: string; submitted: string | null; versionId: string | null; mine: boolean }

export function queueRows(j: Json): QueueRow[] | null {
  const items = find(j, 'items')
  if (!Array.isArray(items)) return null
  const rows: QueueRow[] = []
  for (const i of items) {
    if (i === null || typeof i !== 'object') continue
    const item = i as Json
    rows.push({
      name: str(item.templateName) ?? '?',
      status: str(item.latestReviewStatus) ?? str(item.normalizedStatus) ?? '?',
      submitted: str(item.submittedDate),
      versionId: str(item.assignableVersionId) ?? str(item.versionId),
      mine: item.isAssignedToCurrentReviewer === true,
    })
  }
  return rows
}

/** `key: kind` lines for any other result, so no row is a JSON wall. */
export function genericLines(j: Json): string[] {
  const data = find(j, 'data')
  const root = data !== null && typeof data === 'object' && !Array.isArray(data) ? (data as Json) : j
  return Object.entries(root)
    .slice(0, 12)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.length} item${v.length === 1 ? '' : 's'}`
      if (v !== null && typeof v === 'object') return `${k}: {${Object.keys(v as Json).length} keys}`
      const s = String(v)
      return `${k}: ${s.length > 80 ? `${s.slice(0, 77)}...` : s}`
    })
}

export function shortDate(iso: string | null): string {
  return iso === null ? '-' : iso.slice(0, 10)
}

export function daysSince(iso: string | null, now: number): number | null {
  if (iso === null) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86_400_000))
}
