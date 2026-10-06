import { expect, mock, test } from 'claude-code/testing'

import { captureOf, contextSummary, jsonOf, maxSegments, queueRows, textOf, validationSummary } from '../hooks/parse'
import { fromStructured, fromText, meetsBar } from '../hooks/scorecard'

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
  expect(card.dims.site_optimization?.tier).toBe('Good')
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
