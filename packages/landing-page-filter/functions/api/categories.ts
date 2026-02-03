import { getCategories } from '../../lib/categories';
import type { Env } from '../../lib/airtable';

interface PagesContext {
  request: Request;
  env: Env;
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function getCacheHeaders() {
  return {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    'CDN-Cache-Control': 'public, max-age=86400',
  };
}

export async function onRequestOptions(context: PagesContext): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(context.request),
  });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    const corsHeaders = getCorsHeaders(context.request);
    const cacheHeaders = getCacheHeaders();
    const headers = { ...corsHeaders, ...cacheHeaders, 'Content-Type': 'application/json' };
    
    const url = new URL(context.request.url);
    const hierarchical = url.searchParams.get('hierarchical') === 'true';
    const templateType = (url.searchParams.get('type') || 'onepage') as 'onepage' | 'free' | 'featured';
    
    const categoriesResponse = await getCategories(context.env, hierarchical, templateType);
    
    return new Response(JSON.stringify(categoriesResponse), { headers });
  } catch (error) {
    console.error('Categories API error:', error);
    
    const corsHeaders = getCorsHeaders(context.request);
    
    return new Response(
      JSON.stringify({ error: 'Failed to fetch categories' }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  }
}
