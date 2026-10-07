import { expect, test } from 'claude-code/testing'

import { countsLine, formatRow, mcpJson, parseQueue, parseStats, parseTrend, shortCapability, sparkline, trendLine, windowStart } from './lib'

const QUEUE = {
  ok: true,
  data: {
    records: [
      { assetId: 'recA', appName: 'AltTextify Alt Text', daysInCurrentReviewStage: 3, appCapabilities: 'Hybrid', assignableVersionId: 'recV', reviewer: { name: 'Pablo Miranda', email: 'p@x' }, reviewType: 'Asset Update', submissionDatetime: '2026-10-02T09:54:33.000Z', normalizedStatus: 'ready_to_review' },
      { assetId: 'recB', appName: 'TEST - smoke', daysInCurrentReviewStage: 117, assignableVersionId: 'recW', reviewer: null, reviewType: 'New Asset', submissionDatetime: '2026-06-10T18:18:57.000Z', normalizedStatus: 'ready_to_review' },
    ],
  },
}
const STATS = { ok: true, data: { groups: [{ key: 'ready_to_review', count: 16 }, { key: 'in_review', count: 1 }, { key: 'approved', count: 2768 }] } }

test('MCP results are read from a text block or structuredContent', () => {
  expect(mcpJson({ content: [{ type: 'text', text: JSON.stringify(STATS) }] })).toEqual(STATS)
  expect(mcpJson({ content: [], structuredContent: STATS })).toEqual(STATS)
  expect(mcpJson({ content: [{ type: 'text', text: 'not json' }] })).toBe(null)
})

test('stats and queue payloads parse into counts and rows', () => {
  const counts = parseStats(STATS)
  expect(counts.ready_to_review).toBe(16)
  expect(countsLine(counts)).toBe('16 ready · 1 in review · 0 changes requested · 0 on hold')
  const rows = parseQueue(QUEUE)
  expect(rows.length).toBe(2)
  expect(rows[0]?.reviewer).toBe('Pablo Miranda')
  expect(rows[1]?.reviewer).toBe(null)
  expect(rows[1]?.capability).toBe('')
  expect(parseQueue({ ok: false })).toEqual([])
})

test('rows fit the column budget and name the capability briefly', () => {
  const [row] = parseQueue(QUEUE)
  const line = formatRow(row!, 60)
  expect(line.length <= 60).toBe(true)
  expect(line).toMatch(/^  3d /)
  expect(line).toMatch(/Hybrid/)
  expect(line).toMatch(/Pablo$/)
  expect(shortCapability('Data Client v2')).toBe('Data Client')
  expect(shortCapability('Designer Extension')).toBe('DE')
})

test('monthly rejection rate parses, sorts, and draws as a sparkline', () => {
  const payload = { ok: true, data: { groups: [
    { key: '2026-09', breakdown: [{ key: 'rejected', count: 196 }, { key: 'approved', count: 49 }, { key: 'on_hold', count: 10 }] },
    { key: '2026-07', breakdown: [{ key: 'rejected', count: 178 }, { key: 'approved', count: 44 }] },
    { key: '2026-10', breakdown: [{ key: 'ready_to_review', count: 14 }, { key: 'approved', count: 9 }, { key: 'rejected', count: 9 }] },
  ] } }
  const months = parseTrend(payload)
  expect(months.map(m => m.month)).toEqual(['2026-07', '2026-09', '2026-10'])
  expect(Math.round((months[0]?.rate ?? 0) * 100)).toBe(80)
  expect(months[2]?.decided).toBe(18)
  expect(sparkline(months).length).toBe(3)
  const line = trendLine(months)
  expect(line).toMatch(/^rejection rate [▁▂▃▄▅▆▇█·]{3}  Jul 80%  Sep 80%  Oct 50%\*$/)
  expect(parseTrend({ ok: false })).toEqual([])
  expect(windowStart(Date.UTC(2026, 9, 5), 6)).toBe('2026-04-01')
})
