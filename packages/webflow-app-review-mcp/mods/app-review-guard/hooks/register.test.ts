import { expect, test } from 'claude-code/testing'

import { lintComposed, lintVerbatim } from './lint'
import { describe } from './register'

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
const SETSTATUS = `${S}app_review_set_review_status`
const EXC_UPDATE = `${S}app_review_update_exception_item`
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

test('a review-status write routed through asset metadata needs context for that asset; copy edits pass', async ($, on) => {
  let reached = 0
  on('tool.call', (_$, e) => {
    reached += 1
    if (String(e.tool) === CTX) return { result: { context: { assetId: e.version_id === 'recVa' ? 'recAssetA' : 'recAssetB', appName: 'Some App' } } }
    return { result: { ok: true } }
  })
  const cold = await $.tool.call({ tool: META, asset_id: 'recAssetA', latest_review_status: '✅Approved', status_change: true })
  expect(cold.deny).toMatch(/get_review_context/)
  await $.tool.call({ tool: CTX, version_id: 'recVb' })
  const wrongAsset = await $.tool.call({ tool: META, asset_id: 'recAssetA', latest_review_status: '✅Approved', status_change: true })
  expect(wrongAsset.deny).toMatch(/get_review_context/)
  await $.tool.call({ tool: CTX, version_id: 'recVa' })
  const gated = await $.tool.call({ tool: META, asset_id: 'recAssetA', latest_review_status: '✅Approved', status_change: true })
  expect(gated.deny ?? '').not.toMatch(/get_review_context/)
  const before = reached
  await $.tool.call({ tool: META, asset_id: 'recAssetA', description_short: 'Copy only' })
  expect(reached).toBe(before + 1)
})

test('decision-valued statuses through set_review_status and update_version_review are gated on context', async ($, on) => {
  let reached = 0
  on('tool.call', () => {
    reached += 1
    return { result: { ok: true } }
  })
  const a = await $.tool.call({ tool: SETSTATUS, version_id: 'recE', review_status: '✅Approved', status_change: { confirmed: true, expected_status: 'In Review' } })
  expect(a.deny).toMatch(/get_review_context/)
  const b = await $.tool.call({ tool: UPDATE, version_id: 'recE', review_status: '❌Rejected' })
  expect(b.deny).toMatch(/get_review_context/)
  await $.tool.call({ tool: SETSTATUS, version_id: 'recE', review_status: '🔍In Review' })
  expect(reached).toBe(1)
})

test('exception item routes: a status flip, a new request and a resolution are developer/governance-facing; a text edit is not', () => {
  const call = (name: string, args: Record<string, unknown>) => describe({ name, args, isProxy: false }, {})
  expect(call('update_exception_item', { exception_item_id: 'recItem', exception_status: '✅Approved' })).toMatch(/exception status/)
  expect(call('update_exception_item', { exception_item_id: 'recItem', item: 'Reworded item' })).toBe(null)
  expect(call('create_exception_item', { version_id: 'recV', item: 'Third-party script' })).toMatch(/app-review-exceptions/)
  expect(call('resolve_exception_item', { exception_item_id: 'recItem', resolved_in_version_id: 'recV2', resolution_notes: 'verified' })).toMatch(/Resolve exception item/)
  expect(String(EXC_UPDATE).endsWith('update_exception_item')).toBe(true)
})

test('a failed get_review_context payload (ok:false) does not count as loaded context', async ($, on) => {
  let reached = 0
  on('tool.call', (_$, e) => {
    reached += 1
    if (String(e.tool) === CTX) return { result: { ok: false, error: 'Airtable 503' } }
    return { result: { ok: true } }
  })
  await $.tool.call({ tool: CTX, version_id: 'recF' })
  const ran = await $.tool.call({ tool: APPROVE, version_id: 'recF', review_feedback: CLEAN })
  expect(ran.deny).toMatch(/get_review_context/)
  expect(reached).toBe(1)
})
