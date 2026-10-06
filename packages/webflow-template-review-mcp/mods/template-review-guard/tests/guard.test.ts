import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { collapseNumberedGaps, lintComposed, lintVerbatim } from '../hooks/lint'

const RC = 'mcp__claude_ai_Template_Review_MCP__template_review_request_changes'
const REJECT = 'mcp__claude_ai_Template_Review_MCP__template_review_reject_version'
const CTX = 'mcp__claude_ai_Template_Review_MCP__template_review_get_review_context'
const FOLLOWUP = 'mcp__claude_ai_Template_Review_MCP__template_review_send_ticket_followup'
const VALIDATE = 'mcp__claude_ai_Template_Review_MCP__template_review_run_published_site_validation'
const SHOTS = 'mcp__claude_ai_Template_Review_MCP__template_review_capture_published_site_screenshots'
const CLEAN = 'Thanks for submitting. Below are the items to address.\n\nBLOCKING\n1. Add /licenses at the root slug.\n2. Link Powered by Webflow in the footer.'
const SITE = 'https://savoria.webflow.io/'
/** An in-memory store the test serves and watches; mock.store cannot be combined with store.* hooks. */
function fakeStore(on: On, seed: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(seed))
  const log: { op: 'set' | 'delete'; key: string; value?: unknown }[] = []
  on('store.get', (_$, e) => ({ value: data.get(e.key) }))
  on('store.set', (_$, e) => {
    data.set(e.key, e.value)
    log.push({ op: 'set', key: e.key, value: e.value })
    return { value: undefined }
  })
  on('store.delete', (_$, e) => {
    data.delete(e.key)
    log.push({ op: 'delete', key: e.key })
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...data.keys()] }))
  return log
}

const CR_DATE = '2026-10-05T19:32:46.000Z'
const CR_MS = Date.parse(CR_DATE)
const HOUR = 60 * 60 * 1000

test('lint: backticks, greetings and sign-offs are refused on the composed path', () => {
  expect(lintComposed('Fix the `hero` class').deny).toMatch(/backtick/)
  expect(lintComposed('Hi Okko,\n1. Fix it').deny).toMatch(/greeting/)
  expect(lintComposed('1. Fix it\n\nThe Webflow Marketplace Team').deny).toMatch(/sign-off/)
  expect(lintComposed(CLEAN).deny).toBeUndefined()
})

test('lint: blank lines between numbered items are collapsed, not refused', () => {
  const gappy = 'Intro.\n\nBLOCKING\n1. One\n\n2. Two\n\n3. Three\n\nRECOMMENDED\n1. Four'
  const { text, removed } = collapseNumberedGaps(gappy)
  expect(removed).toBe(2)
  expect(text).toBe('Intro.\n\nBLOCKING\n1. One\n2. Two\n3. Three\n\nRECOMMENDED\n1. Four')
  const lint = lintComposed(gappy)
  expect(lint.deny).toBeUndefined()
  expect(lint.fixed).toBe(text)
})

test('lint: verbatim messages need their own greeting', () => {
  expect(lintVerbatim('Your template was approved.').deny).toMatch(/greeting/)
  expect(lintVerbatim('Hi Okko, your template was approved.\n\nThe Webflow Marketplace Team').deny).toBeUndefined()
})

test('request_changes with a backtick never reaches the MCP', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: RC, version_id: 'recA', review_feedback: 'Rename `hero`.' })
  expect(ran.deny).toMatch(/backtick/)
  expect(reached).toBe(0)
})

test('a decision is refused until get_review_context ran for that version', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: RC, version_id: 'recB', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/get_review_context/)
  expect(reached).toBe(0)
})

test('a Preview link is refused on the evidence tools', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: VALIDATE }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({
    tool: VALIDATE,
    published_url: 'https://preview.webflow.com/preview/savoria?utm_medium=preview_link&workflow=preview',
  })
  expect(ran.deny).toMatch(/Preview link/)
  expect(reached).toBe(0)
})

test('a decision with context but no validation or screenshots is refused', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Savoria' } }))
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recE' })
  const ran = await $.tool.call({ tool: RC, version_id: 'recE', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/missing evidence.*validated, screenshots/)
  expect(reached).toBe(0)
})

test('a Phase 0 fast-exit lets a rejection skip the evidence gate', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Ghost', phase0: { kind: 'DEAD_URL', status: 404 } } }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'nobody here' }))
  on('tool.call', { tool: REJECT }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recF' })
  const ran = await $.tool.call({ tool: REJECT, version_id: 'recF', reject_reason: 'Unreachable URL', rejection_feedback: 'The submitted URL returns 404.' })
  expect(ran.deny).not.toMatch(/evidence/)
  expect(ran.deny).toMatch(/template-review-guard/)
  expect(reached).toBe(0)
})

test('with full evidence, the dialog names the template and carries the feedback; a decline refuses', async ($, on) => {
  mock.clock(on)
  let reached = 0
  let asked = ''
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Savoria', reviewOwner: { name: 'Micah Johnson' } } }))
  on('tool.call', { tool: VALIDATE }, () => ({ result: { findings: [] } }))
  on('tool.call', { tool: SHOTS }, () => ({ result: { gallery_url: 'https://shots.example/g/1' } }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    asked = JSON.stringify(e)
    return { deny: 'nobody here' }
  })
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recC' })
  await $.tool.call({ tool: VALIDATE, published_url: SITE })
  await $.tool.call({ tool: SHOTS, published_url: SITE })
  const ran = await $.tool.call({ tool: RC, version_id: 'recC', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/template-review-guard/)
  expect(asked).toMatch(/Savoria \(recC\)/)
  expect(asked).toMatch(/Add \/licenses at the root slug/)
  expect(reached).toBe(0)
})

test('an internal ticket note passes straight through', async ($, on) => {
  let seen: unknown = null
  on('tool.call', { tool: FOLLOWUP }, (_$, e) => {
    seen = e
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: FOLLOWUP, version_id: 'recD', message: 'internal note, no greeting', visibility: 'internal' })
  expect(ran.deny).toBeUndefined()
  expect(seen).not.toBeNull()
})

test('evidence from an earlier session is restored when newer than the last review', async ($, on) => {
  mock.clock(on, { now: CR_MS + 5 * HOUR })
  fakeStore(on, {
    'evidence:recG': { items: [{ kind: 'validated', at: CR_MS + HOUR }, { kind: 'screenshots', at: CR_MS + 2 * HOUR }] },
  })
  let reached = 0
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Verity', latestReviewDate: CR_DATE } }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'nobody here' }))
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recG' })
  const ran = await $.tool.call({ tool: RC, version_id: 'recG', review_feedback: CLEAN })
  expect(ran.deny).not.toMatch(/missing evidence/)
  expect(ran.deny).toMatch(/declined|nobody answered/)
  expect(reached).toBe(0)
})

test('evidence older than the last review is dropped as stale', async ($, on) => {
  mock.clock(on, { now: CR_MS + 5 * HOUR })
  const log = fakeStore(on, {
    'evidence:recH': { items: [{ kind: 'validated', at: CR_MS - HOUR }, { kind: 'screenshots', at: CR_MS - HOUR }] },
  })
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Verity', latestReviewDate: CR_DATE } }))
  on('tool.call', { tool: RC }, () => ({ result: { ok: true } }))
  await $.tool.call({ tool: CTX, version_id: 'recH' })
  const ran = await $.tool.call({ tool: RC, version_id: 'recH', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/missing evidence.*validated, screenshots/)
  expect(log).toEqual([{ op: 'delete', key: 'evidence:recH' }])
})

test('a validation run is written to the store for later sessions', async ($, on) => {
  mock.clock(on, { now: CR_MS + HOUR })
  const log = fakeStore(on)
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Verity', latestReviewDate: CR_DATE } }))
  on('tool.call', { tool: VALIDATE }, () => ({ result: { findings: [] } }))
  await $.tool.call({ tool: CTX, version_id: 'recJ' })
  await $.tool.call({ tool: VALIDATE, published_url: SITE })
  expect(log).toEqual([{ op: 'set', key: 'evidence:recJ', value: { items: [{ kind: 'validated', at: CR_MS + HOUR }] } }])
})

test('evidence for several sites is credited by published URL, not to the last-named version', async ($, on) => {
  mock.clock(on)
  let asked = ''
  on('tool.call', { tool: CTX }, (_$, e) =>
    e.version_id === 'recK'
      ? { result: { templateName: 'Slotwyse', websiteUrl: 'https://slotwyse.webflow.io/' } }
      : { result: { templateName: 'Ironclaw', websiteUrl: 'https://ironclaw.webflow.io/' } },
  )
  on('tool.call', { tool: VALIDATE }, () => ({ result: { findings: [] } }))
  on('tool.call', { tool: SHOTS }, () => ({ result: { gallery_url: 'https://shots.example/g/2' } }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    asked = JSON.stringify(e)
    return { deny: 'nobody here' }
  })
  on('tool.call', { tool: RC }, () => ({ result: { ok: true } }))
  await $.tool.call({ tool: CTX, version_id: 'recK' })
  await $.tool.call({ tool: CTX, version_id: 'recL' })
  // recL is now the last-named version; Slotwyse's evidence must still land on recK.
  await $.tool.call({ tool: VALIDATE, published_url: 'https://slotwyse.webflow.io/' })
  await $.tool.call({ tool: SHOTS, published_url: 'https://www.Slotwyse.webflow.io/about' })
  const first = await $.tool.call({ tool: RC, version_id: 'recK', review_feedback: CLEAN })
  expect(first.deny).not.toMatch(/missing evidence/)
  expect(asked).toMatch(/Slotwyse \(recK\)/)
  const second = await $.tool.call({ tool: RC, version_id: 'recL', review_feedback: CLEAN })
  expect(second.deny).toMatch(/missing evidence.*validated, screenshots/)
})

test('a site no review context named falls back to the last-named version', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: CTX }, () => ({ result: { templateName: 'Verity', websiteUrl: 'https://verity.webflow.io/' } }))
  on('tool.call', { tool: VALIDATE }, () => ({ result: { findings: [] } }))
  on('tool.call', { tool: SHOTS }, () => ({ result: { gallery_url: 'https://shots.example/g/3' } }))
  on('tool.call', { tool: 'AskUserQuestion' }, () => ({ deny: 'nobody here' }))
  on('tool.call', { tool: RC }, () => ({ result: { ok: true } }))
  await $.tool.call({ tool: CTX, version_id: 'recM' })
  await $.tool.call({ tool: VALIDATE, published_url: 'https://verity-custom.example.com/' })
  await $.tool.call({ tool: SHOTS, published_url: 'https://verity-custom.example.com/' })
  const ran = await $.tool.call({ tool: RC, version_id: 'recM', review_feedback: CLEAN })
  expect(ran.deny).not.toMatch(/missing evidence/)
})
