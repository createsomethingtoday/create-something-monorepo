export type GuardSent = { tool: string; versionId: string | null; at: number }
export type GuardPending = { summary: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'app-review-guard': {
      /** version_ids whose app_review_get_review_context succeeded this session. */
      contextLoaded: string[]
      /** App name per version_id, read from the get_review_context result. */
      names: Record<string, string>
      /** Developer-facing calls the reviewer approved, newest last. */
      sent: GuardSent[]
      /** What the preview pane shows while a confirmation is open. */
      pending: GuardPending | null
    }
  }
}
