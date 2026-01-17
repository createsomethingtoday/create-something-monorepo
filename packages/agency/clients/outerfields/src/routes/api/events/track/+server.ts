/**
 * Event Tracking API
 * 
 * Captures user behavior events for AI-native pattern detection.
 * Events are stored in D1 and analyzed to identify:
 * - Bottlenecks in user flows
 * - Error patterns
 * - Engagement patterns
 * - Conversion opportunities
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { UserEvent, EventType, StoredEvent } from '$lib/types/events';

/**
 * Valid event types (for validation)
 */
const VALID_EVENT_TYPES: EventType[] = [
  'video_play', 'video_pause', 'video_complete',
  'video_gate_shown', 'video_gate_dismissed', 'video_gate_converted',
  'page_view', 'navigation_click',
  'checkout_started', 'checkout_step', 'checkout_abandoned', 'checkout_completed',
  'signup_started', 'signup_completed', 'login_completed',
  'search_performed', 'search_no_results',
  'comment_posted', 'content_shared',
  'error_encountered', 'error_boundary_caught',
  'slow_interaction', 'web_vital_lcp', 'web_vital_fid', 'web_vital_cls'
];

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * POST /api/events/track
 * 
 * Track a single user event or batch of events
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    // Silently fail in development - events are optional
    return json({ success: true, stored: false, reason: 'no_database' });
  }
  
  let body: UserEvent | UserEvent[];
  
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  // Handle single event or batch
  const events = Array.isArray(body) ? body : [body];
  
  if (events.length === 0) {
    return json({ error: 'No events provided' }, { status: 400 });
  }
  
  // Limit batch size
  if (events.length > 50) {
    return json({ error: 'Batch size exceeds limit of 50 events' }, { status: 400 });
  }
  
  // Get user ID from session if available
  const userId = locals.user?.id || null;
  
  const storedEvents: string[] = [];
  const errors: string[] = [];
  
  for (const event of events) {
    // Validate event
    if (!event.type || !VALID_EVENT_TYPES.includes(event.type)) {
      errors.push(`Invalid event type: ${event.type}`);
      continue;
    }
    
    if (!event.sessionId) {
      errors.push('Missing sessionId');
      continue;
    }
    
    if (!event.context?.page) {
      errors.push('Missing context.page');
      continue;
    }
    
    const eventId = generateEventId();
    
    try {
      await db.prepare(`
        INSERT INTO user_events (
          id, event_type, user_id, session_id,
          page, component, action,
          metadata,
          error_message, error_stack, error_component_stack,
          duration_ms, performance_metric,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        eventId,
        event.type,
        event.userId || userId,
        event.sessionId,
        event.context.page,
        event.context.component || null,
        event.context.action || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.errorData?.message || null,
        event.errorData?.stack || null,
        event.errorData?.componentStack || null,
        event.performance?.value || null,
        event.performance?.metric || null,
        Date.now()
      ).run();
      
      storedEvents.push(eventId);
    } catch (error) {
      console.error('Failed to store event:', error);
      errors.push(`Failed to store event: ${event.type}`);
    }
  }
  
  return json({
    success: errors.length === 0,
    stored: storedEvents.length,
    failed: errors.length,
    eventIds: storedEvents,
    errors: errors.length > 0 ? errors : undefined
  });
};

/**
 * GET /api/events/track
 * 
 * Retrieve recent events (admin only)
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  
  if (!db) {
    return json({ events: [], total: 0 });
  }
  
  // Check if user is admin (you'd implement proper admin check here)
  // For now, just allow access for debugging
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
  const eventType = url.searchParams.get('type');
  const page = url.searchParams.get('page');
  
  let query = 'SELECT * FROM user_events';
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  
  if (eventType) {
    conditions.push('event_type = ?');
    params.push(eventType);
  }
  
  if (page) {
    conditions.push('page = ?');
    params.push(page);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  try {
    const result = await db.prepare(query).bind(...params).all<StoredEvent>();
    
    return json({
      events: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return json({ events: [], total: 0, error: 'Failed to fetch events' });
  }
};
