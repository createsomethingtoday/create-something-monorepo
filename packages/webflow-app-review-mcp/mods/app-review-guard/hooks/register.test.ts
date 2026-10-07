import { expect, test } from 'claude-code/testing'

import { lintComposed, lintVerbatim } from './lint'

const S = 'mcp__claude_ai_App_Review_MCP__'
const RC = `${S}app_review_request_changes`
const REJECT = `${S}app_review_reject_version`
const APPROVE = `${S}app_review_approve_version`
const CTX = `${S}app_review_get_review_context`
const FOLLOWUP = `${S}app_review_send_ticket_followup`
const DRAFT = `${S}app_review_save_draft_feedback`
const UPDATE = `${S}app_review_update_version_review`
const LIST = `${S}app_review_list_queue`
const META = `${S}app_review_update_asset_metadata`
const CLEAN = 'Thanks for submitting. Below are the items to address.\n\nBLOCKING\n1. Remove the eval() call in bundle.js.\n2. Attach the source map to the private upload.'

test('lint: backticks, greetings and sign-offs are refused on the composed path; gaps collapse', () => {
  expect(lintComposed('Rename the `hero` class').deny).toMatch(/backtick/)
  expect(lintComposed('Hi there,\n1. Fix it').deny).toMatch(/greeting/)
  expect(lintComposed('1. Fix it\n\nThe Webflow Marketplace Team').deny).toMatch(/sign-off/)
  const lint = lintComposed('Intro.\n\n1. One\n\n2. Two')
  expect(lint.deny).toBeUndefined()
  expect(lint.fixed).toBe('Intro.\n\n1. One\n2. Two')
  expect(lintVerbatim('Your app was approved.').deny).toMatch(/greeting/)
})

test('read-only and internal calls pass straight through', async ($, on) => {
  let reached = 0
  on('tool.call', () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: LIST, limit: 5 })
  await $.tool.call({ tool: FOLLOWUP, version_id: 'recA', message: 'internal note', visibility: 'internal' })
  await $.tool.call({ tool: UPDATE, version_id: 'recA', hold_notes: 'waiting on creator' })
  await $.tool.call({ tool: DRAFT, version_id: 'recA', review_feedback: CLEAN })
  expect(reached).toBe(4)
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
  on('tool.call', () => {
    reached += 1
    return { result: { ok: true } }
  })
  for (const tool of [RC, REJECT, APPROVE] as const) {
    const ran = await $.tool.call({ tool, version_id: 'recB', review_feedback: CLEAN, rejection_reason: 'App issue' })
    expect(ran.deny).toMatch(/get_review_context/)
  }
  expect(reached).toBe(0)
})

test('a public follow-up without a greeting is refused before the dialog', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: FOLLOWUP }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: FOLLOWUP, version_id: 'recA', message: 'Resubmit when ready.' })
  expect(ran.deny).toMatch(/greeting/)
  expect(reached).toBe(0)
})

test('after context loads, a decision reaches the dialog, and with nobody to answer it is refused', async ($, on) => {
  let reached = 0
  on('tool.call', { tool: CTX }, () => ({ result: { ok: true, data: { context: { versionId: 'recC', appName: 'Section Namer' } } } }))
  on('tool.call', { tool: RC }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recC' })
  const ran = await $.tool.call({ tool: RC, version_id: 'recC', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/nobody answered|declined/)
  expect(reached).toBe(0)
})

test('a review-status write routed through asset metadata is gated like a decision; copy edits pass', async ($, on) => {
  let reached = 0
  on('tool.call', () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: META, asset_id: 'recAsset', latest_review_status: '✅Approved', status_change: true })
  expect(ran.deny).toMatch(/get_review_context/)
  await $.tool.call({ tool: META, asset_id: 'recAsset', description_short: 'Copy only' })
  expect(reached).toBe(1)
})
