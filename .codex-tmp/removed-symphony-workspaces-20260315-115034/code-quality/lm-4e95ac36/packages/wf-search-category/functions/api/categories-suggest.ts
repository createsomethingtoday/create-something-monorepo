/**
 * Categories Suggest API - Use OpenAI to suggest categories for a search query
 */

interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
}

interface RequestBody {
  searchQuery: string;
  businessContext?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(): Promise<Response> {
  return new Response(
    JSON.stringify({
      message: 'Categories Suggest API',
      usage: 'POST with { searchQuery: string, businessContext?: string }'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { OPENAI_API_KEY, OPENAI_MODEL = 'gpt-3.5-turbo' } = context.env;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: RequestBody = await context.request.json();
    const { searchQuery, businessContext } = body;

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: searchQuery required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextInfo = businessContext ? `\nBusiness context: ${businessContext}` : '';

    const prompt = `Generate 5 relevant website template category suggestions for the search query: "${searchQuery}"${contextInfo}

Return a JSON array of category objects with "name" and "reason" fields.
Categories should be specific and relevant to website templates (e.g., "Restaurant", "Portfolio", "E-commerce", "SaaS", "Agency", etc.)

Example format:
[
  {"name": "Restaurant", "reason": "User searching for food-related business"},
  {"name": "Cafe & Coffee Shop", "reason": "Related food service category"}
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that suggests relevant website template categories. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', response.status, error);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content || '[]';

    // Parse JSON from response
    let suggestions: Array<{ name: string; reason: string }> = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // Fallback: try to extract category names from text
      const lines = content.split('\n').filter(line => line.trim());
      suggestions = lines.slice(0, 5).map(line => ({
        name: line.replace(/^[-*•\d.]\s*/, '').trim(),
        reason: 'Suggested by AI'
      }));
    }

    return new Response(
      JSON.stringify({
        searchQuery,
        suggestions,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Categories suggest error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to suggest categories' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
