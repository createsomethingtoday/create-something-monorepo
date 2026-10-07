import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'
import type { VizScorecard } from '../types'

import { captureOf, contextSummary, jsonOf, maxSegments, queueRows, textOf, validationSummary } from '../hooks/parse'
import { DIMENSIONS, fromStructured, fromText, meetsBar } from '../hooks/scorecard'

const HUB = 'mcp__reviewer__hub_execute_proxy_tool'
const CAPTURE = 'mcp__claude_ai_Template_Review_MCP__template_review_capture_published_site_screenshots'
const FORMAT = 'mcp__claude_ai_Template_Review_MCP__template_review_format_agent_review_feedback'
const SAVE = 'mcp__claude_ai_Template_Review_MCP__template_review_save_agent_feedback'

function watch(on: On) {
  const last: Record<string, unknown> = {}
  on('state.set', { plugin: 'template-review-viz' }, (_$, e, next) => {
    last[e.key] = e.value
    return next(e)
  })
  return last
}

function drawingText(tree: RenderElement): string {
  return JSON.stringify(tree)
}

const PANE_PROPS = { title: 'Screenshots', isFocused: true, bodyColumns: 140, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 44 }, view: {} }

const PASS_REPORT = `# Template Review: Version A\n\n## Verdict\n**Pass**\n\n## Hard requirement failures\nNone.\n\n${DIMENSIONS.map(d => `| ${d.name} | Good | evidence for A |`).join('\n')}\n\nBLOCKING\n\nRECOMMENDED\n1. Polish A`

test('text scorecard keeps same-version progress and clears all prior fields on a different version', () => {
  const a = fromText(PASS_REPORT, null, 1, 'save_agent_feedback', 'recA')
  expect(meetsBar(a)).toBe('yes')
  const same = fromText('Additional internal note.', a, 2, 'save_agent_feedback', 'recA')
  expect(same.versionId).toBe('recA')
  expect(same.name).toBe('Version A')
  expect(meetsBar(same)).toBe('yes')
  const enriched = fromStructured({ intake: { version_id: 'recA' }, confirmed_findings: [{ severity: 'critical' }], human_follow_up: ['A'], manual_checks_remaining: ['A'], rubric_dimension_matrix: [{ dimension: 'typography', label: 'Auto', evidence_or_reason: 'A' }] }, same, 2)
  const b = fromText('Initial draft for B.', enriched, 3, 'save_agent_feedback', 'recB')
  expect(b.versionId).toBe('recB')
  expect(b.name).toBeNull()
  expect(b.verdict).toBeNull()
  expect(b.blocking).toBeNull()
  expect(b.recommended).toBeNull()
  expect(b.hardFailures).toBeNull()
  expect(b.findings).toEqual({ critical: 0, warning: 0, info: 0 })
  expect(b.followUps).toBeNull()
  expect(b.manual).toBeNull()
  expect(b.dims.typography).toEqual({ tier: null, label: null, note: null })
  expect(meetsBar(b)).toBe('unknown')
  expect(a.name).toBe('Version A')
})

test('structured scorecard clears prior tiers, verdict, counts and labels when intake changes version', () => {
  const a = fromStructured({ intake: { version_id: 'recA' }, confirmed_findings: [{ severity: 'critical' }], human_follow_up: ['A'], manual_checks_remaining: ['A'], rubric_dimension_matrix: [{ dimension: 'typography', label: 'Auto', evidence_or_reason: 'A' }] }, fromText(PASS_REPORT, null, 1, 'save_agent_feedback', 'recA'), 2)
  const same = fromStructured({ intake: { version_id: 'recA' } }, a, 3)
  expect(same.findings.critical).toBe(1)
  expect(same.dims.typography?.tier).toBe('Good')
  const b = fromStructured({ intake: { version_id: 'recB' }, rubric_dimension_matrix: [{ dimension: 'responsive_design', label: 'Manual', evidence_or_reason: 'B' }] }, same, 4)
  expect(b.versionId).toBe('recB')
  expect(b.name).toBeNull()
  expect(b.verdict).toBeNull()
  expect(b.blocking).toBeNull()
  expect(b.recommended).toBeNull()
  expect(b.hardFailures).toBeNull()
  expect(b.findings).toEqual({ critical: 0, warning: 0, info: 0 })
  expect(b.followUps).toBeNull()
  expect(b.manual).toBeNull()
  expect(b.dims.typography).toEqual({ tier: null, label: null, note: null })
  expect(b.dims.responsive_design).toEqual({ tier: null, label: 'Manual', note: 'B' })
  expect(meetsBar(b)).toBe('unknown')
})

for (const via of ['direct', 'Hub'] as const) {
  test(`${via} scorecard dispatch isolates both text and structured versions`, async ($, on) => {
    mock.clock(on)
    const last = watch(on)
    on('tool.call', { tool: via === 'Hub' ? HUB : /template_review_/ }, () => ({ result: { ok: true } }))
    const send = (tool: string, args: Record<string, unknown>) => $.tool.call(via === 'Hub' ? { tool: HUB, proxyToolName: tool, args } : { tool, ...args })
    await send(SAVE, { version_id: 'recA', agent_review_feedback: PASS_REPORT })
    expect(meetsBar(last.scorecard as VizScorecard)).toBe('yes')
    await send(SAVE, { version_id: 'recB', agent_review_feedback: 'Initial draft.' })
    expect(last.scorecard).toMatchObject({ versionId: 'recB', name: null, verdict: null, blocking: null })
    expect(meetsBar(last.scorecard as VizScorecard)).toBe('unknown')
    await send(SAVE, { version_id: 'recA', agent_review_feedback: PASS_REPORT })
    await send(FORMAT, { intake: { version_id: 'recC' }, rubric_dimension_matrix: [{ dimension: 'typography', label: 'Partial', evidence_or_reason: 'C' }] })
    expect(last.scorecard).toMatchObject({ versionId: 'recC', name: null, verdict: null, blocking: null })
    expect((last.scorecard as VizScorecard).dims.typography).toEqual({ tier: null, label: 'Partial', note: 'C' })
    expect(meetsBar(last.scorecard as VizScorecard)).toBe('unknown')
  })
}

const VALIDATION = {
  ok: true,
  data: {
    validation: {
      publishedUrl: 'https://verity-template.webflow.io/',
      evidenceQuality: 'Partial published-site validator evidence.',
      results: {
        webflow_way: {
          summary: { totalIssues: 4, criticalErrors: 0 },
          categories: [
            { key: 'assets', issueCount: 0, errorCount: 0, warningCount: 0, sampleIssues: [] },
            { key: 'content', issueCount: 4, errorCount: 0, warningCount: 4, sampleIssues: [{ severity: 'warning', message: 'title is too long (62 characters)', details: { url: 'https://verity-template.webflow.io/blog/x' } }] },
          ],
        },
        gsap_custom_code: { siteResults: { analyzedCount: 6, passedCount: 6, failedCount: 0 }, detections: { gsapDetected: false, flaggedCodeCount: 0, securityRiskCount: 0, legacyIx2Detected: false, unicornStudioDetected: false } },
      },
    },
  },
}

const SHOTS = {
  ok: true,
  data: {
    final_url: 'https://verity-template.webflow.io/',
    page_title: 'Verity - Webflow HTML website template',
    gallery_url: 'https://x.example/gallery?id=1',
    screenshots: [
      { viewport: 'desktop', width: 1440, height: 900, segment: 0, page_height_px: 9973, view_url: 'https://x.example/v?id=d0' },
      { viewport: 'desktop', width: 1440, height: 900, segment: 1, page_height_px: 9973, view_url: 'https://x.example/v?id=d1' },
      { viewport: 'mobile', width: 390, height: 844, segment: 0, page_height_px: 11799, view_url: 'https://x.example/v?id=m0' },
    ],
  },
}

test('Hub capture tracks screenshots and compacts both transcript row types', async ($, on) => {
  mock.clock(on, { now: 1000 })
  const last = watch(on)
  const ran: string[][] = []
  on('process.run', (_$, e) => {
    ran.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', { tool: HUB }, () => ({ result: SHOTS }))
  const input = { proxyToolName: 'template_review_capture_published_site_screenshots', args: { published_url: 'https://verity-template.webflow.io/' } }
  await $.tool.call({ tool: HUB, tool_use_id: 'hub-capture', ...input })
  expect((last.captures as { id: string }[])[0]?.id).toBe('hub-capture')
  expect(ran.filter(a => a[0] === 'curl').length).toBe(2)
  const props = { tool_use_id: 'hub-capture', tool: HUB, input, isRunning: false, isInterrupted: false, isErrored: false, output: SHOTS }
  const use = await $.ui.render({ component: 'ToolUse', surface: 'terminal', requestId: 'hub-capture', props })
  const result = await $.ui.render({ component: 'ToolResult', surface: 'terminal', requestId: 'hub-capture', props })
  for (const tree of [use, result]) {
    expect(drawingText(tree)).toContain('screenshots: Verity')
    expect(drawingText(tree)).toContain('Show strip')
  }
})

test('Hub compact rows use the matching call identity and leave unrelated Hub tools to the engine', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: HUB }, () => ({ result: VALIDATION }))
  on('ui.render', { component: 'ToolResult' }, () => ({ type: 'Text', props: {}, children: ['original row'] }))
  await $.tool.call({ tool: HUB, tool_use_id: 'hub-validator', proxyToolName: 'template_review_run_published_site_validation', args: {} })
  const tree = await $.ui.render({ component: 'ToolResult', surface: 'terminal', requestId: 'hub-validator', props: { tool_use_id: 'hub-validator', tool: HUB, isErrored: false, output: VALIDATION } })
  expect(drawingText(tree)).toContain('4 issues')
  await $.tool.call({ tool: HUB, tool_use_id: 'hub-other', proxyToolName: 'other_tool', args: {} })
  const other = await $.ui.render({ component: 'ToolResult', surface: 'terminal', requestId: 'hub-other', props: { tool_use_id: 'hub-other', tool: HUB, isErrored: false, output: VALIDATION } })
  expect(drawingText(other)).toContain('original row')
})

for (const failure of ['mkdir', 'curl', 'sips', 'throw'] as const) {
  test(`screenshot ${failure} failure renders segment links after preparation settles`, async ($, on) => {
    mock.clock(on)
    const last = watch(on)
    let attempts = 0
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('process.run', (_$, e) => {
      attempts += 1
      if (failure === 'throw') throw new Error('process unavailable')
      return { value: { exitCode: e.argv[0] === failure ? 1 : 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    })
    on('tool.call', { tool: CAPTURE }, () => ({ result: SHOTS }))
    await $.tool.call({ tool: CAPTURE, tool_use_id: 'failed-capture', published_url: 'https://verity-template.webflow.io/' })
    expect(last.ready).toMatchObject({ 'failed-capture/desktop/0': null, 'failed-capture/mobile/0': null })
    for (const surface of ['terminal', 'desktop'] as const) {
      const tree = await $.ui.render({ component: 'Pane', surface, requestId: 'tr-shots', viewport: { columns: 160, rows: 48 }, props: PANE_PROPS })
      expect(drawingText(tree)).toContain('https://x.example/v?id=d0')
      expect(drawingText(tree)).toContain('https://x.example/v?id=m0')
      expect(drawingText(tree)).toContain('gallery: https://x.example/gallery?id=1')
      expect(drawingText(tree)).not.toContain('fetching segment')
    }
    const before = attempts
    await $.command.run({ command: 'trs', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
    expect(attempts).toBe(before)
  })
}

test('Show strip on an older transcript row opens that row\'s capture, not the latest', async ($, on) => {
  mock.clock(on, { now: 1000 })
  const last = watch(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  const older = { ...SHOTS, data: { ...SHOTS.data, final_url: 'https://older-template.webflow.io/', page_title: 'Older' } }
  on('tool.call', { tool: CAPTURE }, (_$, e) => ({ result: e.published_url === 'https://older-template.webflow.io/' ? older : SHOTS }))
  await $.tool.call({ tool: CAPTURE, tool_use_id: 'cap-older', published_url: 'https://older-template.webflow.io/' })
  await $.tool.call({ tool: CAPTURE, tool_use_id: 'cap-latest', published_url: 'https://verity-template.webflow.io/' })
  expect((last.strip as { captureId: string }).captureId).toBe('cap-latest')
  const props = { tool_use_id: 'cap-older', tool: CAPTURE, isErrored: false, output: older }
  const ui = await $.ui.mount({ plugin: 'template-review-viz', surface: 'terminal', component: 'ToolResult', requestId: 'cap-older', props })
  expect(await ui.find({ type: 'Text', text: /screenshots: Older/ })).toBeDefined()
  await ui.press({ key: 'strip' })
  expect((last.strip as { captureId: string }).captureId).toBe('cap-older')
  expect((last.captures as { id: string }[]).map(c => c.id)).toEqual(['cap-older', 'cap-latest'])
  await ui.unmount()
})

test('successful screenshot preparation still renders PNGs in the terminal and links on desktop', async ($, on) => {
  mock.clock(on)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('tool.call', { tool: CAPTURE }, () => ({ result: SHOTS }))
  await $.tool.call({ tool: CAPTURE, tool_use_id: 'good-capture', published_url: 'https://verity-template.webflow.io/' })
  const terminal = await $.ui.render({ component: 'Pane', surface: 'terminal', requestId: 'tr-shots', props: PANE_PROPS })
  expect(drawingText(terminal)).toContain('"type":"Image"')
  expect(drawingText(terminal)).toContain('/tmp/claude-tr-shots/good-capture/desktop-0.png')
  const desktop = await $.ui.render({ component: 'Pane', surface: 'desktop', requestId: 'tr-shots', props: PANE_PROPS })
  expect(drawingText(desktop)).toContain('https://x.example/v?id=d0')
  expect(drawingText(desktop)).not.toContain('"type":"Image"')
})

test('scorecard: an unverifiable half of a split dimension keeps the dimension unknown', () => {
  const card = fromText(`${PASS_REPORT}\n| Performance | Unverifiable | not measured |`, null, 1, 'save_agent_feedback', 'recS')
  expect(card.dims.site_optimization?.tier).toBe('Unverifiable')
  expect(meetsBar(card)).toBe('unknown')
  const reversed = fromText(`${PASS_REPORT.replace('| Site Optimization | Good |', '| Performance | Unverifiable |')}\n| SEO | Good | fine |`, null, 1, 'save_agent_feedback', 'recS')
  expect(reversed.dims.site_optimization?.tier).toBe('Unverifiable')
})

test('parse: text and json come out of every result shape', () => {
  expect(textOf('{"ok":true}')).toBe('{"ok":true}')
  expect(textOf([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('a\nb')
  expect(jsonOf([{ type: 'text', text: 'Result:\n{"ok":true,"data":{"x":1}}' }])?.ok).toBe(true)
  expect(jsonOf({ ok: true, data: { y: 2 } })?.ok).toBe(true)
  expect(jsonOf('not json')).toBeNull()
})

test('parse: validation, capture, context and queue summaries', () => {
  const v = validationSummary(VALIDATION)
  expect(v?.totalIssues).toBe(4)
  expect(v?.critical).toBe(0)
  expect(v?.categories.map(c => `${c.key}:${c.warnings}`)).toEqual(['assets:0', 'content:4'])
  expect(v?.samples[0]?.message).toMatch(/too long/)
  expect(v?.gsap?.passed).toBe(6)
  const cap = captureOf(SHOTS, 'cap1', 10)
  expect(cap?.title).toBe('Verity - Webflow HTML website template')
  expect(cap?.segments.length).toBe(3)
  expect(maxSegments(cap!)).toBe(2)
  const ctx = contextSummary({ ok: true, data: { version: { templateName: 'Verity', reviewStatus: 'CR', websiteUrl: 'https://verity-template.webflow.io/', submittedDate: '2026-10-02T20:11:10.000Z', phase0: { kind: 'TEMPLATE' }, canReview: true } } })
  expect(ctx?.name).toBe('Verity')
  expect(ctx?.phase0).toBe('TEMPLATE')
  expect(ctx?.canReview).toBe(true)
  const rows = queueRows({ ok: true, data: { items: [{ templateName: 'Rowland', latestReviewStatus: 'CR', submittedDate: '2026-10-02', assignableVersionId: 'rec1', isAssignedToCurrentReviewer: true }] } })
  expect(rows?.[0]?.mine).toBe(true)
})

test('scorecard: the report table, verdict and list counts are read from text', () => {
  const report = `# Template Review: Verity

## Verdict

- **Revise** — one hard failure

## Hard requirement failures

- [Footer] Powered by Webflow link missing — footer has no link

## Rubric assessment

| Dimension | Tier | Evidence |
|-----------|------|----------|
| Overall UX | Good | clean |
| Graphic Design | Exceptional | strong imagery |
| Typography | Satisfactory | hierarchy weak on /about |
| Site Optimization — SEO | Good | fine |
| Site Optimization — Performance | UNVERIFIABLE | run pagespeed |
| Accessibility | UNVERIFIABLE | needs visual review |
`
  const card = fromText(report, null, 5, 'save_agent_feedback')
  expect(card.name).toBe('Verity')
  expect(card.verdict).toBe('Revise')
  expect(card.hardFailures).toBe(1)
  expect(card.dims.overall_user_experience?.tier).toBe('Good')
  expect(card.dims.graphic_design?.tier).toBe('Exceptional')
  expect(card.dims.typography?.tier).toBe('Satisfactory')
  // SEO Good + Performance unverifiable: the dimension stays unknown, not Good.
  expect(card.dims.site_optimization?.tier).toBe('Unverifiable')
  expect(card.dims.accessibility?.tier).toBe('Unverifiable')
  expect(meetsBar(card)).toBe('no')
  const draft = fromText('Thanks.\n\nBLOCKING\n1. One\n2. Two\n\nRECOMMENDED\n1. Three', card, 6, 'request_changes')
  expect(draft.blocking).toBe(2)
  expect(draft.recommended).toBe(1)
  expect(draft.dims.typography?.tier).toBe('Satisfactory')
})

test('scorecard: the structured feedback call fills labels, findings and counts', () => {
  const card = fromStructured(
    {
      intake: { template_name: 'Verity', version_id: 'recV' },
      rubric_dimension_matrix: [
        { dimension: 'typography', label: 'Partial', evidence_or_reason: 'validator headings ok' },
        { dimension: 'responsive_design', label: 'Manual', evidence_or_reason: 'needs Designer QA' },
      ],
      confirmed_findings: [{ title: 'x', severity: 'warning' }, { title: 'y', severity: 'critical' }],
      human_follow_up: ['a', 'b'],
      manual_checks_remaining: ['c'],
    },
    null,
    7,
  )
  expect(card.name).toBe('Verity')
  expect(card.versionId).toBe('recV')
  expect(card.dims.typography?.label).toBe('Partial')
  expect(card.dims.responsive_design?.note).toBe('needs Designer QA')
  expect(card.findings).toEqual({ critical: 1, warning: 1, info: 0 })
  expect(card.followUps).toBe(2)
  expect(card.manual).toBe(1)
  expect(meetsBar(card)).toBe('no')
})

test('a capture result is stored and its first segments fetched', async ($, on) => {
  mock.clock(on, { now: 1000 })
  const ran: string[][] = []
  on('process.run', (_$, e) => {
    ran.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  const stored: Record<string, unknown> = {}
  on('state.set', { plugin: 'template-review-viz' }, (_$, e, next) => {
    stored[e.key] = e.value
    return next(e)
  })
  on('tool.call', { tool: 'mcp__claude_ai_Template_Review_MCP__template_review_capture_published_site_screenshots' }, () => ({ result: SHOTS }))
  await $.tool.call({ tool: 'mcp__claude_ai_Template_Review_MCP__template_review_capture_published_site_screenshots', published_url: 'https://verity-template.webflow.io/' })
  const list = stored.captures as { title: string }[]
  expect(list[0]?.title).toBe('Verity - Webflow HTML website template')
  expect(ran.filter(a => a[0] === 'curl').length).toBe(2)
  expect(ran.filter(a => a[0] === 'sips').length).toBe(2)
  const keys = Object.keys(stored.ready as Record<string, string>)
  expect(keys.some(k => k.endsWith('/desktop/0'))).toBe(true)
  expect(keys.some(k => k.endsWith('/mobile/0'))).toBe(true)
})
