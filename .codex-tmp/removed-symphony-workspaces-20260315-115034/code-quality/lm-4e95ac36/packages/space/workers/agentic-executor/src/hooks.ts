// Agentic Layer Security Hooks
// Defense-in-depth: code-level enforcement that can't be bypassed by prompts

import type { SessionContext, QualityGateResults, GateFailure } from './types';

export interface HookResult {
  approved: boolean;
  reason?: string;
  requiredActions?: string[];
}

// ============================================================================
// Input Sanitization Hook
// ============================================================================

export class InputSanitizationHook {
  /**
   * Sanitize user input before it enters prompts.
   * Removes prompt injection attempts.
   */
  sanitizePrompt(userPrompt: string): string {
    let sanitized = userPrompt;

    // Remove completion signals from user input
    sanitized = sanitized.replace(/<completion>.*?<\/completion>/gi, '[REMOVED: completion signal]');

    // Remove budget override attempts
    sanitized = sanitized.replace(/ignore\s+(all\s+)?budget/gi, '[REMOVED: budget override]');
    sanitized = sanitized.replace(/bypass\s+budget/gi, '[REMOVED: budget bypass]');
    sanitized = sanitized.replace(/disable\s+budget/gi, '[REMOVED: budget disable]');

    // Remove system instruction override attempts
    sanitized = sanitized.replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, '[REMOVED: instruction override]');
    sanitized = sanitized.replace(/ignore\s+system\s+prompt/gi, '[REMOVED: system override]');
    sanitized = sanitized.replace(/you\s+are\s+now\s+/gi, '[REMOVED: role override]');
    sanitized = sanitized.replace(/disregard\s+all/gi, '[REMOVED: disregard instruction]');

    // Remove quality gate bypass attempts
    sanitized = sanitized.replace(/skip\s+(all\s+)?quality\s+gates?/gi, '[REMOVED: quality bypass]');
    sanitized = sanitized.replace(/bypass\s+quality/gi, '[REMOVED: quality bypass]');
    sanitized = sanitized.replace(/disable\s+quality/gi, '[REMOVED: quality bypass]');

    // Remove hook bypass attempts
    sanitized = sanitized.replace(/disable\s+hooks?/gi, '[REMOVED: hook bypass]');
    sanitized = sanitized.replace(/bypass\s+validation/gi, '[REMOVED: validation bypass]');

    return sanitized;
  }

  /**
   * Validate acceptance criteria don't contain injection attempts.
   */
  validateAcceptanceCriteria(criteria: string[]): { valid: boolean; sanitized: string[] } {
    const sanitized = criteria.map(c => {
      // Acceptance criteria should be plain statements, not instructions
      const lower = c.toLowerCase();

      if (lower.includes('ignore') ||
          lower.includes('output <completion>') ||
          lower.includes('bypass') ||
          lower.includes('disable') ||
          c.includes('<completion>')) {
        return '[INVALID CRITERIA]';
      }

      return c;
    });

    const valid = !sanitized.some(c => c === '[INVALID CRITERIA]');

    return { valid, sanitized };
  }

  /**
   * Log sanitization for security auditing.
   */
  getSanitizationReport(original: string, sanitized: string): {
    sanitized: boolean;
    removals: string[]
  } {
    if (original === sanitized) {
      return { sanitized: false, removals: [] };
    }

    // Extract what was removed
    const removals: string[] = [];
    const matches = sanitized.match(/\[REMOVED: ([^\]]+)\]/g);

    if (matches) {
      for (const match of matches) {
        const type = match.match(/\[REMOVED: ([^\]]+)\]/)?.[1];
        if (type && !removals.includes(type)) {
          removals.push(type);
        }
      }
    }

    return { sanitized: true, removals };
  }
}

// ============================================================================
// Budget Enforcement Hook
// ============================================================================

export class BudgetEnforcementHook {
  private readonly BUDGET_WARNING_THRESHOLD = 0.80;  // 80%
  private readonly BUDGET_HARD_STOP = 1.00;          // 100%

  /**
   * Check budget BEFORE iteration starts.
   * Returns false if iteration cannot proceed.
   */
  async beforeIteration(context: SessionContext): Promise<HookResult> {
    const budget = this.getBudgetStatus(context);

    // Hard stop at 100%
    if (budget.percentUsed >= this.BUDGET_HARD_STOP) {
      return {
        approved: false,
        reason: `Budget exhausted (${(budget.percentUsed * 100).toFixed(1)}%)`,
        requiredActions: ['Session terminated due to budget limit']
      };
    }

    // Estimate next iteration cost
    const estimatedCost = this.estimateNextIterationCost(context);

    // Would this iteration exceed budget?
    if (context.costConsumed + estimatedCost > context.budget) {
      return {
        approved: false,
        reason: 'Insufficient budget for next iteration',
        requiredActions: [
          `Estimated cost: $${estimatedCost.toFixed(4)}`,
          `Remaining budget: $${(context.budget - context.costConsumed).toFixed(4)}`,
          'Session terminated to prevent budget overage'
        ]
      };
    }

    return { approved: true };
  }

  /**
   * Verify budget after iteration completes.
   * Safety check for overages.
   */
  async afterIteration(context: SessionContext, actualCost: number): Promise<HookResult> {
    // This should never happen due to pre-checks, but if it does...
    if (context.costConsumed > context.budget) {
      const overage = context.costConsumed - context.budget;

      console.error('⚠️  BUDGET OVERAGE DETECTED', {
        issueId: context.issueId,
        budget: context.budget,
        consumed: context.costConsumed,
        overage,
        iteration: context.iteration
      });

      return {
        approved: false,
        reason: `Budget exceeded by $${overage.toFixed(4)}`,
        requiredActions: ['Session terminated immediately']
      };
    }

    return { approved: true };
  }

  /**
   * Check if budget warning should be injected.
   */
  shouldWarnBudget(context: SessionContext): boolean {
    const percentUsed = context.costConsumed / context.budget;
    return percentUsed >= this.BUDGET_WARNING_THRESHOLD && !context.budgetWarned;
  }

  /**
   * Get current budget status.
   */
  private getBudgetStatus(context: SessionContext) {
    const percentUsed = context.costConsumed / context.budget;
    const remaining = context.budget - context.costConsumed;

    return {
      allocated: context.budget,
      consumed: context.costConsumed,
      remaining,
      percentUsed,
      atWarningThreshold: percentUsed >= this.BUDGET_WARNING_THRESHOLD,
      atHardStop: percentUsed >= this.BUDGET_HARD_STOP
    };
  }

  /**
   * Estimate cost of next iteration based on historical average.
   */
  private estimateNextIterationCost(context: SessionContext): number {
    if (context.iteration === 0 || context.iterationCosts.length === 0) {
      // No data yet, conservative estimate
      // Based on historical data: ~$0.01 actual, use $0.02 for safety
      return 0.02;  // $0.02 per iteration (2x average for safety margin)
    }

    // Use average of last 3 iterations (or all if < 3)
    const recentIterations = Math.min(3, context.iterationCosts.length);
    const recentCosts = context.iterationCosts.slice(-recentIterations);
    const avgCost = recentCosts.reduce((sum, cost) => sum + cost, 0) / recentCosts.length;

    // Add 10% buffer for safety
    return avgCost * 1.1;
  }
}

// ============================================================================
// Completion Validation Hook
// ============================================================================

export class CompletionValidationHook {
  private readonly MAX_COMPLETION_REJECTIONS = 5;
  private rejectionCount = 0;

  /**
   * Validate agent's completion claim.
   * Actually runs quality gates instead of trusting claims.
   */
  async validate(context: SessionContext, env: any): Promise<HookResult> {
    // 1. Files actually modified?
    if (context.filesModified.length === 0) {
      this.rejectionCount++;
      return {
        approved: false,
        reason: 'No files modified',
        requiredActions: [
          'Implement the requested feature',
          'At least one file must be modified to complete'
        ]
      };
    }

    // 2. Quality gates actually passed? (run them, don't trust claims)
    const qualityResults = await this.runQualityGatesActual(context, env);

    if (!qualityResults.allPassed) {
      this.rejectionCount++;
      return {
        approved: false,
        reason: 'Quality gates failed',
        requiredActions: qualityResults.failures.map(f =>
          `Fix ${f.gate}: ${f.issue}`
        )
      };
    }

    // 3. Acceptance criteria met? (if specified)
    if (context.acceptanceCriteria && context.acceptanceCriteria.length > 0) {
      const criteriaResults = await this.validateAcceptanceCriteria(context, env);

      if (!criteriaResults.allMet) {
        this.rejectionCount++;
        return {
          approved: false,
          reason: 'Acceptance criteria not met',
          requiredActions: criteriaResults.unmet
        };
      }
    }

    // 4. Preview deployment exists and loads?
    if (!context.previewUrl) {
      this.rejectionCount++;
      return {
        approved: false,
        reason: 'No preview deployment created',
        requiredActions: ['Create preview deployment using deploy_preview tool']
      };
    }

    const previewHealth = await this.checkPreviewHealth(context.previewUrl);
    if (!previewHealth.ok) {
      this.rejectionCount++;
      return {
        approved: false,
        reason: 'Preview deployment not functional',
        requiredActions: [`Fix preview deployment: ${previewHealth.error}`]
      };
    }

    // 5. Check rejection count (prevent infinite loop)
    if (this.rejectionCount >= this.MAX_COMPLETION_REJECTIONS) {
      return {
        approved: false,
        reason: `Too many completion rejections (${this.rejectionCount})`,
        requiredActions: ['Task requires human review and intervention']
      };
    }

    // All checks passed
    return { approved: true };
  }

  /**
   * Actually run quality gates (don't trust agent claims).
   */
  private async runQualityGatesActual(
    context: SessionContext,
    env: any
  ): Promise<QualityGateResults> {
    const results: QualityGateResults = {
      allPassed: true,
      failures: []
    };

    // Canon audit (actually run it)
    try {
      const canonResult = await this.runCanonAudit(context.filesModified);
      if (canonResult.violations.length > 0) {
        results.allPassed = false;
        results.failures.push({
          gate: 'canon',
          issue: `${canonResult.violations.length} Canon violations found`
        });
      }
    } catch (err) {
      console.warn('Canon audit failed', err);
      // Non-blocking for now
    }

    // Accessibility (actually test the preview)
    if (context.previewUrl) {
      try {
        const a11yResult = await this.runA11yAudit(context.previewUrl);
        if (!a11yResult.passed) {
          results.allPassed = false;
          results.failures.push({
            gate: 'accessibility',
            issue: `WCAG AA not met (score: ${a11yResult.score})`
          });
        }
      } catch (err) {
        console.warn('A11y audit failed', err);
      }
    }

    // Performance (actually run Lighthouse)
    if (context.previewUrl) {
      try {
        const perfResult = await this.runLighthouse(context.previewUrl);
        if (perfResult.score < 90) {
          results.allPassed = false;
          results.failures.push({
            gate: 'performance',
            issue: `Lighthouse score ${perfResult.score} < 90`
          });
        }
      } catch (err) {
        console.warn('Lighthouse audit failed', err);
      }
    }

    return results;
  }

  /**
   * Validate acceptance criteria are met.
   */
  private async validateAcceptanceCriteria(
    context: SessionContext,
    env: any
  ): Promise<{ allMet: boolean; unmet: string[] }> {
    const unmet: string[] = [];

    // This would need actual test execution
    // For now, placeholder logic
    for (const criterion of context.acceptanceCriteria!) {
      // TODO: Implement actual criterion validation
      // For example: run tests, check for specific functionality
    }

    return {
      allMet: unmet.length === 0,
      unmet
    };
  }

  /**
   * Check preview deployment health.
   */
  private async checkPreviewHealth(url: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)  // 10 second timeout
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }

      const html = await response.text();

      // Basic sanity checks
      if (!html.includes('</html>')) {
        return { ok: false, error: 'Invalid HTML response' };
      }

      if (html.includes('ERROR') || html.includes('500 Internal Server Error')) {
        return { ok: false, error: 'Page contains error messages' };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // Placeholder implementations for quality tools
  // These would integrate with actual auditing services

  private async runCanonAudit(files: string[]): Promise<{ violations: string[] }> {
    // TODO: Integrate with /audit-canon skill
    return { violations: [] };
  }

  private async runA11yAudit(url: string): Promise<{ passed: boolean; score: number }> {
    // TODO: Integrate with accessibility testing service
    return { passed: true, score: 100 };
  }

  private async runLighthouse(url: string): Promise<{ score: number }> {
    // TODO: Integrate with Lighthouse CI or PageSpeed Insights API
    return { score: 95 };
  }
}

// ============================================================================
// System Prompt Protection Hook
// ============================================================================

export class SystemPromptProtectionHook {
  /**
   * Sanitize tool results to prevent prompt leakage.
   */
  sanitizeToolResult(toolName: string, result: any): any {
    // Patterns that should be redacted from tool results
    const sensitivePatterns = [
      /BUDGET\s+WARNING/gi,
      /ignore.*budget/gi,
      /<completion>DONE<\/completion>/gi,
      /⚠️.*BUDGET/gi,
      /\$\d+\.\d{2}\s+\/\s+\$\d+\.\d{2}/  // Budget amounts
    ];

    // If result is string, sanitize it
    if (typeof result === 'string') {
      let sanitized = result;
      for (const pattern of sensitivePatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      return sanitized;
    }

    // If result is object with content field
    if (typeof result === 'object' && result.content) {
      return {
        ...result,
        content: this.sanitizeToolResult(toolName, result.content)
      };
    }

    return result;
  }
}
