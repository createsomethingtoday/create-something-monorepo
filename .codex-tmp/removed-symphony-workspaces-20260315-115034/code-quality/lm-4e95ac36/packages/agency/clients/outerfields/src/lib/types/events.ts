/**
 * Event types for user behavior tracking
 * These events feed into the AI-native pattern detection system
 */

/**
 * All trackable event types
 */
export type EventType =
  // Video events
  | 'video_play'
  | 'video_pause'
  | 'video_complete'
  | 'video_gate_shown'
  | 'video_gate_dismissed'
  | 'video_gate_converted'
  
  // Navigation events
  | 'page_view'
  | 'navigation_click'
  
  // Conversion funnel
  | 'checkout_started'
  | 'checkout_step'
  | 'checkout_abandoned'
  | 'checkout_completed'
  | 'signup_started'
  | 'signup_completed'
  | 'login_completed'
  
  // Engagement events
  | 'search_performed'
  | 'search_no_results'
  | 'comment_posted'
  | 'content_shared'
  
  // Error events
  | 'error_encountered'
  | 'error_boundary_caught'
  
  // Performance events
  | 'slow_interaction'
  | 'web_vital_lcp'
  | 'web_vital_fid'
  | 'web_vital_cls';

/**
 * User event payload for tracking API
 */
export interface UserEvent {
  type: EventType;
  sessionId: string;
  userId?: string;
  
  // Context
  context: EventContext;
  
  // Optional data based on event type
  metadata?: Record<string, unknown>;
  errorData?: ErrorData;
  performance?: PerformanceData;
}

/**
 * Event context - where and what triggered the event
 */
export interface EventContext {
  page: string;
  component?: string;
  action?: string;
  referrer?: string;
}

/**
 * Error-specific data
 */
export interface ErrorData {
  message: string;
  stack?: string;
  componentStack?: string;
  errorType?: string;
}

/**
 * Performance-specific data
 */
export interface PerformanceData {
  metric: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Stored event in database
 */
export interface StoredEvent {
  id: string;
  event_type: EventType;
  user_id: string | null;
  session_id: string;
  page: string;
  component: string | null;
  action: string | null;
  metadata: string | null;  // JSON string
  error_message: string | null;
  error_stack: string | null;
  error_component_stack: string | null;
  duration_ms: number | null;
  performance_metric: string | null;
  created_at: number;
}

/**
 * Flow definitions for bottleneck tracking
 */
export const TRACKED_FLOWS = {
  signup: ['page_view', 'signup_started', 'signup_completed'],
  checkout: ['checkout_started', 'checkout_step', 'checkout_completed'],
  video_consumption: ['video_play', 'video_gate_shown', 'video_gate_converted', 'video_complete'],
} as const;

export type FlowName = keyof typeof TRACKED_FLOWS;

/**
 * Pattern types that can be detected
 */
export type PatternType = 'error' | 'bottleneck' | 'engagement' | 'conversion';

/**
 * Severity levels for patterns
 */
export type PatternSeverity = 'low' | 'medium' | 'high';

/**
 * Pattern status
 */
export type PatternStatus = 'detected' | 'analyzed' | 'addressed' | 'dismissed';
