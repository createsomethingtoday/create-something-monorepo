/**
 * Re-export Paper type from shared components library and extend with experiment-specific fields.
 */
import type { Paper as BasePaper } from '@create-something/canon';

export interface Paper extends BasePaper {
  // Executable experiment fields (specific to .space)
  is_executable?: number | boolean
  terminal_commands?: string // JSON stringified array of ExperimentCommand[]
  setup_instructions?: string // What the user will learn
  expected_output?: string // What success looks like
  environment_config?: string // JSON config for runtime environment

  // Code editor experiment fields (specific to .space)
  code_lessons?: string // JSON stringified array of CodeLesson[]
  starter_code?: string // Initial code template
  solution_code?: string // Reference solution

  // Route override for file-based experiments
  route?: string

  // Philosophical principles being tested (file-based experiments)
  tests_principles?: string[]
}

// ============================================================================
// EXPERIMENT RUNTIME TYPES
// ============================================================================

export interface ExperimentCommand {
  id: string
  command: string // The actual command to execute
  description: string // Human-readable explanation
  expected_output?: string // What the output should look like
  is_optional?: boolean // Can this step be skipped?
  order: number // Sequence order
  hints?: string[] // Contextual hints for mechanism design
  alternativeApproaches?: string[] // Alternative ways to solve this step
}

export interface CodeLesson {
  id: number
  title: string
  description: string
  starterCode: string
  solution: string
  hints?: string[]
  expectedOutput?: string
  order: number
}

export interface ExperimentMetrics {
  paper_id: string
  session_id: string
  start_time: number
  end_time?: number
  commands_executed: Array<{
    command: string
    timestamp: number
    success?: boolean
    error?: string
  }>
  errors_count: number
  completed: boolean
  custom_metrics?: Record<string, any>
}

export interface ExperimentExecution {
  id: string
  paper_id: string
  user_session_id: string
  commands_executed: string[] // JSON array
  time_spent_seconds: number
  errors_encountered: number
  completed: boolean
  metrics: ExperimentMetrics | string // Can be object or JSON string
  executed_at: string
}

export interface ExperimentStats {
  total_executions: number
  completed_count: number
  avg_time_seconds: number
  avg_errors: number
  total_errors: number
  completion_rate?: number
  fastest_time?: number
  slowest_time?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function parseTerminalCommands(commandsJson: string | undefined): ExperimentCommand[] {
  if (!commandsJson) return []
  try {
    return JSON.parse(commandsJson)
  } catch {
    return []
  }
}

export function isExecutable(paper: Paper): boolean {
  return !!(paper.is_executable && paper.terminal_commands)
}

export function isCodeExperiment(paper: Paper): boolean {
  return !!(paper.is_executable && paper.code_lessons)
}

export function parseCodeLessons(lessonsJson: string | undefined): CodeLesson[] {
  if (!lessonsJson) return []
  try {
    return JSON.parse(lessonsJson)
  } catch {
    return []
  }
}
