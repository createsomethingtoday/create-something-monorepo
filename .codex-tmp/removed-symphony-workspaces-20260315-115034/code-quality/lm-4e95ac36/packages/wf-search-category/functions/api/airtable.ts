/**
 * Airtable API - Fetch categories from Airtable
 */

interface Env {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_BASE?: string;
  AIRTABLE_TABLE?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const AIRTABLE_API_KEY = context.env.AIRTABLE_API_KEY || context.env.AIRTABLE_KEY;
  const AIRTABLE_BASE_ID = context.env.AIRTABLE_BASE_ID || context.env.AIRTABLE_BASE;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return new Response(
      JSON.stringify({ error: 'Airtable not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Use table ID or name - default to the Categories table ID
    const tableName = context.env.AIRTABLE_TABLE || 'tblSygBX7adZ4VNjK';
    
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams();
      params.set('pageSize', '100');
      if (offset) params.set('offset', offset);

      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Airtable error:', response.status, error);
        throw new Error(`Airtable error: ${response.status}`);
      }

      const data: AirtableResponse = await response.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    // Return raw Airtable fields so client-side script can process them
    // The script expects fields with emoji names like 🥞CMS Slug, 🪣Category Group Display Names, etc.
    const categories = allRecords
      .map(record => {
        const fields = record.fields;
        const name = String(fields['Name'] || '').trim();
        
        // Return all fields for the client-side script to process
        return {
          id: record.id,
          name,
          // Include raw Airtable fields with emoji names
          'Name': name,
          '🥞CMS Slug': fields['🥞CMS Slug'] || '',
          '🥞CMS Status': fields['🥞CMS Status'] || '',
          '🪣Category Group Display Names': fields['🪣Category Group Display Names'] || '',
          '🪣Category Group CMS Slug': fields['🪣Category Group CMS Slug'] || '',
          'ℹ️Description (Short)': fields['ℹ️Description (Short)'] || '',
          '🆎Asset Type': fields['🆎Asset Type'] || '',
          '#️⃣👛Published': fields['#️⃣👛Published'] || 0,
          '#️⃣👛Total': fields['#️⃣👛Total'] || 0,
          '🔑Keywords': fields['🔑Keywords'] || '',
          '🔑Keyword Default Weight': fields['🔑Keyword Default Weight'] || 0.5,
          // Also include simplified versions for other uses
          slug: fields['🥞CMS Slug'] || '',
          description: fields['ℹ️Description (Short)'] || '',
          itemCount: fields['#️⃣👛Published'] || 0,
          isActive: fields['🥞CMS Status'] === 'Active',
        };
      })
      .filter(c => c.name);

    return new Response(
      JSON.stringify({ categories, total: categories.length, timestamp: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    console.error('Airtable API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch categories' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
