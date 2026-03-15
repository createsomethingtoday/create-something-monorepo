/**
 * Categories Select API - Use OpenAI to select relevant categories
 */

interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface RequestBody {
  searchQuery: string;
  availableCategories: Category[];
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
      message: 'Categories Select API',
      usage: 'POST with { searchQuery: string, availableCategories: Array<{id,name,description,...} > }'
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
    const { searchQuery, availableCategories } = body;

    if (!searchQuery || !Array.isArray(availableCategories)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: searchQuery and availableCategories required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build category list for prompt
    const categoryList = availableCategories
      .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
      .join('\n');

    const prompt = `Given the search query "${searchQuery}", select the most relevant categories from this list.
Return only the category names that are most relevant, one per line.
Available categories:
${categoryList}

Return the top 5 most relevant category names only, nothing else.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that selects relevant website template categories based on search queries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', response.status, error);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content || '';

    // Parse selected categories - extract name before any colon/description
    const selectedNames = content
      .split('\n')
      .map(line => {
        // Remove bullet points, numbers, dashes
        let name = line.replace(/^[-*•\d.)\s]+/, '').trim();
        // Take only the part before colon (if any) - AI often returns "Name: description"
        if (name.includes(':')) {
          name = name.split(':')[0].trim();
        }
        return name;
      })
      .filter(name => name.length > 0);

    // Match back to original categories with relevance scores
    const categories = selectedNames
      .map((name, index) => {
        const nameLower = name.toLowerCase();
        const found = availableCategories.find(c => {
          const catNameLower = c.name.toLowerCase();
          return catNameLower === nameLower ||
            catNameLower.includes(nameLower) ||
            nameLower.includes(catNameLower);
        });
        if (found) {
          return {
            id: found.id,
            name: found.name,
            relevance: 0.95 - (index * 0.05), // Decreasing relevance by order
            reason: `Matched search term "${searchQuery}"`
          };
        }
        return null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return new Response(
      JSON.stringify({
        categories, // Format expected by client
        searchQuery,
        reasoning: content,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Categories select error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to select categories' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
