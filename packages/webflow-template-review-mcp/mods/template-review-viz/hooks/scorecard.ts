/** The rubric scorecard: built from the structured feedback call, or parsed from draft text. Pure. */
import type { VizDimension, VizLabel, VizScorecard, VizTier } from '../types'

import { str } from './parse'

export const DIMENSIONS: readonly { id: string; name: string; match: RegExp }[] = [
  { id: 'overall_user_experience', name: 'Overall UX', match: /overall[_ ]?(ux|user)/i },
  { id: 'graphic_design', name: 'Graphic Design', match: /graphic/i },
  { id: 'typography', name: 'Typography', match: /typograph/i },
  { id: 'interaction_design', name: 'Interaction Design', match: /interaction/i },
  { id: 'hierarchy', name: 'Hierarchy', match: /hierarchy/i },
  { id: 'layout_design_quality', name: 'Layout Quality', match: /layout/i },
  { id: 'responsive_design', name: 'Responsive', match: /responsive/i },
  { id: 'conversion_best_practices', name: 'Conversion', match: /conversion/i },
  { id: 'site_optimization', name: 'Site Optimization', match: /optimi[sz]ation|pagespeed|performance|\bseo\b/i },
  { id: 'accessibility', name: 'Accessibility', match: /accessib/i },
]

const TIER_RANK: Record<VizTier, number> = { Unverifiable: 0, Satisfactory: 1, Good: 2, Exceptional: 3 }

/** Partial drafts may extend one version, but must never relabel another version's evidence. */
function previousForVersion(prev: VizScorecard | null, versionId: string | null): VizScorecard | null {
  return versionId === null || prev?.versionId === versionId ? prev : null
}

export function emptyScorecard(now: number, source: string): VizScorecard {
  const dims: Record<string, VizDimension> = {}
  for (const d of DIMENSIONS) dims[d.id] = { tier: null, label: null, note: null }
  return { versionId: null, name: null, verdict: null, dims, findings: { critical: 0, warning: 0, info: 0 }, blocking: null, recommended: null, hardFailures: null, followUps: null, manual: null, source, updatedAt: now }
}

function tierOf(cell: string): VizTier | null {
  if (/exceptional/i.test(cell)) return 'Exceptional'
  if (/\bgood\b/i.test(cell)) return 'Good'
  if (/satisfactory/i.test(cell)) return 'Satisfactory'
  if (/unverifiable|needs (visual|manual)|manual/i.test(cell)) return 'Unverifiable'
  return null
}

function labelOf(v: unknown): VizLabel | null {
  return v === 'Auto' || v === 'Partial' || v === 'Manual' ? v : null
}

function dimensionFor(text: string): string | null {
  for (const d of DIMENSIONS) if (d.match.test(text)) return d.id
  return null
}

/**
 * The lower of two tiers, so split rows (SEO / Performance) collapse to the
 * worst. An unverifiable half leaves the whole dimension unknown: a Good SEO
 * row cannot vouch for a Performance row nobody measured.
 */
function lower(a: VizTier | null, b: VizTier): VizTier {
  if (a === null) return b
  if (a === 'Unverifiable' || b === 'Unverifiable') return 'Unverifiable'
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b
}

/** From `template_review_format_agent_review_feedback`'s structured input. */
export function fromStructured(args: Record<string, unknown>, prev: VizScorecard | null, now: number): VizScorecard {
  const intake = args.intake
  const i = intake !== null && typeof intake === 'object' ? intake as Record<string, unknown> : {}
  const versionId = str(i.version_id) ?? str(args.version_id)
  prev = previousForVersion(prev, versionId)
  const card: VizScorecard = { ...(prev ?? emptyScorecard(now, 'structured')), dims: { ...(prev?.dims ?? emptyScorecard(now, 'structured').dims) }, source: 'format_agent_review_feedback', updatedAt: now }
  card.versionId = versionId ?? card.versionId
  card.name = str(i.template_name) ?? card.name
  const matrix = args.rubric_dimension_matrix
  if (Array.isArray(matrix)) {
    for (const row of matrix) {
      if (row === null || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = str(r.dimension)
      if (id === null || !(id in card.dims)) continue
      const current = card.dims[id] ?? { tier: null, label: null, note: null }
      card.dims[id] = { ...current, label: labelOf(r.label) ?? current.label, note: str(r.evidence_or_reason) ?? current.note }
    }
  }
  const findings = args.confirmed_findings
  if (Array.isArray(findings)) {
    const counts = { critical: 0, warning: 0, info: 0 }
    for (const f of findings) {
      if (f === null || typeof f !== 'object') continue
      const sev = str((f as Record<string, unknown>).severity) ?? 'info'
      if (sev === 'critical') counts.critical += 1
      else if (sev === 'warning') counts.warning += 1
      else counts.info += 1
    }
    card.findings = counts
  }
  if (Array.isArray(args.human_follow_up)) card.followUps = args.human_follow_up.length
  if (Array.isArray(args.manual_checks_remaining)) card.manual = args.manual_checks_remaining.length
  return card
}

function countNumbered(section: string): number {
  return (section.match(/^\s*\d+\.\s/gm) ?? []).length
}

function sectionAfter(text: string, heading: RegExp): string | null {
  const m = heading.exec(text)
  if (m === null) return null
  const rest = text.slice(m.index + m[0].length)
  const end = rest.search(/^\s*(#{1,6}\s|[A-Z][A-Z &/-]{3,}\s*$)/m)
  return end < 0 ? rest : rest.slice(0, end)
}

/** From draft feedback or a report in the review template's shape. */
export function fromText(text: string, prev: VizScorecard | null, now: number, source: string, versionId: string | null = null): VizScorecard {
  prev = previousForVersion(prev, versionId)
  const card: VizScorecard = { ...(prev ?? emptyScorecard(now, source)), dims: { ...(prev?.dims ?? emptyScorecard(now, source).dims) }, source, updatedAt: now }
  card.versionId = versionId ?? card.versionId
  const seen = new Set<string>()
  for (const m of text.matchAll(/^\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|(?:\s*([^|\n]*?)\s*\|)?/gm)) {
    const [, head = '', cell = '', evidence = ''] = m
    if (/^-+$|^dimension$/i.test(head.trim())) continue
    const id = dimensionFor(head)
    const tier = tierOf(cell)
    if (id === null || tier === null) continue
    const current = card.dims[id] ?? { tier: null, label: null, note: null }
    card.dims[id] = { ...current, tier: seen.has(id) ? lower(current.tier, tier) : tier, note: evidence.trim().length > 0 ? evidence.trim() : current.note }
    seen.add(id)
  }
  const verdict = /\*\*(Pass|Revise|Reject)\*\*/.exec(text)?.[1] ?? /^##\s*Verdict\s*\n+\s*(?:-\s*)?(Pass|Revise|Reject)\b/m.exec(text)?.[1]
  if (verdict !== undefined) card.verdict = verdict
  const title = /^#\s*Template Review:\s*(.+)$/m.exec(text)?.[1]
  if (title !== undefined) card.name = title.trim()
  const blocking = sectionAfter(text, /^\s*BLOCKING\s*$/m)
  if (blocking !== null) card.blocking = countNumbered(blocking)
  const recommended = sectionAfter(text, /^\s*RECOMMENDED\s*$/m)
  if (recommended !== null) card.recommended = countNumbered(recommended)
  const hard = sectionAfter(text, /^##\s*Hard requirement failures\s*$/m)
  if (hard !== null) card.hardFailures = /^\s*None\.?\s*$/m.test(hard) ? 0 : (hard.match(/^\s*-\s+\[/gm) ?? []).length
  return card
}

export type Bar = 'yes' | 'no' | 'unknown'

/** The pass rule: Good or better on every dimension, zero blockers. */
export function meetsBar(card: VizScorecard): Bar {
  const blockers = (card.blocking ?? 0) + (card.hardFailures ?? 0) + card.findings.critical
  if (blockers > 0) return 'no'
  let unknown = false
  for (const d of DIMENSIONS) {
    const tier = card.dims[d.id]?.tier ?? null
    if (tier === null || tier === 'Unverifiable') unknown = true
    else if (TIER_RANK[tier] < TIER_RANK.Good) return 'no'
  }
  if (card.blocking === null && card.hardFailures === null) unknown = true
  return unknown ? 'unknown' : 'yes'
}

export function tierCells(tier: VizTier | null): string {
  switch (tier) {
    case 'Exceptional':
      return '###'
    case 'Good':
      return '##.'
    case 'Satisfactory':
      return '#..'
    case 'Unverifiable':
      return '???'
    default:
      return '...'
  }
}

export function tierColor(tier: VizTier | null): string | undefined {
  switch (tier) {
    case 'Exceptional':
    case 'Good':
      return 'green'
    case 'Satisfactory':
      return 'yellow'
    case 'Unverifiable':
      return 'magenta'
    default:
      return undefined
  }
}
