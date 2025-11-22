<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import Terminal from './Terminal.svelte'
  import ResumePrompt from './ResumePrompt.svelte'
  import ContextualHint from './ContextualHint.svelte'
  import type { Paper, ExperimentCommand, ExperimentMetrics } from '$lib/types/paper'
  import { parseTerminalCommands } from '$lib/types/paper'
  import { loadProgress, saveProgress, clearProgress, type ProgressState } from '$lib/utils/progress'
  import { trackLearningEvent, getAggregateInsights } from '$lib/services/learning-analytics'
  import {
    LearningStateTracker,
    decideIntervention,
    commandToStepContext,
    type InterventionDecision
  } from '$lib/services/mechanism-design'

  interface Props {
    paper: Paper
  }

  let { paper }: Props = $props()

  // State
  let commands = $state<ExperimentCommand[]>([])
  let currentCommandIndex = $state(0)
  let isTerminalOpen = $state(false)
  let sessionId = $state('')
  let startTime = $state(0)
  let metrics = $state<ExperimentMetrics>({
    paper_id: paper.id,
    session_id: '',
    start_time: 0,
    commands_executed: [],
    errors_count: 0,
    completed: false
  })
  let completedSteps = $state<number[]>([])
  let savedProgress = $state<ProgressState | null>(null)
  let showResumePrompt = $state(false)

  // Mechanism Design State (DRY)
  let learningTracker = new LearningStateTracker()
  let currentIntervention = $state<InterventionDecision | null>(null)
  let stepStartTime = $state(0)
  let medianTimeForCurrentStep = $state(60000) // Default 60s

  // Computed
  let timeSpent = $derived(
    startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0
  )
  let progress = $derived(
    commands.length > 0
      ? Math.round((completedSteps.length / commands.length) * 100)
      : 0
  )

  onMount(async () => {
    // Parse commands from JSON
    commands = parseTerminalCommands(paper.terminal_commands)

    // Generate anonymous session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    metrics.session_id = sessionId

    // Check for saved progress
    const saved = await loadProgress(paper.id)
    if (saved && saved.experimentType === 'terminal' && saved.completedSteps.length > 0) {
      savedProgress = saved
      showResumePrompt = true
    }
  })

  async function handleResume() {
    if (!savedProgress) return

    currentCommandIndex = savedProgress.currentStep
    completedSteps = [...savedProgress.completedSteps]
    showResumePrompt = false
    isTerminalOpen = true
    startTime = Date.now()
    metrics.start_time = startTime
  }

  async function handleStartOver() {
    await clearProgress(paper.id)
    savedProgress = null
    showResumePrompt = false
    currentCommandIndex = 0
    completedSteps = []
  }

  async function autoSaveProgress() {
    await saveProgress(paper.id, {
      sessionId,
      currentStep: currentCommandIndex,
      completedSteps,
      experimentType: 'terminal'
    })
  }

  async function startExperiment() {
    isTerminalOpen = true
    startTime = Date.now()
    metrics.start_time = startTime

    // Track experiment start
    await trackEvent('start')

    // Initialize mechanism design for first step
    await startNewStep()
  }

  async function startNewStep() {
    stepStartTime = Date.now()
    learningTracker.startStep()
    currentIntervention = null

    // Get aggregate insights for this step
    const insights = await getAggregateInsights(paper.id, currentCommandIndex)
    if (insights) {
      medianTimeForCurrentStep = insights.medianTimeToComplete
    }

    // Track step start
    await trackLearningEvent({
      paperId: paper.id,
      sessionId,
      experimentType: 'terminal',
      stepIndex: currentCommandIndex,
      action: 'step_start'
    })
  }

  async function checkForIntervention() {
    if (!isTerminalOpen || currentIntervention) return

    const stepContext = commandToStepContext(commands[currentCommandIndex], currentCommandIndex)
    const learningState = learningTracker.getState()

    const decision = decideIntervention(
      stepContext,
      learningState,
      medianTimeForCurrentStep
    )

    if (decision.shouldIntervene && decision.delayMs <= 0) {
      currentIntervention = decision

      // Track hint shown
      await trackLearningEvent({
        paperId: paper.id,
        sessionId,
        experimentType: 'terminal',
        stepIndex: currentCommandIndex,
        action: 'hint_shown',
        timeOnStep: learningState.timeOnCurrentStep
      })
    }
  }

  async function trackEvent(
    action: 'start' | 'command' | 'complete' | 'error',
    command?: string,
    error?: string
  ) {
    try {
      await fetch('/api/experiments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          paper_id: paper.id,
          session_id: sessionId,
          command,
          error_message: error,
          metrics: action === 'complete' ? metrics : undefined
        })
      })
    } catch (err) {
      console.error('Tracking error:', err)
    }
  }

  async function handleCommandExecuted(command: string, result: any) {
    const isError = !!result?.error

    // Record command execution
    metrics.commands_executed.push({
      command,
      timestamp: Date.now(),
      success: !isError
    })

    // Update learning tracker
    if (isError) {
      learningTracker.recordError()
      metrics.errors_count++
    } else {
      learningTracker.recordSuccess()

      // Add to completed steps if successful
      if (!completedSteps.includes(currentCommandIndex)) {
        completedSteps = [...completedSteps, currentCommandIndex]
        await autoSaveProgress()
      }

      // Track step completion
      const timeOnStep = Date.now() - stepStartTime
      await trackLearningEvent({
        paperId: paper.id,
        sessionId,
        experimentType: 'terminal',
        stepIndex: currentCommandIndex,
        action: 'step_complete',
        timeOnStep,
        errorCount: learningTracker.getState().errorCount
      })

      // Move to next step if available
      if (currentCommandIndex < commands.length - 1) {
        currentCommandIndex++
        await startNewStep()
      }
    }

    // Track the command
    await trackEvent(isError ? 'error' : 'command', command, result?.error)

    // Check if completed
    if (completedSteps.length >= commands.length) {
      metrics.completed = true
      await trackEvent('complete')
    }

    // Check if intervention needed (after error)
    if (isError) {
      setTimeout(() => checkForIntervention(), 1000)
    }
  }

  // Auto-update time every second when terminal is open
  $effect(() => {
    if (!isTerminalOpen) return

    const interval = setInterval(() => {
      // Force reactivity by accessing startTime
      const _ = startTime
    }, 1000)

    return () => clearInterval(interval)
  })

  // Periodic intervention check (game-theoretic timing)
  $effect(() => {
    if (!isTerminalOpen || currentIntervention) return

    const checkInterval = setInterval(() => {
      checkForIntervention()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(checkInterval)
  })
</script>

<!-- Resume Progress Prompt -->
{#if showResumePrompt && savedProgress}
  <ResumePrompt
    progress={savedProgress}
    totalSteps={commands.length}
    onResume={handleResume}
    onStartOver={handleStartOver}
  />
{/if}

<div class="experiment-runtime">
  {#if !isTerminalOpen}
    <!-- Experiment Overview - Before Launch -->
    <div
      class="border border-white/10 rounded-lg bg-black/50 p-8 mb-8 hover:border-white/20 transition-colors"
      transition:fade
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <h3 class="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Try This Experiment
          </h3>
          <p class="text-white/60">
            Run this experiment in your browser. No setup required.
          </p>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <div class="px-3 py-1 bg-white/10 text-white rounded-full border border-white/20 font-medium">
            {commands.length} steps
          </div>
        </div>
      </div>

      <!-- Setup Instructions -->
      {#if paper.setup_instructions}
        <div class="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 class="text-white font-semibold mb-2 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What You'll Learn
          </h4>
          <p class="text-white/70 text-sm leading-relaxed">
            {paper.setup_instructions}
          </p>
        </div>
      {/if}

      <!-- Command Preview -->
      <div class="mb-6">
        <h4 class="text-white font-semibold mb-3">Steps:</h4>
        <div class="space-y-2">
          {#each commands.slice(0, 3) as cmd, i}
            <div class="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors">
              <div class="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-mono font-bold">
                {i + 1}
              </div>
              <div class="flex-1">
                <code class="text-sm text-white/80 font-mono">{cmd.command}</code>
                {#if cmd.description}
                  <p class="text-xs text-white/50 mt-1">{cmd.description}</p>
                {/if}
              </div>
            </div>
          {/each}

          {#if commands.length > 3}
            <div class="text-center text-white/40 text-sm py-2">
              + {commands.length - 3} more step{commands.length - 3 !== 1 ? 's' : ''}
            </div>
          {/if}
        </div>
      </div>

      <!-- Start Button -->
      <button
        onclick={startExperiment}
        class="w-full py-4 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Launch Interactive Terminal
      </button>
    </div>
  {:else}
    <!-- Terminal Runtime - After Launch -->
    <div class="border border-white/20 rounded-lg overflow-hidden mb-8" transition:slide>
      <!-- Terminal Header -->
      <div class="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span class="text-white font-mono text-sm">
            Experiment Running: {paper.title}
          </span>
        </div>

        <div class="flex items-center gap-4 text-xs text-white/60 font-mono">
          <span>Commands: {metrics.commands_executed.length}/{commands.length}</span>
          <span>Session: {sessionId.slice(-8)}</span>
        </div>
      </div>

      <!-- Terminal Component -->
      <Terminal
        welcomeMessage="🧪 Experiment Terminal Ready - Type commands or use suggestions below"
        {commands}
        onCommandExecuted={handleCommandExecuted}
      />
    </div>

    <!-- Contextual Hint (Mechanism Design) -->
    {#if currentIntervention && currentIntervention.shouldIntervene}
      <ContextualHint
        paperId={paper.id}
        {sessionId}
        experimentType="terminal"
        stepIndex={currentCommandIndex}
        hint={currentIntervention.content}
        alternativeApproach={currentIntervention.alternativeContent}
        onDismiss={() => (currentIntervention = null)}
      />
    {/if}

    <!-- Metrics Dashboard -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
        <div class="text-white/40 text-xs uppercase tracking-wide mb-1">Commands Run</div>
        <div class="text-3xl font-bold text-white">{metrics.commands_executed.length}</div>
        <div class="text-xs text-white/50 mt-1">of {commands.length} total</div>
      </div>

      <div class="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
        <div class="text-white/40 text-xs uppercase tracking-wide mb-1">Time Spent</div>
        <div class="text-3xl font-bold text-white">{timeSpent}s</div>
        <div class="text-xs text-white/50 mt-1">
          {timeSpent > 60 ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : 'just started'}
        </div>
      </div>

      <div class="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
        <div class="text-white/40 text-xs uppercase tracking-wide mb-1">Progress</div>
        <div class="text-3xl font-bold text-white">{progress}%</div>
        <div class="text-xs text-white/50 mt-1">
          {metrics.completed ? '✓ Complete!' : `${commands.length - metrics.commands_executed.length} left`}
        </div>
      </div>
    </div>

    <!-- Completion Message -->
    {#if metrics.completed}
      <div class="border border-white/20 bg-white/5 rounded-lg p-6 mb-8" transition:fade>
        <div class="flex items-center gap-3 mb-3">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 class="text-xl font-bold text-white">Experiment Complete!</h4>
        </div>
        <p class="text-white/70 mb-4">
          You completed this experiment in {timeSpent}s with {metrics.errors_count} error{metrics.errors_count !== 1 ? 's' : ''}.
        </p>
        <div class="flex gap-3">
          <button
            onclick={() => window.location.href = '/experiments'}
            class="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Browse More Experiments
          </button>
          <button
            onclick={() => { isTerminalOpen = false; metrics = { ...metrics, commands_executed: [], errors_count: 0, completed: false }; startTime = 0 }}
            class="px-6 py-2 bg-white border border-white/20 text-black rounded-lg hover:bg-white/90 transition-colors font-medium"
          >
            Run Again
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
