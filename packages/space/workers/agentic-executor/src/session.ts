// Agentic Session - Durable Object with Extended Thinking + Budget Enforcement
// Implements session management with hooks for security and cost control

import Anthropic from '@anthropic-ai/sdk';
import { GuardError, guardResponse, readPolicy, validateTask, usdUnits } from './guards.ts';
import { quota } from './quota.ts';
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

// Langfuse observability types (inline to avoid worker bundling issues)
interface LangfuseTrace {
  id: string;
  generation: (opts: any) => LangfuseGeneration;
  span: (opts: any) => LangfuseSpan;
}

interface LangfuseGeneration {
  end: (opts: any) => void;
}

interface LangfuseSpan {
  end: (opts?: any) => void;
}

// Simple Langfuse client for Workers (fetch-based)
class WorkerLangfuse {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(env: Env) {
    this.publicKey = (env as any).LANGFUSE_PUBLIC_KEY || '';
    this.secretKey = (env as any).LANGFUSE_SECRET_KEY || '';
    this.baseUrl = (env as any).LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
  }

  isEnabled(): boolean {
    return !!(this.publicKey && this.secretKey);
  }

  async sendEvent(body: any): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.publicKey}:${this.secretKey}`)}`
        },
        body: JSON.stringify({ batch: [body] }),
        signal: AbortSignal.timeout(10_000)
      });
    } catch (err) {
      console.error('Langfuse ingestion error:', err);
    }
  }

  createTrace(opts: { name: string; metadata?: any; sessionId?: string }): string {
    const traceId = crypto.randomUUID();
    
    this.sendEvent({
      type: 'trace-create',
      body: {
        id: traceId,
        name: opts.name,
        metadata: opts.metadata,
        sessionId: opts.sessionId,
        timestamp: new Date().toISOString()
      }
    });

    return traceId;
  }

  createGeneration(traceId: string, opts: {
    name: string;
    model: string;
    input: any;
    metadata?: any;
  }): string {
    const generationId = crypto.randomUUID();

    this.sendEvent({
      type: 'generation-create',
      body: {
        id: generationId,
        traceId,
        name: opts.name,
        model: opts.model,
        input: opts.input,
        metadata: opts.metadata,
        startTime: new Date().toISOString()
      }
    });

    return generationId;
  }

  endGeneration(generationId: string, opts: {
    output: any;
    usage?: { input?: number; output?: number; total?: number };
    level?: string;
    statusMessage?: string;
  }): void {
    this.sendEvent({
      type: 'generation-update',
      body: {
        id: generationId,
        output: opts.output,
        usage: opts.usage,
        level: opts.level,
        statusMessage: opts.statusMessage,
        endTime: new Date().toISOString()
      }
    });
  }
}

export class AgenticSession {
  private state: DurableObjectState;
  private env: Env;
  private anthropic: Anthropic;
  private langfuse: WorkerLangfuse;
  private traceId: string | null = null;

  // Session state (persisted)
  private conversationHistory: Message[] = [];
  private context!: SessionContext;
  private starting: Promise<Response> | null = null;
  private executing = false;
  private requestAbort: AbortController | null = null;
  private lastCheckpoint: number = 0;

  // Hooks
  private budgetHook: BudgetEnforcementHook;
  private completionHook: CompletionValidationHook;
  private promptProtection: SystemPromptProtectionHook;


  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Disable SDK retries: a failed request can still have incurred provider charges.
    this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 60_000, fetch: globalThis.fetch as any });

    // Initialize Langfuse for observability
    this.langfuse = new WorkerLangfuse(env);

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
        if (this.context.guardVersion !== 1 || this.context.callPending || this.context.initializationPending) {
          this.context.status = 'error';
          this.context.error = 'Legacy state or interrupted initialization/model outcome requires operator reconciliation';
          await this.saveSessionState();
          await this.state.storage.deleteAlarm();
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

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
    if (this.starting) return this.starting;
    this.starting = this.startOnce(task);
    try { return await this.starting; } catch (error) { return guardResponse(error); }
    finally { this.starting = null; }
  }

  private async startOnce(input: AgenticTask): Promise<Response> {
    const task = validateTask(input, readPolicy(this.env));
    const admission = await quota(this.env).fetch('https://quota/verify', {method:'POST',body:JSON.stringify(task)});
    if (!admission.ok) {
      const transient = admission.status >= 500 || [408,429].includes(admission.status);
      return Response.json({error:transient ? 'Admission verification unavailable' : 'Admission required'}, {status:transient ? 503 : 403});
    }
    const receipt = await admission.json() as {deadline:number};
    const stored = await this.state.storage.get<SessionState>('session');
    if (stored) {
      if (this.context.initializationPending) {
        return Response.json({error:'Interrupted initialization requires reconciliation',status:this.context.status}, {status:409});
      }
      // Queue redelivery never resumes, resets, or re-arms an existing session.
      return Response.json({status:this.context.status,sessionId:this.state.id.toString(),budget:this.getBudgetStatus()});
    }
    if (!Number.isFinite(receipt.deadline) || receipt.deadline <= Date.now()) {
      return Response.json({error:'Admission expired'}, {status:410});
    }
    const issue = await this.loadBeadsIssue(task.issueId);
    this.context = {
      issueId:task.issueId, epicId:task.epicId, convoyId:task.convoyId,
      budget:task.budget, costConsumed:0, costReserved:0, guardVersion:1,
      deadline:receipt.deadline, callPending:false, initializationPending:true, iteration:0, iterationCosts:[],
      filesModified:[],status:'running',budgetWarned:false,
      acceptanceCriteria:task.acceptanceCriteria || issue.acceptance
    };
    this.conversationHistory = [{role:'user',content:this.buildInitialPrompt(issue,task)}];
    // Persist before any external tracking or alarm. A failed start remains deduplicated.
    await this.saveSessionState();

    try {
    // Tracking may have an uncertain outcome; never restart it automatically.
    await this.trackSessionStart();

    // Create Langfuse trace for observability
    if (this.langfuse.isEnabled()) {
      this.traceId = this.langfuse.createTrace({
        name: `agentic-session:${task.issueId}`,
        sessionId: this.state.id.toString(),
        metadata: {
          touchpoint: 'agentic-executor',
          aiTasks: ['execute', 'reason', 'generate'],
          systemTasks: ['orchestrate', 'persist', 'validate'],
          dataArtifacts: ['code', 'test_results', 'deployment'],
          constraints: { budget: task.budget, maxIterations: 50 },
          issueId: task.issueId,
          epicId: task.epicId,
          convoyId: task.convoyId
        }
      });
    }

    // Schedule execution loop via alarm (fires immediately)
    // This is the correct pattern for Durable Objects - alarms trigger background work
    // Commit readiness and the first alarm together: no persisted running state
    // can be advertised as initialized without a durable wake-up.
    const initializedContext = {...this.context, initializationPending:false};
    await this.state.storage.transaction(async storage => {
      await storage.put<SessionState>('session', {
        conversationHistory:this.conversationHistory, context:initializedContext,
        lastCheckpoint:this.lastCheckpoint
      });
      await storage.setAlarm(Date.now()+100);
    });
    this.context = initializedContext;
    } catch (error) {
      this.context.status = 'error';
      this.context.error = 'Session initialization failed; operator reconciliation required';
      // Keep the pending marker, including after a crash before this catch.
      await this.saveSessionState();
      await this.state.storage.deleteAlarm();
      throw error;
    }

    console.log('✅ Scheduled executeLoop via alarm');

    return Response.json({
      status: 'started',
      sessionId: this.state.id.toString(),
      budget: this.getBudgetStatus()
    });
  }

  // Durable Object alarm handler - triggered for background execution
  async alarm(): Promise<void> {
    if (!this.context || this.context.status !== 'running' || this.context.initializationPending || this.executing) return;
    this.executing = true;
    try { await this.executeLoop(); } finally { this.executing = false; }
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
        if (!this.context.deadline || Date.now() >= this.context.deadline || this.context.guardVersion !== 1 || this.context.callPending) {
          this.context.status = 'error';
          this.context.error = 'Execution deadline or durable spend guard stopped the session';
          break;
        }
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
        if (this.context.status !== 'running') break;

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

          if (this.context.status !== 'running') break;
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

        if (this.context.status === 'running') this.context.status = 'error';
        this.context.error = errorDetails.message || JSON.stringify(errorDetails);
        await this.saveSessionState();
        break;
      }
    }

      if (this.context.status === 'running' && this.context.iteration >= maxIterations) {
        this.context.status = 'error';
        this.context.terminationReason = 'Maximum iteration limit reached';
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
    const policy = readPolicy(this.env);
    if (this.context.status !== 'running' || this.context.guardVersion !== 1 || this.context.callPending ||
        !Number.isFinite(this.context.costReserved) || !this.context.deadline || Date.now() >= this.context.deadline) {
      throw new GuardError('Session cannot make another model request',409);
    }
    if (Math.round(this.context.costReserved! * 1_000_000) + usdUnits(policy.callReservation) > Math.floor(this.context.budget * 1_000_000)) {
      this.context.status = 'budget_exhausted';
      await this.saveSessionState();
      throw new GuardError('Insufficient unreserved model budget',402);
    }
    this.context.iteration++;

    // Build system prompt with budget info
    const budget = this.getBudgetStatus();
    const systemPrompt = this.buildSystemPrompt(budget);

    // Create Langfuse generation for this LLM call
    let generationId: string | null = null;
    if (this.langfuse.isEnabled() && this.traceId) {
      generationId = this.langfuse.createGeneration(this.traceId, {
        name: `iteration-${this.context.iteration}`,
        model: 'claude-sonnet-4-5-20250929',
        input: {
          system: systemPrompt,
          messages: this.conversationHistory.slice(-5), // Last 5 for context
          messageCount: this.conversationHistory.length
        },
        metadata: {
          iteration: this.context.iteration,
          budgetRemaining: budget.remaining,
          budgetPercent: budget.percentUsed
        }
      });
    }

    const parameters = {
      model: 'claude-sonnet-4-5-20250929', max_tokens: 16384,
      thinking: { type: 'enabled' as const, budget_tokens: 10000 },
      system: systemPrompt, messages: this.conversationHistory as any,
      tools: this.buildTools(), tool_choice: { type: 'auto' as const }
    };
    if (new TextEncoder().encode(JSON.stringify(parameters)).length > policy.maxRequestBytes) {
      throw new GuardError('Model request exceeds configured context byte cap');
    }
    // Debit the conservative maximum, never refund automatically. Persist before crossing
    // the provider boundary; unknown outcomes stop on recovery rather than repeating a call.
    this.context.costReserved = (Math.round(this.context.costReserved! * 1_000_000) + usdUnits(policy.callReservation)) / 1_000_000;
    this.context.callPending = true;
    await this.saveSessionState();
    if (this.context.status !== 'running') throw new GuardError('Session paused',409);
    this.requestAbort = new AbortController();
    const deadlineTimer = setTimeout(() => this.requestAbort?.abort(), Math.max(1, Math.min(60_000, this.context.deadline! - Date.now())));
    let response;
    try {
      response = await this.anthropic.messages.create(parameters, {signal:this.requestAbort.signal});
    } finally {
      clearTimeout(deadlineTimer);
      this.requestAbort = null;
    }

    // Calculate actual cost
    const actualCost = this.calculateCost(response.usage!);
    this.context.costConsumed += actualCost;
    this.context.iterationCosts.push(actualCost);
    this.context.callPending = false;
    if (!Number.isFinite(actualCost) || actualCost < 0 || actualCost > policy.callReservation) {
      this.context.status = 'error';
      this.context.error = 'Provider usage exceeded configured reservation; reconcile pricing policy';
    }
    // Persist the response/accounting before external tracking or tool effects.
    this.conversationHistory.push({role:'assistant',content:response.content as any});
    await this.saveSessionState();
    if (this.context.status !== 'running' || Date.now() >= this.context.deadline!) return response;

    // End Langfuse generation with results
    if (this.langfuse.isEnabled() && generationId) {
      this.langfuse.endGeneration(generationId, {
        output: response.content,
        usage: {
          input: response.usage?.input_tokens,
          output: response.usage?.output_tokens,
          total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        }
      });
    }

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

    // Execute tool calls
    const toolResults: ToolResultContent[] = [];

    for (const block of response.content) {
      if (this.context.status !== 'running' || Date.now() >= this.context.deadline!) break;
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
    if (!this.context) return Response.json({error:'No session'}, {status:404});
    if (this.context.status !== 'running') return this.status();
    this.context.status = 'paused';
    this.requestAbort?.abort();
    await this.saveSessionState();
    await this.state.storage.deleteAlarm();
    return Response.json({status:'paused'});
  }

  async resume(): Promise<Response> {
    if (!this.context || this.context.status !== 'paused' || this.context.callPending || this.executing ||
        this.context.guardVersion !== 1 || !this.context.deadline || Date.now() >= this.context.deadline) {
      return Response.json({error:'Session cannot safely resume'}, {status:409});
    }
    readPolicy(this.env);
    this.context.status = 'running';
    await this.saveSessionState();
    await this.state.storage.setAlarm(Date.now()+100);
    return Response.json({status:'resumed'});
  }

  status(): Response {
    if (!this.context) return Response.json({error:'No session'}, {status:404});
    return Response.json({
      sessionId: this.state.id.toString(),
      iteration: this.context.iteration,
      costConsumed: this.context.costConsumed,
      costReserved: this.context.costReserved,
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
    const policy = readPolicy(this.env);
    if (!Number.isSafeInteger(usage.input_tokens) || usage.input_tokens < 0 || !Number.isSafeInteger(usage.output_tokens) || usage.output_tokens < 0) return NaN;
    return (usage.input_tokens * policy.inputRate + usage.output_tokens * policy.outputRate) / 1_000_000;
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
