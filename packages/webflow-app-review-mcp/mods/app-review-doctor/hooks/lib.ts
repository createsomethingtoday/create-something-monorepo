import type { DoctorFinding, DoctorReport } from '../types'

/** Bash commands after which the bundle may have changed. */
const BUILD = /\b(npm|pnpm|yarn)\s+(run\s+)?build\b|\bwebflow\s+extension\s+bundle\b|\bwebpack\b.*--mode\s+production|\bwf-forge\s+doctor\b|\bforge\s+doctor\b/

export function isBuildCommand(command: string): boolean {
  return BUILD.test(command)
}

export function statusLine(report: DoctorReport | null, name: string): string | undefined {
  if (!report) return undefined
  if (report.error) return `${name}: doctor failed`
  if (report.ready) return `${name}: doctor READY ${report.passed} passed${report.warnings ? `, ${report.warnings} suggested` : ''}`
  return `${name}: doctor ${report.blockers} blocker, ${report.required} required`
}

/** Parse `wf-forge doctor --json` output into a report; never throws. */
export function parseDoctorOutput(stdout: string, exitCode: number, stderr: string, ranAt: number): DoctorReport {
  const empty: DoctorReport = { ready: false, blockers: 0, required: 0, warnings: 0, passed: 0, findings: [], ranAt, error: null }
  const start = stdout.indexOf('{')
  if (start < 0) {
    return { ...empty, error: (stderr || stdout || `doctor exited ${exitCode} with no output`).trim().slice(0, 300) }
  }
  try {
    const parsed = JSON.parse(stdout.slice(start)) as { summary?: Partial<DoctorReport>; findings?: DoctorFinding[] }
    const s = parsed.summary ?? {}
    return {
      ready: Boolean(s.ready),
      blockers: Number(s.blockers ?? 0),
      required: Number(s.required ?? 0),
      warnings: Number(s.warnings ?? 0),
      passed: Number(s.passed ?? 0),
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map(f => ({
            check: String(f.check),
            status: f.status,
            severity: f.severity,
            title: String(f.title),
            detail: String(f.detail ?? ''),
            evidence: Array.isArray(f.evidence) ? f.evidence.map(String) : [],
          }))
        : [],
      ranAt,
      error: null,
    }
  } catch (error) {
    return { ...empty, error: `doctor output was not JSON: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export const RUBRIC = [
  'This working directory is a Webflow Designer Extension (webflow.json present). Marketplace review asks three things: is it real (works end to end, no placeholder content), is it safe and inspectable (production build, Designer APIs only, no eval, no secrets, no inline handlers, source map in review-artifacts/ never in the bundle), and is it honest (listing matches behavior, fees disclosed, one developer account).',
  'Before saying a build is ready, run `pnpm forge doctor <dir>` from the CREATE SOMETHING monorepo (or the /doctor command) and quote its result. Identify sections with getTag() === "section", report through webflow.notify, never alert(). Analytics only behind consent.',
  'Never submit to the Marketplace on the developer\'s behalf. The packet is the handoff; the developer clicks submit. Do not write privacy policy or terms text.',
].join(' ')

/** Resolve a path a person or a command named against the session's cwd. */
export function resolveDir(raw: string, cwd: string): string {
  const t = raw.trim().replace(/^['"]|['"]$/g, '')
  if (!t || t === '.') return cwd
  if (t.startsWith('/')) return t.replace(/\/+$/, '')
  return `${cwd.replace(/\/+$/, '')}/${t.replace(/^\.\//, '').replace(/\/+$/, '')}`
}

/** The directory a Bash command builds in: its leading `cd <dir> &&`, else the cwd. */
export function buildDir(command: string, cwd: string): string {
  const m = /^\s*cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*(?:&&|;)/.exec(command)
  const target = m ? (m[1] ?? m[2] ?? m[3] ?? '') : ''
  return target ? resolveDir(target, cwd) : cwd
}
