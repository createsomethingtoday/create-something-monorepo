import { expect, mock, test } from 'claude-code/testing'

import { resolve, slackFixes } from '../hooks/rules'

const SLACK = 'mcp__claude_ai_Slack__slack_send_message'
const DRAFT = 'mcp__claude_ai_Slack__slack_send_message_draft'
const GMAIL = 'mcp__claude_ai_Gmail__send_message'
const STATSIG_GET = 'mcp__claude_ai_Statsig__Get_List_of_Gates'
const STATSIG_CREATE = 'mcp__claude_ai_Statsig__Create_Gate'
const CHANNEL = 'C0TESTCHAN1'

test('rules: what is outbound and what is not', () => {
  expect(resolve('mcp__claude_ai_Slack__slack_read_channel', { channel_id: CHANNEL })).toBeNull()
  expect(resolve(DRAFT, { channel_id: CHANNEL, message: 'x' })).toBeNull()
  expect(resolve(STATSIG_GET, {})).toBeNull()
  expect(resolve(STATSIG_CREATE, { params: {} })?.summary).toMatch(/Statsig \(production\)/)
  expect(resolve('mcp__claude_ai_Template_Review_MCP__template_review_request_changes', { version_id: 'x' })).toBeNull()
  expect(resolve('mcp__claude_ai_App_Review_MCP__app_review_send_ticket_followup', { version_id: 'x', message: 'hi', visibility: 'internal' })).toBeNull()
  expect(resolve('mcp__claude_ai_App_Review_MCP__app_review_send_ticket_followup', { version_id: 'x', message: 'hi' })?.summary).toMatch(/Public Zendesk reply/)
  expect(resolve(GMAIL, { to: ['a@example.com'], subject: 'Hello', body: 'plain' })?.summary).toBe('Gmail: new email to a@example.com, subject "Hello"')
  expect(resolve('Bash', { command: 'ls' })).toBeNull()
})

test('rules: Slack DM channel ids and tables are refused, URLs and tags get fixes or warnings', () => {
  expect(resolve(SLACK, { channel_id: 'D0TESTDM001', message: 'hi' })?.deny).toMatch(/DM channel id/)
  expect(resolve(SLACK, { channel_id: CHANNEL, message: '| a | b |\n|---|---|' })?.deny).toMatch(/table/)
  const url = slackFixes('See https://www.figma.com/board/abc\nLight mode next')
  expect(url.message).toBe('See https://www.figma.com/board/abc\n\nLight mode next')
  expect(url.warnings[0]).toMatch(/blank line after 1 URL/)
  expect(slackFixes('See <https://x.y/z|the board>\nnext').message).toBe('See <https://x.y/z|the board>\nnext')
  expect(slackFixes('use <img> here').warnings[0]).toMatch(/HTML-looking tag/)
  expect(slackFixes('hey @juan can you look').warnings[0]).toMatch(/plain @name/)
  expect(slackFixes('hey <@U0TESTUSR01> can you look').warnings).toEqual([])
  const out = resolve(SLACK, { channel_id: CHANNEL, message: 'Link https://a.b/c\nmore' })
  expect(out?.fixed?.message).toBe('Link https://a.b/c\n\nmore')
})

test('a Slack send that mentions a non-member is refused after checking the member list', async ($, on) => {
  let reached = 0
  let listed: unknown = null
  on('mcp.call', (_$, e) => {
    listed = e
    return { value: { isError: false, content: [{ type: 'text', text: '{"members":["U0TESTUSR03","U0TESTUSR02"],"next_cursor":""}' }] } }
  })
  on('tool.call', { tool: SLACK }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: SLACK, channel_id: CHANNEL, message: 'Can <@U0TESTUSR01> and <@U0TESTUSR02> take a look?' })
  expect(ran.deny).toMatch(/<@U0TESTUSR01> is not in C0TESTCHAN1/)
  expect(ran.deny).not.toMatch(/U0TESTUSR02/)
  expect(listed).not.toBeNull()
  expect(reached).toBe(0)
})

test('a Slack send to members reaches the dialog with the fixed text; a decline refuses', async ($, on) => {
  mock.clock(on)
  let reached = 0
  let asked = ''
  on('mcp.call', () => ({ value: { isError: false, content: [{ type: 'text', text: '["U0TESTUSR02"]' }] } }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    asked = JSON.stringify(e)
    return { deny: 'declined in test' }
  })
  on('tool.call', { tool: SLACK }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const ran = await $.tool.call({ tool: SLACK, channel_id: CHANNEL, message: '<@U0TESTUSR02> recap: https://a.b/c\nnext steps below' })
  expect(ran.deny).toMatch(/outbound-guard/)
  expect(asked).toMatch(/Slack message to C0TESTCHAN1/)
  expect(asked).toMatch(/blank line after 1 URL/)
  expect(asked).toMatch(/https:\/\/a\.b\/c\\n\\nnext steps/)
  expect(reached).toBe(0)
})

test('a Gmail send reaches the dialog with recipients and body; reads pass through', async ($, on) => {
  let asked = ''
  let reached = 0
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    asked = JSON.stringify(e)
    return { deny: 'declined in test' }
  })
  on('tool.call', { tool: GMAIL }, () => {
    reached += 1
    return { result: { id: 'm1' } }
  })
  on('tool.call', { tool: STATSIG_GET }, () => {
    reached += 1
    return { result: { gates: [] } }
  })
  const ran = await $.tool.call({ tool: GMAIL, to: ['creator@example.com'], subject: 'Your template', body: 'Hi there, your template is approved.' })
  expect(ran.deny).toMatch(/outbound-guard/)
  expect(asked).toMatch(/creator@example.com/)
  expect(asked).toMatch(/your template is approved/)
  expect(reached).toBe(0)
  const read = await $.tool.call({ tool: STATSIG_GET })
  expect(read.deny).toBeUndefined()
  expect(reached).toBe(1)
})

const APPROVE = 'mcp__claude_ai_App_Review_MCP__app_review_approve_version'
const REJECT = 'mcp__claude_ai_App_Review_MCP__app_review_reject_version'
const CHANGES = 'mcp__claude_ai_App_Review_MCP__app_review_request_changes'

test('rules: App Review decisions are outbound; Gmail previews the HTML recipients see', () => {
  expect(resolve(APPROVE, { version_id: 'v1', review_feedback: 'Looks good' })?.summary).toMatch(/APPROVE v1 \(the developer is emailed\)/)
  expect(resolve(REJECT, { version_id: 'v1', rejection_reason: 'Spam', review_feedback: 'No' })?.text).toBe('No')
  expect(resolve(CHANGES, { version_id: 'v1', review_feedback: 'Fix X', review_status: '📤Changes Requested (No Notification)' })?.summary).toMatch(/no notification/)
  const both = resolve(GMAIL, { to: ['a@example.com'], body: 'plain fallback', htmlBody: '<p>rich version</p>' })
  expect(both?.text).toBe('<p>rich version</p>')
  expect(both?.warnings[0]).toMatch(/htmlBody/)
  expect(resolve(GMAIL, { to: ['a@example.com'], body: 'only plain' })?.text).toBe('only plain')
})

test('an approval reaches the dialog, and text too long to review in full is refused unseen', async ($, on) => {
  let asked = 0
  let reached = 0
  on('tool.call', { tool: 'AskUserQuestion' }, () => {
    asked += 1
    return { deny: 'declined in test' }
  })
  on('tool.call', { tool: APPROVE }, () => {
    reached += 1
    return { result: { ok: true } }
  })
  const short = await $.tool.call({ tool: APPROVE, version_id: 'v1', review_feedback: 'Approved, nice work.' })
  expect(short.deny).toMatch(/outbound-guard/)
  expect(asked).toBe(1)
  const long = await $.tool.call({ tool: APPROVE, version_id: 'v1', review_feedback: 'x'.repeat(9501) })
  expect(long.deny).toMatch(/longer than can be shown in full/)
  expect(asked).toBe(1)
  expect(reached).toBe(0)
})

const UPDATE_REVIEW = 'mcp__claude_ai_App_Review_MCP__app_review_update_version_review'
const TICKET_STATUS = 'mcp__claude_ai_App_Review_MCP__app_review_update_ticket_status'
const SET_STATUS = 'mcp__claude_ai_App_Review_MCP__app_review_set_review_status'

test('rules: generic App Review writes are guarded only when they notify the developer', () => {
  expect(resolve(UPDATE_REVIEW, { version_id: 'v1', review_status: '✅Approved' })?.summary).toMatch(/developer is emailed/)
  expect(resolve(UPDATE_REVIEW, { version_id: 'v1', review_status: '❌Rejected', review_feedback: 'No' })?.text).toBe('No')
  expect(resolve(UPDATE_REVIEW, { version_id: 'v1', review_status: '✅Approved (No Notification)' })).toBeNull()
  expect(resolve(UPDATE_REVIEW, { version_id: 'v1', hold_notes: 'x' })).toBeNull()
  expect(resolve(TICKET_STATUS, { ticket_id: '1', status: 'solved' })?.summary).toMatch(/solved/)
  expect(resolve(TICKET_STATUS, { ticket_id: '1', status: 'pending' })).toBeNull()
  expect(resolve(SET_STATUS, { version_id: 'v1', review_status: '⏸️On Hold' })).toBeNull()
})
