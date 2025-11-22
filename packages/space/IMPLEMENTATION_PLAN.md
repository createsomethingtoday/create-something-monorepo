# IMPLEMENTATION PLAN: Interactive Experiment Runtime for CREATE SOMETHING SPACE

**Version:** 1.0
**Date:** 2025-11-16
**Status:** Approved - Ready for Implementation

---

## Executive Summary

Transform CREATE SOMETHING SPACE from a static content site into an "Interactive Experiment Runtime + Community Lab" by embedding the existing Terminal component into experiment pages, enabling users to run code, track metrics, and share variations.

### Vision

The whole (community learning mission) requires transforming the parts (experiments) from static articles into living, runnable experiences. SPACE should be where the community learns by DOING, not just reading.

**Current State:** Experiments are static blog posts
**Target State:** Interactive runtime where users execute code, modify experiments, and share variations

---

## Current Architecture Analysis

### Existing Components (Reusable)

- **Terminal.svelte** (`/src/lib/components/Terminal.svelte`) - Basic terminal with command processing
- **TerminalExperience.svelte** (`/src/lib/components/TerminalExperience.svelte`) - Advanced terminal with GSAP animations, 3D background, card navigation
- **API: /api/terminal/+server.ts** - Command processing endpoint with D1 integration
- **Paper type** (`/src/lib/types/paper.ts`) - Already has `interactive_demo_url` and `video_walkthrough_url` fields (unused)
- **D1 Database** - create-something-db (configured)
- **KV Store** - SESSIONS and CACHE bindings (configured)
- **R2 Bucket** - STORAGE (configured)

### Database Infrastructure

- **D1 Database**: create-something-db
- **KV Namespaces**: SESSIONS (session data), CACHE (temporary storage)
- **R2 Bucket**: STORAGE (future: code snapshots, results)

---

## PHASE 1: MVP - RUNNABLE EXPERIMENTS

**Goal:** Enable users to run experiments in the browser, track metrics, and see community stats.

**Timeline:** 24-28 hours core development + 3 hours per experiment conversion

---

## 1. DATABASE SCHEMA ADDITIONS

**File:** `/db/schema.sql` or create `/db/migrations/001_experiment_runtime.sql`

### SQL Migration

```sql
-- ============================================================================
-- EXPERIMENT RUNTIME SCHEMA
-- ============================================================================

-- Add executable fields to existing papers table
ALTER TABLE papers ADD COLUMN is_executable INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN terminal_commands TEXT; -- JSON array of command objects
ALTER TABLE papers ADD COLUMN setup_instructions TEXT;
ALTER TABLE papers ADD COLUMN expected_output TEXT;
ALTER TABLE papers ADD COLUMN environment_config TEXT; -- JSON config for runtime

-- ============================================================================
-- EXPERIMENT EXECUTIONS TRACKING
-- ============================================================================
-- Tracks every time a user runs an experiment
CREATE TABLE IF NOT EXISTS experiment_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  paper_id TEXT NOT NULL,
  user_session_id TEXT, -- Anonymous session ID (no auth required)
  commands_executed TEXT, -- JSON array of executed commands
  time_spent_seconds INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0, -- 1 if user completed all steps
  metrics TEXT, -- JSON object with custom metrics
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_paper ON experiment_executions(paper_id);
CREATE INDEX IF NOT EXISTS idx_executions_session ON experiment_executions(user_session_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON experiment_executions(executed_at);

-- ============================================================================
-- EXPERIMENT VARIATIONS (Phase 2 - Future)
-- ============================================================================
-- Community-shared variations of experiments
CREATE TABLE IF NOT EXISTS experiment_variations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  paper_id TEXT NOT NULL,
  user_session_id TEXT NOT NULL,
  variation_name TEXT NOT NULL,
  commands TEXT NOT NULL, -- JSON array of modified commands
  description TEXT,
  shared INTEGER DEFAULT 0, -- 1 if publicly shared
  upvotes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variations_paper ON experiment_variations(paper_id);
CREATE INDEX IF NOT EXISTS idx_variations_shared ON experiment_variations(shared);
CREATE INDEX IF NOT EXISTS idx_variations_upvotes ON experiment_variations(upvotes DESC);

-- ============================================================================
-- COMMAND HISTORY (Enhanced)
-- ============================================================================
-- Already exists, but ensure it has session tracking
-- ALTER TABLE command_history ADD COLUMN session_id TEXT;
-- CREATE INDEX IF NOT EXISTS idx_command_history_session ON command_history(session_id);
```

**Migration Commands:**
```bash
# Local development
wrangler d1 execute create-something-db --local --file=./db/migrations/001_experiment_runtime.sql

# Production (after testing)
wrangler d1 execute create-something-db --remote --file=./db/migrations/001_experiment_runtime.sql
```

**Complexity:** LOW (1-2 hours)

---

## 2. TYPE DEFINITIONS UPDATE

**File:** `/src/lib/types/paper.ts`

### Updated Paper Interface

```typescript
export interface Paper {
  // ... existing fields (id, title, slug, category, etc.) ...

  // NEW: Executable experiment fields
  is_executable?: number | boolean
  terminal_commands?: string // JSON stringified array of ExperimentCommand[]
  setup_instructions?: string // What the user will learn
  expected_output?: string // What success looks like
  environment_config?: string // JSON config for runtime environment
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
```

**Complexity:** LOW (30 minutes)

---

## 3. API ENDPOINT: EXPERIMENT TRACKING

**File:** `/src/routes/api/experiments/track/+server.ts`

### Purpose
Track experiment events: start, command execution, errors, completion.

### Implementation

```typescript
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

interface TrackingRequest {
  action: 'start' | 'command' | 'complete' | 'error'
  paper_id: string
  session_id: string
  command?: string
  error_message?: string
  metrics?: any
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json() as TrackingRequest
    const { action, paper_id, session_id, command, error_message, metrics } = body

    const DB = platform?.env?.DB
    const KV_SESSIONS = platform?.env?.SESSIONS

    if (!DB || !KV_SESSIONS) {
      return json({ error: 'Database not available' }, { status: 503 })
    }

    // Get or create session metrics in KV (fast, temporary storage)
    const sessionKey = `experiment:${session_id}`
    let sessionData = await KV_SESSIONS.get(sessionKey, 'json') as any

    if (!sessionData) {
      sessionData = {
        paper_id,
        session_id,
        start_time: Date.now(),
        commands_executed: [],
        errors_count: 0,
        completed: false
      }
    }

    // Update session based on action
    switch (action) {
      case 'start':
        // Session already initialized above
        break

      case 'command':
        sessionData.commands_executed.push({
          command,
          timestamp: Date.now(),
          success: true
        })
        break

      case 'error':
        sessionData.errors_count++
        sessionData.last_error = {
          message: error_message,
          timestamp: Date.now()
        }
        // Also record the failed command
        if (command) {
          sessionData.commands_executed.push({
            command,
            timestamp: Date.now(),
            success: false,
            error: error_message
          })
        }
        break

      case 'complete':
        sessionData.completed = true
        sessionData.end_time = Date.now()

        // Save to D1 for long-term analytics
        await DB.prepare(`
          INSERT INTO experiment_executions (
            paper_id, user_session_id, commands_executed,
            time_spent_seconds, errors_encountered, completed, metrics
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          paper_id,
          session_id,
          JSON.stringify(sessionData.commands_executed),
          Math.floor((sessionData.end_time - sessionData.start_time) / 1000),
          sessionData.errors_count,
          1,
          JSON.stringify(metrics || sessionData)
        ).run()
        break
    }

    // Update KV with session data (expires in 24 hours)
    await KV_SESSIONS.put(sessionKey, JSON.stringify(sessionData), {
      expirationTtl: 86400 // 24 hours
    })

    return json({
      success: true,
      session: sessionData,
      action
    })

  } catch (error) {
    console.error('Tracking error:', error)
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3001/api/experiments/track \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "paper_id": "test-experiment",
    "session_id": "session_test_123"
  }'
```

**Complexity:** MEDIUM (2-3 hours)

---

## 4. API ENDPOINT: EXPERIMENT STATS

**File:** `/src/routes/api/experiments/[paper_id]/stats/+server.ts`

### Purpose
Get aggregate statistics for an experiment (how many times run, avg completion time, etc.)

### Implementation

```typescript
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { ExperimentStats } from '$lib/types/paper'

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { paper_id } = params
    const DB = platform?.env?.DB

    if (!DB) {
      return json({ error: 'Database not available' }, { status: 503 })
    }

    // Get aggregate stats for this experiment
    const stats = await DB.prepare(`
      SELECT
        COUNT(*) as total_executions,
        SUM(completed) as completed_count,
        AVG(time_spent_seconds) as avg_time_seconds,
        AVG(errors_encountered) as avg_errors,
        SUM(errors_encountered) as total_errors,
        MIN(time_spent_seconds) as fastest_time,
        MAX(time_spent_seconds) as slowest_time
      FROM experiment_executions
      WHERE paper_id = ?
    `).bind(paper_id).first() as ExperimentStats & { fastest_time: number; slowest_time: number }

    // Get recent executions (last 10)
    const recentExecutions = await DB.prepare(`
      SELECT
        user_session_id,
        time_spent_seconds,
        errors_encountered,
        completed,
        executed_at
      FROM experiment_executions
      WHERE paper_id = ?
      ORDER BY executed_at DESC
      LIMIT 10
    `).bind(paper_id).all()

    // Calculate completion rate
    const completionRate = stats.total_executions > 0
      ? Math.round((stats.completed_count / stats.total_executions) * 100)
      : 0

    return json({
      success: true,
      paper_id,
      stats: {
        ...stats,
        completion_rate: completionRate,
        avg_time_seconds: Math.round(stats.avg_time_seconds || 0),
        avg_errors: Math.round(stats.avg_errors || 0)
      },
      recent_executions: recentExecutions.results
    })

  } catch (error) {
    console.error('Stats error:', error)
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
```

**Test with curl:**
```bash
curl http://localhost:3001/api/experiments/test-experiment/stats
```

**Complexity:** LOW (1-2 hours)

---

## 5. COMPONENT: ExperimentRuntime.svelte

**File:** `/src/lib/components/ExperimentRuntime.svelte`

### Purpose
Main component that orchestrates the experiment runtime experience.

### Implementation

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import Terminal from './Terminal.svelte'
  import type { Paper, ExperimentCommand, ExperimentMetrics } from '$lib/types/paper'
  import { parseTerminalCommands } from '$lib/types/paper'

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

  // Computed
  let timeSpent = $derived(
    startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0
  )
  let progress = $derived(
    commands.length > 0
      ? Math.round((metrics.commands_executed.length / commands.length) * 100)
      : 0
  )

  onMount(() => {
    // Parse commands from JSON
    commands = parseTerminalCommands(paper.terminal_commands)

    // Generate anonymous session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    metrics.session_id = sessionId
  })

  async function startExperiment() {
    isTerminalOpen = true
    startTime = Date.now()
    metrics.start_time = startTime

    // Track experiment start
    await trackEvent('start')
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

  function handleCommandExecuted(command: string, result: any) {
    // Record command execution
    metrics.commands_executed.push({
      command,
      timestamp: Date.now(),
      success: !result?.error
    })

    // Track the command
    trackEvent('command', command)

    // Check if completed
    if (metrics.commands_executed.length >= commands.length) {
      metrics.completed = true
      trackEvent('complete')
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
</script>

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
            <svg class="w-7 h-7 text-terminal-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 font-medium">
            ✓ Runnable
          </div>
          <div class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 font-medium">
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
              <div class="flex-shrink-0 w-6 h-6 rounded-full bg-terminal-green/20 text-terminal-green flex items-center justify-center text-xs font-mono font-bold">
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
        class="w-full py-4 bg-terminal-green text-black font-bold rounded-lg hover:bg-terminal-green/90 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
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
    <div class="border border-terminal-green/30 rounded-lg overflow-hidden mb-8" transition:slide>
      <!-- Terminal Header -->
      <div class="bg-terminal-green/10 px-6 py-3 border-b border-terminal-green/30 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-terminal-green rounded-full animate-pulse"></div>
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

      <div class="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-terminal-green/30 transition-colors">
        <div class="text-white/40 text-xs uppercase tracking-wide mb-1">Progress</div>
        <div class="text-3xl font-bold text-terminal-green">{progress}%</div>
        <div class="text-xs text-white/50 mt-1">
          {metrics.completed ? '✓ Complete!' : `${commands.length - metrics.commands_executed.length} left`}
        </div>
      </div>
    </div>

    <!-- Completion Message -->
    {#if metrics.completed}
      <div class="border border-terminal-green/30 bg-terminal-green/10 rounded-lg p-6 mb-8" transition:fade>
        <div class="flex items-center gap-3 mb-3">
          <svg class="w-8 h-8 text-terminal-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            class="px-6 py-2 bg-terminal-green/20 border border-terminal-green/30 text-terminal-green rounded-lg hover:bg-terminal-green/30 transition-colors"
          >
            Run Again
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  :global(.text-terminal-green) {
    color: #00ff00;
  }
  :global(.bg-terminal-green) {
    background-color: #00ff00;
  }
</style>
```

**Complexity:** MEDIUM-HIGH (6-8 hours)

---

## 6. ENHANCE TERMINAL COMPONENT

**File:** `/src/lib/components/Terminal.svelte`

### Changes Needed

Add support for:
1. Pre-loaded command sequences
2. Command suggestions
3. Execution callbacks

### Code Additions

```svelte
<script lang="ts">
  // ... existing imports ...
  import type { ExperimentCommand } from '$lib/types/paper'

  interface Props {
    welcomeMessage?: string
    commands?: ExperimentCommand[] // NEW
    onCommandExecuted?: (command: string, result: any) => void // NEW
  }

  let {
    welcomeMessage = '',
    commands = [],
    onCommandExecuted
  }: Props = $props()

  // NEW: Suggested next command
  let suggestedCommand = $state('')
  let commandSequenceIndex = $state(0)

  // Update suggested command when commands are provided
  $effect(() => {
    if (commands.length > 0 && commandSequenceIndex < commands.length) {
      suggestedCommand = commands[commandSequenceIndex].command
    } else {
      suggestedCommand = ''
    }
  })

  async function handleSubmit(e: Event) {
    e.preventDefault()
    // ... existing code ...

    // NEW: Notify parent of command execution
    if (onCommandExecuted) {
      onCommandExecuted(currentInput, result)
    }

    // NEW: Advance command sequence if command matches
    const matchedCommand = commands.find(cmd =>
      cmd.command.toLowerCase() === currentInput.toLowerCase()
    )
    if (matchedCommand) {
      commandSequenceIndex++
    }

    // ... existing code ...
  }

  // NEW: Auto-complete suggested command
  function useSuggestion() {
    currentInput = suggestedCommand
    inputRef?.focus()
  }
</script>

<!-- Add suggestion UI above the terminal output -->
{#if suggestedCommand && suggestedCommand !== currentInput && commandSequenceIndex < commands.length}
  <div class="px-4 py-3 bg-terminal-green/10 border-b border-terminal-green/20 flex items-center justify-between">
    <div class="flex items-center gap-2 text-sm">
      <span class="text-white/60">Next step:</span>
      <code class="text-terminal-green font-mono text-sm">{suggestedCommand}</code>
      {#if commands[commandSequenceIndex].description}
        <span class="text-white/40 text-xs ml-2">
          // {commands[commandSequenceIndex].description}
        </span>
      {/if}
    </div>
    <button
      onclick={useSuggestion}
      class="text-xs px-3 py-1.5 bg-terminal-green/20 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors border border-terminal-green/30 font-medium"
    >
      Use this command →
    </button>
  </div>
{/if}

<!-- ... rest of existing terminal code ... -->
```

**Complexity:** MEDIUM (3-4 hours)

---

## 7. UPDATE EXPERIMENT PAGE

**File:** `/src/routes/experiments/[slug]/+page.svelte`

### Changes

Add conditional rendering of ExperimentRuntime component.

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import ArticleHeader from '$lib/components/ArticleHeader.svelte';
  import ArticleContent from '$lib/components/ArticleContent.svelte';
  import ShareButtons from '$lib/components/ShareButtons.svelte';
  import RelatedArticles from '$lib/components/RelatedArticles.svelte';
  // NEW IMPORT
  import ExperimentRuntime from '$lib/components/ExperimentRuntime.svelte';
  import { isExecutable } from '$lib/types/paper';

  export let data: PageData;
  const { paper, relatedPapers } = data;

  // Check if this experiment is executable
  const canRun = isExecutable(paper)

  const fullUrl = `https://createsomething.space/experiments/${paper.slug}`;
</script>

<svelte:head>
  <title>{paper.title} | CREATE SOMETHING SPACE</title>
  <!-- ... existing meta tags ... -->
</svelte:head>

<div class="min-h-screen bg-black">
  <!-- Article Header -->
  <ArticleHeader {paper} />

  <!-- NEW: Experiment Runtime (only if executable) -->
  {#if canRun}
    <div class="w-full max-w-5xl mx-auto px-6 mb-12">
      <ExperimentRuntime {paper} />
    </div>
  {/if}

  <!-- Main Content with Sidebar -->
  <div class="w-full max-w-7xl mx-auto px-6">
    <div class="grid grid-cols-1 lg:grid-cols-[80px_1fr] gap-12">
      <!-- Sidebar - Share Buttons (left, sticky) -->
      <aside class="hidden lg:block">
        <ShareButtons title={paper.title} url={fullUrl} />
      </aside>

      <!-- Article Content -->
      <div class="min-w-0">
        <ArticleContent {paper} />
      </div>
    </div>
  </div>

  <!-- Related Articles -->
  <RelatedArticles papers={relatedPapers} currentPaperId={paper.id} />

  <!-- Back to Experiments -->
  <div class="w-full max-w-5xl mx-auto px-6 py-12">
    <a
      href="/experiments"
      class="inline-flex items-center gap-2 text-terminal-green hover:text-white transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to all experiments
    </a>
  </div>
</div>
```

**Complexity:** LOW (1 hour)

---

## 8. UPDATE PAPER CARD

**File:** `/src/lib/components/PaperCard.svelte`

### Changes

Add "Runnable" badge for executable experiments.

Find the section where badges are displayed (near category/difficulty) and add:

```svelte
<!-- Add this near other badges -->
{#if paper.is_executable}
  <div class="flex items-center gap-1.5 px-2 py-1 bg-terminal-green/20 text-terminal-green rounded text-xs font-medium border border-terminal-green/30">
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Runnable
  </div>
{/if}
```

**Complexity:** LOW (30 minutes)

---

## 9. EXAMPLE EXECUTABLE EXPERIMENT

**File:** `/src/lib/data/examples/cloudflare-kv-experiment.json`

### Example Experiment Data

```json
{
  "id": "cloudflare-kv-quick-start",
  "title": "Cloudflare Workers KV Quick Start",
  "slug": "cloudflare-kv-quick-start",
  "category": "infrastructure",
  "description": "Learn how to interact with Cloudflare Workers KV storage through interactive commands. Practice reading, writing, and listing keys in a safe sandbox environment.",
  "is_executable": 1,
  "setup_instructions": "This experiment teaches you the fundamentals of Cloudflare Workers KV (Key-Value) storage. You'll learn how to write data, read it back, list keys, and clean up. All commands run in a sandboxed environment.",
  "terminal_commands": "[
    {
      \"id\": \"cmd-1\",
      \"command\": \"kv list\",
      \"description\": \"List all KV namespaces available in this Worker\",
      \"expected_output\": \"SESSIONS, CACHE\",
      \"order\": 1
    },
    {
      \"id\": \"cmd-2\",
      \"command\": \"kv write CACHE test-key 'Hello from CREATE SOMETHING SPACE!'\",
      \"description\": \"Write a test value to the CACHE namespace\",
      \"expected_output\": \"✓ Key 'test-key' written successfully to CACHE\",
      \"order\": 2
    },
    {
      \"id\": \"cmd-3\",
      \"command\": \"kv read CACHE test-key\",
      \"description\": \"Read the value back from CACHE\",
      \"expected_output\": \"Hello from CREATE SOMETHING SPACE!\",
      \"order\": 3
    },
    {
      \"id\": \"cmd-4\",
      \"command\": \"kv write CACHE json-example '{\\\"name\\\": \\\"test\\\", \\\"value\\\": 42}'\",
      \"description\": \"Store JSON data in KV\",
      \"expected_output\": \"✓ Key 'json-example' written successfully\",
      \"order\": 4
    },
    {
      \"id\": \"cmd-5\",
      \"command\": \"kv read CACHE json-example --json\",
      \"description\": \"Read JSON data back (parsed)\",
      \"expected_output\": \"{name: 'test', value: 42}\",
      \"order\": 5
    },
    {
      \"id\": \"cmd-6\",
      \"command\": \"kv delete CACHE test-key\",
      \"description\": \"Clean up by deleting the test key\",
      \"expected_output\": \"✓ Key 'test-key' deleted from CACHE\",
      \"order\": 6,
      \"is_optional\": true
    }
  ]",
  "expected_output": "You should see successful KV operations without errors. The final cleanup step is optional but recommended.",
  "environment_config": "{\"kv_namespaces\": [\"SESSIONS\", \"CACHE\"]}",
  "reading_time": 10,
  "difficulty_level": "beginner",
  "published": 1,
  "featured": 1
}
```

### How to Add to Database

```bash
# Use wrangler d1 to insert
wrangler d1 execute create-something-db --local --command="
INSERT INTO papers (
  id, title, slug, category, description, is_executable,
  setup_instructions, terminal_commands, expected_output,
  environment_config, reading_time, difficulty_level, published, featured
) VALUES (
  'cloudflare-kv-quick-start',
  'Cloudflare Workers KV Quick Start',
  'cloudflare-kv-quick-start',
  'infrastructure',
  'Learn Cloudflare Workers KV storage interactively',
  1,
  'This experiment teaches you KV fundamentals...',
  '[{...commands...}]',
  'Successful KV operations',
  '{\"kv_namespaces\": [\"SESSIONS\", \"CACHE\"]}',
  10,
  'beginner',
  1,
  1
)"
```

**Complexity:** LOW (3 hours per experiment to create and test)

---

## COMPONENT ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│  /experiments/[slug] Route (Page)                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ArticleHeader.svelte                               │   │
│  │  - Title, category, metadata, badges                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ExperimentRuntime.svelte (NEW) ★                   │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │  Before Launch: Overview UI                   │ │   │
│  │  │  - Setup instructions                          │ │   │
│  │  │  - Command preview (first 3)                   │ │   │
│  │  │  - "Launch Terminal" button                    │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                  ↓ (on click)                        │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │  After Launch: Runtime UI                     │ │   │
│  │  │  ┌─────────────────────────────────────────┐ │ │   │
│  │  │  │  Terminal.svelte (Enhanced)             │ │ │   │
│  │  │  │  - Command input/output                 │ │ │   │
│  │  │  │  - Command suggestions                  │ │ │   │
│  │  │  │  - Step tracking                        │ │ │   │
│  │  │  └─────────────────────────────────────────┘ │ │   │
│  │  │  ┌─────────────────────────────────────────┐ │ │   │
│  │  │  │  Metrics Dashboard                      │ │ │   │
│  │  │  │  - Commands run (X/Y)                   │ │ │   │
│  │  │  │  - Time spent (Xs)                      │ │ │   │
│  │  │  │  - Progress (X%)                        │ │ │   │
│  │  │  └─────────────────────────────────────────┘ │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │ API Calls                             │
│                     ↓                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ArticleContent.svelte                              │   │
│  │  - Markdown/HTML content                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ HTTP POST/GET
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  API Layer (SvelteKit Server Routes)                        │
│                                                               │
│  POST /api/experiments/track                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Actions: start, command, error, complete           │   │
│  │  - Update KV (session state, 24hr TTL)             │   │
│  │  - Write to D1 on completion (long-term)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  GET /api/experiments/[id]/stats                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Return aggregate stats from D1                     │   │
│  │  - Total runs, completion rate, avg time            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Data Layer (Cloudflare Platform)                           │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  D1 Database │  │  KV Store    │  │  R2 Storage  │     │
│  │              │  │              │  │  (Phase 2)   │     │
│  │  - papers    │  │  - sessions  │  │  - snapshots │     │
│  │  - executions│  │  - metrics   │  │  - results   │     │
│  │  - variations│  │  (24hr TTL)  │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION ORDER

### Sprint 1: Foundation (Week 1)

**Day 1-2: Database & Types (8 hours)**
1. ✅ Create database migration file
2. ✅ Run migration locally with wrangler
3. ✅ Update Paper type with experiment fields
4. ✅ Add helper functions (parseTerminalCommands, isExecutable)
5. ✅ Test with sample data

**Day 3: API Endpoints (5 hours)**
6. ✅ Create tracking endpoint (/api/experiments/track)
7. ✅ Test with curl/Postman
8. ✅ Create stats endpoint (/api/experiments/[id]/stats)
9. ✅ Verify KV and D1 writes

### Sprint 2: UI Components (Week 1-2)

**Day 4-5: Terminal Enhancement (4 hours)**
10. ✅ Add command sequence support to Terminal.svelte
11. ✅ Add suggestion UI
12. ✅ Add callback props
13. ✅ Test with mock data

**Day 6-7: ExperimentRuntime Component (8 hours)**
14. ✅ Create component structure
15. ✅ Build "before launch" UI
16. ✅ Build "after launch" UI with metrics
17. ✅ Integrate Terminal component
18. ✅ Add session tracking
19. ✅ Style and polish

**Day 8: Page Integration (2 hours)**
20. ✅ Update experiment detail page
21. ✅ Add conditional rendering
22. ✅ Test both executable and static experiments

### Sprint 3: Polish & Deploy (Week 2)

**Day 9: UI Updates (2 hours)**
23. ✅ Add "Runnable" badge to PaperCard
24. ✅ Update hover states
25. ✅ Test responsive design

**Day 10-11: Content Creation (6 hours)**
26. ✅ Create 2 executable experiments
27. ✅ Write terminal_commands JSON
28. ✅ Test end-to-end flow
29. ✅ Add to database

**Day 12: Testing & Deployment (4 hours)**
30. ✅ Cross-browser testing
31. ✅ Performance optimization
32. ✅ Bug fixes
33. ✅ Deploy to production
34. ✅ Monitor metrics

---

## FILE CHECKLIST

### New Files
- [ ] `/db/migrations/001_experiment_runtime.sql` (database schema)
- [ ] `/src/routes/api/experiments/track/+server.ts` (tracking API)
- [ ] `/src/routes/api/experiments/[paper_id]/stats/+server.ts` (stats API)
- [ ] `/src/lib/components/ExperimentRuntime.svelte` (main component)
- [ ] `/src/lib/data/examples/cloudflare-kv-experiment.json` (example data)

### Modified Files
- [ ] `/src/lib/types/paper.ts` (add experiment types)
- [ ] `/src/lib/components/Terminal.svelte` (add sequence support)
- [ ] `/src/lib/components/PaperCard.svelte` (add runnable badge)
- [ ] `/src/routes/experiments/[slug]/+page.svelte` (add runtime)

### Configuration
- [ ] No changes to `wrangler.jsonc` (D1/KV already configured)
- [ ] No changes to `svelte.config.js`
- [ ] No new dependencies needed

---

## TESTING CHECKLIST

### Unit Tests
- [ ] parseTerminalCommands() parses JSON correctly
- [ ] isExecutable() returns true/false correctly
- [ ] Session ID generation is unique

### Integration Tests
- [ ] Track API: start event creates KV entry
- [ ] Track API: command event updates session
- [ ] Track API: complete event writes to D1
- [ ] Stats API: returns correct aggregates
- [ ] Terminal suggestions advance on command match

### E2E Tests
- [ ] User can view runnable experiment
- [ ] User can launch terminal
- [ ] User can execute commands
- [ ] Metrics update in real-time
- [ ] Completion triggers correctly
- [ ] Stats display on experiment page

### Performance Tests
- [ ] Page load time < 2s
- [ ] API response time < 100ms
- [ ] Terminal input lag < 50ms
- [ ] Metrics update smoothly

---

## DEPLOYMENT STRATEGY

### Development
```bash
# 1. Install dependencies (if new)
cd create-something-space-svelte
npm install

# 2. Run database migration
wrangler d1 execute create-something-db --local --file=./db/migrations/001_experiment_runtime.sql

# 3. Start dev server
npm run dev

# 4. Test at http://localhost:3001
```

### Staging
```bash
# 1. Create feature branch
git checkout -b feature/interactive-experiments

# 2. Commit changes
git add .
git commit -m "feat: add interactive experiment runtime"

# 3. Deploy to preview
npm run build
wrangler deploy --env preview

# 4. Test preview URL
```

### Production
```bash
# 1. Run migration on production D1
wrangler d1 execute create-something-db --remote --file=./db/migrations/001_experiment_runtime.sql

# 2. Deploy to production
npm run deploy

# 3. Monitor logs
wrangler tail create-something-space

# 4. Check analytics
# Visit Cloudflare dashboard
```

### Rollback Plan
```bash
# If issues arise:
# 1. Revert deployment
wrangler rollback create-something-space

# 2. Database rollback (if needed)
# Migrations are additive, so safe to keep
# If must revert:
# ALTER TABLE papers DROP COLUMN is_executable;
# DROP TABLE experiment_executions;
# DROP TABLE experiment_variations;
```

---

## SUCCESS METRICS

### Week 1 (Post-Launch)
- [ ] 100+ experiment views
- [ ] 20+ terminal launches (20% conversion)
- [ ] 10+ completions (50% completion rate)
- [ ] < 2s page load time
- [ ] 0 critical errors

### Month 1
- [ ] 30% of visitors try a runnable experiment
- [ ] 60% completion rate for started experiments
- [ ] 2x time-on-page vs static experiments
- [ ] 20% newsletter signups from experiment completers
- [ ] 5+ community variations shared (Phase 2)

### Technical Metrics (Ongoing)
- [ ] API uptime > 99%
- [ ] API response time < 100ms (p95)
- [ ] Zero data loss (all completions tracked)
- [ ] KV hit rate > 80%
- [ ] D1 query time < 50ms

---

## PHASE 2: COMMUNITY VARIATIONS (Future)

**Not included in current implementation**

### Features
1. **"Share My Attempt" button** after completion
2. **Variation gallery** on experiment pages
3. **Upvoting system** for best variations
4. **Fork & remix** one-click to run someone's variation
5. **Leaderboards** (fastest time, most creative, etc.)

### Components Needed
- `VariationGallery.svelte`
- `ShareVariationModal.svelte`
- `VariationCard.svelte`
- `Leaderboard.svelte`

### API Endpoints
- POST `/api/experiments/variations`
- GET `/api/experiments/[id]/variations`
- POST `/api/experiments/variations/[id]/upvote`
- GET `/api/leaderboards/[paper_id]`

### Database Schema
Already created in Phase 1 (`experiment_variations` table)

### Estimated Time
16-20 additional hours

---

## RISK MITIGATION

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Terminal command execution security | High | Medium | Whitelist commands, no server-side execution |
| D1 query performance degradation | Medium | Low | KV caching, indexed queries, pagination |
| KV storage limits reached | Medium | Low | 24hr TTL, cleanup old sessions |
| Browser compatibility issues | Low | Medium | Progressive enhancement, feature detection |
| Mobile terminal UX poor | Medium | High | Simplified mobile UI, pre-filled commands |

### Content Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Not enough executable experiments | High | High | Start with 2-3, add weekly |
| Commands don't work as expected | Medium | Medium | Thorough testing, clear error messages |
| Users confused by terminal | Medium | Medium | Step-by-step guidance, tooltips |
| Low completion rates | Medium | Medium | Shorter experiments, better UX |

### Mitigation Actions

1. **Command Whitelisting**: Only allow pre-defined safe commands
2. **Progressive Enhancement**: Static content works if JS fails
3. **Clear Error Handling**: Helpful error messages guide users
4. **Analytics Tracking**: Monitor where users drop off
5. **User Feedback Loop**: Collect feedback on experiment difficulty

---

## QUESTIONS & DECISIONS

### Resolved
- ✅ Use KV for real-time session data (fast, temporary)
- ✅ Use D1 for long-term analytics (queryable, persistent)
- ✅ No authentication required (anonymous session IDs)
- ✅ Terminal commands are pre-defined (not arbitrary execution)

### Open Questions
- ⏸️ Should experiments be sandboxed per user or shared environment?
  - **Decision**: Shared for Phase 1, sandboxed in Phase 2
- ⏸️ Should we track partial completions?
  - **Decision**: Yes, track every command execution
- ⏸️ What happens if user refreshes during experiment?
  - **Decision**: Session lost for MVP, add persistence in Phase 2

---

## SUPPORT & MAINTENANCE

### Documentation Needed
- [ ] User guide: "How to Run an Experiment"
- [ ] Developer guide: "Creating Executable Experiments"
- [ ] API documentation for stats endpoints
- [ ] Troubleshooting guide

### Monitoring
- Cloudflare Analytics for API usage
- Wrangler tail for real-time logs
- D1 queries for completion rates
- User feedback form

### Maintenance Schedule
- **Weekly**: Review stats, identify issues
- **Bi-weekly**: Add new executable experiments
- **Monthly**: Performance optimization
- **Quarterly**: Major feature updates (Phase 2)

---

## CONCLUSION

This implementation plan provides a complete blueprint for transforming CREATE SOMETHING SPACE into an interactive experiment runtime. The approach:

- ✅ **Reuses existing infrastructure** (Terminal, D1, KV)
- ✅ **Minimizes breaking changes** (additive schema, backward compatible)
- ✅ **Delivers incrementally** (quick wins, phased rollout)
- ✅ **Focuses on UX** (clear guidance, instant feedback, real-time metrics)
- ✅ **Enables community** (foundation for Phase 2 variations)

**Total Implementation Time**: 24-28 hours core + 3 hours per experiment

**Next Steps**: Begin with Sprint 1 (Database & Types), then build up through Sprints 2-3.

---

**Last Updated**: 2025-11-16
**Plan Version**: 1.0
**Status**: ✅ Approved - Ready for Implementation
