// Agentic Session - Durable Object with Extended Thinking + Budget Enforcement
// Implements session management with hooks for security and cost control

import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages';
import {
  BudgetEnforcementHook,
  CompletionValidationHook,
  SystemPromptProtectionHook
} from './hooks';
import type {
  AgenticTask,
  SessionContext,
  SessionState,
  SessionStatus,
  Message,
  ToolResultContent,
  BudgetStatus,
  Env,
  BeadsIssue
} from './types';

export class AgenticSession {
  private state: DurableObjectState;
  private env: Env;
  private anthropic: Anthropic;

  // Session state (persisted)
  private conversationHistory: Message[] = [];
  private context: SessionContext;
  private lastCheckpoint: number = 0;

  // Hooks
  private budgetHook: BudgetEnforcementHook;
  private completionHook: CompletionValidationHook;
  private promptProtection: SystemPromptProtectionHook;

  // Cost tracking (Sonnet 4.5 pricing)
  private readonly INPUT_COST = 0.003 / 1000;   // $3 per MTok
  private readonly OUTPUT_COST = 0.015 / 1000;  // $15 per MTok

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Log API key status (first 10 chars only for security)
    const hasApiKey = !!env.ANTHROPIC_API_KEY;
    const apiKeyPreview = env.ANTHROPIC_API_KEY?.substring(0, 10) || 'undefined';
    console.log('Durable Object constructor', { hasApiKey, apiKeyPreview });

    this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    // Initialize hooks
    this.budgetHook = new BudgetEnforcementHook();
    this.completionHook = new CompletionValidationHook();
    this.promptProtection = new SystemPromptProtectionHook();

    // Set up alarm for background checkpoint
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<SessionState>('session');
      if (stored) {
        this.conversationHistory = stored.conversationHistory;
        this.context = stored.context;
        this.lastCheckpoint = stored.lastCheckpoint;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Log all headers for debugging
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value.substring(0, 20);  // Truncate for security
    });
    console.log('Durable Object fetch request', { pathname: url.pathname, headers });

    // Extract API key from header (secrets aren't inherited by Durable Objects)
    const apiKey = request.headers.get('X-Api-Key');
    if (apiKey) {
      // Reinitialize Anthropic client with the provided API key
      this.anthropic = new Anthropic({ apiKey });
      console.log('Reinitialized Anthropic client with provided API key', {
        hasKey: true,
        keyPreview: apiKey.substring(0, 10)
      });
    } else {
      console.log('No API key in request header', { allHeaders: Object.keys(headers) });
    }

    switch (url.pathname) {
      case '/start':
        return await this.start(await request.json());

      case '/pause':
        return await this.pause();

      case '/resume':
        return await this.resume();

      case '/status':
        return this.status();

      default:
        return new Response('Not found', { status: 404 });
    }
  }

  // ============================================================================
  // Session Lifecycle
  // ============================================================================

  async start(task: AgenticTask): Promise<Response> {
    // Validate budget upfront
    if (task.budget <= 0 || task.budget > 100) {
      return Response.json(
        { error: 'Budget must be between $0.01 and $100' },
        { status: 400 }
      );
    }

    // Check if resuming existing session
    const stored = await this.state.storage.get<SessionState>('session');

    if (stored) {
      // Resuming
      this.conversationHistory = stored.conversationHistory;
      this.context = stored.context;

      // Check if budget was already exhausted
      if (this.context.status === 'budget_exhausted') {
        return Response.json({
          error: 'Session budget exhausted',
          budget: this.getBudgetStatus()
        }, { status: 402 });  // 402 Payment Required
      }
    } else {
      // New session - load Beads issue
      const issue = await this.loadBeadsIssue(task.issueId);

      // Initialize context
      this.context = {
        issueId: task.issueId,
        epicId: task.epicId,
        convoyId: task.convoyId,
        budget: task.budget,
        costConsumed: 0,
        iteration: 0,
        iterationCosts: [],
        filesModified: [],
        status: 'running',
        budgetWarned: false,
        acceptanceCriteria: task.acceptanceCriteria || issue.acceptance
      };

      // Initial system message
      this.conversationHistory.push({
        role: 'user',
        content: this.buildInitialPrompt(issue, task)
      });
    }

    // Track session start in DB
    await this.trackSessionStart();

    // Schedule execution loop via alarm (fires immediately)
    // This is the correct pattern for Durable Objects - alarms trigger background work
    await this.state.storage.setAlarm(Date.now() + 100);  // Fire in 100ms

    console.log('✅ Scheduled executeLoop via alarm');

    return Response.json({
      status: 'started',
      sessionId: this.state.id.toString(),
      budget: this.getBudgetStatus()
    });
  }

  // Durable Object alarm handler - triggered for background execution
  async alarm(): Promise<void> {
    console.log('🔔 Alarm fired - starting executeLoop');
    await this.executeLoop();
  }

  async executeLoop(): Promise<void> {
    console.log('🚀 executeLoop STARTED', {
      issueId: this.context.issueId,
      iteration: this.context.iteration,
      status: this.context.status,
      budget: this.context.budget,
      costConsumed: this.context.costConsumed
    });

    try {
      const maxIterations = 50;

      console.log('Entering while loop', {
        status: this.context.status,
        iteration: this.context.iteration,
        maxIterations
      });

      while (this.context.status === 'running' && this.context.iteration < maxIterations) {
        console.log('Loop iteration starting', {
          iteration: this.context.iteration,
          status: this.context.status
        });

        try {
        // HOOK: Budget enforcement (before iteration)
        const budgetCheck = await this.budgetHook.beforeIteration(this.context);
        if (!budgetCheck.approved) {
          this.context.status = 'budget_exhausted';
          this.context.terminationReason = budgetCheck.reason;
          await this.handleTermination();
          break;
        }

        // HOOK: Budget warning injection (if needed)
        if (this.budgetHook.shouldWarnBudget(this.context)) {
          await this.injectBudgetWarning();
          this.context.budgetWarned = true;
        }

        // Execute iteration
        const response = await this.iterate();

        // HOOK: Budget enforcement (after iteration)
        const lastCost = this.context.iterationCosts[this.context.iterationCosts.length - 1];
        const postBudgetCheck = await this.budgetHook.afterIteration(this.context, lastCost);

        if (!postBudgetCheck.approved) {
          this.context.status = 'budget_exhausted';
          this.context.terminationReason = postBudgetCheck.reason;
          await this.handleTermination();
          break;
        }

        // Agent claims completion?
        if (this.agentClaimedCompletion(response)) {
          // HOOK: Validate completion claim (don't trust it)
          const completionCheck = await this.completionHook.validate(this.context, this.env);

          if (completionCheck.approved) {
            // Actually complete
            this.context.status = 'complete';
            break;
          } else {
            // Completion claim rejected - tell agent to continue
            await this.injectCompletionRejection(completionCheck);
            // Loop continues...
          }
        }

        // Checkpoint every 5 iterations
        if (this.context.iteration - this.lastCheckpoint >= 5) {
          await this.createCheckpoint();
        }

      } catch (err: any) {
        // Serialize error completely (might not have .message property)
        const errorDetails = {
          message: err?.message || String(err),
          type: err?.constructor?.name || typeof err,
          status: err?.status,
          error: err?.error,
          ...err  // Capture any additional properties
        };

        console.error('Iteration failed', {
          issueId: this.context.issueId,
          iteration: this.context.iteration,
          errorDetails
        });

        this.context.status = 'error';
        this.context.error = errorDetails.message || JSON.stringify(errorDetails);
        await this.saveSessionState();
        break;
      }
    }

      // Finalize if completed normally
      if (this.context.status === 'complete') {
        await this.finalize();
      }

      console.log('executeLoop COMPLETED normally', {
        finalIteration: this.context.iteration,
        finalStatus: this.context.status,
        totalCost: this.context.costConsumed
      });

      // Save final state
      await this.saveSessionState();

    } catch (err: any) {
      console.error('❌ executeLoop FATAL ERROR (outer catch)', {
        error: err?.message || String(err),
        stack: err?.stack,
        issueId: this.context.issueId,
        iteration: this.context.iteration,
        status: this.context.status
      });

      // Try to save error state
      try {
        this.context.status = 'error';
        this.context.error = err?.message || String(err);
        await this.saveSessionState();
      } catch (saveErr: any) {
        console.error('Failed to save error state', {
          saveError: saveErr?.message || String(saveErr)
        });
      }

      throw err;
    }
  }

  async iterate(): Promise<any> {
    this.context.iteration++;

    // Build system prompt with budget info
    const budget = this.getBudgetStatus();
    const systemPrompt = this.buildSystemPrompt(budget);

    // Make API call with full conversation history + Extended Thinking
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,  // Must be > thinking.budget_tokens (10000)
      thinking: {
        type: 'enabled',
        budget_tokens: 10000  // Extended thinking for better reasoning
      },
      system: systemPrompt,
      messages: this.conversationHistory as any,
      tools: this.buildTools(),
      tool_choice: { type: 'auto' }
    } as MessageCreateParamsNonStreaming);

    // Calculate actual cost
    const actualCost = this.calculateCost(response.usage!);
    this.context.costConsumed += actualCost;
    this.context.iterationCosts.push(actualCost);

    // Track cost in DB immediately (real-time visibility)
    await this.trackIterationCost(actualCost, response.usage!);

    // Double-check we didn't exceed budget (safety check)
    if (this.context.costConsumed > this.context.budget) {
      console.error('⚠️  BUDGET OVERAGE DETECTED', {
        issueId: this.context.issueId,
        budget: this.context.budget,
        consumed: this.context.costConsumed,
        overage: this.context.costConsumed - this.context.budget
      });

      this.context.status = 'budget_exhausted';
      await this.handleTermination();

      return response;
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    // Execute tool calls
    const toolResults: ToolResultContent[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await this.executeToolCall(block);

        // HOOK: Sanitize tool result (prevent prompt leakage)
        const sanitized = this.promptProtection.sanitizeToolResult(block.name, result);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(sanitized)
        });
      }
    }

    // Add tool results to history (if any)
    if (toolResults.length > 0) {
      this.conversationHistory.push({
        role: 'user',
        content: toolResults as any
      });
    }

    // Persist session state
    await this.saveSessionState();

    return response;
  }

  async pause(): Promise<Response> {
    this.context.status = 'paused';
    await this.createCheckpoint();
    await this.saveSessionState();

    return Response.json({ status: 'paused' });
  }

  async resume(): Promise<Response> {
    this.context.status = 'running';
    await this.saveSessionState();

    // Resume execution loop via alarm
    await this.state.storage.setAlarm(Date.now() + 100);
    console.log('✅ Scheduled resume via alarm');

    return Response.json({ status: 'resumed' });
  }

  status(): Response {
    return Response.json({
      sessionId: this.state.id.toString(),
      iteration: this.context.iteration,
      costConsumed: this.context.costConsumed,
      budget: this.context.budget,
      status: this.context.status,
      filesModified: this.context.filesModified.length,
      conversationLength: this.conversationHistory.length,
      budgetStatus: this.getBudgetStatus()
    });
  }

  // ============================================================================
  // Budget Management
  // ============================================================================

  private getBudgetStatus(): BudgetStatus {
    const percentUsed = this.context.costConsumed / this.context.budget;
    const remaining = this.context.budget - this.context.costConsumed;

    return {
      allocated: this.context.budget,
      consumed: this.context.costConsumed,
      remaining,
      percentUsed,
      atWarningThreshold: percentUsed >= 0.80,
      atHardStop: percentUsed >= 1.00,
      estimatedIterationsRemaining: this.estimateRemainingIterations()
    };
  }

  private estimateRemainingIterations(): number {
    if (this.context.iteration === 0) {
      return Math.floor(this.context.budget / 0.10);  // Conservative: $0.10/iteration
    }

    const avgCost = this.context.costConsumed / this.context.iteration;
    const remaining = this.context.budget - this.context.costConsumed;

    return Math.floor(remaining / avgCost);
  }

  private calculateCost(usage: { input_tokens: number; output_tokens: number }): number {
    return (usage.input_tokens * this.INPUT_COST) + (usage.output_tokens * this.OUTPUT_COST);
  }

  private async injectBudgetWarning(): Promise<void> {
    const budget = this.getBudgetStatus();

    const warningMessage: Message = {
      role: 'user',
      content: `⚠️  BUDGET WARNING

You have consumed ${(budget.percentUsed * 100).toFixed(1)}% of your allocated budget.

Budget Status:
- Allocated: $${budget.allocated.toFixed(2)}
- Consumed: $${budget.consumed.toFixed(4)}
- Remaining: $${budget.remaining.toFixed(4)}
- Estimated iterations remaining: ~${budget.estimatedIterationsRemaining}

CRITICAL: You are approaching the hard budget limit. The session will automatically stop at 100% consumption (no overages allowed).

Please:
1. Focus on completing essential work only
2. Avoid exploratory or optional tasks
3. Prepare to wrap up within ${budget.estimatedIterationsRemaining} iterations
4. Output <completion>DONE</completion> when core requirements are met`
    };

    this.conversationHistory.push(warningMessage);

    // Log to DB
    await this.logEvent('budget_warning', budget);
  }

  // ============================================================================
  // Completion Handling
  // ============================================================================

  private agentClaimedCompletion(response: any): boolean {
    // Only check TEXT blocks (not tool results, not file contents)
    const textBlocks = response.content.filter((c: any) => c.type === 'text');

    for (const block of textBlocks) {
      if (block.text.includes('<completion>DONE</completion>')) {
        return true;
      }
    }

    return false;
  }

  private async injectCompletionRejection(check: { approved: boolean; reason?: string; requiredActions?: string[] }): Promise<void> {
    const rejectionMessage: Message = {
      role: 'user',
      content: `❌ COMPLETION REJECTED

Your completion claim was rejected by system validation.

Reason: ${check.reason}

Required actions before completion:
${check.requiredActions?.map(a => `- ${a}`).join('\n') || '- Fix the issues above'}

Continue working. Do not output <completion>DONE</completion> until all requirements are actually met and validated.`
    };

    this.conversationHistory.push(rejectionMessage);

    // Log event
    await this.logEvent('completion_rejected', check);
  }

  // ============================================================================
  // Prompts
  // ============================================================================

  private buildInitialPrompt(issue: BeadsIssue, task: AgenticTask): string {
    return `You are executing a Beads issue autonomously in a production environment.

## Issue
ID: ${issue.id}
Title: ${issue.title}

${issue.description}

## Budget
Allocated: $${task.budget.toFixed(2)}
This is a HARD LIMIT. The session will stop at 100% consumption.

## Quality Requirements
After implementation, these gates will run automatically:
- Canon compliance (strict - use Canon design tokens)
- Accessibility (WCAG AA minimum)
- Performance (Lighthouse >= 90)
- Security (no vulnerabilities)

You MUST fix any gate failures before completion.

${task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? `## Acceptance Criteria\n${task.acceptanceCriteria.map(c => `- ${c}`).join('\n')}` : ''}

## Tools Available
- read_file, write_file, edit_file: File operations
- run_command: Execute shell commands (build, test, lint)
- deploy_preview: Create preview deployment

## Completion
Output <completion>DONE</completion> when:
- All acceptance criteria met
- Quality gates passed
- Preview deployment functional

Begin work.`;
  }

  private buildSystemPrompt(budget: BudgetStatus): string {
    const budgetWarning = budget.atWarningThreshold
      ? `\n⚠️  BUDGET WARNING: ${(budget.percentUsed * 100).toFixed(1)}% consumed. ${budget.estimatedIterationsRemaining} iterations remaining.\n`
      : '';

    return `You are executing a Beads issue autonomously.

## Current Status
Iteration: ${this.context.iteration + 1}/50
Budget: $${budget.consumed.toFixed(4)} / $${budget.allocated.toFixed(2)} (${(budget.percentUsed * 100).toFixed(1)}%)
Remaining: $${budget.remaining.toFixed(4)}
${budgetWarning}
## Important
- Budget enforcement is CODE-LEVEL (cannot be bypassed)
- Quality gates will actually run (your claims will be validated)
- Completion requires passing all gates + deployment health check

${budget.atWarningThreshold ? '⚠️  CRITICAL: Budget running low. Focus on essential work only.' : ''}

Continue work.`;
  }

  // ============================================================================
  // Tools (Placeholder - implement actual tools)
  // ============================================================================

  private buildTools(): any[] {
    return [
      {
        name: 'read_file',
        description: 'Read contents of a file',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'edit_file',
        description: 'Edit file using search/replace',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            old_string: { type: 'string' },
            new_string: { type: 'string' }
          },
          required: ['path', 'old_string', 'new_string']
        }
      },
      {
        name: 'run_command',
        description: 'Execute shell command',
        input_schema: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            cwd: { type: 'string' }
          },
          required: ['command']
        }
      },
      {
        name: 'deploy_preview',
        description: 'Deploy preview to staging',
        input_schema: {
          type: 'object',
          properties: {
            buildDir: { type: 'string' }
          },
          required: ['buildDir']
        }
      }
    ];
  }

  private async executeToolCall(toolUse: any): Promise<any> {
    const { name, input } = toolUse;

    switch (name) {
      case 'write_file':
      case 'edit_file':
        if (!this.context.filesModified.includes(input.path)) {
          this.context.filesModified.push(input.path);
        }
        return { success: true, path: input.path };

      case 'deploy_preview':
        const previewUrl = await this.deployPreview(input.buildDir);
        this.context.previewUrl = previewUrl;
        return { success: true, url: previewUrl };

      default:
        return { success: true };
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private async saveSessionState(): Promise<void> {
    await this.state.storage.put<SessionState>('session', {
      conversationHistory: this.conversationHistory,
      context: this.context,
      lastCheckpoint: this.lastCheckpoint
    });
  }

  private async createCheckpoint(): Promise<void> {
    const checkpoint = {
      iteration: this.context.iteration,
      costConsumed: this.context.costConsumed,
      filesModified: this.context.filesModified,
      conversationHistory: this.conversationHistory,
      timestamp: Date.now()
    };

    // Save to D1
    await this.env.DB.prepare(`
      INSERT INTO agentic_checkpoints (
        session_id, iteration, cost_consumed, files_modified,
        conversation_length, checkpoint_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.state.id.toString(),
      this.context.iteration,
      this.context.costConsumed,
      JSON.stringify(this.context.filesModified),
      this.conversationHistory.length,
      JSON.stringify(checkpoint),
      Date.now()
    ).run();

    this.lastCheckpoint = this.context.iteration;

    await this.logEvent('checkpoint_created', { iteration: this.context.iteration });
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  private async trackSessionStart(): Promise<void> {
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO agentic_sessions (
        id, issue_id, epic_id, convoy_id, budget, cost_consumed, iteration, status, started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).bind(
      this.state.id.toString(),
      this.context.issueId,
      this.context.epicId,
      this.context.convoyId || null,
      this.context.budget,
      'running',
      Date.now(),
      Date.now()
    ).run();

    await this.logEvent('session_started', { budget: this.context.budget });
  }

  private async trackIterationCost(cost: number, usage: { input_tokens: number; output_tokens: number }): Promise<void> {
    // Update session
    await this.env.DB.prepare(`
      UPDATE agentic_sessions
      SET cost_consumed = ?, iteration = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      this.context.costConsumed,
      this.context.iteration,
      Date.now(),
      this.state.id.toString()
    ).run();

    // Log iteration
    await this.env.DB.prepare(`
      INSERT INTO agentic_iterations (
        session_id, iteration, cost, input_tokens, output_tokens,
        files_modified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.state.id.toString(),
      this.context.iteration,
      cost,
      usage.input_tokens,
      usage.output_tokens,
      this.context.filesModified.length,
      Date.now()
    ).run();
  }

  private async logEvent(eventType: string, eventData: any): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO agentic_events (session_id, issue_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      this.state.id.toString(),
      this.context.issueId,
      eventType,
      JSON.stringify(eventData),
      Date.now()
    ).run();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private async loadBeadsIssue(issueId: string): Promise<BeadsIssue> {
    // TODO: Integrate with actual Beads
    return {
      id: issueId,
      title: 'Placeholder',
      description: 'Placeholder description',
      labels: [],
      status: 'open'
    };
  }

  private async deployPreview(buildDir: string): Promise<string> {
    // TODO: Implement R2 upload
    const previewId = `preview-${this.context.issueId}`;
    return `https://${previewId}.createsomething.space`;
  }

  private async handleTermination(): Promise<void> {
    await this.createCheckpoint();
    await this.saveSessionState();

    await this.env.DB.prepare(`
      UPDATE agentic_sessions
      SET status = ?, termination_reason = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      this.context.status,
      this.context.terminationReason || this.context.error,
      Date.now(),
      this.state.id.toString()
    ).run();

    await this.logEvent('session_completed', {
      status: this.context.status,
      reason: this.context.terminationReason
    });
  }

  private async finalize(): Promise<void> {
    // Mark complete
    await this.handleTermination();

    // Update Beads issue
    // TODO: Integrate with Beads
  }

  // Required for Durable Object
}
