/**
 * Review Queue Priority Scoring
 * 
 * Scores submissions to determine review order.
 * Higher scores = review sooner.
 * 
 * Factors:
 * 1. Time in queue (aging = urgent)
 * 2. Creator tier (established = trust)
 * 3. Asset type (Apps need specialist)
 * 4. Scan risk score (clean = fast-track)
 * 5. Historical rejection predictor lift
 * 
 * Usage:
 *   const score = calculatePriorityScore(submission);
 *   // Returns: { score: 75, factors: [...], suggestedReviewer: 'Pablo' }
 */

import type { ScanReport } from '../types';
import { scoreSubmissionPriority, type CorrelationReport } from './correlation';

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = 'template' | 'app';

export type CreatorTier = 
  | 'new'           // First submission
  | 'returning'     // 1-4 published
  | 'established'   // 5+ published
  | 'partner';      // Verified partner

export interface SubmissionContext {
  submissionId: string;
  assetType: AssetType;
  creatorTier: CreatorTier;
  createdAt: Date;            // When submitted
  daysInQueue: number;        // Days since submission
  previousRejections: number; // This asset's resubmission count
  scanReport?: ScanReport;
  correlationReport?: CorrelationReport;
}

export interface PriorityScore {
  /** Overall priority score (0-100, higher = review sooner) */
  score: number;
  
  /** Score breakdown by factor */
  factors: PriorityFactor[];
  
  /** Urgency tier */
  urgency: 'critical' | 'high' | 'normal' | 'low';
  
  /** Suggested reviewer type */
  suggestedReviewer: 'senior' | 'specialist' | 'any';
  
  /** Reasoning for priority */
  reasoning: string[];
}

export interface PriorityFactor {
  name: string;
  weight: number;
  rawValue: number;
  contribution: number;  // Weighted contribution to final score
  description: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PriorityScoringConfig {
  /** Weight for time-in-queue factor (default: 0.30) */
  timeWeight: number;
  
  /** Weight for creator tier factor (default: 0.15) */
  creatorWeight: number;
  
  /** Weight for asset type factor (default: 0.10) */
  assetTypeWeight: number;
  
  /** Weight for scan risk factor (default: 0.25) */
  riskWeight: number;
  
  /** Weight for historical correlation factor (default: 0.20) */
  correlationWeight: number;
  
  /** Days in queue before considered urgent */
  urgentDays: number;
  
  /** Days in queue before considered critical */
  criticalDays: number;
}

export const DEFAULT_CONFIG: PriorityScoringConfig = {
  timeWeight: 0.30,
  creatorWeight: 0.15,
  assetTypeWeight: 0.10,
  riskWeight: 0.25,
  correlationWeight: 0.20,
  urgentDays: 5,
  criticalDays: 10
};

// ============================================================================
// SCORING
// ============================================================================

/**
 * Calculate priority score for a submission.
 */
export function calculatePriorityScore(
  submission: SubmissionContext,
  config: PriorityScoringConfig = DEFAULT_CONFIG
): PriorityScore {
  const factors: PriorityFactor[] = [];
  const reasoning: string[] = [];
  
  // 1. Time in Queue (higher = more urgent)
  const timeScore = scoreTimeInQueue(submission.daysInQueue, config);
  factors.push({
    name: 'Time in Queue',
    weight: config.timeWeight,
    rawValue: submission.daysInQueue,
    contribution: timeScore * config.timeWeight,
    description: `${submission.daysInQueue} days waiting`
  });
  
  if (submission.daysInQueue >= config.criticalDays) {
    reasoning.push(`Critical: ${submission.daysInQueue} days in queue (>= ${config.criticalDays})`);
  } else if (submission.daysInQueue >= config.urgentDays) {
    reasoning.push(`Urgent: ${submission.daysInQueue} days in queue (>= ${config.urgentDays})`);
  }
  
  // 2. Creator Tier (established = trust, can fast-track)
  const creatorScore = scoreCreatorTier(submission.creatorTier);
  factors.push({
    name: 'Creator Tier',
    weight: config.creatorWeight,
    rawValue: creatorScore,
    contribution: creatorScore * config.creatorWeight,
    description: `${submission.creatorTier} creator`
  });
  
  if (submission.creatorTier === 'partner') {
    reasoning.push('Partner submission - prioritize');
  } else if (submission.creatorTier === 'established') {
    reasoning.push('Established creator - likely clean');
  }
  
  // 3. Asset Type (Apps need specialist)
  const assetScore = scoreAssetType(submission.assetType);
  factors.push({
    name: 'Asset Type',
    weight: config.assetTypeWeight,
    rawValue: assetScore,
    contribution: assetScore * config.assetTypeWeight,
    description: submission.assetType
  });
  
  // 4. Scan Risk Score (clean = fast-track, risky = needs attention)
  let riskScore = 50; // Neutral if no scan
  if (submission.scanReport) {
    if (submission.correlationReport) {
      const scanPriority = scoreSubmissionPriority(
        submission.scanReport,
        submission.correlationReport
      );
      riskScore = scanPriority.priorityScore;
      
      if (scanPriority.riskLevel === 'critical') {
        reasoning.push(`Critical risk: ${scanPriority.topRiskFactors.join(', ')}`);
      } else if (scanPriority.riskLevel === 'high') {
        reasoning.push(`High risk findings detected`);
      }
    } else {
      // Basic scoring from verdict
      riskScore = submission.scanReport.verdict === 'PASS' ? 30 :
                  submission.scanReport.verdict === 'ACTION_REQUIRED' ? 60 : 90;
    }
  }
  
  factors.push({
    name: 'Scan Risk',
    weight: config.riskWeight,
    rawValue: riskScore,
    contribution: riskScore * config.riskWeight,
    description: submission.scanReport?.verdict || 'Not scanned'
  });
  
  // 5. Resubmission (previous rejections = needs resolution)
  const resubmitScore = submission.previousRejections > 0 ? 70 : 50;
  factors.push({
    name: 'Resubmission',
    weight: config.correlationWeight,
    rawValue: resubmitScore,
    contribution: resubmitScore * config.correlationWeight,
    description: submission.previousRejections > 0 
      ? `Resubmission #${submission.previousRejections + 1}`
      : 'First submission'
  });
  
  if (submission.previousRejections > 0) {
    reasoning.push(`Resubmission - creator addressed feedback`);
  }
  
  // Calculate final score
  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  // Determine urgency tier
  let urgency: PriorityScore['urgency'];
  if (totalScore >= 75 || submission.daysInQueue >= config.criticalDays) {
    urgency = 'critical';
  } else if (totalScore >= 60 || submission.daysInQueue >= config.urgentDays) {
    urgency = 'high';
  } else if (totalScore >= 40) {
    urgency = 'normal';
  } else {
    urgency = 'low';
  }
  
  // Determine suggested reviewer
  let suggestedReviewer: PriorityScore['suggestedReviewer'];
  if (submission.assetType === 'app') {
    suggestedReviewer = 'specialist'; // Apps need Pablo
  } else if (riskScore >= 70 || submission.creatorTier === 'new') {
    suggestedReviewer = 'senior'; // Complex or new creator
  } else {
    suggestedReviewer = 'any';
  }
  
  return {
    score: Math.round(totalScore),
    factors,
    urgency,
    suggestedReviewer,
    reasoning
  };
}

/**
 * Score time in queue (0-100, exponential urgency)
 */
function scoreTimeInQueue(days: number, config: PriorityScoringConfig): number {
  if (days === 0) return 20;
  if (days <= 2) return 35;
  if (days <= 4) return 50;
  if (days < config.urgentDays) return 60;
  if (days < config.criticalDays) return 80;
  // Exponential urgency after critical threshold
  return Math.min(100, 80 + (days - config.criticalDays) * 5);
}

/**
 * Score creator tier (higher tier = more trust, can fast-track)
 */
function scoreCreatorTier(tier: CreatorTier): number {
  switch (tier) {
    case 'partner': return 80;
    case 'established': return 65;
    case 'returning': return 50;
    case 'new': return 35;
  }
}

/**
 * Score asset type (Apps need more attention)
 */
function scoreAssetType(type: AssetType): number {
  return type === 'app' ? 70 : 50;
}

// ============================================================================
// QUEUE SORTING
// ============================================================================

/**
 * Sort a queue of submissions by priority.
 */
export function sortQueueByPriority(
  submissions: SubmissionContext[],
  config?: PriorityScoringConfig
): Array<SubmissionContext & { priority: PriorityScore }> {
  return submissions
    .map(s => ({
      ...s,
      priority: calculatePriorityScore(s, config)
    }))
    .sort((a, b) => b.priority.score - a.priority.score);
}

/**
 * Filter queue by reviewer type.
 */
export function filterForReviewer(
  queue: Array<SubmissionContext & { priority: PriorityScore }>,
  reviewerType: 'senior' | 'specialist' | 'any'
): Array<SubmissionContext & { priority: PriorityScore }> {
  if (reviewerType === 'any') return queue;
  return queue.filter(s => 
    s.priority.suggestedReviewer === reviewerType ||
    s.priority.suggestedReviewer === 'any'
  );
}
