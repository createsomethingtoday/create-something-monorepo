/**
 * Orchestration Utilities
 * 
 * Timeline management, sequencing, and scene planning helpers.
 * The invisible conductor that makes motion graphics feel coherent.
 */

export { Timeline, createTimeline, quickTimeline, type TimelineEntry } from './timeline';
export { ScenePlanner, type PlannerConfig } from './planner';
export { 
  easeIn, 
  easeOut, 
  easeInOut, 
  springConfig,
  type SpringConfig,
} from './easing';
