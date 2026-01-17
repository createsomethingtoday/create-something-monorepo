/**
 * Client-side Event Tracker
 * 
 * Lightweight utility for tracking user events. Events are batched
 * and sent to the server periodically to minimize network overhead.
 * 
 * Usage:
 *   import { tracker } from '$lib/utils/event-tracker';
 *   
 *   // Track a video gate event
 *   tracker.track('video_gate_shown', {
 *     context: { page: '/watch/123', component: 'VideoPlayer' },
 *     metadata: { videoId: '123', timeShown: 45 }
 *   });
 */
import { browser } from '$app/environment';
import type { EventType, UserEvent, EventContext, ErrorData, PerformanceData } from '$lib/types/events';

// Configuration
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds
const SESSION_KEY = 'pcn_session_id';

/**
 * Generate or retrieve session ID
 */
function getSessionId(): string {
  if (!browser) return 'server';
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Event tracker singleton
 */
class EventTracker {
  private queue: UserEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private userId: string | undefined;
  private enabled: boolean = true;
  
  constructor() {
    this.sessionId = browser ? getSessionId() : 'server';
    
    if (browser) {
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
      
      // Start periodic flush
      this.startFlushTimer();
    }
  }
  
  /**
   * Set user ID (call after login)
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }
  
  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Track an event
   */
  track(
    type: EventType,
    options: {
      context: Partial<EventContext>;
      metadata?: Record<string, unknown>;
      errorData?: ErrorData;
      performance?: PerformanceData;
    }
  ): void {
    if (!this.enabled || !browser) return;
    
    const event: UserEvent = {
      type,
      sessionId: this.sessionId,
      userId: this.userId,
      context: {
        page: window.location.pathname,
        ...options.context
      },
      metadata: options.metadata,
      errorData: options.errorData,
      performance: options.performance
    };
    
    this.queue.push(event);
    
    // Flush if batch is full
    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    }
  }
  
  /**
   * Track page view
   */
  trackPageView(page?: string): void {
    this.track('page_view', {
      context: { 
        page: page || window.location.pathname,
        referrer: document.referrer || undefined
      }
    });
  }
  
  /**
   * Track video events
   */
  trackVideo(
    action: 'play' | 'pause' | 'complete' | 'gate_shown' | 'gate_dismissed' | 'gate_converted',
    videoId: string,
    metadata?: Record<string, unknown>
  ): void {
    const eventMap: Record<string, EventType> = {
      play: 'video_play',
      pause: 'video_pause',
      complete: 'video_complete',
      gate_shown: 'video_gate_shown',
      gate_dismissed: 'video_gate_dismissed',
      gate_converted: 'video_gate_converted'
    };
    
    this.track(eventMap[action], {
      context: { component: 'VideoPlayer', action },
      metadata: { videoId, ...metadata }
    });
  }
  
  /**
   * Track checkout funnel
   */
  trackCheckout(
    step: 'started' | 'step' | 'abandoned' | 'completed',
    metadata?: Record<string, unknown>
  ): void {
    const eventMap: Record<string, EventType> = {
      started: 'checkout_started',
      step: 'checkout_step',
      abandoned: 'checkout_abandoned',
      completed: 'checkout_completed'
    };
    
    this.track(eventMap[step], {
      context: { component: 'Checkout', action: step },
      metadata
    });
  }
  
  /**
   * Track errors
   */
  trackError(error: Error, componentStack?: string): void {
    this.track('error_encountered', {
      context: { component: 'ErrorBoundary' },
      errorData: {
        message: error.message,
        stack: error.stack,
        componentStack,
        errorType: error.name
      }
    });
    
    // Flush immediately for errors
    this.flush();
  }
  
  /**
   * Track search
   */
  trackSearch(query: string, resultCount: number): void {
    const eventType: EventType = resultCount === 0 ? 'search_no_results' : 'search_performed';
    
    this.track(eventType, {
      context: { component: 'Search', action: 'search' },
      metadata: { query, resultCount }
    });
  }
  
  /**
   * Track web vitals
   */
  trackWebVital(metric: 'LCP' | 'FID' | 'CLS', value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const eventMap: Record<string, EventType> = {
      LCP: 'web_vital_lcp',
      FID: 'web_vital_fid',
      CLS: 'web_vital_cls'
    };
    
    this.track(eventMap[metric], {
      context: { component: 'WebVitals' },
      performance: { metric, value, rating }
    });
  }
  
  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, FLUSH_INTERVAL);
  }
  
  /**
   * Flush queued events to server
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || !browser) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      // Use sendBeacon for reliability on page unload
      const useBeacon = document.visibilityState === 'hidden';
      
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/events/track',
          JSON.stringify(events)
        );
      } else {
        await fetch('/api/events/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(events),
          keepalive: true
        });
      }
    } catch (error) {
      // Re-queue events on failure (up to a limit)
      if (this.queue.length < 100) {
        this.queue.unshift(...events);
      }
      console.error('Failed to flush events:', error);
    }
  }
}

// Export singleton instance
export const tracker = browser ? new EventTracker() : {
  setUserId: () => {},
  setEnabled: () => {},
  track: () => {},
  trackPageView: () => {},
  trackVideo: () => {},
  trackCheckout: () => {},
  trackError: () => {},
  trackSearch: () => {},
  trackWebVital: () => {},
  flush: async () => {}
} as EventTracker;

// Export type for external use
export type { EventTracker };
