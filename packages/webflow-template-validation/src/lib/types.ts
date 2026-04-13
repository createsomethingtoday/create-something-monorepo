export type Severity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  category: 'Accessibility' | 'Components' | 'Interactions' | 'Typography' | 'Variables' | 'Styles' | 'Naming'
  severity: Severity
  message: string
  details?: Record<string, unknown>
  example?: string
}

export interface CategoryResult {
  category: 'Accessibility' | 'Components' | 'Interactions' | 'Typography' | 'Variables' | 'Styles' | 'Naming'
  passed: boolean
  score?: number
  issues: ValidationIssue[]
  stats?: Record<string, unknown>
}

export interface ValidationResponse {
  url: string
  success: boolean
  categories: CategoryResult[]
  summary: {
    errors: number
    warnings: number
    infos: number
    passedCategories: number
    failedCategories: number
  }
}
