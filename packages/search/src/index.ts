/**
 * Unified Search Worker
 *
 * Cross-property semantic search across CREATE SOMETHING.
 * Canon: Search reveals connection. Connection reveals meaning.
 *
 * Endpoints:
 * - POST /search - Semantic search with property/type filtering
 * - GET /related/:id - Get related content using knowledge graph edges
 * - GET /story/:concept - Trace a concept across all properties
 * - GET /health - Health check
 */

import type {
  Env,
  SearchRequest,
  SearchResponse,
  SearchResult,
  RelatedItem,
  ConceptStory,
  Property,
  ContentType,
  VectorMetadata,
} from './types';
import { indexAllContent, type IndexResult } from './indexer';

// =============================================================================
// CORS HEADERS
// =============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse<T>(data: T, status = 200): Response {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embedding for a search query using Workers AI
 */
async function generateQueryEmbedding(query: string, ai: Ai): Promise<number[]> {
  const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: [query],
  });

  // Workers AI returns { data: number[][] }
  if (!response.data || !response.data[0]) {
    throw new Error('Failed to generate embedding');
  }

  return response.data[0];
}

// =============================================================================
// PROPERTY URL HELPERS
// =============================================================================

const PROPERTY_URLS: Record<Property, string> = {
  space: 'https://createsomething.space',
  io: 'https://createsomething.io',
  agency: 'https://createsomething.agency',
  ltd: 'https://createsomething.ltd',
  lms: 'https://learn.createsomething.space',
};

function buildUrl(property: Property, path: string): string {
  return `${PROPERTY_URLS[property]}${path}`;
}

// =============================================================================
// SEARCH HANDLER
// =============================================================================

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();

  let body: SearchRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { query, properties, types, limit = 20, includeRelated = false } = body;

  if (!query || typeof query !== 'string') {
    return errorResponse('Query is required');
  }

  if (query.length > 500) {
    return errorResponse('Query too long (max 500 characters)');
  }

  try {
    // 1. Generate embedding for query
    const embedding = await generateQueryEmbedding(query, env.AI);

    // 2. Query Vectorize (cap at 20 for returnMetadata: 'all')
    const topK = Math.min(limit * 2, 20);
    const vectorResults = await env.VECTORIZE.query(embedding, {
      topK,
      returnMetadata: 'all',
    });

    // 3. Filter and transform results
    let results: SearchResult[] = vectorResults.matches
      .map((match) => {
        const meta = match.metadata as unknown as VectorMetadata;
        if (!meta) return null;

        // Apply filters
        if (properties && properties.length > 0) {
          if (!properties.includes(meta.property as Property)) return null;
        }
        if (types && types.length > 0) {
          if (!types.includes(meta.type as ContentType)) return null;
        }

        const property = meta.property as Property;
        const concepts = meta.concepts ? JSON.parse(meta.concepts) : [];

        return {
          id: match.id,
          title: meta.title,
          description: meta.description,
          property,
          type: meta.type as ContentType,
          url: buildUrl(property, meta.path),
          path: meta.path,
          score: match.score,
          concepts,
          related: includeRelated ? [] : undefined, // Populated separately if needed
        } satisfies SearchResult;
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, limit);

    // 4. Group by property
    const byProperty: Record<Property, SearchResult[]> = {
      space: [],
      io: [],
      agency: [],
      ltd: [],
      lms: [],
    };

    for (const result of results) {
      byProperty[result.property].push(result);
    }

    // 5. Optionally fetch related content
    if (includeRelated && results.length > 0) {
      // For now, use concept-based relationships from the results themselves
      // This can be enhanced with knowledge graph edges later
      const allConcepts = new Set<string>();
      results.forEach(r => r.concepts?.forEach(c => allConcepts.add(c)));

      // Find results that share concepts
      for (const result of results) {
        const related: RelatedItem[] = [];
        for (const other of results) {
          if (other.id === result.id) continue;
          
          const sharedConcepts = result.concepts?.filter(c => 
            other.concepts?.includes(c)
          ) || [];
          
          if (sharedConcepts.length > 0) {
            related.push({
              id: other.id,
              title: other.title,
              property: other.property,
              type: other.type,
              url: other.url,
              relationshipType: 'concept',
            });
          }
        }
        result.related = related.slice(0, 3);
      }
    }

    const response: SearchResponse = {
      results,
      byProperty,
      total: results.length,
      query,
      took: Date.now() - startTime,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse('Search failed', 500);
  }
}

// =============================================================================
// RELATED CONTENT HANDLER
// =============================================================================

async function handleRelated(id: string, env: Env): Promise<Response> {
  if (!id) {
    return errorResponse('ID is required');
  }

  try {
    // Parse the ID to extract info (format: property:type:slug)
    const [property, type, ...slugParts] = id.split(':');
    const slug = slugParts.join(':');
    
    if (!property || !type || !slug) {
      return errorResponse('Invalid ID format. Expected: property:type:slug');
    }

    // Search for content similar to this item using its slug as a query
    // Convert slug to readable text (replace hyphens with spaces)
    const searchQuery = slug.replace(/-/g, ' ');
    
    const embedding = await generateQueryEmbedding(searchQuery, env.AI);
    const vectorResults = await env.VECTORIZE.query(embedding, {
      topK: 15,
      returnMetadata: 'all',
    });

    // Find the original item and related items
    let title = '';
    const related: RelatedItem[] = [];
    
    for (const match of vectorResults.matches) {
      const meta = match.metadata as unknown as VectorMetadata;
      if (!meta) continue;
      
      if (match.id === id) {
        // This is the original item
        title = meta.title;
      } else {
        // This is a related item
        related.push({
          id: match.id,
          title: meta.title,
          property: meta.property as Property,
          type: meta.type as ContentType,
          url: buildUrl(meta.property as Property, meta.path),
          relationshipType: 'semantic',
        });
      }
    }

    // If we didn't find the title, use the slug
    if (!title) {
      title = searchQuery.replace(/\b\w/g, c => c.toUpperCase());
    }

    return jsonResponse({
      id,
      title,
      related: related.slice(0, 10),
      total: related.length,
    });
  } catch (error) {
    console.error('Related content error:', error);
    return errorResponse('Failed to get related content', 500);
  }
}

// =============================================================================
// STORY MODE HANDLER
// =============================================================================

async function handleStory(concept: string, env: Env): Promise<Response> {
  if (!concept) {
    return errorResponse('Concept is required');
  }

  try {
    // Search for content related to this concept
    const embedding = await generateQueryEmbedding(concept, env.AI);
    
    const results = await env.VECTORIZE.query(embedding, {
      topK: 50,
      returnMetadata: 'all',
    });

    // Organize results by property/journey stage
    const journey: ConceptStory['journey'] = {
      canon: [],
      learn: [],
      explore: [],
      study: [],
      apply: [],
    };

    for (const match of results.matches) {
      const meta = match.metadata as unknown as VectorMetadata;
      if (!meta) continue;

      const property = meta.property as Property;
      const concepts = meta.concepts ? JSON.parse(meta.concepts) : [];

      const result: SearchResult = {
        id: match.id,
        title: meta.title,
        description: meta.description,
        property,
        type: meta.type as ContentType,
        url: buildUrl(property, meta.path),
        path: meta.path,
        score: match.score,
        concepts,
      };

      // Map property to journey stage
      switch (property) {
        case 'ltd':
          journey.canon!.push(result);
          break;
        case 'io':
          journey.learn!.push(result);
          break;
        case 'space':
          journey.explore!.push(result);
          break;
        case 'lms':
          journey.study!.push(result);
          break;
        case 'agency':
          journey.apply!.push(result);
          break;
      }
    }

    // Limit each stage
    const limit = 5;
    journey.canon = journey.canon!.slice(0, limit);
    journey.learn = journey.learn!.slice(0, limit);
    journey.explore = journey.explore!.slice(0, limit);
    journey.study = journey.study!.slice(0, limit);
    journey.apply = journey.apply!.slice(0, limit);

    const totalContent = Object.values(journey).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );

    const story: ConceptStory = {
      concept,
      description: `Explore "${concept}" across all CREATE SOMETHING properties.`,
      journey,
      totalContent,
    };

    return jsonResponse(story);
  } catch (error) {
    console.error('Story error:', error);
    return errorResponse('Failed to get concept story', 500);
  }
}

// =============================================================================
// INDEX HANDLER (ADMIN)
// =============================================================================

async function handleIndex(request: Request, env: Env): Promise<Response> {
  // Simple auth check (can be enhanced)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const result = await indexAllContent(env);
    return jsonResponse(result);
  } catch (error) {
    console.error('Index error:', error);
    return errorResponse('Indexing failed', 500);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    // Route handlers
    try {
      // POST /search
      if (path === '/search' && request.method === 'POST') {
        return handleSearch(request, env);
      }

      // GET /related/:id
      if (path.startsWith('/related/') && request.method === 'GET') {
        const id = decodeURIComponent(path.slice('/related/'.length));
        return handleRelated(id, env);
      }

      // GET /story/:concept
      if (path.startsWith('/story/') && request.method === 'GET') {
        const concept = decodeURIComponent(path.slice('/story/'.length));
        return handleStory(concept, env);
      }

      // POST /admin/index - Trigger re-indexing
      if (path === '/admin/index' && request.method === 'POST') {
        return handleIndex(request, env);
      }

      // GET /health
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT,
        });
      }

      // 404 for unknown routes
      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
