import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { OutboundSent } from '../types'
import { resolve, slackMentions, str } from './rules'
import type { Args, Outbound } from './rules'

const PLUGIN = 'outbound-guard'
const PANE = 'outbound-send'
const sent = atom({ plugin: 'outbound-guard', key: 'sent' } as const, [])
const pending = atom({ plugin: 'outbound-guard', key: 'pending' } as const, null)

const QUESTION_EXCERPT = 1500
/** Longest text the pane renders in full. Anything longer is refused: the
 *  person must be able to read every character they approve. */
const PANE_LIMIT = 9500
const MEMBER_PAGES = 12

/**
 * A Slack @-mention only notifies a channel member. Lists the channel's
 * members through the mod's own MCP access and names anyone mentioned who
 * is not there. A DM (U… id) has no member list; the mention is the target.
 */
async function missingMembers($: EngineInterface, server: string, channel: string, mentioned: string[]): Promise<{ missing: string[]; unverified: string | null }> {
  if (mentioned.length === 0 || !channel.startsWith('C') && !channel.startsWith('G')) return { missing: [], unverified: null }
  const members = new Set<string>()
  let cursor: string | undefined
  try {
    for (let page = 0; page < MEMBER_PAGES; page += 1) {
      const args: Args = { channel_id: channel, response_format: 'ids_only', limit: 30 }
      if (cursor !== undefined) args.cursor = cursor
      const ran = await $.mcp.call(server, 'slack_list_channel_members', args)
      if (ran.isError) return { missing: [], unverified: 'the member list call errored' }
      const text = ran.content.map(block => ('text' in block && typeof block.text === 'string' ? block.text : '')).join('\n')
      for (const m of text.matchAll(/\bU[A-Z0-9]{6,}\b/g)) members.add(m[0])
      const next = /"next_cursor"\s*:\s*"([^"]+)"/.exec(text)?.[1]
      if (next === undefined || next === '') break
      cursor = next
    }
  } catch {
    return { missing: [], unverified: 'the member list could not be fetched' }
  }
  return { missing: mentioned.filter(id => !members.has(id)), unverified: null }
}

/** `$.mcp.call` accepts the tool-name spelling of the server (`claude_ai_Slack`). */
function serverOf(toolName: string): string {
  return toolName.replace(/^mcp__/, '').replace(/__.*$/, '')
}

async function confirm($: EngineInterface, out: Outbound): Promise<string | null> {
  const text = out.text
  if (text !== null && text.length > PANE_LIMIT) {
    return `${PLUGIN}: ${out.tool} refused: the text is ${text.length} characters, longer than can be shown in full for review (${PANE_LIMIT}). Split it or shorten it, then show the draft again.`
  }
  let paneOpen = false
  if (text !== null) {
    await update($, pending, () => ({ summary: out.summary, text, warnings: out.warnings }))
    try {
      paneOpen = (await $.ui.open({ id: PANE, title: 'What goes out', rows: 24 })).isPlaced
    } catch {
      paneOpen = false
    }
    if (!paneOpen && text.length > QUESTION_EXCERPT) {
      await update($, pending, () => null)
      return `${PLUGIN}: ${out.tool} refused: the full text could not be shown (the review pane did not open) and the dialog shows only ${QUESTION_EXCERPT} characters. Shorten it or retry when the pane can open.`
    }
  }
  const notes = out.warnings.length === 0 ? '' : `\n\nNote: ${out.warnings.join('; ')}.`
  const excerpt =
    text === null
      ? ''
      : `\n\n---\n${text.length > QUESTION_EXCERPT ? `${text.slice(0, QUESTION_EXCERPT)}\n[... ${text.length - QUESTION_EXCERPT} more chars${paneOpen ? ', shown in full in the pane' : ''}]` : text}\n---`
  let answer: string
  try {
    answer = await $.ui.ask(`${out.summary}.${notes}${excerpt}\nSend it?`, { options: ['Send', 'Do not send'], header: 'Outbound' })
  } catch {
    answer = ''
  } finally {
    if (text !== null) {
      await update($, pending, () => null)
      if (paneOpen) await $.ui.close({ id: PANE })
    }
  }
  if (answer === 'Send') return null
  if (answer === '') return `${PLUGIN}: ${out.tool} needs the person to approve it and nobody answered. Refused.`
  const note = answer === 'Do not send' ? '' : `: ${answer}`
  return `${PLUGIN}: the person declined ${out.tool}${note}. Do not retry it without new instructions. If they want changes, draft again and show it before sending.`
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const args = e as unknown as Args
    const out = resolve(String(e.tool), args)
    if (out === null) return next(e)
    if (out.deny !== undefined) return { deny: `${PLUGIN}: ${out.tool} refused: ${out.deny}` }

    if (out.tool === 'slack_send_message' || out.tool === 'slack_schedule_message') {
      const channel = str(args.channel_id) ?? ''
      const { missing, unverified } = await missingMembers($, serverOf(String(e.tool)), channel, slackMentions(out.text ?? ''))
      if (missing.length > 0) {
        return {
          deny: `${PLUGIN}: ${out.tool} refused: ${missing.map(id => `<@${id}>`).join(', ')} ${missing.length === 1 ? 'is' : 'are'} not in ${channel}, so the mention would not notify ${missing.length === 1 ? 'them' : 'anyone'}. Post where they are, DM them by user id, or mention them on the PR instead.`,
        }
      }
      if (unverified !== null) out.warnings.push(`mention membership unverified (${unverified})`)
    }

    const refusal = await confirm($, out)
    if (refusal !== null) return { deny: refusal }

    const input = out.fixed === undefined ? e : ({ ...e, ...out.fixed } as typeof e)
    const ran = await next(input)
    if (ran.deny === undefined && ran.isError === undefined) {
      const entry: OutboundSent = { tool: out.tool, target: out.summary, at: await $.clock.now() }
      const all = await update($, sent, list => [...list, entry].slice(-100))
      $.ui.status(`${all.length} outbound send${all.length === 1 ? '' : 's'} confirmed this session`)
      $.ui.toast(`sent: ${out.summary}`)
    }
    return ran
  }).catch(($, e, next) =>
    resolve(String(e.tool), e as unknown as Args) === null
      ? next(e)
      : { deny: `${PLUGIN}: the guard failed while checking ${String(e.tool)}; refusing the send rather than letting it through. Tell the person.` },
  )

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const shown = await read($, pending)
    if (shown === null) {
      return (
        <Box>
          <Text dimColor>Nothing waiting to go out.</Text>
        </Box>
      )
    }
    // confirm() refuses anything longer than PANE_LIMIT, so this is always the whole text.
    const body = shown.text
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold wrap="wrap">
          {shown.summary}
        </Text>
        {shown.warnings.map(w => (
          <Text color="yellow" wrap="wrap">
            {w}
          </Text>
        ))}
        <Text dimColor>Answer Send / Do not send in the dialog. This is the exact text that goes out.</Text>
        <Markdown text={body} />
      </Box>
    )
  })
}
