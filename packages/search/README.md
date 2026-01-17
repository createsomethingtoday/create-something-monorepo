# @create-something/search

Unified semantic search across CREATE SOMETHING properties.

> "The full story, at your fingertips."

## Philosophy

Each CREATE SOMETHING property represents a distinct "mode of being" in the ecosystem:

- **.space** (Explore) - Interactive experiments
- **.io** (Learn) - Research papers and documentation
- **.agency** (Build) - Services and case studies
- **.ltd** (Canon) - Principles and patterns
- **LMS** (Study) - Structured lessons

Unified search reveals the connections between these modes, enabling users to discover the "full story" of any concept.

## API Endpoints

### POST /search

Semantic search across all properties.

```typescript
// Request
{
  query: string;          // Natural language query
  properties?: Property[]; // Filter by property (optional)
  types?: ContentType[];   // Filter by content type (optional)
  limit?: number;          // Max results (default: 20)
  includeRelated?: boolean; // Include related content (default: false)
}

// Response
{
  results: SearchResult[];
  byProperty: Record<Property, SearchResult[]>;
  total: number;
  query: string;
  took: number; // milliseconds
}
```

### GET /related/:id

Get related content for a specific item.

```typescript
// Response
{
  id: string;
  title: string;
  related: RelatedItem[];
  total: number;
}
```

### GET /story/:concept

Trace a concept across all properties (Story Mode).

```typescript
// Response
{
  concept: string;
  description: string;
  journey: {
    canon?: SearchResult[];   // .ltd
    learn?: SearchResult[];   // .io
    explore?: SearchResult[]; // .space
    study?: SearchResult[];   // LMS
    apply?: SearchResult[];   // .agency
  };
  totalContent: number;
}
```

### GET /health

Health check endpoint.

## Setup

### 1. Create Vectorize Index

```bash
wrangler vectorize create unified-search \
  --dimensions 768 \
  --metric cosine
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Development

```bash
pnpm dev
```

### 4. Deploy

```bash
pnpm deploy
```

### 5. Index Content

```bash
pnpm index              # Full index
pnpm index:incremental  # Only changed content
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Request                        │
│                   (Cmd+K Search)                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Unified Search Worker                   │
│  ┌─────────────────┐  ┌────────────────────────────┐    │
│  │ Workers AI      │  │ Vectorize Index            │    │
│  │ (BGE Embeddings)│  │ (768 dimensions, cosine)   │    │
│  └────────┬────────┘  └──────────────┬─────────────┘    │
│           │                          │                   │
│           └──────────┬───────────────┘                   │
│                      │                                   │
│                      ▼                                   │
│           ┌──────────────────┐                          │
│           │ Search Results   │                          │
│           │ (grouped by      │                          │
│           │  property)       │                          │
│           └──────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

## Content Types

| Type | Property | Description |
|------|----------|-------------|
| paper | .io | Research papers |
| experiment | .space, .io | Interactive experiments |
| lesson | LMS | Structured lessons |
| principle | .ltd | Design principles |
| pattern | .ltd | Design patterns |
| master | .ltd | Design masters |
| service | .agency | Services offered |
| case-study | .agency | Client case studies |

## Content Sources

Different properties use different content sources:

| Property | Source | Reason |
|----------|--------|--------|
| **.space** | D1 Database | Dynamic experiments with metadata |
| **.io** | Manifest API | Static Svelte routes with interactive components |
| **.ltd** | D1 Database | Principles and patterns |
| **.agency** | D1 Database | Services and case studies |

### Why io Uses Manifest, Not D1

IO papers are **static Svelte routes** containing interactive components that cannot be stored in D1:

```svelte
// hermeneutic-spiral-ux/+page.svelte
import { IsometricSpiral, IsometricArchitecture } from '@create-something/components';

const archNodes = [
  { id: 'whatsapp', label: 'WhatsApp', position: { x: -100, y: 0, z: 0 } },
  // 3D interactive visualizations, metric cards, etc.
];
```

The manifest at `/api/manifest` provides metadata for indexing:

```json
{
  "papers": [
    {
      "slug": "hermeneutic-spiral-ux",
      "title": "The Hermeneutic Spiral in UX Design",
      "description": "Applying Heidegger's hermeneutic circle to UX design"
    }
  ]
}
```

### Adding New IO Content

When adding a new paper to io:

1. **Create static route**: `packages/io/src/routes/papers/new-paper/+page.svelte`
2. **Update manifest**: `packages/io/src/routes/api/manifest/+server.ts`
3. **Re-index**: Happens automatically every 6 hours, or manually via `/admin/index`

## Canon Alignment

This search system embodies the CREATE SOMETHING philosophy:

1. **Subtractive**: One search, all properties
2. **Zuhandenheit**: Search recedes; discovery emerges
3. **Hermeneutic Circle**: Each result reveals connections to the whole
