/**
 * Mechanism Design Service
 *
 * Game-theoretic optimization of learning paths.
 * Uses Nash equilibrium thinking to determine optimal interventions.
 *
 * DRY: Reusable across terminal and code experiments.
 */

import type { ExperimentCommand } from '$lib/types/paper'
import { detectStruggle, calculateHintDelay, type StruggleSignals } from './learning-analytics'

export interface StepContext {
  stepIndex: number
  stepId?: string
  description?: string
  expectedDifficulty?: 'easy' | 'medium' | 'hard'
  hints?: string[]
  alternativeApproaches?: string[]
}

export interface LearningState {
  timeOnCurrentStep: number
  errorCount: number
  retryCount: number
  previousSuccesses: number
  previousFailures: number
}

export interface InterventionDecision {
  shouldIntervene: boolean
  interventionType: 'hint' | 'alternative_approach' | 'encouragement' | 'none'
  content: string
  alternativeContent?: string
  confidence: number
  delayMs: number
}

/**
 * Decide if and how to intervene based on game-theoretic principles
 *
 * Nash Equilibrium: What's the optimal intervention strategy?
 * - User's payoff: Understanding + Confidence
 * - System's payoff: User retention + Completion rate
 *
 * Optimal intervention: Maximize (Understanding * Retention)
 */
export function decideIntervention(
  stepContext: StepContext,
  learningState: LearningState,
  medianTimeForStep: number = 60000
): InterventionDecision {
  // Detect struggle signals
  const struggle: StruggleSignals = detectStruggle(
    learningState.timeOnCurrentStep,
    learningState.errorCount,
    learningState.retryCount,
    medianTimeForStep
  )

  // Default: No intervention
  let decision: InterventionDecision = {
    shouldIntervene: false,
    interventionType: 'none',
    content: '',
    confidence: 0,
    delayMs: 0
  }

  // Game-theoretic decision tree
  if (struggle.isStruggling) {
    // High confidence struggle: Provide contextual help
    if (struggle.confidence >= 0.66) {
      decision = {
        shouldIntervene: true,
        interventionType: 'hint',
        content: selectOptimalHint(stepContext, learningState),
        alternativeContent: selectAlternativeApproach(stepContext),
        confidence: struggle.confidence,
        delayMs: calculateHintDelay(
          learningState.timeOnCurrentStep,
          medianTimeForStep,
          learningState.errorCount
        )
      }
    }
    // Medium confidence: Offer encouragement + alternative approach
    else if (struggle.confidence >= 0.33) {
      decision = {
        shouldIntervene: true,
        interventionType: 'alternative_approach',
        content: generateEncouragement(learningState),
        alternativeContent: selectAlternativeApproach(stepContext),
        confidence: struggle.confidence,
        delayMs: medianTimeForStep * 1.5 - learningState.timeOnCurrentStep
      }
    }
  }

  // Special case: Quick successes (build confidence)
  else if (
    learningState.previousSuccesses > 0 &&
    learningState.timeOnCurrentStep < medianTimeForStep * 0.5 &&
    learningState.errorCount === 0
  ) {
    decision = {
      shouldIntervene: true,
      interventionType: 'encouragement',
      content:
        "You're moving quickly through this - you clearly understand the concepts. Keep going!",
      confidence: 0.8,
      delayMs: 0
    }
  }

  return decision
}

/**
 * Select optimal hint using information theory
 * Most informative hint = highest reduction in uncertainty
 */
function selectOptimalHint(context: StepContext, state: LearningState): string {
  if (!context.hints || context.hints.length === 0) {
    return generateGenericHint(state)
  }

  // Strategy: Escalate hint detail based on struggle
  // First struggle: High-level hint
  // More struggles: More specific hint
  const hintIndex = Math.min(state.errorCount + state.retryCount, context.hints.length - 1)

  return context.hints[hintIndex]
}

/**
 * Select alternative approach based on current strategy
 */
function selectAlternativeApproach(context: StepContext): string | undefined {
  if (!context.alternativeApproaches || context.alternativeApproaches.length === 0) {
    return undefined
  }

  // For now, return first alternative
  // Future: Track which approach user is taking, suggest the opposite
  return context.alternativeApproaches[0]
}

/**
 * Generate encouraging message based on learning state
 */
function generateEncouragement(state: LearningState): string {
  const successRate =
    state.previousSuccesses / (state.previousSuccesses + state.previousFailures || 1)

  if (successRate > 0.7) {
    return "You've been doing well on previous steps. This one might take a bit more time - that's normal."
  }

  if (state.errorCount > 0) {
    return "Each error is part of the learning process. You're getting closer to understanding."
  }

  return 'Take your time. Understanding emerges through experimentation.'
}

/**
 * Generate generic hint when no specific hints available
 */
function generateGenericHint(state: LearningState): string {
  if (state.errorCount > 2) {
    return "You've encountered several errors. Try breaking down the problem into smaller steps."
  }

  if (state.retryCount > 1) {
    return "Multiple resets suggest trying a different approach might help. What's a simpler version of this task?"
  }

  return 'Consider reviewing the instructions or expected output. What patterns do you notice?'
}

/**
 * DRY: Convert ExperimentCommand to StepContext
 */
export function commandToStepContext(command: ExperimentCommand, index: number): StepContext {
  return {
    stepIndex: index,
    stepId: `cmd_${index}`,
    description: command.description,
    hints: command.hints || [],
    alternativeApproaches: command.alternativeApproaches
  }
}

/**
 * DRY: Build learning state tracker
 * Reusable state management across experiments
 */
export class LearningStateTracker {
  private startTime: number = 0
  private errorCount: number = 0
  private retryCount: number = 0
  private previousSuccesses: number = 0
  private previousFailures: number = 0

  startStep(): void {
    this.startTime = Date.now()
    this.errorCount = 0
  }

  recordError(): void {
    this.errorCount++
  }

  recordRetry(): void {
    this.retryCount++
    this.errorCount = 0 // Reset errors on retry
  }

  recordSuccess(): void {
    this.previousSuccesses++
    this.errorCount = 0
    this.retryCount = 0
  }

  recordFailure(): void {
    this.previousFailures++
  }

  getState(): LearningState {
    return {
      timeOnCurrentStep: Date.now() - this.startTime,
      errorCount: this.errorCount,
      retryCount: this.retryCount,
      previousSuccesses: this.previousSuccesses,
      previousFailures: this.previousFailures
    }
  }

  reset(): void {
    this.startTime = 0
    this.errorCount = 0
    this.retryCount = 0
    this.previousSuccesses = 0
    this.previousFailures = 0
  }
}
