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

/** Brings an earlier session's evidence for this version into the gate, dropping what went stale. */
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
  if (kinds.length > 0) {
    await update($, evidence, all => {
      const had = all[versionId] ?? []
      const merged: GuardEvidence[] = [...had, ...kinds.filter(kind => !had.includes(kind))]
      return { ...all, [versionId]: merged }
    })
  }
  return kinds
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
    case 'update_asset_publishing':
    case 'set_mrp_visibility':
    case 'set_featured_flag':
    case 'set_featured_pick':
      return `${name.replace(/_/g, ' ')} on ${v}: changes what buyers see`
    default:
      return null
  }
}

/** The text the creator would read, when the call carries one. */
function creatorText({ name, args }: Call): string | null {
  switch (name) {
    case 'request_changes':
    case 'update_version_review':
      return str(args.review_feedback) ?? str(args.rejection_feedback)
    case 'reject_version':
      return str(args.rejection_feedback)
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
 * budget does not run while they read). The full text is drawn in a pane
 * beside it where the terminal is wide enough; the dialog carries an excerpt
 * either way. Resolves null to send, else the refusal for the model.
 */
async function confirm($: EngineInterface, call: Call, summary: string): Promise<string | null> {
  const text = creatorText(call)
  let paneOpen = false
  if (text !== null) {
    await update($, pending, () => ({ summary, text }))
    try {
      paneOpen = (await $.ui.open({ id: PANE, title: 'What the creator will read', rows: 24 })).isPlaced
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
    answer = await $.ui.ask(`${summary}.${excerpt}\nSend it to the creator?`, { options: ['Send', 'Do not send'], header: 'Creator' })
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
      if (kind !== undefined && target !== null && ran.deny === undefined && ran.isError === undefined) {
        await addEvidence($, target, kind)
      }
      return ran
    }

    if (call.name === 'get_review_context') {
      const ran = await next(e)
      if (ran.deny === undefined && ran.isError === undefined && versionId !== null) {
        const text = resultText(ran)
        await update($, contextLoaded, list => (list.includes(versionId) ? list : [...list, versionId]))
        const template = NAME_RE.exec(text)?.[1]
        if (template !== undefined) await update($, names, known => ({ ...known, [versionId]: template }))
        const hosts = [...text.matchAll(SITE_URL_RE)].map(m => (m[1] === undefined ? null : siteKey(m[1]))).filter((h): h is string => h !== null)
        if (hosts.length > 0) await update($, sites, known => ({ ...known, ...Object.fromEntries(hosts.map(h => [h, versionId])) }))
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
      if (lint.fixed !== undefined && !call.isProxy) {
        input = { ...input, [field]: lint.fixed }
        call.args = { ...call.args, [field]: lint.fixed }
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

    if (DECISIONS.has(call.name) && versionId !== null) {
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
    if (ran.deny === undefined && ran.isError === undefined) {
      const entry: GuardSent = { tool: call.name, versionId, at: await $.clock.now() }
      const all = await update($, sent, list => [...list, entry].slice(-50))
      $.ui.status(`${all.length} creator-facing write${all.length === 1 ? '' : 's'} confirmed this session`)
      $.ui.toast(`sent: ${call.name}${versionId === null ? '' : ` ${versionId}`}`)
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
    const limit = 9500
    const body = shown.text.length > limit ? `${shown.text.slice(0, limit)}\n\n_[cut: ${shown.text.length - limit} more characters]_` : shown.text
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold wrap="wrap">
          {shown.summary}
        </Text>
        <Text dimColor>Answer Send / Do not send in the dialog. This is the exact text the creator receives.</Text>
        <Markdown text={body} />
      </Box>
    )
  })
}
