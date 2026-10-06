import { expect, mock, test } from 'claude-code/testing'

import type { On } from 'claude-code'

import type { Review } from '../types'

import { apply, observe, summarize } from '../hooks/track'

const CTX = 'mcp__claude_ai_Template_Review_MCP__template_review_get_review_context'
const SHOTS = 'mcp__claude_ai_Template_Review_MCP__template_review_capture_published_site_screenshots'
const RC = 'mcp__claude_ai_Template_Review_MCP__template_review_request_changes'

/** Watches the plugin's own state writes, since the test engine has no $.state of its own. */
function watch(on: On) {
  const last: Record<string, unknown> = {}
  on('state.set', { plugin: 'template-review-hud' }, (_$, e, next) => {
    last[e.key] = e.value
    return next(e)
  })
  return last
}

test('observe reads the name, url and gallery out of results', () => {
  const ctx = observe(
    { name: 'get_review_context', args: { version_id: 'rec1' } },
    '{"template_name":"Savoria","published_url":"https://savoria.webflow.io/"}',
  )
  expect(ctx.name).toBe('Savoria')
  expect(ctx.url).toBe('https://savoria.webflow.io/')
  expect(ctx.step).toBe('context')
  expect(ctx.owned).toBe(false)
  const live = observe(
    { name: 'get_review_context', args: { version_id: 'rec2' } },
    '{"templateName":"Verity","reviewOwner":{"name":"Micah Johnson"},"websiteUrl":"https://verity-template.webflow.io/","previewSiteUrl":"https://preview.webflow.com/x","isAssignedToCurrentReviewer": true}',
  )
  expect(live.name).toBe('Verity')
  expect(live.url).toBe('https://verity-template.webflow.io/')
  expect(live.owned).toBe(true)
  expect(apply([], null, live, 1).reviews[0]?.steps).toEqual(['context', 'assigned'])
  const shots = observe(
    { name: 'capture_published_site_screenshots', args: { published_url: 'https://savoria.webflow.io/' } },
    '{"gallery_url":"https://shots.example/g/1","screenshots":[]}',
  )
  expect(shots.versionId).toBeNull()
  expect(shots.gallery).toBe('https://shots.example/g/1')
})

test('apply attaches url-only calls to the current review and keeps steps', () => {
  const a = apply([], null, observe({ name: 'get_review_context', args: { version_id: 'rec1' } }, '{"name":"Savoria"}'), 1)
  const b = apply(a.reviews, a.current, observe({ name: 'run_published_site_validation', args: { published_url: 'https://x.webflow.io/' } }, '{}'), 2)
  const c = apply(b.reviews, b.current, observe({ name: 'request_changes', args: { version_id: 'rec1', review_feedback: 'x' } }, '{}'), 3)
  const review = c.reviews.find(r => r.id === 'rec1')
  expect(review?.steps).toEqual(['context', 'validated'])
  expect(review?.url).toBe('https://x.webflow.io/')
  expect(review?.decision).toBe('Changes Requested')
  expect(summarize(review!)).toMatch(/ctx ✓ {2}own · {2}val ✓/)
})

test('tool calls through the engine land in state', async ($, on) => {
  mock.clock(on, { now: 1000 })
  const last = watch(on)
  on('tool.call', { tool: CTX }, () => ({ result: { template_name: 'Savoria', published_url: 'https://savoria.webflow.io/' } }))
  on('tool.call', { tool: SHOTS }, () => ({ result: { gallery_url: 'https://shots.example/g/2' } }))
  on('tool.call', { tool: RC }, () => ({ result: { ok: true } }))
  await $.tool.call({ tool: CTX, version_id: 'rec9' })
  await $.tool.call({ tool: SHOTS, published_url: 'https://savoria.webflow.io/' })
  await $.tool.call({ tool: RC, version_id: 'rec9', review_feedback: 'ok' })
  expect(last.current).toBe('rec9')
  const review = (last.reviews as Review[]).find(r => r.id === 'rec9')
  expect(review?.name).toBe('Savoria')
  expect(review?.gallery).toBe('https://shots.example/g/2')
  expect(review?.steps).toEqual(['context', 'screenshots'])
  expect(review?.decision).toBe('Changes Requested')
})

test('a failed call changes nothing', async ($, on) => {
  mock.clock(on)
  const last = watch(on)
  on('tool.call', { tool: CTX }, () => ({ deny: 'nope' }))
  await $.tool.call({ tool: CTX, version_id: 'recX' })
  expect(last.current).toBeUndefined()
  expect(last.reviews).toBeUndefined()
})
