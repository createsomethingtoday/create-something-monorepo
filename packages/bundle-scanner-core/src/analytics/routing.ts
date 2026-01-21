/**
 * Smart Routing for Review Queue
 * 
 * Routes submissions to the best-fit reviewer based on:
 * - Asset type expertise (Apps → Pablo)
 * - Category familiarity
 * - Current workload
 * - Historical accuracy
 * 
 * Usage:
 *   const router = new ReviewRouter(reviewers);
 *   const assignment = router.route(submission);
 *   // Returns: { reviewerId: 'pablo', reason: 'App specialist', confidence: 0.95 }
 */

import type { PriorityScore } from './priority';

// ============================================================================
// TYPES
// ============================================================================

export type AssetCategory = 
  | 'portfolio'
  | 'business'
  | 'ecommerce'
  | 'agency'
  | 'blog'
  | 'saas'
  | 'other';

export interface ReviewerProfile {
  id: string;
  name: string;
  
  /** Asset types this reviewer handles */
  assetTypes: ('template' | 'app')[];
  
  /** Category expertise (0-1 for each) */
  categoryExpertise: Partial<Record<AssetCategory, number>>;
  
  /** Can handle complex/risky submissions */
  seniorReviewer: boolean;
  
  /** Current queue size */
  currentWorkload: number;
  
  /** Target queue size (for load balancing) */
  targetWorkload: number;
  
  /** Historical accuracy rate */
  accuracyRate: number;
  
  /** Average review time in hours */
  avgReviewTime: number;
  
  /** Whether currently available */
  available: boolean;
}

export interface SubmissionForRouting {
  id: string;
  assetType: 'template' | 'app';
  category?: AssetCategory;
  priority?: PriorityScore;
  requiresSenior?: boolean;
}

export interface RoutingDecision {
  reviewerId: string;
  reviewerName: string;
  confidence: number;          // 0-1
  reasons: string[];
  alternativeReviewers: string[];
}

export interface RoutingConfig {
  /** Weight for expertise match (default: 0.35) */
  expertiseWeight: number;
  
  /** Weight for workload balance (default: 0.30) */
  workloadWeight: number;
  
  /** Weight for historical accuracy (default: 0.20) */
  accuracyWeight: number;
  
  /** Weight for speed (default: 0.15) */
  speedWeight: number;
  
  /** Max workload factor (reject if > targetWorkload * this) */
  maxWorkloadFactor: number;
}

export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  expertiseWeight: 0.35,
  workloadWeight: 0.30,
  accuracyWeight: 0.20,
  speedWeight: 0.15,
  maxWorkloadFactor: 1.5
};

// ============================================================================
// ROUTER
// ============================================================================

export class ReviewRouter {
  private reviewers: Map<string, ReviewerProfile> = new Map();
  private config: RoutingConfig;
  
  constructor(
    reviewers: ReviewerProfile[] = [],
    config: RoutingConfig = DEFAULT_ROUTING_CONFIG
  ) {
    for (const r of reviewers) {
      this.reviewers.set(r.id, r);
    }
    this.config = config;
  }
  
  /**
   * Add or update a reviewer profile.
   */
  setReviewer(profile: ReviewerProfile): void {
    this.reviewers.set(profile.id, profile);
  }
  
  /**
   * Update a reviewer's workload.
   */
  updateWorkload(reviewerId: string, workload: number): void {
    const reviewer = this.reviewers.get(reviewerId);
    if (reviewer) {
      reviewer.currentWorkload = workload;
    }
  }
  
  /**
   * Route a submission to the best reviewer.
   */
  route(submission: SubmissionForRouting): RoutingDecision {
    const candidates = this.getCandidates(submission);
    
    if (candidates.length === 0) {
      // No available reviewers
      return {
        reviewerId: '',
        reviewerName: '',
        confidence: 0,
        reasons: ['No available reviewers for this submission type'],
        alternativeReviewers: []
      };
    }
    
    // Score each candidate
    const scored = candidates.map(reviewer => ({
      reviewer,
      score: this.scoreReviewer(reviewer, submission),
      reasons: this.explainScore(reviewer, submission)
    }));
    
    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);
    
    const best = scored[0];
    const alternatives = scored.slice(1, 4).map(s => s.reviewer.id);
    
    return {
      reviewerId: best.reviewer.id,
      reviewerName: best.reviewer.name,
      confidence: best.score,
      reasons: best.reasons,
      alternativeReviewers: alternatives
    };
  }
  
  /**
   * Route multiple submissions (batch assignment with load balancing).
   */
  routeBatch(submissions: SubmissionForRouting[]): Map<string, RoutingDecision> {
    const results = new Map<string, RoutingDecision>();
    
    // Copy current workloads
    const workloads = new Map<string, number>();
    for (const [id, r] of this.reviewers) {
      workloads.set(id, r.currentWorkload);
    }
    
    // Sort submissions by priority (if available)
    const sorted = [...submissions].sort((a, b) => {
      const aPriority = a.priority?.score ?? 50;
      const bPriority = b.priority?.score ?? 50;
      return bPriority - aPriority;
    });
    
    // Assign each submission
    for (const sub of sorted) {
      const decision = this.route(sub);
      results.set(sub.id, decision);
      
      // Update simulated workload
      if (decision.reviewerId) {
        const current = workloads.get(decision.reviewerId) || 0;
        workloads.set(decision.reviewerId, current + 1);
        
        // Temporarily update the reviewer's workload for next iteration
        const reviewer = this.reviewers.get(decision.reviewerId);
        if (reviewer) {
          reviewer.currentWorkload = current + 1;
        }
      }
    }
    
    // Restore original workloads
    for (const [id, workload] of workloads) {
      const reviewer = this.reviewers.get(id);
      if (reviewer) {
        reviewer.currentWorkload = workload - 
          [...results.values()].filter(r => r.reviewerId === id).length;
      }
    }
    
    return results;
  }
  
  /**
   * Get eligible candidates for a submission.
   */
  private getCandidates(submission: SubmissionForRouting): ReviewerProfile[] {
    return [...this.reviewers.values()].filter(r => {
      // Must be available
      if (!r.available) return false;
      
      // Must handle this asset type
      if (!r.assetTypes.includes(submission.assetType)) return false;
      
      // Must be senior if required
      if (submission.requiresSenior && !r.seniorReviewer) return false;
      
      // Must not be overloaded
      if (r.currentWorkload > r.targetWorkload * this.config.maxWorkloadFactor) return false;
      
      return true;
    });
  }
  
  /**
   * Score a reviewer for a submission (0-1).
   */
  private scoreReviewer(
    reviewer: ReviewerProfile, 
    submission: SubmissionForRouting
  ): number {
    const { expertiseWeight, workloadWeight, accuracyWeight, speedWeight } = this.config;
    
    // Expertise score
    let expertiseScore = 0.5; // Base score
    if (submission.category && reviewer.categoryExpertise[submission.category]) {
      expertiseScore = reviewer.categoryExpertise[submission.category] || 0.5;
    }
    // Bonus for handling the asset type
    if (reviewer.assetTypes.includes(submission.assetType)) {
      expertiseScore += 0.1;
    }
    expertiseScore = Math.min(1, expertiseScore);
    
    // Workload score (lower workload = higher score)
    const workloadRatio = reviewer.currentWorkload / reviewer.targetWorkload;
    const workloadScore = Math.max(0, 1 - workloadRatio * 0.5);
    
    // Accuracy score
    const accuracyScore = reviewer.accuracyRate;
    
    // Speed score (faster = better)
    // Normalize: assume 8 hours is average, 2 hours is fast, 24 hours is slow
    const speedScore = Math.max(0, Math.min(1, 1 - (reviewer.avgReviewTime - 2) / 22));
    
    // Weighted sum
    const totalScore = 
      expertiseScore * expertiseWeight +
      workloadScore * workloadWeight +
      accuracyScore * accuracyWeight +
      speedScore * speedWeight;
    
    return totalScore;
  }
  
  /**
   * Explain why a reviewer was scored.
   */
  private explainScore(
    reviewer: ReviewerProfile,
    submission: SubmissionForRouting
  ): string[] {
    const reasons: string[] = [];
    
    // Expertise
    if (submission.category && reviewer.categoryExpertise[submission.category]) {
      const expertise = reviewer.categoryExpertise[submission.category] || 0;
      if (expertise >= 0.8) {
        reasons.push(`Expert in ${submission.category} templates`);
      } else if (expertise >= 0.6) {
        reasons.push(`Experienced with ${submission.category}`);
      }
    }
    
    // Asset type specialist
    if (submission.assetType === 'app' && reviewer.assetTypes.includes('app')) {
      reasons.push('App specialist');
    }
    
    // Workload
    const workloadRatio = reviewer.currentWorkload / reviewer.targetWorkload;
    if (workloadRatio < 0.5) {
      reasons.push('Low current workload');
    } else if (workloadRatio > 1) {
      reasons.push('Above target workload');
    }
    
    // Senior
    if (submission.requiresSenior && reviewer.seniorReviewer) {
      reasons.push('Senior reviewer for complex submission');
    }
    
    // Speed
    if (reviewer.avgReviewTime <= 4) {
      reasons.push('Fast turnaround time');
    }
    
    if (reasons.length === 0) {
      reasons.push('Available reviewer');
    }
    
    return reasons;
  }
}

// ============================================================================
// DEFAULT REVIEWER PROFILES
// ============================================================================

/**
 * Default reviewer profiles based on Webflow Marketplace team data.
 * These should be updated with real data from Airtable.
 */
export const DEFAULT_REVIEWERS: ReviewerProfile[] = [
  {
    id: 'mariana',
    name: 'Mariana Segura',
    assetTypes: ['template'],
    categoryExpertise: { portfolio: 0.9, business: 0.8, agency: 0.8 },
    seniorReviewer: true,
    currentWorkload: 0,
    targetWorkload: 15,
    accuracyRate: 0.95,
    avgReviewTime: 4,
    available: true
  },
  {
    id: 'natalia',
    name: 'Natalia Ledford',
    assetTypes: ['template'],
    categoryExpertise: { ecommerce: 0.85, business: 0.8, saas: 0.75 },
    seniorReviewer: true,
    currentWorkload: 0,
    targetWorkload: 12,
    accuracyRate: 0.93,
    avgReviewTime: 5,
    available: true
  },
  {
    id: 'sudiksha',
    name: 'Sudiksha Khanduja',
    assetTypes: ['template'],
    categoryExpertise: { blog: 0.9, portfolio: 0.75, other: 0.7 },
    seniorReviewer: false,
    currentWorkload: 0,
    targetWorkload: 10,
    accuracyRate: 0.88,
    avgReviewTime: 6,
    available: true
  },
  {
    id: 'pablo',
    name: 'Pablo Miranda',
    assetTypes: ['app', 'template'],
    categoryExpertise: { saas: 0.95, ecommerce: 0.7 },
    seniorReviewer: true,
    currentWorkload: 0,
    targetWorkload: 8,
    accuracyRate: 0.96,
    avgReviewTime: 8,
    available: true
  },
  {
    id: 'vicki',
    name: 'Vicki Chen',
    assetTypes: ['template'],
    categoryExpertise: { portfolio: 0.8, agency: 0.75, business: 0.7 },
    seniorReviewer: false,
    currentWorkload: 0,
    targetWorkload: 8,
    accuracyRate: 0.85,
    avgReviewTime: 7,
    available: true
  },
  {
    id: 'eric',
    name: 'Eric Unger',
    assetTypes: ['template'],
    categoryExpertise: { business: 0.85, ecommerce: 0.8 },
    seniorReviewer: false,
    currentWorkload: 0,
    targetWorkload: 8,
    accuracyRate: 0.87,
    avgReviewTime: 6,
    available: true
  }
];
