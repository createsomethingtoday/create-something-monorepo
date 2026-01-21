/**
 * Validation → Review Correlation Analysis
 * 
 * Tracks which validation findings correlate with review outcomes.
 * Used to improve prioritization and predict rejection likelihood.
 * 
 * Usage:
 *   const analyzer = new CorrelationAnalyzer();
 *   
 *   // Record historical data
 *   analyzer.record(scanReport, "rejected");
 *   analyzer.record(scanReport2, "approved");
 *   
 *   // Get insights
 *   const insights = analyzer.analyze();
 *   // Returns: which rules predict rejection most strongly
 */

import type { ScanReport, Verdict, ScanRule, Finding } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/** Review outcome from Airtable */
export type ReviewOutcome = 'approved' | 'rejected' | 'changes_requested' | 'pending';

/** Recorded submission with scan + outcome */
export interface RecordedSubmission {
  submissionId: string;
  scanRunId: string;
  scanVerdict: Verdict;
  ruleIds: string[];           // Which rules had findings
  findingCounts: Record<string, number>;  // ruleId → count
  reviewOutcome: ReviewOutcome;
  recordedAt: string;
}

/** Correlation insight for a single rule */
export interface RuleCorrelation {
  ruleId: string;
  ruleName: string;
  category: string;
  
  // Counts
  timesTriggered: number;      // How many submissions had this finding
  rejectedWhenTriggered: number;
  approvedWhenTriggered: number;
  
  // Rates
  rejectionRate: number;       // % rejected when this rule triggers
  baselineRejectionRate: number;  // % rejected overall
  
  // Lift = how much more likely to be rejected vs baseline
  lift: number;                // rejectionRate / baselineRejectionRate
  
  // Statistical confidence
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
}

/** Overall correlation analysis result */
export interface CorrelationReport {
  generatedAt: string;
  submissionCount: number;
  rejectionCount: number;
  baselineRejectionRate: number;
  
  // Top predictive rules
  topRejectionPredictors: RuleCorrelation[];
  
  // Rules that DON'T predict rejection (noisy)
  lowSignalRules: RuleCorrelation[];
  
  // Category-level insights
  categoryInsights: CategoryInsight[];
  
  // Recommendations
  recommendations: string[];
}

/** Insight for a rule category */
export interface CategoryInsight {
  category: string;
  avgRejectionRateWhenTriggered: number;
  ruleCount: number;
  topRule: string;
}

// ============================================================================
// ANALYZER
// ============================================================================

export class CorrelationAnalyzer {
  private submissions: RecordedSubmission[] = [];
  private ruleMetadata: Map<string, { name: string; category: string }> = new Map();
  
  /**
   * Record a submission with its scan report and review outcome.
   */
  record(
    submissionId: string,
    scanReport: ScanReport,
    outcome: ReviewOutcome,
    rules?: ScanRule[]
  ): void {
    // Extract rule IDs that had findings
    const ruleIds: string[] = [];
    const findingCounts: Record<string, number> = {};
    
    for (const [ruleId, group] of Object.entries(scanReport.findings)) {
      ruleIds.push(ruleId);
      findingCounts[ruleId] = group.count;
      
      // Cache rule metadata
      if (group.rule && !this.ruleMetadata.has(ruleId)) {
        this.ruleMetadata.set(ruleId, {
          name: group.rule.name,
          category: group.rule.category
        });
      }
    }
    
    // Also extract from rules if provided
    if (rules) {
      for (const rule of rules) {
        if (!this.ruleMetadata.has(rule.ruleId)) {
          this.ruleMetadata.set(rule.ruleId, {
            name: rule.name,
            category: rule.category
          });
        }
      }
    }
    
    this.submissions.push({
      submissionId,
      scanRunId: scanReport.runId,
      scanVerdict: scanReport.verdict,
      ruleIds,
      findingCounts,
      reviewOutcome: outcome,
      recordedAt: new Date().toISOString()
    });
  }
  
  /**
   * Analyze correlations from recorded submissions.
   */
  analyze(): CorrelationReport {
    const total = this.submissions.length;
    const rejected = this.submissions.filter(s => s.reviewOutcome === 'rejected').length;
    const baselineRate = total > 0 ? rejected / total : 0;
    
    // Calculate per-rule correlations
    const ruleStats = new Map<string, {
      triggered: number;
      rejectedWhen: number;
      approvedWhen: number;
    }>();
    
    for (const sub of this.submissions) {
      for (const ruleId of sub.ruleIds) {
        const stats = ruleStats.get(ruleId) || { triggered: 0, rejectedWhen: 0, approvedWhen: 0 };
        stats.triggered++;
        
        if (sub.reviewOutcome === 'rejected') {
          stats.rejectedWhen++;
        } else if (sub.reviewOutcome === 'approved') {
          stats.approvedWhen++;
        }
        
        ruleStats.set(ruleId, stats);
      }
    }
    
    // Build correlation objects
    const correlations: RuleCorrelation[] = [];
    
    for (const [ruleId, stats] of ruleStats) {
      const meta = this.ruleMetadata.get(ruleId) || { name: ruleId, category: 'UNKNOWN' };
      const rejectionRate = stats.triggered > 0 ? stats.rejectedWhen / stats.triggered : 0;
      const lift = baselineRate > 0 ? rejectionRate / baselineRate : 1;
      
      correlations.push({
        ruleId,
        ruleName: meta.name,
        category: meta.category,
        timesTriggered: stats.triggered,
        rejectedWhenTriggered: stats.rejectedWhen,
        approvedWhenTriggered: stats.approvedWhen,
        rejectionRate,
        baselineRejectionRate: baselineRate,
        lift,
        sampleSize: stats.triggered,
        confidence: this.getConfidence(stats.triggered, total)
      });
    }
    
    // Sort by lift (most predictive first)
    correlations.sort((a, b) => b.lift - a.lift);
    
    // Top predictors: high lift + reasonable sample
    const topPredictors = correlations
      .filter(c => c.lift > 1.2 && c.confidence !== 'low')
      .slice(0, 10);
    
    // Low signal: lift near 1 or below baseline
    const lowSignal = correlations
      .filter(c => c.lift < 1.1 && c.timesTriggered >= 5)
      .slice(0, 5);
    
    // Category insights
    const categoryMap = new Map<string, { rates: number[]; topRule: string; topLift: number }>();
    for (const c of correlations) {
      const cat = categoryMap.get(c.category) || { rates: [], topRule: '', topLift: 0 };
      cat.rates.push(c.rejectionRate);
      if (c.lift > cat.topLift) {
        cat.topLift = c.lift;
        cat.topRule = c.ruleName;
      }
      categoryMap.set(c.category, cat);
    }
    
    const categoryInsights: CategoryInsight[] = [];
    for (const [category, data] of categoryMap) {
      const avg = data.rates.reduce((a, b) => a + b, 0) / data.rates.length;
      categoryInsights.push({
        category,
        avgRejectionRateWhenTriggered: avg,
        ruleCount: data.rates.length,
        topRule: data.topRule
      });
    }
    categoryInsights.sort((a, b) => b.avgRejectionRateWhenTriggered - a.avgRejectionRateWhenTriggered);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(topPredictors, lowSignal, categoryInsights);
    
    return {
      generatedAt: new Date().toISOString(),
      submissionCount: total,
      rejectionCount: rejected,
      baselineRejectionRate: baselineRate,
      topRejectionPredictors: topPredictors,
      lowSignalRules: lowSignal,
      categoryInsights,
      recommendations
    };
  }
  
  /**
   * Export submissions for persistence.
   */
  export(): RecordedSubmission[] {
    return [...this.submissions];
  }
  
  /**
   * Import historical submissions.
   */
  import(submissions: RecordedSubmission[]): void {
    this.submissions.push(...submissions);
    
    // Rebuild rule metadata from submissions if possible
    // (metadata must be provided separately for full rule names)
  }
  
  /**
   * Clear all recorded data.
   */
  clear(): void {
    this.submissions = [];
  }
  
  private getConfidence(sampleSize: number, total: number): 'high' | 'medium' | 'low' {
    // Statistical confidence based on sample size
    const minForHigh = Math.max(30, total * 0.1);
    const minForMedium = Math.max(10, total * 0.03);
    
    if (sampleSize >= minForHigh) return 'high';
    if (sampleSize >= minForMedium) return 'medium';
    return 'low';
  }
  
  private generateRecommendations(
    topPredictors: RuleCorrelation[],
    lowSignal: RuleCorrelation[],
    categories: CategoryInsight[]
  ): string[] {
    const recs: string[] = [];
    
    // High lift rules
    if (topPredictors.length > 0) {
      const top = topPredictors[0];
      recs.push(
        `Rule "${top.ruleName}" has ${(top.lift).toFixed(1)}x rejection lift. ` +
        `Consider auto-flagging submissions with this finding.`
      );
    }
    
    // Security vs other categories
    const securityCat = categories.find(c => c.category === 'SECURITY');
    if (securityCat && securityCat.avgRejectionRateWhenTriggered > 0.7) {
      recs.push(
        `SECURITY findings predict rejection ${(securityCat.avgRejectionRateWhenTriggered * 100).toFixed(0)}% of the time. ` +
        `Route these to senior reviewers.`
      );
    }
    
    // Low signal rules
    if (lowSignal.length > 0) {
      const lowNames = lowSignal.map(l => l.ruleName).join(', ');
      recs.push(
        `Rules [${lowNames}] trigger often but rarely correlate with rejection. ` +
        `Consider reducing severity or improving precision.`
      );
    }
    
    // If we have enough data
    if (this.submissions.length < 50) {
      recs.push(
        `Only ${this.submissions.length} submissions recorded. ` +
        `Collect more data for statistically significant insights.`
      );
    }
    
    return recs;
  }
}

// ============================================================================
// PRIORITY SCORING
// ============================================================================

/**
 * Score a new submission's priority based on historical correlations.
 * Higher score = more likely to need attention / be rejected.
 */
export function scoreSubmissionPriority(
  scanReport: ScanReport,
  correlationReport: CorrelationReport
): {
  priorityScore: number;  // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  topRiskFactors: string[];
} {
  const ruleIds = Object.keys(scanReport.findings);
  
  // Build lookup of rule lifts
  const liftMap = new Map<string, number>();
  for (const c of correlationReport.topRejectionPredictors) {
    liftMap.set(c.ruleId, c.lift);
  }
  
  // Calculate weighted score based on triggered rules
  let totalLift = 0;
  let maxLift = 0;
  const riskFactors: { ruleId: string; lift: number }[] = [];
  
  for (const ruleId of ruleIds) {
    const lift = liftMap.get(ruleId) || 1.0;
    totalLift += lift;
    maxLift = Math.max(maxLift, lift);
    
    if (lift > 1.2) {
      riskFactors.push({ ruleId, lift });
    }
  }
  
  // Normalize to 0-100
  // Baseline: average lift of 1.0 per rule
  const avgLift = ruleIds.length > 0 ? totalLift / ruleIds.length : 1.0;
  
  // Score: 50 is average, higher is riskier
  let score = 50 + (avgLift - 1.0) * 30 + (maxLift - 1.0) * 10;
  score = Math.max(0, Math.min(100, score));
  
  // Risk level
  let riskLevel: 'critical' | 'high' | 'medium' | 'low';
  if (score >= 80 || maxLift >= 3.0) {
    riskLevel = 'critical';
  } else if (score >= 65 || maxLift >= 2.0) {
    riskLevel = 'high';
  } else if (score >= 45) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Top risk factors
  riskFactors.sort((a, b) => b.lift - a.lift);
  const topFactors = riskFactors.slice(0, 3).map(f => f.ruleId);
  
  return {
    priorityScore: Math.round(score),
    riskLevel,
    topRiskFactors: topFactors
  };
}
