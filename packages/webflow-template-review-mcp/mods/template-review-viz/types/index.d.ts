/** One captured segment of a published page at one viewport. */
export type VizSegment = {
  viewport: 'desktop' | 'tablet' | 'mobile'
  segment: number
  viewUrl: string
  width: number
  height: number
  pageHeight: number
}

/** One screenshot capture, as the capture tool returned it. */
export type VizCapture = {
  id: string
  title: string
  url: string
  gallery: string | null
  at: number
  segments: VizSegment[]
}

export type VizTier = 'Satisfactory' | 'Good' | 'Exceptional' | 'Unverifiable'
export type VizLabel = 'Auto' | 'Partial' | 'Manual'

export type VizDimension = {
  tier: VizTier | null
  label: VizLabel | null
  note: string | null
}

/** What the draft review says so far, from whichever source last touched it. */
export type VizScorecard = {
  versionId: string | null
  name: string | null
  verdict: string | null
  dims: Record<string, VizDimension>
  findings: { critical: number; warning: number; info: number }
  blocking: number | null
  recommended: number | null
  hardFailures: number | null
  followUps: number | null
  manual: number | null
  source: string
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'template-review-viz': {
      captures: VizCapture[]
      strip: { captureId: string; index: number } | null
      /** PNG path, or null after preparation failed; absent while pending. */
      ready: Record<string, string | null>
      /** Hub result rows have no input, so remember the resolved name by tool_use_id. */
      callNames: Record<string, string>
      scorecard: VizScorecard | null
    }
  }
}
