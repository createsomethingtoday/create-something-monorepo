/** A creator-facing call the reviewer confirmed in this session. */
export type GuardSent = { tool: string; versionId: string | null; at: number }

/** Evidence the guard has seen for a version this session. */
export type GuardEvidence = 'validated' | 'screenshots' | 'fast-exit'

/** The creator-facing text waiting for the reviewer's answer, drawn in the preview pane. */
export type GuardPending = { summary: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'template-review-guard': {
      /** version_ids whose template_review_get_review_context succeeded this session. */
      contextLoaded: string[]
      /** Template name per version_id, read from the get_review_context result. */
      names: Record<string, string>
      /** Evidence per version_id; URL-only tools attach to the version whose published site they ran on. */
      evidence: Record<string, GuardEvidence[]>
      /** The version_id most recently named by a template_review_* call. */
      current: string | null
      /** Published-site host (lowercase, no www.) to version_id, read from get_review_context. */
      sites: Record<string, string>
      /** Creator-facing calls the reviewer approved, newest last. */
      sent: GuardSent[]
      /** What the preview pane is showing while a confirmation is open. */
      pending: GuardPending | null
    }
  }
}
