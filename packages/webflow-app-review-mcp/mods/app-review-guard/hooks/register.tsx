import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GuardSent } from '../types'
import { lintComposed, lintVerbatim } from './lint'

const PLUGIN = 'app-review-guard'
const PANE = 'ar-send'
const contextLoaded = atom({ plugin: 'app-review-guard', key: 'contextLoaded' } as const, [])
const names = atom({ plugin: 'app-review-guard', key: 'names' } as const, {})
const sent = atom({ plugin: 'app-review-guard', key: 'sent' } as const, [])
const pending = atom({ plugin: 'app-review-guard', key: 'pending' } as const, null)

/** The direct connector and a Hub proxy name alike. */
const TOOL_RE = /app_review_([a-z_]+)$/
const PROXY_RE = /hub_execute_proxy_tool$/
const NAME_RE = /"appName"\s*:\s*"([^"\n]+)"/

type Args = Record<string, unknown>
type Call = { name: string; args: Args; isProxy: boolean }

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function resolveCall(e: { tool: string } & Args): Call | null {
  const direct = TOOL_RE.exec(String(e.tool))
  if (direct?.[1]) return { name: direct[1], args: e, isProxy: false }
  if (!PROXY_RE.test(String(e.tool))) return null
  const proxied = TOOL_RE.exec(str(e.proxyToolName) ?? '')
  if (!proxied?.[1]) return null
  const raw = e.arguments ?? e.args ?? e.input ?? e.params
  const args = raw !== null && typeof raw === 'object' ? (raw as Args) : {}
  return { name: proxied[1], args, isProxy: true }
}

function resultText(ran: { text?: string; result?: unknown }): string {
  return ran.text ?? (typeof ran.result === 'string' ? ran.result : JSON.stringify(ran.result ?? ''))
}

/** Statuses on update_version_review that notify the developer or settle the decision. */
const DECISION_STATUSES = /changes requested|approved|rejected/i
/** Official decisions: review context must have been loaded this session. */
const DECISIONS = new Set(['request_changes', 'approve_version', 'reject_version'])

/** A decision by name, or a status write routed through asset metadata. */
function isDecision(call: Call): boolean {
  return DECISIONS.has(call.name) || (call.name === 'update_asset_metadata' && str(call.args.latest_review_status) !== null)
}

/**
 * What the call does to the developer, the marketplace, or the team, or null
 * when it is a reviewer-internal write that needs no confirmation.
 */
export function describe({ name, args }: Call, known: Record<string, string>): string | null {
  const id = str(args.version_id) ?? str(args.asset_id) ?? '?'
  const app = known[id]
  const v = app === undefined ? id : `${app} (${id})`
  switch (name) {
    case 'request_changes':
      return `Request Changes on ${v}${args.review_status === '📤Changes Requested (No Notification)' ? ' (no notification)' : ': emails the developer the feedback'} (${String(args.review_feedback ?? '').length} chars)`
    case 'reject_version':
      return `Reject ${v} (${str(args.rejection_reason) ?? 'no reason'}): emails the developer a rejection`
    case 'approve_version':
      return `Approve ${v}: emails the developer an approval and clears the way to publish`
    case 'update_version_review': {
      const status = str(args.review_status)
      if (status && DECISION_STATUSES.test(status)) return `Set Review Status "${status}" on ${v}${/no notification/i.test(status) ? '' : ' (notifies the developer)'}`
      if (args.exception_status === '🆕Requested') return `Request an exception on ${v}: posts to #app-review-exceptions`
      if (str(args.review_feedback)) return `Write the developer-facing Review Feedback field on ${v}`
      return null
    }
    case 'send_ticket_followup':
      return args.visibility === 'internal' ? null : `Public Zendesk reply to the developer on ${v}`
    case 'create_ticket':
      return `New Zendesk ticket to the developer: "${str(args.subject) ?? ''}"`
    case 'update_ticket_status':
      return args.status === 'solved' ? `Solve Zendesk ticket ${str(args.ticket_id) ?? '?'} (sends the solved email)` : null
    case 'set_marketplace_status':
      return `Marketplace Status -> ${str(args.marketplace_status) ?? '?'} on ${v}: changes what customers see`
    case 'update_asset_metadata': {
      const status = str(args.latest_review_status)
      if (status) return `Set Review Status "${status}" on ${v} through asset metadata${/no notification/i.test(status) ? '' : ' (notifies the developer)'}`
      const market = str(args.marketplace_status)
      if (market) return `Marketplace Status -> ${market} on ${v} through asset metadata: changes what customers see`
      return null
    }
    default:
      return null
  }
}

/** The text the developer would read, when the call carries one. */
export function developerText({ name, args }: Call): string | null {
  switch (name) {
    case 'request_changes':
    case 'reject_version':
    case 'approve_version':
    case 'update_version_review':
      return str(args.review_feedback)
    case 'send_ticket_followup':
    case 'create_ticket':
      return str(args.message)
    default:
      return null
  }
}

const QUESTION_EXCERPT = 1500

/**
 * Asks the reviewer on the engine's own dialog (a `$` call, so the hook's
 * budget does not run while they read); the full text is drawn in a pane
 * beside it where the terminal is wide enough. Resolves null to send, else
 * the refusal for the model.
 */
async function confirm($: EngineInterface, call: Call, summary: string): Promise<string | null> {
  const text = developerText(call)
  let paneOpen = false
  if (text !== null) {
    await update($, pending, () => ({ summary, text }))
    try {
      paneOpen = (await $.ui.open({ id: PANE, title: 'What the developer will read', rows: 24 })).isPlaced
    } catch {
      paneOpen = false
    }
  }
  const excerpt =
    text === null
      ? ''
      : `\n\n---\n${text.length > QUESTION_EXCERPT ? `${text.slice(0, QUESTION_EXCERPT)}\n[... ${text.length - QUESTION_EXCERPT} more chars${paneOpen ? ', shown in full in the pane' : ''}]` : text}\n---\n`
  let answer: string
  try {
    answer = await $.ui.ask(`${summary}.${excerpt}\nSend it?`, { options: ['Send', 'Do not send'], header: 'Developer' })
  } catch {
    answer = ''
  } finally {
    if (text !== null) {
      await update($, pending, () => null)
      if (paneOpen) await $.ui.close({ id: PANE })
    }
  }
  if (answer === 'Send') return null
  if (answer === '') return `${PLUGIN}: ${call.name} needs a reviewer to approve it and nobody answered. Refused.`
  const note = answer === 'Do not send' ? '' : `: ${answer}`
  return `${PLUGIN}: the reviewer declined ${call.name}${note}. Do not retry it without new instructions from the reviewer.`
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const call = resolveCall(e as { tool: string } & Args)
    if (call === null) return next(e)
    const versionId = str(call.args.version_id)

    if (call.name === 'get_review_context') {
      const ran = await next(e)
      if (ran.deny === undefined && ran.isError === undefined && versionId !== null) {
        const text = resultText(ran)
        await update($, contextLoaded, list => (list.includes(versionId) ? list : [...list, versionId]))
        const app = NAME_RE.exec(text)?.[1]
        if (app !== undefined) await update($, names, known => ({ ...known, [versionId]: app }))
      }
      return ran
    }

    // Lint developer-facing text before anything else happens.
    let input: typeof e = e
    const feedback = str(call.args.review_feedback)
    if (feedback !== null && call.name !== 'approve_version') {
      const lint = lintComposed(feedback)
      if (lint.deny !== undefined) return { deny: `${PLUGIN}: review_feedback ${lint.deny}` }
      for (const w of lint.warnings) $.ui.toast(`review_feedback: ${w}`)
      if (lint.fixed !== undefined && !call.isProxy) {
        input = { ...input, ...({ review_feedback: lint.fixed } as Record<string, unknown>) } as typeof e
        call.args = { ...call.args, review_feedback: lint.fixed }
      }
    }
    const verbatim = call.name === 'create_ticket' || (call.name === 'send_ticket_followup' && call.args.visibility !== 'internal')
    const message = str(call.args.message)
    if (verbatim && message !== null) {
      const lint = lintVerbatim(message)
      if (lint.deny !== undefined) return { deny: `${PLUGIN}: message ${lint.deny}` }
      for (const w of lint.warnings) $.ui.toast(`message: ${w}`)
    }
    if (call.name === 'save_draft_feedback') {
      $.ui.toast('save_draft_feedback writes the developer-facing Review Feedback field without sending; the send happens on request_changes / reject_version')
    }

    const summary = describe(call, await read($, names))
    if (summary === null) return next(input)

    // An asset-level status write has no version id; it needs some review context loaded this session.
    const gateId = versionId ?? (call.name === 'update_asset_metadata' ? str(call.args.asset_id) : null)
    if (isDecision(call) && gateId !== null) {
      const loaded = await read($, contextLoaded)
      if (versionId !== null ? !loaded.includes(versionId) : loaded.length === 0) {
        return {
          deny: `${PLUGIN}: ${call.name} on ${versionId ?? gateId} refused: app_review_get_review_context has not been called ${versionId !== null ? 'for this version' : 'for any version'} in this session. Load the review context first, then retry.`,
        }
      }
    }

    const refusal = await confirm($, call, summary)
    if (refusal !== null) return { deny: refusal }

    // The dialog answer is the reviewer's approval the MCP asks for on create_ticket.
    if (call.name === 'create_ticket' && !call.isProxy) input = { ...input, ...({ confirm_send: true } as Record<string, unknown>) } as typeof e

    const ran = await next(input)
    if (ran.deny === undefined && ran.isError === undefined) {
      const entry: GuardSent = { tool: call.name, versionId, at: await $.clock.now() }
      const all = await update($, sent, list => [...list, entry].slice(-50))
      $.ui.status(`${all.length} developer-facing write${all.length === 1 ? '' : 's'} confirmed this session`)
      $.ui.toast(`sent: ${call.name}${versionId === null ? '' : ` ${versionId}`}`)
    }
    return ran
  }).catch(($, e, next) =>
    resolveCall(e as { tool: string } & Args) === null
      ? next(e)
      : { deny: `${PLUGIN}: the guard failed while checking ${String(e.tool)}; refusing the call rather than letting it through. Tell the reviewer.` },
  )

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const shown = await read($, pending)
    if (shown === null) {
      return (
        <Box>
          <Text dimColor>Nothing waiting for approval.</Text>
        </Box>
      )
    }
    const limit = 9500
    const body = shown.text.length > limit ? `${shown.text.slice(0, limit)}\n\n_[cut: ${shown.text.length - limit} more characters]_` : shown.text
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold wrap="wrap">
          {shown.summary}
        </Text>
        <Text dimColor>Answer Send / Do not send in the dialog. This is the exact text the developer receives.</Text>
        <Markdown text={body} />
      </Box>
    )
  })
}
