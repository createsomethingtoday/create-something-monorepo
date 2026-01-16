/**
 * Orchestration Utilities
 * 
 * Timeline management, sequencing, and scene planning helpers.
 * The invisible conductor that makes motion graphics feel coherent.
 */

export { Timeline, createTimeline, type TimelineEntry } from './timeline.js';
export { ScenePlanner, type PlannerConfig } from './planner.js';
export { 
  easeIn, 
  easeOut, 
  easeInOut, 
  springConfig,
  type SpringConfig,
} from './easing.js';
