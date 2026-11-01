import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Review } from '../types'
import { STEP_LABELS, apply, label, observe, resolveCall, summarize } from './track'

const PLUGIN = 'template-review-hud'
const PANE = 'template-reviews'
const reviews = atom({ plugin: 'template-review-hud', key: 'reviews' } as const, [])
const current = atom({ plugin: 'template-review-hud', key: 'current' } as const, null)
const isHidden = atom({ plugin: 'template-review-hud', key: 'isHidden' } as const, false)
/** The MCP's own failure envelope arrives as a normal result, not as `isError`. */
const FAILED_RE = /"ok"\s*:\s*false/

function paneText(list: Review[]): string {
  if (list.length === 0) return 'No template versions touched yet. Load one with template_review_get_review_context.'
  const legend = STEP_LABELS.map(({ step, short }) => `${short} = ${step}`).join(', ')
  const rows = [...list]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(r => {
      const lines = [`### ${label(r)}`, summarize(r)]
      if (r.url !== null) lines.push(`site: ${r.url}`)
      if (r.gallery !== null) lines.push(`screenshots: [gallery](${r.gallery})`)
      return lines.join('\n')
    })
  return `${rows.join('\n\n')}\n\n_${legend}_`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tr', description: 'Template reviews touched this session, with playbook progress' })
    const id = await read($, current)
    if (id !== null) $.ui.status(`reviewing ${id}`)
    return next(e)
  })

  on('command.run', { command: 'tr' }, async $ => {
    await update($, isHidden, () => false)
    const opened = await $.ui.open({ id: PANE, title: 'Template reviews', focus: true, closeOnEscape: true, rows: 16 })
    const list = await read($, reviews)
    return { text: opened.isPlaced ? `${list.length} review${list.length === 1 ? '' : 's'} this session.` : paneText(list) }
  })

  on('tool.call', async ($, e, next) => {
    const call = resolveCall(e as { tool: string } & Record<string, unknown>)
    if (call === null) return next(e)
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError !== undefined) return ran
    const text = ran.text ?? (typeof ran.result === 'string' ? ran.result : JSON.stringify(ran.result ?? ''))
    if (FAILED_RE.test(text)) return ran
    const seen = observe(call, text)
    const now = await $.clock.now()
    const before = { reviews: await read($, reviews), current: await read($, current) }
    const after = apply(before.reviews, before.current, seen, now)
    if (after.current !== before.current) await update($, current, () => after.current)
    await update($, reviews, () => after.reviews)
    if (after.current !== null) {
      const review = after.reviews.find(r => r.id === after.current)
      if (review !== undefined) {
        $.ui.status(`reviewing ${label(review)}`)
        if (seen.decision !== null) $.ui.toast(`${label(review)}: ${seen.decision}`)
      }
      if (seen.gallery !== null) $.ui.toast(`screenshot gallery ready: ${seen.gallery}`)
    }
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const id = await read($, current)
    if (e.props.hasSurvey || id === null || (await read($, isHidden))) return next(e)
    const review = (await read($, reviews)).find(r => r.id === id)
    if (review === undefined) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const width = Math.max(20, e.props.bodyColumns - 24)
    return (
      <Box gap={1}>
        <Text wrap="truncate-end" bold>
          {label(review)}
        </Text>
        <Box width={width}>
          <Text dimColor wrap="truncate-end">
            {summarize(review)}
          </Text>
        </Box>
        <Button key="open" label="Open" hotkey="o" onPress={() => void $.ui.open({ id: PANE, title: 'Template reviews', focus: true, closeOnEscape: true, rows: 16 })} />
        <Button key="hide" label="Hide" hotkey="h" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown } = $.ui.resolve(e)
    const list = await read($, reviews)
    return (
      <Box flexDirection="column">
        <Markdown text={paneText(list)} />
      </Box>
    )
  })
}
