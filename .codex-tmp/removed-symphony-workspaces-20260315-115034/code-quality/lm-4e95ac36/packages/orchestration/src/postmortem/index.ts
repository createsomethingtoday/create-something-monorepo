/**
 * @create-something/orchestration
 *
 * Postmortem module.
 *
 * Philosophy: Every incident is a learning opportunity. This module provides
 * tools to analyze incidents, identify root causes, and generate prevention
 * rules that close the loop between incidents and future prevention.
 *
 * The postmortem loop:
 * 1. Create postmortem from incident issue
 * 2. Analyze root cause (automated + human review)
 * 3. Generate prevention rules
 * 4. Apply rules to .claude/rules/ files
 * 5. Future agents catch the pattern before it causes problems
 */

// Types
export type {
  Postmortem,
  RootCause,
  RootCauseCategory,
  Impact,
  TimelineEvent,
  PreventionRule,
  PostmortemStatus,
  PostmortemConfig,
  StoredPostmortem,
} from './types.js';

export { DEFAULT_POSTMORTEM_CONFIG } from './types.js';

// Analysis
export {
  createPostmortem,
  analyzeRootCause,
  generatePreventionRules,
} from './analyzer.js';

// Storage
export {
  savePostmortem,
  loadPostmortem,
  listPostmortems,
  updatePostmortemStatus,
  applyPreventionRule,
  applyAllRules,
  formatPostmortemReport,
} from './store.js';
