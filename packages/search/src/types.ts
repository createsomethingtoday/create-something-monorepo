/**
 * Unified Search Types
 *
 * Shared types for cross-property search and discovery.
 * Canon: Types reveal structure. Structure enables understanding.
 */

// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface Env {
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  DB_SPACE: D1Database;
  DB_IO: D1Database;
  DB_LTD: D1Database;
  DB_AGENCY: D1Database;
  SEARCH_CACHE: KVNamespace;
  ENVIRONMENT: string;
}

// =============================================================================
// PROPERTY TYPES
// =============================================================================

/**
 * CREATE SOMETHING properties (modes of being)
 */
export type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';

/**
 * Content types across properties
 */
export type ContentType =
  | 'paper'       // Research papers (.io)
  | 'experiment'  // Interactive experiments (.space, .io)
  | 'lesson'      // LMS lessons
  | 'principle'   // Design principles (.ltd)
  | 'pattern'     // Design patterns (.ltd)
  | 'master'      // Design masters (.ltd)
  | 'service'     // Services (.agency)
  | 'case-study'; // Case studies (.agency)

/**
 * Property display information
 */
export const PROPERTY_INFO: Record<Property, { name: string; verb: string; icon: string; url: string }> = {
  space: { name: '.space', verb: 'Explore', icon: '🧪', url: 'https://createsomething.space' },
  io: { name: '.io', verb: 'Learn', icon: '📖', url: 'https://createsomething.io' },
  agency: { name: '.agency', verb: 'Build', icon: '🔨', url: 'https://createsomething.agency' },
  ltd: { name: '.ltd', verb: 'Canon', icon: '📜', url: 'https://createsomething.ltd' },
  lms: { name: 'LMS', verb: 'Study', icon: '📚', url: 'https://learn.createsomething.space' },
};

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Search request
 */
export interface SearchRequest {
  /** Search query (natural language) */
  query: string;

  /** Filter by properties (optional) */
  properties?: Property[];

  /** Filter by content types (optional) */
  types?: ContentType[];

  /** Maximum results to return */
  limit?: number;

  /** Include related content in results */
  includeRelated?: boolean;
}

/**
 * Search result item
 */
export interface SearchResult {
  /** Unique identifier */
  id: string;

  /** Content title */
  title: string;

  /** Short description/excerpt */
  description: string;

  /** Which property this content belongs to */
  property: Property;

  /** Content type */
  type: ContentType;

  /** Canonical URL */
  url: string;

  /** URL path within the property */
  path: string;

  /** Semantic similarity score (0-1) */
  score: number;

  /** Associated concepts/tags */
  concepts?: string[];

  /** Related content IDs (from knowledge graph) */
  related?: RelatedItem[];
}

/**
 * Related content item (lighter weight)
 */
export interface RelatedItem {
  id: string;
  title: string;
  property: Property;
  type: ContentType;
  url: string;
  relationshipType: 'concept' | 'cross-reference' | 'semantic' | 'explicit';
}

/**
 * Search response
 */
export interface SearchResponse {
  /** Search results */
  results: SearchResult[];

  /** Results grouped by property */
  byProperty: Record<Property, SearchResult[]>;

  /** Total results found */
  total: number;

  /** Query that was searched */
  query: string;

  /** Time taken in ms */
  took: number;
}

// =============================================================================
// STORY MODE TYPES
// =============================================================================

/**
 * Concept story - traces a concept across all properties
 */
export interface ConceptStory {
  /** The concept being traced */
  concept: string;

  /** Canonical description */
  description: string;

  /** Content organized by journey stage */
  journey: {
    /** Canon definition (.ltd) */
    canon?: SearchResult[];

    /** Research/documentation (.io) */
    learn?: SearchResult[];

    /** Interactive experiments (.space) */
    explore?: SearchResult[];

    /** Structured lessons (LMS) */
    study?: SearchResult[];

    /** Applied examples (.agency) */
    apply?: SearchResult[];
  };

  /** Total pieces of content */
  totalContent: number;
}

// =============================================================================
// INDEX TYPES
// =============================================================================

/**
 * Content to be indexed
 */
export interface IndexableContent {
  /** Unique ID (property:type:slug) */
  id: string;

  /** Content title */
  title: string;

  /** Description/excerpt */
  description: string;

  /** Full content for embedding */
  content: string;

  /** Property */
  property: Property;

  /** Content type */
  type: ContentType;

  /** URL path */
  path: string;

  /** Associated concepts */
  concepts: string[];

  /** Content hash for change detection */
  hash: string;

  /** Last modified timestamp */
  lastModified: string;
}

/**
 * Vectorize metadata (stored with embeddings)
 */
export interface VectorMetadata {
  title: string;
  description: string;
  property: Property;
  type: ContentType;
  path: string;
  concepts: string;  // JSON stringified array
  indexed_at: number;
}
