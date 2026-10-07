import { atom, read, update } from 'claude-code'
import type { On, Register } from 'claude-code'

import type { DoctorProject, DoctorReport } from '../types'
import { FIND_FORGE_CLI_SH, RUBRIC, buildDir, isBuildCommand, parseDoctorOutput, resolveDir, statusLine } from './lib'

const PANE = 'app-review-doctor'
const project = atom({ plugin: 'app-review-doctor', key: 'project' } as const, null)
const report = atom({ plugin: 'app-review-doctor', key: 'report' } as const, null)
const isHidden = atom({ plugin: 'app-review-doctor', key: 'isHidden' } as const, false)

type Engine = Parameters<Parameters<On>[2]>[0]

async function detect($: Engine, cwd: string): Promise<DoctorProject | null> {
  const manifest = `${cwd}/webflow.json`
  if (!(await $.fs.exists(manifest))) return null
  let name = cwd.split('/').pop() ?? 'extension'
  try {
    const parsed = JSON.parse(await $.fs.read(manifest)) as { name?: unknown }
    if (typeof parsed.name === 'string' && parsed.name.trim()) name = parsed.name.trim()
  } catch {
    // keep the folder name
  }
  return { cwd, name }
}

async function findForgeCli($: Engine, cwd: string): Promise<string> {
  const ran = await $.process.run(['sh', '-c', FIND_FORGE_CLI_SH], { cwd, timeoutMs: 10_000 })
  return ran.exitCode === 0 ? ran.stdout.trim() : ''
}

async function runDoctor($: Engine, p: DoctorProject, configured: string): Promise<DoctorReport> {
  const ranAt = await $.clock.now()
  let next: DoctorReport
  try {
    const forgeCli = configured || (await findForgeCli($, p.cwd))
    if (!forgeCli) throw new Error('App Forge CLI not found above the project; set forgeCli in the mod options')
    const ran = await $.process.run(['node', forgeCli, 'doctor', p.cwd, '--json'], { cwd: p.cwd, timeoutMs: 60_000 })
    next = parseDoctorOutput(ran.stdout, ran.exitCode, ran.stderr, ranAt)
  } catch (error) {
    next = { ready: false, blockers: 0, required: 0, warnings: 0, passed: 0, findings: [], ranAt, error: error instanceof Error ? error.message : String(error) }
  }
  await update($, report, () => next)
  $.ui.status(statusLine(next, p.name))
  if (next.error) $.ui.toast(`doctor could not run: ${next.error}`)
  else if (!next.ready) $.ui.toast(`${p.name}: doctor found ${next.blockers} blocker, ${next.required} required. /doctor for details.`)
  return next
}

export const register: Register = (on, options) => {
  const forgeCli = String(options.forgeCli ?? '')

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'doctor', description: 'Run the App Forge doctor on this Designer Extension and open the findings pane' })
    const found = await detect($, e.cwd)
    await update($, project, () => found)
    return next(e)
  })

  on('command.run', { command: 'doctor' }, async ($, e) => {
    const cwd = await $.session.cwd()
    const remembered = await read($, project)
    const dir = e.args.trim() ? resolveDir(e.args, cwd) : remembered?.cwd ?? cwd
    const found = await detect($, dir)
    await update($, project, () => found)
    if (!found) return { text: `No webflow.json in ${dir}. Run /doctor <path-to-extension> or run it from the project.` }
    const result = await runDoctor($, found, forgeCli)
    await $.ui.open({ id: PANE, title: `Doctor: ${found.name}`, focus: true })
    if (result.error) return { text: `Doctor could not run: ${result.error}` }
    return { text: `${found.name}: ${result.ready ? 'READY' : 'NOT READY'} (${result.blockers} blocker, ${result.required} required, ${result.warnings} suggested, ${result.passed} passed). Pane opened.` }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (!isBuildCommand(e.command) || ran.deny !== undefined) return ran
    // A failed build leaves the previous bundle.zip in place; a doctor pass on it would be misleading.
    const res = (ran as { result?: { exitCode?: unknown; stderr?: unknown } }).result
    const failed = ran.isError === true || (typeof res?.exitCode === 'number' && res.exitCode !== 0)
    if (failed) {
      $.ui.toast('build failed: doctor skipped (the old bundle.zip would be checked otherwise)')
      return ran
    }
    const cwd = await $.session.cwd()
    const found = (await detect($, buildDir(e.command, cwd))) ?? (await read($, project))
    if (!found) return ran
    await update($, project, () => found)
    void runDoctor($, found, forgeCli)
    return ran
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const found = await read($, project)
    if (!found) return composed
    return { sections: [...composed.sections, { id: 'app-review-doctor:rubric', text: RUBRIC, scope: 'session' as const }] }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const found = await read($, project)
    if (!found || e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const current = await read($, report)
    const line = current ? (statusLine(current, found.name) ?? '') : `${found.name}: doctor not run yet`
    return (
      <Box>
        <Text dimColor={Boolean(current?.ready)} color={current && !current.ready && !current.error ? 'red' : undefined}>
          {line}{' '}
        </Text>
        <Button key="run" label="Run doctor" onPress={() => runDoctor($, found, forgeCli)} />
        <Text> </Text>
        <Button key="pane" label="Findings" onPress={() => $.ui.open({ id: PANE, title: `Doctor: ${found.name}`, focus: true })} />
        <Text> </Text>
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const current = await read($, report)
    const found = await read($, project)
    const room = Math.max(3, (e.viewport?.rows ?? 24) - 4)
    if (!current) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No doctor run yet. Press Run doctor or type /doctor.</Text>
        </Box>
      )
    }
    if (current.error) {
      return (
        <Box flexDirection="column">
          <Text color="red">Doctor could not run.</Text>
          <Text>{current.error}</Text>
        </Box>
      )
    }
    const open = current.findings.filter(f => f.status === 'fail' || f.status === 'warn')
    const rows: Array<{ text: string; color?: string; dim?: boolean }> = []
    rows.push({ text: `${found?.name ?? 'extension'}: ${current.ready ? 'READY' : 'NOT READY'}  ${current.blockers} blocker, ${current.required} required, ${current.warnings} suggested, ${current.passed} passed`, color: current.ready ? 'green' : 'red' })
    for (const f of open) {
      const mark = f.status === 'warn' || f.severity === 'suggested' ? 'warn' : 'FAIL'
      rows.push({ text: `${mark} [${f.severity}] ${f.check}: ${f.title}`, color: mark === 'FAIL' ? 'red' : 'yellow' })
      if (f.detail) rows.push({ text: `     ${f.detail}`, dim: true })
      for (const ev of f.evidence.slice(0, 3)) rows.push({ text: `     - ${ev}`, dim: true })
    }
    if (open.length === 0) rows.push({ text: 'Nothing to fix. Next: App Review Preflight on this exact bundle.zip and review-artifacts/bundle.js.map.', dim: true })
    return (
      <Box flexDirection="column">
        {rows.slice(0, room).map(row => (
          <Text color={row.color} dimColor={row.dim}>
            {row.text}
          </Text>
        ))}
        {rows.length > room && <Text dimColor>... {rows.length - room} more rows</Text>}
      </Box>
    )
  })
}
