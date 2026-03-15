/**
 * Pattern Analysis API
 * 
 * Analyzes user events using Cloudflare Workers AI to detect
 * patterns, bottlenecks, and improvement opportunities.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface PatternAnalysisRequest {
  type: 'engagement' | 'error' | 'navigation' | 'search' | 'bottleneck';
  dateRange?: '24h' | '7d' | '30d';
  flowName?: string;  // For bottleneck analysis
}

/**
 * POST /api/events/analyze
 * 
 * Run pattern analysis on collected events
 */
export const POST: RequestHandler = async ({ request, platform }) => {
  const db = platform?.env?.DB;
  const ai = platform?.env?.AI;
  
  if (!db) {
    return json({ error: 'Database not available' }, { status: 503 });
  }
  
  let body: PatternAnalysisRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  const { type, dateRange = '7d', flowName } = body;
  
  // Calculate date threshold
  const dateThresholds: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  const threshold = Date.now() - dateThresholds[dateRange];
  
  try {
    switch (type) {
      case 'engagement':
        return json(await analyzeEngagement(db, ai, threshold));
      case 'error':
        return json(await analyzeErrors(db, ai, threshold));
      case 'bottleneck':
        return json(await analyzeBottlenecks(db, ai, threshold, flowName));
      case 'search':
        return json(await analyzeSearch(db, ai, threshold));
      default:
        return json({ error: 'Unknown analysis type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pattern analysis failed:', error);
    return json({ error: 'Analysis failed' }, { status: 500 });
  }
};

/**
 * Analyze engagement patterns
 */
async function analyzeEngagement(db: any, ai: any, threshold: number) {
  // Get video engagement events
  const events = await db.prepare(`
    SELECT 
      event_type,
      page,
      metadata,
      COUNT(*) as count,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM user_events
    WHERE created_at >= ?
      AND event_type IN ('video_play', 'video_gate_shown', 'video_gate_dismissed', 'video_gate_converted', 'video_complete')
    GROUP BY event_type, page
    ORDER BY count DESC
    LIMIT 50
  `).bind(threshold).all();
  
  const patterns = [];
  
  // Detect gate conversion pattern
  const gateShown = events.results?.filter((e: any) => e.event_type === 'video_gate_shown') || [];
  const gateConverted = events.results?.filter((e: any) => e.event_type === 'video_gate_converted') || [];
  const gateDismissed = events.results?.filter((e: any) => e.event_type === 'video_gate_dismissed') || [];
  
  const totalGates = gateShown.reduce((sum: number, e: any) => sum + e.count, 0);
  const totalConverted = gateConverted.reduce((sum: number, e: any) => sum + e.count, 0);
  const totalDismissed = gateDismissed.reduce((sum: number, e: any) => sum + e.count, 0);
  
  if (totalGates > 0) {
    const conversionRate = (totalConverted / totalGates * 100).toFixed(1);
    const dismissalRate = (totalDismissed / totalGates * 100).toFixed(1);
    
    patterns.push({
      id: `pat_eng_gate_${Date.now()}`,
      type: 'engagement',
      name: 'Video Gate Performance',
      description: `Gate conversion rate is ${conversionRate}%. ${dismissalRate}% of users dismiss the gate without converting.`,
      metrics: {
        totalGatesShown: totalGates,
        conversions: totalConverted,
        dismissals: totalDismissed,
        conversionRate: parseFloat(conversionRate),
        dismissalRate: parseFloat(dismissalRate)
      },
      severity: parseFloat(dismissalRate) > 70 ? 'high' : parseFloat(dismissalRate) > 50 ? 'medium' : 'low',
      suggestion: parseFloat(dismissalRate) > 60 
        ? 'Consider extending preview duration or improving gate messaging'
        : null
    });
  }
  
  // Use AI for deeper analysis if available
  let aiInsights = null;
  if (ai && events.results?.length > 0) {
    try {
      const prompt = `Analyze this video engagement data and identify patterns:
${JSON.stringify(events.results, null, 2)}

Provide 2-3 actionable insights about:
1. User engagement patterns
2. Potential friction points
3. Opportunities for improvement

Keep response concise (under 200 words). Focus on data-backed observations.`;

      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are an analytics expert helping improve a video platform. Be specific and actionable.' },
          { role: 'user', content: prompt }
        ]
      });
      
      aiInsights = response.response;
    } catch (e) {
      console.error('AI analysis failed:', e);
    }
  }
  
  return {
    type: 'engagement',
    patterns,
    rawData: events.results,
    aiInsights,
    analyzedAt: Date.now()
  };
}

/**
 * Analyze error patterns
 */
async function analyzeErrors(db: any, ai: any, threshold: number) {
  const errors = await db.prepare(`
    SELECT 
      error_message,
      page,
      component,
      COUNT(*) as count,
      COUNT(DISTINCT session_id) as affected_sessions,
      MAX(created_at) as last_seen
    FROM user_events
    WHERE created_at >= ?
      AND event_type IN ('error_encountered', 'error_boundary_caught')
      AND error_message IS NOT NULL
    GROUP BY error_message, page
    HAVING COUNT(*) >= 2
    ORDER BY count DESC
    LIMIT 20
  `).bind(threshold).all();
  
  const patterns = (errors.results || []).map((error: any, i: number) => ({
    id: `pat_err_${Date.now()}_${i}`,
    type: 'error',
    name: `Recurring Error: ${error.error_message?.substring(0, 50)}...`,
    description: `Error occurring ${error.count} times on ${error.page}, affecting ${error.affected_sessions} sessions`,
    metrics: {
      occurrences: error.count,
      affectedSessions: error.affected_sessions,
      page: error.page,
      component: error.component,
      lastSeen: error.last_seen
    },
    severity: error.count > 10 ? 'high' : error.count > 5 ? 'medium' : 'low'
  }));
  
  return {
    type: 'error',
    patterns,
    totalErrors: patterns.reduce((sum: number, p: any) => sum + p.metrics.occurrences, 0),
    analyzedAt: Date.now()
  };
}

/**
 * Analyze funnel bottlenecks
 */
async function analyzeBottlenecks(db: any, ai: any, threshold: number, flowName?: string) {
  const flows: Record<string, string[]> = {
    video_consumption: ['video_play', 'video_gate_shown', 'video_gate_converted', 'video_complete'],
    signup: ['page_view', 'signup_started', 'signup_completed'],
    checkout: ['checkout_started', 'checkout_step', 'checkout_completed']
  };
  
  const targetFlow = flowName || 'video_consumption';
  const flowSteps = flows[targetFlow] || flows.video_consumption;
  
  // Get counts for each step
  const stepCounts = await Promise.all(
    flowSteps.map(async (step) => {
      const result = await db.prepare(`
        SELECT COUNT(DISTINCT session_id) as sessions
        FROM user_events
        WHERE created_at >= ? AND event_type = ?
      `).bind(threshold, step).first();
      
      return { step, sessions: result?.sessions || 0 };
    })
  );
  
  // Calculate drop-offs
  const bottlenecks = stepCounts.map((current, i) => {
    const previous = i > 0 ? stepCounts[i - 1] : null;
    const dropOff = previous 
      ? ((previous.sessions - current.sessions) / previous.sessions * 100).toFixed(1)
      : '0';
    
    return {
      step: current.step,
      stepNumber: i + 1,
      sessions: current.sessions,
      dropOffRate: parseFloat(dropOff),
      dropOffFromPrevious: previous ? previous.sessions - current.sessions : 0
    };
  });
  
  // Find worst bottleneck
  const worstBottleneck = bottlenecks
    .filter(b => b.stepNumber > 1)
    .sort((a, b) => b.dropOffRate - a.dropOffRate)[0];
  
  const patterns = [];
  
  if (worstBottleneck && worstBottleneck.dropOffRate > 30) {
    patterns.push({
      id: `pat_bot_${targetFlow}_${Date.now()}`,
      type: 'bottleneck',
      name: `High drop-off at ${worstBottleneck.step}`,
      description: `${worstBottleneck.dropOffRate}% of users drop off at the "${worstBottleneck.step}" step`,
      metrics: worstBottleneck,
      severity: worstBottleneck.dropOffRate > 60 ? 'high' : worstBottleneck.dropOffRate > 40 ? 'medium' : 'low',
      suggestion: worstBottleneck.step === 'video_gate_shown' 
        ? 'Consider adjusting preview duration or gate messaging'
        : 'Investigate friction at this step'
    });
  }
  
  return {
    type: 'bottleneck',
    flow: targetFlow,
    steps: bottlenecks,
    patterns,
    analyzedAt: Date.now()
  };
}

/**
 * Analyze search patterns
 */
async function analyzeSearch(db: any, ai: any, threshold: number) {
  const searches = await db.prepare(`
    SELECT 
      json_extract(metadata, '$.query') as query,
      json_extract(metadata, '$.resultCount') as result_count,
      COUNT(*) as search_count,
      SUM(CASE WHEN json_extract(metadata, '$.resultCount') = 0 THEN 1 ELSE 0 END) as no_results_count
    FROM user_events
    WHERE created_at >= ?
      AND event_type IN ('search_performed', 'search_no_results')
      AND metadata IS NOT NULL
    GROUP BY query
    ORDER BY search_count DESC
    LIMIT 30
  `).bind(threshold).all();
  
  const patterns = [];
  
  // Find queries with no results (content gaps)
  const noResultQueries = (searches.results || [])
    .filter((s: any) => s.no_results_count > 0)
    .map((s: any, i: number) => ({
      id: `pat_search_gap_${Date.now()}_${i}`,
      type: 'search',
      name: `Content gap: "${s.query}"`,
      description: `${s.no_results_count} searches for "${s.query}" returned no results`,
      metrics: {
        query: s.query,
        totalSearches: s.search_count,
        noResultSearches: s.no_results_count
      },
      severity: s.no_results_count > 5 ? 'medium' : 'low'
    }));
  
  patterns.push(...noResultQueries);
  
  return {
    type: 'search',
    patterns,
    topQueries: (searches.results || []).slice(0, 10),
    analyzedAt: Date.now()
  };
}
