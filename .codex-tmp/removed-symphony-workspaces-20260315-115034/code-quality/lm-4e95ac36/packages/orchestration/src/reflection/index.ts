/**
 * @create-something/orchestration
 *
 * Agent reflection module.
 *
 * Philosophy: Like RoboDev's "sleep" phase, agents need time to reorganize
 * their memory. This module analyzes completed work to extract learnings
 * that improve future performance.
 *
 * The reflection loop:
 * 1. Analyze completed convoy/session
 * 2. Extract learnings from corrections, failures, inefficiencies
 * 3. Persist learnings to Git
 * 4. Optionally apply learnings to .claude/rules/ files
 * 5. Future agents benefit from accumulated wisdom
 */

// Types
export type {
  Learning,
  LearningType,
  LearningSource,
  ReflectionResult,
  ReflectionTarget,
  ReflectionStats,
  IssueMetrics,
  ReflectionConfig,
  StoredReflection,
} from './types.js';

export { DEFAULT_REFLECTION_CONFIG } from './types.js';

// Analysis
export {
  analyzeConvoy,
  analyzeEpic,
  identifyCorrections,
  identifyFailurePatterns,
} from './analyzer.js';

// Learning extraction
export { extractLearnings } from './extractor.js';

// Storage and application
export {
  saveReflection,
  loadReflection,
  listReflections,
  applyLearning,
  applyAllLearnings,
  getPendingLearningSummary,
  generateLearningsReport,
} from './store.js';
