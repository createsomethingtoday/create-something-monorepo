import { atom, read, update } from 'claude-code'
import type { Elements, EngineInterface, Register, RenderElement, RenderSurface } from 'claude-code'

import type { VizCapture, VizScorecard, VizSegment } from '../types'
import {
  captureOf,
  contextSummary,
  daysSince,
  genericLines,
  jsonOf,
  maxSegments,
  queueRows,
  segmentsOf,
  shortDate,
  str,
  suffixOf,
  validationSummary,
} from './parse'
import { DIMENSIONS, fromStructured, fromText, meetsBar, tierCells, tierColor } from './scorecard'

const PLUGIN = 'template-review-viz'
const STRIP = 'tr-shots'
const CARD = 'tr-scorecard'
const SHOT_DIR = '/tmp/claude-tr-shots'
const VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const

const captures = atom({ plugin: 'template-review-viz', key: 'captures' } as const, [])
const strip = atom({ plugin: 'template-review-viz', key: 'strip' } as const, null)
const ready = atom({ plugin: 'template-review-viz', key: 'ready' } as const, {})
const scorecard = atom({ plugin: 'template-review-viz', key: 'scorecard' } as const, null)

type Args = Record<string, unknown>

function readyKey(captureId: string, seg: VizSegment): string {
  return `${captureId}/${seg.viewport}/${seg.segment}`
}

/**
 * The capture tool serves JPEGs; the terminal's image protocol takes a PNG
 * file it opens itself, so each segment is fetched once with curl and
 * converted with sips (macOS). Resolves the PNG path, or null when either
 * step failed; the pane then shows the link instead.
 */
async function ensurePng($: EngineInterface, captureId: string, seg: VizSegment): Promise<string | null> {
  const known = (await read($, ready))[readyKey(captureId, seg)]
  if (known !== undefined) return known
  const dir = `${SHOT_DIR}/${captureId.replace(/[^A-Za-z0-9_-]/g, '_')}`
  const base = `${dir}/${seg.viewport}-${seg.segment}`
  try {
    await $.process.run(['mkdir', '-p', dir])
    const dl = await $.process.run(['curl', '-sSL', '--max-time', '25', '-o', `${base}.jpg`, seg.viewUrl], { timeoutMs: 30_000 })
    if (dl.exitCode !== 0) return null
    const conv = await $.process.run(['sips', '-s', 'format', 'png', `${base}.jpg`, '--out', `${base}.png`], { timeoutMs: 30_000 })
    if (conv.exitCode !== 0) return null
  } catch {
    return null
  }
  const path = `${base}.png`
  await update($, ready, all => ({ ...all, [readyKey(captureId, seg)]: path }))
  return path
}

async function prepareIndex($: EngineInterface, capture: VizCapture, index: number): Promise<void> {
  for (const viewport of VIEWPORTS) {
    const segs = segmentsOf(capture, viewport)
    const seg = segs[Math.min(index, segs.length - 1)]
    if (seg !== undefined) await ensurePng($, capture.id, seg)
  }
}

async function openStrip($: EngineInterface): Promise<boolean> {
  return (await $.ui.open({ id: STRIP, title: 'Screenshots', focus: true, closeOnEscape: true, rows: 44, columns: 140 })).isPlaced
}

async function openCard($: EngineInterface): Promise<boolean> {
  return (await $.ui.open({ id: CARD, title: 'Scorecard', focus: true, closeOnEscape: true, rows: 22, columns: 72 })).isPlaced
}

/** Cells tall for an image `columns` wide, with a terminal cell about twice as tall as wide. */
function rowsFor(seg: VizSegment, columns: number, maxRows: number): number {
  return Math.max(1, Math.min(255, maxRows, Math.round((columns * (seg.height / seg.width)) / 2)))
}

function sevGlyph(sev: string): string {
  return sev === 'error' || sev === 'critical' ? 'E' : sev === 'warning' ? 'W' : 'i'
}

type Ui = Pick<Elements[RenderSurface], 'Box' | 'Button' | 'Text'>

/** A compact drawing of a Template Review result, or null to let the engine draw its own row. */
function compact($: EngineInterface, ui: Ui, tool: string, output: unknown): RenderElement | null {
  const name = suffixOf(tool)
  if (name === null) return null
  const json = jsonOf(output)
  if (json === null) return null
  const { Box, Button, Text } = ui
  const now = Date.now()

  if (name === 'get_review_context') {
    const c = contextSummary(json)
    if (c === null) return null
    const caps = [c.canAssign === true ? 'assign' : null, c.canReview === true ? 'review' : null, c.canPublish === true ? 'publish' : null].filter(x => x !== null).join(', ')
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>{c.name}</Text>
          <Text dimColor>{` ${c.versionId ?? ''}`}</Text>
        </Text>
        <Text>{`${c.status ?? '-'}  ${c.marketplace ?? '-'}  creator ${c.creator ?? '-'}`}</Text>
        <Text dimColor>{`submitted ${shortDate(c.submitted)} (${daysSince(c.submitted, now) ?? '?'} d)  last review ${shortDate(c.lastReview)}  can: ${caps.length > 0 ? caps : 'nothing'}`}</Text>
        {c.url !== null && <Text dimColor>{`site ${c.url}`}</Text>}
        {c.phase0 !== null && <Text color={c.phase0 === 'TEMPLATE' || c.phase0 === 'CUSTOM_DOMAIN_TEMPLATE' ? 'green' : 'red'}>{`phase 0: ${c.phase0}`}</Text>}
        {c.feedbackChars > 0 && <Text dimColor>{`previous feedback on file: ${c.feedbackChars} chars`}</Text>}
      </Box>
    )
  }

  if (name === 'run_published_site_validation') {
    const v = validationSummary(json)
    if (v === null) return null
    const worst = (v.critical ?? 0) > 0 ? 'red' : (v.totalIssues ?? 0) > 0 ? 'yellow' : 'green'
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={worst}>{`validation: ${v.totalIssues ?? '?'} issue${v.totalIssues === 1 ? '' : 's'}, ${v.critical ?? '?'} critical`}</Text>
          <Text dimColor>{v.url === null ? '' : `  ${v.url}`}</Text>
        </Text>
        <Text dimColor>{v.categories.map(c => `${c.key} ${c.errors}E/${c.warnings}W`).join('   ')}</Text>
        {v.gsap !== null && (
          <Text dimColor>
            {`custom code: ${v.gsap.passed ?? '?'}/${v.gsap.pages ?? '?'} pages pass  gsap ${v.gsap.gsap ? 'yes' : 'no'}  flagged ${v.gsap.flagged}  security ${v.gsap.security}  legacy IX2 ${v.gsap.legacyIx2 ? 'yes' : 'no'}  unicorn ${v.gsap.unicorn ? 'yes' : 'no'}`}
          </Text>
        )}
        {v.samples.slice(0, 6).map(s => (
          <Text wrap="truncate-end">
            <Text color={s.severity === 'error' ? 'red' : s.severity === 'warning' ? 'yellow' : undefined}>{`${sevGlyph(s.severity)} `}</Text>
            {s.message}
          </Text>
        ))}
        {v.samples.length > 6 && <Text dimColor>{`and ${v.samples.length - 6} more (ctrl+o for the full result)`}</Text>}
        {v.quality !== null && <Text dimColor wrap="truncate-end">{v.quality}</Text>}
      </Box>
    )
  }

  if (name === 'capture_published_site_screenshots') {
    const cap = captureOf(json, 'row', now)
    if (cap === null) return null
    const perViewport = VIEWPORTS.map(v => {
      const segs = segmentsOf(cap, v)
      const first = segs[0]
      return `${v} ${segs.length} seg${first === undefined ? '' : ` (${first.width}x${first.pageHeight})`}`
    }).join('   ')
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>{`screenshots: ${cap.title}`}</Text>
          <Text dimColor>{`  ${cap.segments.length} segments`}</Text>
        </Text>
        <Text dimColor>{perViewport}</Text>
        {cap.gallery !== null && <Text dimColor wrap="truncate-end">{`gallery (about 1 h): ${cap.gallery}`}</Text>}
        <Box>
          <Button
            key="strip"
            label="Show strip"
            onPress={async () => {
              const list = await read($, captures)
              const latest = list[list.length - 1]
              if (latest === undefined) return
              await prepareIndex($, latest, 0)
              await update($, strip, () => ({ captureId: latest.id, index: 0 }))
              await openStrip($)
            }}
          />
        </Box>
      </Box>
    )
  }

  if (name === 'my_queue' || name === 'list_queue') {
    const rows = queueRows(json)
    if (rows === null) return null
    return (
      <Box flexDirection="column">
        <Text bold>{`${rows.length} in queue`}</Text>
        {rows.slice(0, 15).map(r => (
          <Text wrap="truncate-end">
            <Text>{r.name.padEnd(22).slice(0, 22)}</Text>
            <Text dimColor>{` ${r.status.padEnd(28).slice(0, 28)} ${shortDate(r.submitted)} ${(daysSince(r.submitted, now) ?? '?').toString().padStart(4)} d  ${r.versionId ?? ''}${r.mine ? '  mine' : ''}`}</Text>
          </Text>
        ))}
        {rows.length > 15 && <Text dimColor>{`and ${rows.length - 15} more`}</Text>}
      </Box>
    )
  }

  const lines = genericLines(json)
  if (lines.length === 0) return null
  return (
    <Box flexDirection="column">
      <Text dimColor>{`template_review_${name}`}</Text>
      {lines.map(l => (
        <Text wrap="truncate-end">{l}</Text>
      ))}
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'trs', description: 'Screenshot strip for the last template capture (desktop, tablet, mobile)' })
    await $.command.register({ name: 'trc', description: 'Rubric scorecard for the template review in progress' })
    return next(e)
  })

  on('command.run', { command: 'trs' }, async $ => {
    const list = await read($, captures)
    const latest = list[list.length - 1]
    if (latest === undefined) return { text: 'No screenshot capture yet. Run template_review_capture_published_site_screenshots first.' }
    const current = await read($, strip)
    if (current === null || current.captureId !== latest.id) await update($, strip, () => ({ captureId: latest.id, index: 0 }))
    await prepareIndex($, latest, current?.captureId === latest.id ? current.index : 0)
    const placed = await openStrip($)
    return { text: placed ? `Screenshot strip: ${latest.title}` : `The terminal is too narrow for the strip; gallery: ${latest.gallery ?? latest.url}` }
  })

  on('command.run', { command: 'trc' }, async $ => {
    const card = await read($, scorecard)
    if (card === null) return { text: 'No scorecard yet. It fills in as the draft review is written or formatted.' }
    const placed = await openCard($)
    return { text: placed ? `Scorecard: ${card.name ?? card.versionId ?? 'current review'}` : 'The terminal is too narrow for the scorecard pane.' }
  })

  // Captures and scorecard sources are read off the tool calls themselves.
  on('tool.call', async ($, e, next) => {
    const name = suffixOf(String(e.tool))
    if (name === null) return next(e)
    const args = e as unknown as Args
    const now = await $.clock.now()

    if (name === 'format_agent_review_feedback') {
      const prev = await read($, scorecard)
      await update($, scorecard, () => fromStructured(args, prev, now))
      $.ui.toast('scorecard updated from the structured feedback (/trc)')
      return next(e)
    }
    const draft = str(args.agent_review_feedback) ?? str(args.review_feedback)
    if (draft !== null && (name === 'save_agent_feedback' || name === 'save_draft_feedback' || name === 'request_changes' || name === 'update_version_review')) {
      const prev = await read($, scorecard)
      const card = fromText(draft, prev, now, name)
      if (str(args.version_id) !== null) card.versionId = str(args.version_id)
      await update($, scorecard, () => card)
      $.ui.toast(`scorecard updated from ${name} (/trc)`)
      return next(e)
    }

    const ran = await next(e)
    if (name !== 'capture_published_site_screenshots' || ran.deny !== undefined || ran.isError !== undefined) return ran
    const json = jsonOf(ran.text ?? ran.result)
    const capture = json === null ? null : captureOf(json, e.tool_use_id ?? String(now), now)
    if (capture === null) return ran
    await update($, captures, list => [...list.filter(c => c.id !== capture.id), capture].slice(-5))
    await update($, strip, () => ({ captureId: capture.id, index: 0 }))
    await prepareIndex($, capture, 0)
    $.ui.toast(`${capture.title}: ${maxSegments(capture)} segments captured, /trs to view`)
    return ran
  })

  // Compact transcript rows for Template Review results.
  on('ui.render', { component: 'ToolResult', props: { tool: /template_review_/ } }, ($, e, next) => {
    if (e.props.isErrored || e.props.output === undefined) return next(e)
    return compact($, $.ui.resolve(e), e.props.tool, e.props.output) ?? next(e)
  })
  on('ui.render', { component: 'ToolUse', props: { tool: /template_review_/ } }, ($, e, next) => {
    if (e.props.isRunning || e.props.isErrored || e.props.output === undefined) return next(e)
    return compact($, $.ui.resolve(e), e.props.tool, e.props.output) ?? next(e)
  })

  on('ui.render', { component: 'Pane', requestId: STRIP }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    // Only the terminal's table has Image (kitty graphics); elsewhere the links stand in.
    const Image = e.surface === 'terminal' ? $.ui.resolve(e).Image : null
    const current = await read($, strip)
    const list = await read($, captures)
    const capture = current === null ? undefined : list.find(c => c.id === current.captureId)
    if (capture === undefined || current === null) {
      return (
        <Box>
          <Text dimColor>No capture to show. Run template_review_capture_published_site_screenshots, then /trs.</Text>
        </Box>
      )
    }
    const done = await read($, ready)
    const total = maxSegments(capture)
    const index = Math.min(current.index, Math.max(0, total - 1))
    const columns = Math.max(30, e.props.bodyColumns)
    const usable = columns - 4
    const widths = { desktop: Math.floor(usable * 0.52), tablet: Math.floor(usable * 0.27), mobile: 0 }
    widths.mobile = usable - widths.desktop - widths.tablet
    const maxRows = Math.max(8, (e.viewport?.rows ?? 48) - 7)
    const go = async (delta: number) => {
      const next = Math.min(total - 1, Math.max(0, index + delta))
      if (next === index) return
      await prepareIndex($, capture, next)
      await update($, strip, () => ({ captureId: capture.id, index: next }))
    }
    return (
      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <Text bold wrap="truncate-end">{capture.title}</Text>
          <Text dimColor>{`segment ${index + 1} of ${total}`}</Text>
          <Button key="prev" label="Prev" hotkey="p" onPress={() => go(-1)} />
          <Button key="next" label="Next" hotkey="n" onPress={() => go(1)} />
        </Box>
        <Box gap={2}>
          {VIEWPORTS.map(viewport => {
            const segs = segmentsOf(capture, viewport)
            const seg = segs[Math.min(index, segs.length - 1)]
            const width = widths[viewport]
            if (seg === undefined) {
              return (
                <Box width={width}>
                  <Text dimColor>{`${viewport}: not captured`}</Text>
                </Box>
              )
            }
            const path = done[readyKey(capture.id, seg)]
            const rows = rowsFor(seg, width, maxRows)
            return (
              <Box flexDirection="column" width={width}>
                <Text dimColor>{`${viewport} ${seg.width}x${seg.height} at ${Math.round((seg.segment * seg.height) / seg.pageHeight * 100)}% of ${seg.pageHeight}px${seg.segment !== index ? ' (last)' : ''}`}</Text>
                {path === undefined ? (
                  <Text dimColor>{`fetching segment ${seg.segment + 1}...`}</Text>
                ) : Image === null ? (
                  <Text dimColor wrap="truncate-end">{seg.viewUrl}</Text>
                ) : (
                  <Image key={`${viewport}-${seg.segment}`} source={{ file: path, format: 'png' }} columns={width} rows={rows} alt={`${viewport} segment ${seg.segment + 1}: ${seg.viewUrl}`} />
                )}
              </Box>
            )
          })}
        </Box>
        {capture.gallery !== null && <Text dimColor wrap="truncate-end">{`gallery: ${capture.gallery}`}</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: CARD }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const card = await read($, scorecard)
    if (card === null) {
      return (
        <Box>
          <Text dimColor>No scorecard yet.</Text>
        </Box>
      )
    }
    const bar = meetsBar(card)
    const barColor = bar === 'yes' ? 'green' : bar === 'no' ? 'red' : 'yellow'
    const counts = [
      card.hardFailures === null ? null : `hard failures ${card.hardFailures}`,
      card.blocking === null ? null : `blocking ${card.blocking}`,
      card.recommended === null ? null : `recommended ${card.recommended}`,
      card.findings.critical + card.findings.warning + card.findings.info > 0 ? `findings ${card.findings.critical}C/${card.findings.warning}W/${card.findings.info}i` : null,
      card.followUps === null ? null : `follow-ups ${card.followUps}`,
      card.manual === null ? null : `manual checks ${card.manual}`,
    ].filter((x): x is string => x !== null)
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>{card.name ?? card.versionId ?? 'current review'}</Text>
          <Text dimColor>{`  from ${card.source}`}</Text>
        </Text>
        <Text>
          <Text bold color={card.verdict === 'Pass' ? 'green' : card.verdict === 'Reject' ? 'red' : card.verdict === null ? undefined : 'yellow'}>{`verdict ${card.verdict ?? '-'}`}</Text>
          <Text color={barColor}>{`   meets bar: ${bar}`}</Text>
        </Text>
        <Text dimColor>{counts.length > 0 ? counts.join('   ') : 'no counts yet'}</Text>
        <Text> </Text>
        {DIMENSIONS.map(d => {
          const dim = card.dims[d.id] ?? { tier: null, label: null, note: null }
          return (
            <Text wrap="truncate-end">
              <Text>{d.name.padEnd(18)}</Text>
              <Text color={tierColor(dim.tier)}>{`${tierCells(dim.tier)} ${(dim.tier ?? '-').padEnd(13)}`}</Text>
              <Text dimColor>{`${(dim.label ?? '').padEnd(8)}${dim.note ?? ''}`}</Text>
            </Text>
          )
        })}
        <Text> </Text>
        <Text dimColor>{'### Exceptional  ##. Good  #.. Satisfactory  ??? Unverifiable'}</Text>
      </Box>
    )
  })
}
