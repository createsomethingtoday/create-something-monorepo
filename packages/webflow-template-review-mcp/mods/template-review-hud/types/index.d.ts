/** One playbook step the reviewer (or the agent on their behalf) has completed. */
export type ReviewStep =
  | 'context'
  | 'assigned'
  | 'validated'
  | 'screenshots'
  | 'sandbox'
  | 'stylesheet'
  | 'ticket'
  | 'draft'
  | 'notes'

/** One template version touched in this session. */
export type Review = {
  id: string
  name: string | null
  url: string | null
  gallery: string | null
  steps: ReviewStep[]
  decision: string | null
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'template-review-hud': {
      reviews: Review[]
      current: string | null
      isHidden: boolean
    }
  }
}
