/** A send the person confirmed in this session. */
export type OutboundSent = { tool: string; target: string; at: number }

/** What the preview pane shows while a confirmation is open. */
export type OutboundPending = { summary: string; text: string; warnings: string[]; literal: boolean }

declare module 'claude-code' {
  interface PluginState {
    'outbound-guard': {
      sent: OutboundSent[]
      pending: OutboundPending | null
    }
  }
}
