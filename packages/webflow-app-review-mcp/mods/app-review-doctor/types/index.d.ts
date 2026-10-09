export type DoctorProject = { cwd: string; name: string }

export type DoctorFinding = {
  check: string
  status: 'pass' | 'fail' | 'warn' | 'skip'
  severity: 'blocker' | 'required' | 'suggested'
  title: string
  detail: string
  evidence: string[]
}

export type DoctorReport = {
  ready: boolean
  blockers: number
  required: number
  warnings: number
  passed: number
  findings: DoctorFinding[]
  ranAt: number
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'app-review-doctor': {
      project: DoctorProject | null
      report: DoctorReport | null
      isHidden: boolean
    }
  }
}
