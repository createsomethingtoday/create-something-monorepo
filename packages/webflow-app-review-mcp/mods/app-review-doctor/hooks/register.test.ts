import { expect, test } from 'claude-code/testing'

import { buildDir, isBuildCommand, parseDoctorOutput, resolveDir, statusLine } from './lib'

test('build commands are recognised, other commands are not', () => {
  for (const cmd of ['npm run build', 'pnpm build', 'webflow extension bundle', 'cd app && npm run build', 'webpack --config webpack.config.mjs --mode production', 'pnpm forge doctor .']) {
    expect(isBuildCommand(cmd)).toBe(true)
  }
  for (const cmd of ['ls -la', 'npm run dev', 'git status', 'npm install', 'webflow extension serve']) {
    expect(isBuildCommand(cmd)).toBe(false)
  }
})

test('doctor JSON output becomes a report and a status line', () => {
  const json = JSON.stringify({ summary: { ready: false, blockers: 1, required: 0, warnings: 2, passed: 19 }, findings: [{ check: 'doctor:prod-build', status: 'fail', severity: 'blocker', title: 'Development residue', detail: 'Build with --mode production', evidence: ['bundle.js: Warning string'] }] })
  const report = parseDoctorOutput(`noise before\n${json}`, 1, '', 5)
  expect(report.error).toBe(null)
  expect(report.ready).toBe(false)
  expect(report.findings.length).toBe(1)
  expect(report.findings[0]?.evidence[0]).toBe('bundle.js: Warning string')
  expect(statusLine(report, 'Section Namer')).toBe('Section Namer: doctor 1 blocker, 0 required')

  const ready = parseDoctorOutput(JSON.stringify({ summary: { ready: true, blockers: 0, required: 0, warnings: 0, passed: 22 }, findings: [] }), 0, '', 5)
  expect(statusLine(ready, 'Section Namer')).toBe('Section Namer: doctor READY 22 passed')
})

test('a doctor that printed nothing or non-JSON is an error, not a crash', () => {
  expect(parseDoctorOutput('', 2, 'No bundle.zip', 1).error).toBe('No bundle.zip')
  expect(parseDoctorOutput('{not json', 0, '', 1).error).toMatch(/not JSON/)
  expect(statusLine(null, 'x')).toBe(undefined)
})

test('a non-build Bash call passes through untouched', async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'ok', stderr: '' } }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'git status' })
  expect(ran.deny).toBe(undefined)
  expect(ran.isError === true).toBe(false)
})

test('paths resolve against the session cwd and a leading cd is honoured', () => {
  expect(resolveDir('', '/repo')).toBe('/repo')
  expect(resolveDir('.', '/repo')).toBe('/repo')
  expect(resolveDir('./apps/x/', '/repo')).toBe('/repo/apps/x')
  expect(resolveDir('/abs/app', '/repo')).toBe('/abs/app')
  expect(buildDir('cd /tmp/app && npm run build', '/repo')).toBe('/tmp/app')
  expect(buildDir('cd "apps/my app"; npm run build', '/repo')).toBe('/repo/apps/my app')
  expect(buildDir('npm run build', '/repo')).toBe('/repo')
})
