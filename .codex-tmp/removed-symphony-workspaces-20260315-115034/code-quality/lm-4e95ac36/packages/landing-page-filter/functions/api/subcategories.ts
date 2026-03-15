import { subcategoryData } from '../../lib/subcategory-data';

interface PagesContext {
  request: Request;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  try {
    console.log('API: Loading subcategories from static data');
    
    let subcategories: Array<{id: string; name: string; slug: string}> = [];
    
    if (subcategoryData.all_subcategories && Array.isArray(subcategoryData.all_subcategories)) {
      subcategories = subcategoryData.all_subcategories.map((name: string, index: number) => ({
        id: `subcategory-${index + 1}`,
        name,
        slug: name.toLowerCase()
          .replace(/[&]/g, 'and')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      }));
      
      console.log(`Loaded ${subcategories.length} subcategories from bundled data`);
    }

    const response = {
      subcategories,
      total: subcategories.length,
      source: 'bundled-data',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('API Error in /api/subcategories:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load subcategories',
        subcategories: [],
        total: 0,
        source: 'error'
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
