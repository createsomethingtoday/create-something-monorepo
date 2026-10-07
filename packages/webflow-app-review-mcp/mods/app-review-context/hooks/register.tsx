import { atom, read, update } from 'claude-code'
import type { On, Register } from 'claude-code'

import type { ContextSnapshot } from '../types'
import { HISTORY_WINDOW, computeFlags, isRecordId, matchQueue, mcpJson, parseContext, parseExceptionItems, parseHistory, parseTickets, resultJson, statusLine } from './lib'

const PANE = 'app-review-context'
const current = atom({ plugin: 'app-review-context', key: 'current' } as const, null)

type Engine = Parameters<Parameters<On>[2]>[0]
const CONTEXT_TOOL = /app_review_get_review_context$/

function errorOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** History, exception items and tickets for a snapshot; each part fails on its own. */
async function enrich($: Engine, server: string, base: ContextSnapshot): Promise<ContextSnapshot> {
  const next: ContextSnapshot = { ...base }
  const [history, items, tickets] = await Promise.allSettled([
    $.mcp.call(server, 'app_review_list_versions', { asset_id: base.assetId, limit: HISTORY_WINDOW }),
    $.mcp.call(server, 'app_review_list_exception_items', { version_id: base.versionId }),
    $.mcp.call(server, 'app_review_search_tickets', { query: base.appName, limit: 5, sort_by: 'updated_at', sort_order: 'desc' }),
  ])
  if (history.status === 'fulfilled' && !history.value.isError) next.history = parseHistory(mcpJson(history.value))
  if (items.status === 'fulfilled' && !items.value.isError) next.exceptions = { ...next.exceptions, items: parseExceptionItems(mcpJson(items.value)) }
  if (tickets.status === 'fulfilled' && !tickets.value.isError) next.tickets = parseTickets(mcpJson(tickets.value))
  next.flags = computeFlags(next)
  await update($, current, () => next)
  $.ui.status(statusLine(next))
  return next
}

async function load($: Engine, server: string, versionId: string): Promise<ContextSnapshot> {
  const fetchedAt = await $.clock.now()
  const ran = await $.mcp.call(server, 'app_review_get_review_context', { version_id: versionId })
  const parsed = ran.isError ? null : parseContext(mcpJson(ran), fetchedAt)
  if (!parsed) {
    const text = ran.content.find(b => b.type === 'text') as { text?: string } | undefined
    const failed: ContextSnapshot = { ...(await read($, current)) ?? emptySnapshot(versionId, fetchedAt), error: `get_review_context failed for ${versionId}: ${text?.text?.slice(0, 200) ?? 'no payload'}`, fetchedAt }
    await update($, current, () => failed)
    return failed
  }
  parsed.flags = computeFlags(parsed)
  await update($, current, () => parsed)
  return enrich($, server, parsed)
}

function emptySnapshot(versionId: string, fetchedAt: number): ContextSnapshot {
  return { versionId, assetId: '', appName: versionId, capability: '', versionNumber: 0, reviewType: '', reviewStatus: '', days: 0, reviewer: null, marketplaceStatus: '', visibility: '', payment: '', submittedAt: '', clientId: '', zendeskTicketId: null, urls: {}, iconAlt: '', carouselCount: 0, notesHint: null, history: null, exceptions: { undecided: 0, denied: 0, assetUndecided: 0, assetApproved: 0, items: [] }, tickets: null, flags: [], fetchedAt, error: null }
}

/** A version id for what the reviewer typed: a version id, an asset id, or part of an app name. */
async function resolve($: Engine, server: string, raw: string): Promise<{ versionId: string } | { error: string }> {
  const q = raw.trim()
  if (isRecordId(q)) {
    const asVersion = await $.mcp.call(server, 'app_review_get_review_context', { version_id: q })
    if (!asVersion.isError && parseContext(mcpJson(asVersion), 0)) return { versionId: q }
    const asAsset = await $.mcp.call(server, 'app_review_list_versions', { asset_id: q, limit: 1 })
    const first = parseHistory(mcpJson(asAsset))
    const versions = (mcpJson(asAsset) as { data?: { versions?: Array<{ versionId?: string }> } })?.data?.versions
    const vid = versions?.[0]?.versionId
    if (!asAsset.isError && vid) return { versionId: vid }
    return { error: `${q} is neither a version nor an asset the App Review MCP knows (${first.total} versions found).` }
  }
  const queue = await $.mcp.call(server, 'app_review_list_queue', { limit: 500, sort: 'submissionDatetime_desc' })
  if (queue.isError) return { error: 'could not list the queue to search by name' }
  const matches = matchQueue(mcpJson(queue), q)
  if (matches.length === 0) return { error: `no app in the open queue matches "${q}". Pass a version id (rec…) for apps outside the queue.` }
  const open = matches.find(m => m.status === 'ready_to_review' || m.status === 'in_review') ?? matches[0]!
  return { versionId: open.versionId }
}

export const register: Register = (on, options) => {
  const server = String(options.server ?? 'claude.ai App Review MCP')

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'review', description: 'Open the review context pane for an app version, asset id, or app name' })
    return next(e)
  })

  on('command.run', { command: 'review' }, async ($, e) => {
    const existing = await read($, current)
    let versionId = existing?.versionId ?? null
    if (e.args.trim()) {
      const found = await resolve($, server, e.args)
      if ('error' in found) return { text: `app-review-context: ${found.error}` }
      versionId = found.versionId
    }
    if (!versionId) return { text: 'Usage: /review <version id | asset id | app name>. Or run app_review_get_review_context and the pane fills itself.' }
    await $.ui.open({ id: PANE, title: 'Review context', focus: true })
    const snap = await load($, server, versionId)
    if (snap.error) return { text: snap.error }
    return { text: `${statusLine(snap)}. ${snap.flags.length ? `Flags: ${snap.flags.join('; ')}.` : 'No flags.'} Pane opened.` }
  })

  // Fill the pane whenever the model loads a review context, without a command.
  on('tool.call', async ($, e, next) => {
    if (!CONTEXT_TOOL.test(String(e.tool))) return next(e)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    const fetchedAt = await $.clock.now()
    const parsed = parseContext(resultJson(ran), fetchedAt)
    if (parsed) {
      parsed.flags = computeFlags(parsed)
      await update($, current, () => parsed)
      $.ui.status(statusLine(parsed))
      void enrich($, server, parsed)
    }
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, current)
    const room = Math.max(6, (e.viewport?.rows ?? 30) - 4)
    if (!s) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No version loaded. /review &lt;version id | asset id | app name&gt;</Text>
        </Box>
      )
    }
    const lines: Array<{ text: string; color?: string; dim?: boolean; bold?: boolean }> = []
    lines.push({ text: `${s.appName}  v${s.versionNumber} ${s.reviewType}  ·  ${s.capability}  ·  ${s.visibility}  ·  ${s.marketplaceStatus}`, bold: true })
    lines.push({ text: `${s.reviewStatus}  ·  ${s.days}d in stage  ·  reviewer ${s.reviewer ?? 'unassigned'}  ·  submitted ${s.submittedAt.slice(0, 10)}  ·  ${s.payment || 'payment unset'}`, dim: true })
    if (s.error) lines.push({ text: s.error, color: 'red' })
    if (s.flags.length) {
      lines.push({ text: 'Flags', bold: true })
      for (const f of s.flags) lines.push({ text: `  ! ${f}`, color: /cannot approve|repeat/i.test(f) ? 'red' : 'yellow' })
    }
    lines.push({ text: 'Listing', bold: true })
    for (const [k, v] of Object.entries(s.urls)) lines.push({ text: `  ${k.padEnd(11)} ${v}` })
    lines.push({ text: `  icon alt    ${s.iconAlt || '(none)'}  ·  ${s.carouselCount} screenshots  ·  client ${s.clientId ? `${s.clientId.slice(0, 12)}…` : '(none)'}`, dim: true })
    lines.push({ text: s.history ? `History  ${s.history.total} versions, ${s.history.rejectedRecent} of last ${s.history.window} rejected` : 'History  loading…', bold: true })
    for (const r of s.history?.rows ?? []) lines.push({ text: `  v${String(r.n).padStart(3)} ${r.date} ${r.type.padEnd(12)} ${r.status}${r.reason ? ` (${r.reason})` : ''}`, dim: !/rejected/i.test(r.status) })
    lines.push({ text: `Exceptions  ${s.exceptions.undecided} undecided · ${s.exceptions.denied} denied · asset ${s.exceptions.assetApproved} approved / ${s.exceptions.assetUndecided} undecided`, bold: true })
    for (const it of s.exceptions.items.slice(0, 6)) lines.push({ text: `  ${it.status.padEnd(12)} ${it.label}` })
    lines.push({ text: s.tickets ? `Zendesk  ${s.tickets.length} recent (linked ${s.zendeskTicketId ?? 'none'})` : 'Zendesk  loading…', bold: true })
    for (const t of s.tickets ?? []) lines.push({ text: `  #${t.id} ${t.status.padEnd(7)} updated ${t.updatedAt}${t.id === s.zendeskTicketId ? '  ← this version' : ''}`, dim: t.status === 'closed' || t.status === 'solved' })
    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>{s.versionId} · asset {s.assetId} </Text>
          <Button key="refresh" label="Refresh" onPress={() => load($, server, s.versionId)} />
        </Box>
        {lines.slice(0, room).map(l => (
          <Text bold={l.bold} dimColor={l.dim} color={l.color}>
            {l.text}
          </Text>
        ))}
        {lines.length > room && <Text dimColor>… {lines.length - room} more</Text>}
      </Box>
    )
  })
}
