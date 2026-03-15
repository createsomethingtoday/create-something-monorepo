interface PagesContext {
  request: Request;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const templatePath = url.searchParams.get('path');
    
    if (!templatePath) {
      return new Response(
        JSON.stringify({ error: 'Template path is required' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate that it's a legitimate template path
    if (!templatePath.startsWith('/templates/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid template path' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const webflowUrl = `https://webflow.com${templatePath}`;
    console.log(`[Template Proxy] Fetching: ${webflowUrl}`);
    
    const response = await fetch(webflowUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TemplateProxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      console.error(`[Template Proxy] HTTP ${response.status} for ${webflowUrl}`);
      return new Response(
        JSON.stringify({ error: `Template fetch failed: ${response.status}` }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const content = await response.text();
    console.log(`[Template Proxy] Successfully fetched ${content.length} bytes for ${templatePath}`);
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...corsHeaders,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
    
  } catch (error) {
    console.error(`[Template Proxy] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch template content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
