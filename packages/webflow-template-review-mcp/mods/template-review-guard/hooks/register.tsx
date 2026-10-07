import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GuardEvidence, GuardSent } from '../types'
import { lintComposed, lintVerbatim } from './lint'

const PLUGIN = 'template-review-guard'
const PANE = 'tr-send'
const contextLoaded = atom({ plugin: 'template-review-guard', key: 'contextLoaded' } as const, [])
const names = atom({ plugin: 'template-review-guard', key: 'names' } as const, {})
const evidence = atom({ plugin: 'template-review-guard', key: 'evidence' } as const, {})
const current = atom({ plugin: 'template-review-guard', key: 'current' } as const, null)
const sites = atom({ plugin: 'template-review-guard', key: 'sites' } as const, {})
const sent = atom({ plugin: 'template-review-guard', key: 'sent' } as const, [])
const pending = atom({ plugin: 'template-review-guard', key: 'pending' } as const, null)

/** Matches the direct connector, either reviewer bridge and a Hub proxy name alike. */
const TOOL_RE = /template_review_([a-z_]+)$/
const PROXY_RE = /hub_execute_proxy_tool$/
const NAME_RE = /"(?:templateName|template_name|assetName|asset_name)"\s*:\s*"([^"\n]+)"/
const FAST_EXIT_RE = /"phase0"[\s\S]{0,300}?"kind"\s*:\s*"(DEAD_URL|NOT_A_TEMPLATE)"/
const PREVIEW_HOST_RE = /^https?:\/\/preview\.webflow\.com\//i
/** Published-site fields in a get_review_context result (the asset's websiteUrl today). */
const SITE_URL_RE = /"(?:websiteUrl|website_url|publishedUrl|published_url|customDomainUrl)"\s*:\s*"([^"\s]+)"/g

/** The host a published URL is matched on: lowercase, without www. Null for Preview links and junk. */
function siteKey(url: string): string | null {
  if (PREVIEW_HOST_RE.test(url)) return null
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/**
 * The version a URL-only evidence call belongs to. A URL whose site was seen
 * in a review context goes to that version, so screenshots of four sites
 * credit four versions; an unknown site falls back to the last-named version.
 */
async function evidenceTarget($: EngineInterface, url: string | null): Promise<string | null> {
  const key = url === null ? null : siteKey(url)
  const matched = key === null ? undefined : (await read($, sites))[key]
  return matched ?? (await read($, current))
}

type Args = Record<string, unknown>
/** `argsKey` is the Hub envelope key the arguments came from (null on a direct call), so a rewrite lands where the MCP reads. */
type Call = { name: string; args: Args; isProxy: boolean; argsKey: string | null }
const PROXY_ARG_KEYS = ['arguments', 'args', 'input', 'params'] as const

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function resolveCall(e: { tool: string } & Args): Call | null {
  const direct = TOOL_RE.exec(String(e.tool))
  if (direct?.[1]) return { name: direct[1], args: e, isProxy: false, argsKey: null }
  if (!PROXY_RE.test(String(e.tool))) return null
  const proxied = TOOL_RE.exec(str(e.proxyToolName) ?? '')
  if (!proxied?.[1]) return null
  const argsKey = PROXY_ARG_KEYS.find(k => e[k] !== null && typeof e[k] === 'object') ?? 'args'
  const raw = e[argsKey]
  const args = raw !== null && typeof raw === 'object' ? (raw as Args) : {}
  return { name: proxied[1], args, isProxy: true, argsKey }
}

/** The MCP's own failure envelope: `{"ok":false,...}` arrives as a normal result, not as `isError`. */
const FAILED_RE = /"ok"\s*:\s*false/
function failed(ran: { deny?: unknown; isError?: unknown; text?: string; result?: unknown }): boolean {
  return ran.deny !== undefined || ran.isError !== undefined || FAILED_RE.test(resultText(ran))
}

function resultText(ran: { text?: string; result?: unknown }): string {
  return ran.text ?? (typeof ran.result === 'string' ? ran.result : JSON.stringify(ran.result ?? ''))
}

/**
 * Evidence outlives the session in `$.store`, keyed by version, because
 * reviewers split a review across sessions. An item is dropped once the
 * version's latest review date passes it (the creator resubmitted after a
 * Changes Requested, so the old run looked at the old site) or after 14 days.
 */
type StoredItem = { kind: GuardEvidence; at: number }
type StoredEvidence = { items: StoredItem[] }
const EVIDENCE_TTL_MS = 14 * 24 * 60 * 60 * 1000
const LATEST_REVIEW_RE = /"latestReviewDate"\s*:\s*"([^"]+)"/
const PERSISTED: readonly GuardEvidence[] = ['validated', 'screenshots']

function storeKey(versionId: string): string {
  return `evidence:${versionId}`
}

function isStored(v: unknown): v is StoredEvidence {
  if (v === null || typeof v !== 'object' || !Array.isArray((v as StoredEvidence).items)) return false
  return (v as StoredEvidence).items.every(
    item => item !== null && typeof item === 'object' && PERSISTED.includes(item.kind) && typeof item.at === 'number',
  )
}

async function addEvidence($: EngineInterface, versionId: string, kind: GuardEvidence): Promise<void> {
  await update($, evidence, all => {
    const had = all[versionId] ?? []
    const added: GuardEvidence[] = [...had, kind]
    return had.includes(kind) ? all : { ...all, [versionId]: added }
  })
  if (!PERSISTED.includes(kind)) return
  const at = await $.clock.now()
  const stored = await $.store.get(storeKey(versionId))
  const items = (isStored(stored) ? stored.items : []).filter(item => item.kind !== kind)
  await $.store.set(storeKey(versionId), { items: [...items, { kind, at }] } satisfies StoredEvidence)
}

/**
 * Brings the store's evidence for this version into the gate, dropping what
 * went stale. Returns the kinds now in the gate that were not there before.
 */
async function restoreEvidence($: EngineInterface, versionId: string, contextText: string): Promise<GuardEvidence[]> {
  const stored = await $.store.get(storeKey(versionId))
  if (!isStored(stored)) return []
  const now = await $.clock.now()
  const latest = LATEST_REVIEW_RE.exec(contextText)?.[1]
  const latestMs = latest === undefined ? Number.NaN : Date.parse(latest)
  const kept = stored.items.filter(item => item.at >= now - EVIDENCE_TTL_MS && (Number.isNaN(latestMs) || item.at >= latestMs))
  if (kept.length === stored.items.length) {
    // nothing stale
  } else if (kept.length === 0) {
    await $.store.delete(storeKey(versionId))
  } else {
    await $.store.set(storeKey(versionId), { items: kept } satisfies StoredEvidence)
  }
  const kinds = kept.map(item => item.kind)
  let added: GuardEvidence[] = []
  await update($, evidence, all => {
    const had = all[versionId] ?? []
    added = kinds.filter(kind => !had.includes(kind))
    return added.length === 0 ? all : { ...all, [versionId]: [...had, ...added] }
  })
  return added
}

/** Read-only tools that take the published site, never a Preview link. */
const PUBLISHED_URL_TOOLS = new Set([
  'run_published_site_validation',
  'capture_published_site_screenshots',
  'run_published_site_sandbox',
  'fetch_published_site_stylesheet',
  'prepare_published_site_sandbox',
])
const EVIDENCE_OF: Record<string, GuardEvidence> = {
  run_published_site_validation: 'validated',
  capture_published_site_screenshots: 'screenshots',
}
/** Official decisions: context first, and validation + screenshots unless Phase 0 fast-exited. */
const DECISIONS = new Set(['request_changes', 'approve_version', 'reject_version', 'complete_publishing'])
const REQUIRED: readonly GuardEvidence[] = ['validated', 'screenshots']

function isDecision({ name, args }: Call): boolean {
  if (DECISIONS.has(name)) return true
  // Airtable uses emoji-prefixed labels; plain labels must receive the same gate.
  return name === 'update_version_review' && /^(?:✅|❌|📤)?\s*(?:Approved|Rejected|Changes Requested)$/i.test(str(args.review_status)?.trim() ?? '')
}

/**
 * Returns what the call does to the creator or the marketplace, or null when
 * the call is a reviewer-internal write that needs no confirmation.
 */
function describe({ name, args }: Call, known: Record<string, string>): string | null {
  const id = str(args.version_id) ?? str(args.asset_id) ?? '?'
  const template = known[id]
  const v = template === undefined ? id : `${template} (${id})`
  switch (name) {
    case 'request_changes':
      return `Request Changes on ${v}: emails the creator the review feedback (${String(args.review_feedback ?? '').length} chars)`
    case 'approve_version':
      return `Approve ${v}: emails the creator an approval`
    case 'reject_version':
      return `Reject ${v} (${str(args.reject_reason) ?? 'no reason'}): emails the creator a rejection`
    case 'complete_publishing':
      return args.approve_version === true
        ? `Approve and attach release for ${v}: emails the creator`
        : `Attach release / publishing checklist for ${v}`
    case 'update_version_review': {
      const status = str(args.review_status)
      if (status) return `Set Review Status "${status}" on ${v} (plain Changes Requested releases feedback by email)`
      if (str(args.review_feedback) || str(args.rejection_feedback))
        return `Write creator-facing feedback fields on ${v}`
      return null
    }
    case 'send_ticket_followup':
      return args.visibility === 'internal' ? null : `Public Zendesk reply to the creator on ${v}`
    case 'create_ticket':
      return `New Zendesk ticket to the creator: "${str(args.subject) ?? ''}"`
    case 'update_ticket_status':
      return args.status === 'solved'
        ? `Solve the Zendesk ticket on ${v} (sends the solved email)`
        : `Zendesk ticket status -> ${str(args.status) ?? '?'} on ${v}`
    case 'set_featured_pick':
      return str(args.pick_reason) !== null
        ? `Set the live Reviewer Pick Reason on ${v}: shown on the public listing and quoted in the creator's featured email`
        : `set featured pick on ${v}: changes what buyers see`
    case 'update_asset_publishing':
    case 'set_mrp_visibility':
    case 'set_featured_flag':
      return `${name.replace(/_/g, ' ')} on ${v}: changes what buyers see`
    default:
      return null
  }
}

/** The text the creator would read, when the call carries one. */
function creatorText({ name, args }: Call): string | null {
  switch (name) {
    case 'request_changes':
      return str(args.review_feedback) ?? str(args.rejection_feedback)
    case 'update_version_review': {
      // A rejected status emails rejection_feedback; Changes Requested emails review_feedback.
      // Both given: show both, each under the field name, so nothing goes out unseen.
      const review = str(args.review_feedback)
      const rejection = str(args.rejection_feedback)
      if (review !== null && rejection !== null) return `## review_feedback\n\n${review}\n\n## rejection_feedback (sent by the rejection email)\n\n${rejection}`
      return /rejected/i.test(str(args.review_status) ?? '') ? (rejection ?? review) : (review ?? rejection)
    }
    case 'reject_version':
      return str(args.rejection_feedback)
    case 'send_ticket_followup':
    case 'create_ticket':
      return str(args.message)
    case 'set_featured_pick':
      // pick_reason_draft is the internal staging field; only the live field reaches the public.
      return str(args.pick_reason)
    default:
      return null
  }
}

const QUESTION_EXCERPT = 1500
/** Longer than any review feedback should be; the pane would stop being reviewable. */
const CREATOR_TEXT_MAX = 20_000

/**
 * Asks the reviewer on the engine's own dialog (a `$` call, so the hook's
 * budget does not run while they read). The full text is drawn in a pane
 * beside it where the terminal is wide enough; the dialog carries an excerpt.
 * Text the reviewer could not read in full is refused rather than sent on an
 * excerpt. Resolves null to send, else the refusal for the model.
 */
let turn: Promise<void> = Promise.resolve()

/** Confirmations run one at a time: the dialog, the pending atom and the pane are shared, so a second call must wait for the first answer. */
async function confirm($: EngineInterface, call: Call, summary: string): Promise<string | null> {
  const previous = turn
  let release = () => {}
  turn = new Promise<void>(resolve => {
    release = resolve
  })
  await previous
  try {
    return await confirmNow($, call, summary)
  } finally {
    release()
  }
}

async function confirmNow($: EngineInterface, call: Call, summary: string): Promise<string | null> {
  const text = creatorText(call)
  if (text !== null && text.length > CREATOR_TEXT_MAX) {
    return `${PLUGIN}: ${call.name} carries ${text.length} characters of creator-facing text, more than a reviewer can check in full (limit ${CREATOR_TEXT_MAX}). Shorten it and retry.`
  }
  let paneOpen = false
  if (text !== null) {
    await update($, pending, () => ({ summary, text }))
    try {
      paneOpen = (await $.ui.open({ id: PANE, title: 'What the creator will read', rows: 24 })).isPlaced
    } catch {
      paneOpen = false
    }
    if (!paneOpen && text.length > QUESTION_EXCERPT) {
      await update($, pending, () => null)
      return `${PLUGIN}: ${call.name} carries ${text.length} characters of creator-facing text and the terminal has no room for the pane that shows it in full (the dialog shows ${QUESTION_EXCERPT}). Ask the reviewer to widen the terminal, then retry; nothing was sent.`
    }
  }
  const excerpt =
    text === null
      ? ''
      : `\n\n---\n${text.length > QUESTION_EXCERPT ? `${text.slice(0, QUESTION_EXCERPT)}\n[... ${text.length - QUESTION_EXCERPT} more chars${paneOpen ? ', shown in full in the pane' : ''}]` : text}\n---\n`
  let answer: string
  try {
    answer = await $.ui.ask(`${summary}.${excerpt}\nSend it to the creator?`, { options: ['Send', 'Do not send'], header: 'Creator' })
  } catch {
    answer = ''
  } finally {
    if (text !== null) {
      await update($, pending, () => null)
      if (paneOpen) {
        try {
          await $.ui.close({ id: PANE })
        } catch {
          // The answer stands; a pane that would not close is not a reason to refuse.
        }
      }
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
    if (versionId !== null) await update($, current, () => versionId)

    // Read-only evidence tools: never a Preview link, and remember what ran.
    if (PUBLISHED_URL_TOOLS.has(call.name)) {
      const url = str(call.args.published_url) ?? str(call.args.publishedUrl)
      if (url !== null && PREVIEW_HOST_RE.test(url)) {
        return {
          deny: `${PLUGIN}: ${call.name} refused: ${url} is a Webflow Preview link. Automated analysis and screenshots take the published site only (the *.webflow.io or custom-domain URL from the review context).`,
        }
      }
      const ran = await next(e)
      const kind = EVIDENCE_OF[call.name]
      const target = await evidenceTarget($, url)
      if (kind !== undefined && target !== null && !failed(ran)) {
        await addEvidence($, target, kind)
      }
      return ran
    }

    if (call.name === 'get_review_context') {
      const ran = await next(e)
      if (!failed(ran) && versionId !== null) {
        const text = resultText(ran)
        await update($, contextLoaded, list => (list.includes(versionId) ? list : [...list, versionId]))
        const template = NAME_RE.exec(text)?.[1]
        if (template !== undefined) await update($, names, known => ({ ...known, [versionId]: template }))
        const hosts = [...text.matchAll(SITE_URL_RE)].map(m => (m[1] === undefined ? null : siteKey(m[1]))).filter((h): h is string => h !== null)
        if (hosts.length > 0) await update($, sites, known => ({ ...known, ...Object.fromEntries(hosts.map(h => [h, versionId])) }))
        // A fresh context replaces this version's in-session evidence rather
        // than adding to it: a creator resubmission must not pass on the
        // previous submission's runs, and a fast-exit holds only while the
        // context still reports one. Validation and screenshots live in the
        // store, so what is still current comes straight back.
        await update($, evidence, all => (versionId in all ? { ...all, [versionId]: [] } : all))
        if (FAST_EXIT_RE.test(text)) await addEvidence($, versionId, 'fast-exit')
        const restored = await restoreEvidence($, versionId, text)
        if (restored.length > 0) {
          $.ui.toast(`${template ?? versionId}: evidence restored from an earlier session (${restored.join(', ')})`)
        }
      }
      return ran
    }

    // Lint creator-facing text before anything else happens.
    let input: typeof e = e
    for (const field of ['review_feedback', 'rejection_feedback'] as const) {
      const text = str(call.args[field])
      if (text === null) continue
      const lint = lintComposed(text)
      if (lint.deny !== undefined) return { deny: `${PLUGIN}: ${field} ${lint.deny}` }
      for (const w of lint.warnings) $.ui.toast(`${field}: ${w}`)
      if (lint.fixed !== undefined) {
        call.args = { ...call.args, [field]: lint.fixed }
        input = call.argsKey === null ? { ...input, [field]: lint.fixed } : { ...input, [call.argsKey]: call.args }
      }
    }
    const verbatim =
      call.name === 'create_ticket' || (call.name === 'send_ticket_followup' && call.args.visibility !== 'internal')
    const message = str(call.args.message)
    if (verbatim && message !== null) {
      const lint = lintVerbatim(message)
      if (lint.deny !== undefined) return { deny: `${PLUGIN}: message ${lint.deny}` }
      for (const w of lint.warnings) $.ui.toast(`message: ${w}`)
    }
    if (call.name === 'save_draft_feedback') {
      $.ui.toast('save_draft_feedback writes the creator-facing Review Feedback field; internal notes go to save_agent_feedback')
    }

    const summary = describe(call, await read($, names))
    if (summary === null) return next(input)

    if (isDecision(call)) {
      if (versionId === null) return { deny: `${PLUGIN}: ${call.name} refused: a decision requires version_id and evidence for that version.` }
      const loaded = await read($, contextLoaded)
      if (!loaded.includes(versionId)) {
        return {
          deny: `${PLUGIN}: ${call.name} on ${versionId} refused: template_review_get_review_context has not been called for this version in this session. Load the review context first, then retry.`,
        }
      }
      const have = (await read($, evidence))[versionId] ?? []
      if (!have.includes('fast-exit')) {
        const missing = REQUIRED.filter(kind => !have.includes(kind))
        if (missing.length > 0) {
          const tools = missing.map(kind => (kind === 'validated' ? 'template_review_run_published_site_validation' : 'template_review_capture_published_site_screenshots'))
          return {
            deny: `${PLUGIN}: ${call.name} on ${versionId} refused: missing evidence for this version in this session: ${missing.join(', ')}. Run ${tools.join(' and ')} on the published URL first (Phase 0 DEAD_URL / NOT_A_TEMPLATE fast-exits are exempt), then retry.`,
          }
        }
      }
    }

    const refusal = await confirm($, call, summary)
    if (refusal !== null) return { deny: refusal }

    const ran = await next(input)
    if (!failed(ran)) {
      // The write has happened. Bookkeeping that fails must not turn it into a
      // refusal the model would retry (a second email, ticket or listing change).
      try {
        const entry: GuardSent = { tool: call.name, versionId, at: await $.clock.now() }
        const all = await update($, sent, list => [...list, entry].slice(-50))
        $.ui.status(`${all.length} creator-facing write${all.length === 1 ? '' : 's'} confirmed this session`)
        $.ui.toast(`sent: ${call.name}${versionId === null ? '' : ` ${versionId}`}`)
      } catch {
        $.ui.toast(`sent: ${call.name} (the session tally could not be updated)`)
      }
    }
    return ran
  }).catch(($, e, next) =>
    // A guard that crashed must not let a creator-facing write through.
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
    // The whole text, always: Send is only offered when this pane is placed or the dialog holds it all.
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold wrap="wrap">
          {shown.summary}
        </Text>
        <Text dimColor>{`Answer Send / Do not send in the dialog. This is the exact text the creator receives (${shown.text.length} characters).`}</Text>
        <Markdown text={shown.text} />
      </Box>
    )
  })
}
