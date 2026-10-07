/**
 * Which tool calls leave the company or change a live system, what they do,
 * and the text the recipient would read. Pure: no engine access.
 */
export type Args = Record<string, unknown>

export type Outbound = {
  /** `mcp__<server>__<tool>` split apart. */
  server: string
  tool: string
  /** One line for the dialog: what goes where. */
  summary: string
  /** What the recipient reads, when the call carries text. */
  text: string | null
  /** Things to say in the dialog that do not block the send. */
  warnings: string[]
  /** Why the send must not go out as written. */
  deny?: string
  /** Arguments rewritten with deterministic fixes applied. */
  fixed?: Args
  /** The recipient sees the characters as written (plain-text email), so the
   *  preview must not render them as Markdown. */
  literal?: boolean
}

export function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function split(name: string): { server: string; tool: string } | null {
  const m = /^mcp__(.+?)__(.+)$/.exec(name)
  return m?.[1] && m[2] ? { server: m[1], tool: m[2] } : null
}

/** Statsig reads; everything else on that server changes production config. */
const STATSIG_READ = /^(Get_|GetExperiment|Query_|Search_|Cluster_|search$|fetch$|Get_Tool_Schema)/
const CALENDAR_SENDS = new Set(['create_event', 'update_event', 'delete_event', 'respond_to_event'])
const PARTNERSTACK_SENDS = new Set([
  'approve_or_decline_an_application',
  'create_a_message',
  'create_a_reward',
  'create_a_transaction',
])

/** App Review statuses whose write fires a developer-facing email. */
const NOTIFYING_REVIEW_STATUSES = new Set(['📤Changes Requested', '✅Approved', '❌Rejected'])

/** The Slack checks that have each cost a deleted or lost message before. */
export const SLACK_MENTION_RE = /<@(U[A-Z0-9]{6,})>/g
const SLACK_BARE_MENTION_RE = /(^|\s)@[a-z][\w.-]+/i
const SLACK_TABLE_RE = /^\s*\|.*\|\s*$/m
const SLACK_HTML_TAG_RE = /<(?!@|#|!|https?:|mailto:)[a-z][^>\n]*>/i
/** A bare URL ending a line with prose on the very next line: Slack swallows that word into the link. */
const SLACK_URL_LINE_RE = /(^|[^<\w])(https?:\/\/[^\s>|]+)\n(?=[^\n])/g

export function slackFixes(message: string): { message: string; warnings: string[]; deny?: string } {
  const warnings: string[] = []
  if (SLACK_TABLE_RE.test(message)) {
    return { message, warnings, deny: 'contains a Markdown table; slack_send_message drops tables silently and delivers a blank gap. Use a bullet list.' }
  }
  if (SLACK_HTML_TAG_RE.test(message)) {
    warnings.push('contains an HTML-looking tag; Slack strips tags (write the tag name without angle brackets)')
  }
  if (SLACK_BARE_MENTION_RE.test(message.replace(SLACK_MENTION_RE, ''))) {
    warnings.push('has a plain @name mention; only <@Uxxxx> ids notify anyone')
  }
  let fixedCount = 0
  const fixed = message.replace(SLACK_URL_LINE_RE, (_m, lead: string, url: string) => {
    fixedCount += 1
    return `${lead}${url}\n\n`
  })
  if (fixedCount > 0) warnings.push(`added a blank line after ${fixedCount} URL${fixedCount === 1 ? '' : 's'} so Slack does not swallow the next word into the link`)
  return { message: fixed, warnings }
}

export function slackMentions(message: string): string[] {
  return [...message.matchAll(SLACK_MENTION_RE)].map(m => m[1]).filter((id): id is string => id !== undefined)
}

/** Null when the call is not outbound. */
export function resolve(name: string, args: Args): Outbound | null {
  const parts = split(name)
  if (parts === null) return null
  const { server, tool } = parts
  const base = { server, tool, warnings: [] as string[] }

  if (/slack/i.test(server) && (tool === 'slack_send_message' || tool === 'slack_schedule_message')) {
    const channel = str(args.channel_id) ?? '?'
    const message = str(args.message) ?? ''
    const when = tool === 'slack_schedule_message' ? ` scheduled for ${String(args.post_at ?? '?')}` : ''
    const thread = str(args.thread_ts) !== null ? ' as a thread reply' : ''
    const out: Outbound = { ...base, summary: `Slack message to ${channel}${thread}${when}`, text: message }
    if (channel.startsWith('D')) {
      out.deny = `channel_id ${channel} is a DM channel id; slack_send_message reports success there and delivers nothing. Use the person's U… user id as channel_id, or slack_send_message_draft.`
      return out
    }
    const fixes = slackFixes(message)
    if (fixes.deny !== undefined) {
      out.deny = fixes.deny
      return out
    }
    out.warnings = fixes.warnings
    if (fixes.message !== message) {
      out.fixed = { ...args, message: fixes.message }
      out.text = fixes.message
    }
    return out
  }

  if (/gmail/i.test(server) && (tool === 'send_message' || tool === 'reply' || tool === 'forward')) {
    // Keep the roles apart: an address in To instead of BCC is exposed to everyone.
    const roles = [['to', list(args.to)], ['cc', list(args.cc)], ['bcc', list(args.bcc)]] as const
    const to = roles.flatMap(([, xs]) => xs)
    const labelled = roles.filter(([, xs]) => xs.length > 0).map(([role, xs]) => `${role}: ${xs.join(', ')}`).join('; ')
    const draft = str(args.draftId)
    // htmlBody is what recipients normally render; body is the plain-text
    // fallback. Preview the version they will read.
    const html = str(args.htmlBody)
    const body = html ?? str(args.body) ?? str(args.forwardText)
    const what = tool === 'send_message' ? (draft !== null ? `Gmail: send draft ${draft}` : 'Gmail: new email') : tool === 'reply' ? `Gmail: reply${args.replyAll === true ? ' to all' : ''} on ${str(args.messageId) ?? '?'}` : `Gmail: forward ${str(args.messageId) ?? '?'}`
    const who = to.length > 0 ? ` (${labelled})` : tool === 'reply' ? ' to the thread participants' : ''
    const subject = str(args.subject)
    const out: Outbound = { ...base, summary: `${what}${who}${subject === null ? '' : `, subject "${subject}"`}`, text: body, literal: html === null }
    if (html !== null && str(args.body) !== null) {
      out.warnings.push('showing htmlBody (what recipients see); the plain-text body is only the fallback')
    }
    if (html === null && str(args.body) !== null && /(^|\n)(#{1,6} |\* |- |\|)|\*\*/.test(str(args.body) ?? '')) {
      out.warnings.push('body looks like Markdown; Gmail sends body as plain text (use htmlBody for formatting)')
    }
    return out
  }

  if (tool === 'app_review_send_ticket_followup') {
    if (args.visibility === 'internal') return null
    return { ...base, summary: `Public Zendesk reply to the app developer on ${str(args.version_id) ?? '?'}`, text: str(args.message) }
  }
  if (tool === 'app_review_create_ticket') {
    const target = str(args.version_id) !== null ? `version ${str(args.version_id)}` : `asset ${str(args.asset_id) ?? '?'}`
    const to = str(args.requester_email) ?? "the asset's creator email"
    return {
      ...base,
      summary: `New Zendesk ticket to ${to} (${target}): "${str(args.subject) ?? ''}"`,
      text: str(args.message),
      // The MCP refuses without confirm_send; approving this dialog is that confirmation.
      fixed: { ...args, confirm_send: true },
    }
  }
  // Decision transitions release creator-facing emails through the base's
  // review-status automations, so they get the same dialog as a direct send.
  if (tool === 'app_review_approve_version') {
    return { ...base, summary: `App Review: APPROVE ${str(args.version_id) ?? '?'} (the developer is emailed)`, text: str(args.review_feedback) }
  }
  if (tool === 'app_review_reject_version') {
    return { ...base, summary: `App Review: REJECT ${str(args.version_id) ?? '?'} (${str(args.rejection_reason) ?? '?'}; the developer is emailed)`, text: str(args.review_feedback) }
  }
  // The generic write path reaches the same automations when it sets a
  // notifying decision status. Internal statuses and "(No Notification)"
  // variants stay unguarded.
  if (tool === 'app_review_update_version_review') {
    const status = str(args.review_status)
    if (status === null || !NOTIFYING_REVIEW_STATUSES.has(status)) return null
    return { ...base, summary: `App Review: set ${str(args.version_id) ?? '?'} to ${status} (the developer is emailed)`, text: str(args.review_feedback) }
  }
  // A third route: the asset-metadata write passes latest_review_status
  // straight through to the version review.
  if (tool === 'app_review_update_asset_metadata') {
    const status = str(args.latest_review_status)
    if (status === null || !NOTIFYING_REVIEW_STATUSES.has(status)) return null
    return { ...base, summary: `App Review: set asset ${str(args.asset_id) ?? '?'} latest review to ${status} (the developer is emailed)`, text: null }
  }
  if (tool === 'app_review_update_ticket_status') {
    if (args.status !== 'solved') return null
    return { ...base, summary: `Zendesk: mark ticket ${str(args.ticket_id) ?? '?'} solved (Zendesk emails the developer)`, text: str(args.private_note) }
  }
  if (tool === 'app_review_request_changes') {
    const silent = str(args.review_status)?.includes('No Notification') === true
    return { ...base, summary: `App Review: request changes on ${str(args.version_id) ?? '?'}${silent ? ' (no notification)' : ' (the developer is emailed)'}`, text: str(args.review_feedback) }
  }

  if (/partnerstack/i.test(server) && PARTNERSTACK_SENDS.has(tool)) {
    if (tool === 'approve_or_decline_an_application') {
      return { ...base, summary: `PartnerStack: ${args.approved === true ? 'approve' : 'decline'} application ${str(args.application_key) ?? '?'}`, text: str(args.decline_reason) }
    }
    if (tool === 'create_a_message') {
      return { ...base, summary: `PartnerStack message to room ${str(args.room_key) ?? '?'}`, text: str(args.body) }
    }
    return { ...base, summary: `PartnerStack: ${tool.replace(/_/g, ' ')} (money moves)`, text: null }
  }

  if (/statsig/i.test(server) && !STATSIG_READ.test(tool)) {
    return { ...base, summary: `Statsig (production): ${tool.replace(/_/g, ' ')}`, text: null }
  }

  if (/zapier/i.test(server) && tool === 'execute_zapier_write_action') {
    return { ...base, summary: `Zapier write: ${str(args.action) ?? '?'} on ${str(args.selected_api) ?? '?'}`, text: args.params === undefined ? null : JSON.stringify(args.params, null, 2) }
  }

  if (/drive/i.test(server) && tool === 'share_file') {
    return { ...base, summary: `Share Drive file ${str(args.fileId) ?? '?'} with ${str(args.emailAddress) ?? '?'} as ${str(args.role) ?? '?'}`, text: null }
  }

  if (/calendar/i.test(server) && CALENDAR_SENDS.has(tool)) {
    return { ...base, summary: `Calendar: ${tool.replace(/_/g, ' ')} (attendees are notified)`, text: str(args.description) }
  }

  return null
}
