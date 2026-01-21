/**
 * Analytics Module
 * 
 * Provides correlation analysis and priority scoring for
 * understanding which validation signals predict review outcomes.
 */

export {
  CorrelationAnalyzer,
  scoreSubmissionPriority,
  type ReviewOutcome,
  type RecordedSubmission,
  type RuleCorrelation,
  type CorrelationReport,
  type CategoryInsight
} from './correlation';

export {
  calculatePriorityScore,
  sortQueueByPriority,
  filterForReviewer,
  DEFAULT_CONFIG as DEFAULT_PRIORITY_CONFIG,
  type AssetType,
  type CreatorTier,
  type SubmissionContext,
  type PriorityScore,
  type PriorityFactor,
  type PriorityScoringConfig
} from './priority';

export {
  ReviewRouter,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_REVIEWERS,
  type AssetCategory,
  type ReviewerProfile,
  type SubmissionForRouting,
  type RoutingDecision,
  type RoutingConfig
} from './routing';
