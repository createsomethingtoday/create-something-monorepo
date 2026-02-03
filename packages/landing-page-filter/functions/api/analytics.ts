interface PagesContext {
  request: Request;
}

// Allowed origins for CORS
const allowedOrigins = [
  'https://templates.webflow.com',
  'https://webflow.com',
  'https://branch--landing-page-template-marketplace-150056.webflow.io',
  'https://branch--landing-page-template-marketplace-459da4.webflow.io',
  'https://branch--landing-page-template-marketplace-62df84.webflow.io'
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

const noCacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function onRequestOptions(context: PagesContext): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(context.request),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  try {
    const corsHeaders = getCorsHeaders(context.request);
    const headers = { 
      ...corsHeaders, 
      ...noCacheHeaders,
      'Content-Type': 'application/json',
    };
    
    const body = await context.request.json() as { events?: unknown[] };
    const { events } = body;

    if (!Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Invalid events format' }),
        { status: 400, headers }
      );
    }

    // Log analytics events
    interface AnalyticsEvent {
      event?: string;
      sessionId?: string;
      url?: string;
      timestamp?: number;
      data?: unknown;
    }
    
    console.log('Analytics Events:', {
      timestamp: new Date().toISOString(),
      count: events.length,
      events: (events as AnalyticsEvent[]).map((event) => ({
        event: event.event,
        sessionId: event.sessionId,
        url: event.url,
        timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : null,
        data: event.data
      }))
    });

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { headers }
    );
  } catch (error) {
    console.error('Analytics processing error:', error);
    const corsHeaders = getCorsHeaders(context.request);
    return new Response(
      JSON.stringify({ error: 'Failed to process analytics' }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          ...noCacheHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
