/**
 * Intelligence Layer
 * 
 * The intelligence layer observes the automation layer through metrics
 * and feedback, then proposes modifications to improve it.
 * 
 * This is the self-improving loop:
 * 1. Execute scripts (automation layer)
 * 2. Record metrics and feedback (observability)
 * 3. Analyze patterns (intelligence)
 * 4. Propose modifications (intelligence)
 * 5. Apply approved modifications (versioning)
 * 6. Repeat
 */

import { RegistryManager, getRegistry } from './registry.js';
import type {
  ScriptModification,
  ModificationProposal,
  ExtractionFeedback,
  FeedbackIssue,
  ProposedChange,
  VersionComparison
} from './types.js';

// =============================================================================
// Intelligence Analyzer
// =============================================================================

export class IntelligenceAnalyzer {
  private registry: RegistryManager;

  constructor(registry?: RegistryManager) {
    this.registry = registry || getRegistry();
  }

  // ===========================================================================
  // Pattern Analysis
  // ===========================================================================

  /**
   * Analyze feedback to identify common issues
   */
  analyzeIssuePatterns(scriptName: string): IssuePattern[] {
    const feedback = this.registry.getFeedback(scriptName);
    const patterns: Map<string, IssuePattern> = new Map();

    for (const fb of feedback) {
      for (const issue of fb.issues) {
        const key = `${issue.type}:${issue.description}`;
        
        if (!patterns.has(key)) {
          patterns.set(key, {
            type: issue.type,
            description: issue.description,
            occurrences: 0,
            urls: [],
            selectors: [],
            feedbackIds: []
          });
        }

        const pattern = patterns.get(key)!;
        pattern.occurrences++;
        pattern.urls.push(fb.url);
        pattern.feedbackIds.push(fb.id);
        
        if (issue.selector) {
          pattern.selectors.push(issue.selector);
        }
      }
    }

    // Return patterns sorted by frequency
    return Array.from(patterns.values())
      .filter(p => p.occurrences >= 2) // At least 2 occurrences
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Identify URLs where scripts consistently fail or underperform
   */
  identifyProblematicUrls(scriptName: string): ProblematicUrl[] {
    const feedback = this.registry.getFeedback(scriptName);
    const urlStats: Map<string, { total: number; lowRatings: number; issues: FeedbackIssue[] }> = new Map();

    for (const fb of feedback) {
      const domain = new URL(fb.url).hostname;
      
      if (!urlStats.has(domain)) {
        urlStats.set(domain, { total: 0, lowRatings: 0, issues: [] });
      }

      const stats = urlStats.get(domain)!;
      stats.total++;
      
      if (fb.rating <= 2) {
        stats.lowRatings++;
      }
      
      stats.issues.push(...fb.issues);
    }

    return Array.from(urlStats.entries())
      .filter(([_, stats]) => stats.lowRatings / stats.total > 0.3) // >30% low ratings
      .map(([domain, stats]) => ({
        domain,
        totalFeedback: stats.total,
        lowRatingCount: stats.lowRatings,
        lowRatingRate: stats.lowRatings / stats.total,
        commonIssues: this.aggregateIssues(stats.issues)
      }))
      .sort((a, b) => b.lowRatingRate - a.lowRatingRate);
  }

  /**
   * Aggregate issues by type
   */
  private aggregateIssues(issues: FeedbackIssue[]): { type: string; count: number }[] {
    const counts: Map<string, number> = new Map();
    
    for (const issue of issues) {
      const key = issue.type;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ===========================================================================
  // Modification Proposal Generation
  // ===========================================================================

  /**
   * Generate modification proposals based on feedback analysis
   */
  generateProposals(scriptName: string): ModificationProposal[] {
    const patterns = this.analyzeIssuePatterns(scriptName);
    const proposals: ModificationProposal[] = [];

    const activeVersionId = this.registry.getRegistryState().activeVersions[scriptName];
    const currentVersion = activeVersionId?.split('-v')[1] || '1.0.0';

    for (const pattern of patterns) {
      const proposal = this.patternToProposal(scriptName, currentVersion, pattern);
      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * Convert an issue pattern to a modification proposal
   */
  private patternToProposal(
    scriptName: string,
    currentVersion: string,
    pattern: IssuePattern
  ): ModificationProposal | null {
    const proposedChanges: ProposedChange[] = [];

    switch (pattern.type) {
      case 'missing':
        // Element not being captured - likely need to add selector
        if (pattern.selectors.length > 0) {
          const mostCommonSelector = this.findMostCommon(pattern.selectors);
          proposedChanges.push({
            type: 'add_selector',
            description: `Add selector to capture missing elements: ${pattern.description}`,
            codeChange: {
              search: 'const interactiveSelectors = [',
              replace: `const interactiveSelectors = [\n    '${mostCommonSelector}',`
            }
          });
        }
        break;

      case 'incorrect':
        // Logic producing wrong results
        proposedChanges.push({
          type: 'modify_logic',
          description: `Fix incorrect extraction: ${pattern.description}`,
          codeChange: {
            search: '// PLACEHOLDER: Logic modification needed',
            replace: '// PLACEHOLDER: Logic modification needed'
          }
        });
        break;

      case 'timeout':
        // Script too slow - might need optimization
        proposedChanges.push({
          type: 'fix_bug',
          description: 'Optimize script to prevent timeouts',
          codeChange: {
            search: 'await page.evaluate',
            replace: 'await page.evaluate'
          }
        });
        break;

      case 'extra':
        // Capturing too much - need to filter
        if (pattern.selectors.length > 0) {
          const selectorToRemove = this.findMostCommon(pattern.selectors);
          proposedChanges.push({
            type: 'remove_selector',
            description: `Remove selector capturing extra elements: ${pattern.description}`,
            codeChange: {
              search: `'${selectorToRemove}',`,
              replace: ''
            }
          });
        }
        break;
    }

    if (proposedChanges.length === 0) {
      return null;
    }

    return {
      targetScript: scriptName,
      currentVersion,
      proposedChanges,
      rationale: `Pattern detected: "${pattern.description}" occurring ${pattern.occurrences} times`,
      evidence: pattern.feedbackIds.map(id => ({
        type: 'feedback' as const,
        id,
        summary: `Feedback reporting: ${pattern.type}`
      }))
    };
  }

  /**
   * Find most common value in array
   */
  private findMostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = arr[0];
    
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }

  // ===========================================================================
  // A/B Test Analysis
  // ===========================================================================

  /**
   * Analyze A/B test results and make recommendations
   */
  analyzeABTest(scriptName: string): ABTestAnalysis | null {
    const state = this.registry.getRegistryState();
    const testingVersionId = state.testingVersions[scriptName];
    const activeVersionId = state.activeVersions[scriptName];

    if (!testingVersionId) {
      return null; // No active A/B test
    }

    const comparison = this.registry.compareVersions(activeVersionId, testingVersionId);
    
    if (!comparison) {
      return null;
    }

    return {
      scriptName,
      activeVersion: activeVersionId,
      testingVersion: testingVersionId,
      comparison,
      recommendation: this.getRecommendationExplanation(comparison),
      action: comparison.recommendation
    };
  }

  /**
   * Get human-readable recommendation explanation
   */
  private getRecommendationExplanation(comparison: VersionComparison): string {
    const { improvement, recommendation } = comparison;

    switch (recommendation) {
      case 'promote':
        const improvements = [];
        if (improvement.successRate >= 5) {
          improvements.push(`${improvement.successRate.toFixed(1)}% better success rate`);
        }
        if (improvement.duration >= 10) {
          improvements.push(`${improvement.duration.toFixed(1)}% faster`);
        }
        if (improvement.itemsExtracted >= 10) {
          improvements.push(`${improvement.itemsExtracted.toFixed(1)}% more items extracted`);
        }
        return `Recommend promoting: ${improvements.join(', ')}`;

      case 'keep_testing':
        return `Need more data: only ${comparison.metrics.compare.executionCount} executions so far (need 50+)`;

      case 'rollback':
        const regressions = [];
        if (improvement.successRate < -5) {
          regressions.push(`${Math.abs(improvement.successRate).toFixed(1)}% worse success rate`);
        }
        if (improvement.duration < -20) {
          regressions.push(`${Math.abs(improvement.duration).toFixed(1)}% slower`);
        }
        return `Recommend rollback: ${regressions.join(', ')}`;

      case 'deprecate':
        return 'No significant improvement detected - recommend deprecating test version';
    }
  }

  // ===========================================================================
  // Autonomous Improvement Loop
  // ===========================================================================

  /**
   * Run a full analysis cycle and return recommended actions
   */
  async runAnalysisCycle(scriptName: string): Promise<AnalysisCycleResult> {
    const result: AnalysisCycleResult = {
      scriptName,
      timestamp: new Date().toISOString(),
      issuePatterns: [],
      problematicUrls: [],
      proposals: [],
      abTestAnalysis: null,
      recommendedActions: []
    };

    // Analyze patterns
    result.issuePatterns = this.analyzeIssuePatterns(scriptName);
    result.problematicUrls = this.identifyProblematicUrls(scriptName);

    // Generate proposals
    result.proposals = this.generateProposals(scriptName);

    // Check A/B test
    result.abTestAnalysis = this.analyzeABTest(scriptName);

    // Generate recommended actions
    if (result.abTestAnalysis?.action === 'promote') {
      result.recommendedActions.push({
        type: 'promote_version',
        priority: 'high',
        description: result.abTestAnalysis.recommendation,
        data: { versionId: result.abTestAnalysis.testingVersion }
      });
    }

    if (result.abTestAnalysis?.action === 'rollback') {
      result.recommendedActions.push({
        type: 'deprecate_version',
        priority: 'high',
        description: result.abTestAnalysis.recommendation,
        data: { versionId: result.abTestAnalysis.testingVersion }
      });
    }

    for (const proposal of result.proposals) {
      result.recommendedActions.push({
        type: 'create_modification',
        priority: 'medium',
        description: proposal.rationale,
        data: { proposal }
      });
    }

    return result;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface IssuePattern {
  type: FeedbackIssue['type'];
  description: string;
  occurrences: number;
  urls: string[];
  selectors: string[];
  feedbackIds: string[];
}

export interface ProblematicUrl {
  domain: string;
  totalFeedback: number;
  lowRatingCount: number;
  lowRatingRate: number;
  commonIssues: { type: string; count: number }[];
}

export interface ABTestAnalysis {
  scriptName: string;
  activeVersion: string;
  testingVersion: string;
  comparison: VersionComparison;
  recommendation: string;
  action: VersionComparison['recommendation'];
}

export interface AnalysisCycleResult {
  scriptName: string;
  timestamp: string;
  issuePatterns: IssuePattern[];
  problematicUrls: ProblematicUrl[];
  proposals: ModificationProposal[];
  abTestAnalysis: ABTestAnalysis | null;
  recommendedActions: RecommendedAction[];
}

export interface RecommendedAction {
  type: 'promote_version' | 'deprecate_version' | 'create_modification' | 'start_ab_test';
  priority: 'high' | 'medium' | 'low';
  description: string;
  data: Record<string, unknown>;
}

// =============================================================================
// Factory
// =============================================================================

export function createIntelligenceAnalyzer(registry?: RegistryManager): IntelligenceAnalyzer {
  return new IntelligenceAnalyzer(registry);
}
