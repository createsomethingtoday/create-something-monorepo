import { atom, read, update } from 'claude-code'
import type { On, Register } from 'claude-code'

import type { QueueSnapshot, QueueTrend } from '../types'
import { OPEN_STATUSES, countsLine, formatRow, mcpJson, parseQueue, parseStats, parseTrend, statusLabel, trendLine, windowStart } from './lib'

const PANE = 'review-queue'
const snapshot = atom({ plugin: 'review-queue', key: 'snapshot' } as const, null)
const trend = atom({ plugin: 'review-queue', key: 'trend' } as const, null)
const isBandHidden = atom({ plugin: 'review-queue', key: 'isBandHidden' } as const, false)
const TREND_MONTHS = 6

type Engine = Parameters<Parameters<On>[2]>[0]

async function refresh($: Engine, server: string): Promise<QueueSnapshot> {
  const fetchedAt = await $.clock.now()
  let next: QueueSnapshot
  try {
    const [stats, ready, inReview] = await Promise.all([
      $.mcp.call(server, 'app_review_queue_stats', { group_by: ['status'] }),
      $.mcp.call(server, 'app_review_list_queue', { status: 'ready_to_review', sort: 'submissionDatetime_asc', limit: 100 }),
      $.mcp.call(server, 'app_review_list_queue', { status: 'in_review', sort: 'submissionDatetime_asc', limit: 100 }),
    ])
    const failed = [stats, ready, inReview].find(r => r.isError)
    if (failed) {
      const text = failed.content.find(b => b.type === 'text') as { text?: string } | undefined
      throw new Error(text?.text?.slice(0, 200) ?? 'the App Review MCP reported an error')
    }
    next = {
      counts: parseStats(mcpJson(stats)),
      rows: [...parseQueue(mcpJson(ready)), ...parseQueue(mcpJson(inReview))],
      fetchedAt,
      error: null,
    }
  } catch (error) {
    next = { counts: {}, rows: [], fetchedAt, error: error instanceof Error ? error.message : String(error) }
  }
  await update($, snapshot, () => next)
  $.ui.status(next.error ? 'queue: unavailable' : `queue: ${next.counts.ready_to_review ?? 0} ready, ${next.counts.in_review ?? 0} in review`)
  return next
}

async function refreshTrend($: Engine, server: string): Promise<QueueTrend> {
  const fetchedAt = await $.clock.now()
  let next: QueueTrend
  try {
    const ran = await $.mcp.call(server, 'app_review_queue_stats', { group_by: ['month', 'status'], submitted_after: windowStart(fetchedAt, TREND_MONTHS) })
    if (ran.isError) throw new Error('queue_stats reported an error')
    next = { months: parseTrend(mcpJson(ran)), fetchedAt, error: null }
  } catch (error) {
    next = { months: [], fetchedAt, error: error instanceof Error ? error.message : String(error) }
  }
  await update($, trend, () => next)
  return next
}

export const register: Register = (on, options) => {
  const server = String(options.server ?? 'claude.ai App Review MCP')

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'queue', description: 'Open the Marketplace App review queue pane; /queue trend re-reads the rejection-rate band' })
    const started = await next(e)
    void refreshTrend($, server)
    return started
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const t = await read($, trend)
    if (!t || t.error || t.months.length === 0 || e.props.hasSurvey || (await read($, isBandHidden))) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const latest = t.months[t.months.length - 1]
    const hot = latest && latest.rate !== null && latest.decided >= 20 && latest.rate >= 0.6
    return (
      <Box>
        <Text color={hot ? 'red' : undefined} dimColor={!hot}>
          {trendLine(t.months)}{'  '}
        </Text>
        <Button key="trend-refresh" label="Refresh" onPress={() => refreshTrend($, server)} />
        <Text> </Text>
        <Button key="trend-hide" label="Hide" onPress={() => update($, isBandHidden, () => true)} />
      </Box>
    )
  })

  on('command.run', { command: 'queue' }, async ($, e) => {
    if (e.args.trim() === 'trend') {
      const t = await refreshTrend($, server)
      await update($, isBandHidden, () => false)
      return { text: t.error ? `Trend unavailable: ${t.error}` : trendLine(t.months) }
    }
    await $.ui.open({ id: PANE, title: 'App review queue', focus: true })
    const current = await refresh($, server)
    if (current.error) return { text: `Queue pane opened, but the App Review MCP did not answer: ${current.error}` }
    return { text: `Queue: ${countsLine(current.counts)}. Pane opened with ${current.rows.length} open versions.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const current = await read($, snapshot)
    const columns = Math.max(40, e.props.bodyColumns)
    const room = Math.max(4, (e.viewport?.rows ?? 24) - 6)

    const header = (
      <Box>
        <Text bold>{current ? countsLine(current.counts) : 'Loading the queue…'} </Text>
        <Button key="refresh" label="Refresh" onPress={() => refresh($, server)} />
      </Box>
    )

    if (!current) {
      return <Box flexDirection="column">{header}</Box>
    }
    if (current.error) {
      return (
        <Box flexDirection="column">
          {header}
          <Text color="red">App Review MCP unavailable: {current.error}</Text>
          <Text dimColor>Check /mcp for the server named "{server}", then Refresh.</Text>
        </Box>
      )
    }

    const sections: Array<{ status: string; rows: typeof current.rows }> = OPEN_STATUSES.slice(0, 2).map(status => ({
      status,
      rows: current.rows.filter(r => r.status === status),
    }))
    const lines: Array<{ text: string; dim?: boolean; color?: string; bold?: boolean }> = []
    for (const section of sections) {
      lines.push({ text: `${statusLabel(section.status)} (${section.rows.length})`, bold: true })
      if (section.rows.length === 0) lines.push({ text: '  none', dim: true })
      for (const row of section.rows) {
        lines.push({ text: formatRow(row, columns), color: row.days >= 10 ? 'yellow' : undefined, dim: row.appName.startsWith('TEST') })
      }
    }

    return (
      <Box flexDirection="column">
        {header}
        {lines.slice(0, room).map(line => (
          <Text bold={line.bold} dimColor={line.dim} color={line.color}>
            {line.text}
          </Text>
        ))}
        {lines.length > room && <Text dimColor>… {lines.length - room} more</Text>}
        <Text dimColor>age in current stage · capability · review type · reviewer. Yellow = 10+ days.</Text>
      </Box>
    )
  })
}
