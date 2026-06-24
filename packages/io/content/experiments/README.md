# Experiments Content

Experiments on `.io` are a public research surface. The current implementation is route/catalog based, not MDsveX component-import based.

## Runtime Model

The archive at `/experiments` merges:

- file-based experiment metadata from `src/lib/config/fileBasedExperiments.ts`
- database-backed experiment rows from D1 `papers`, when available

The detail route at `/experiments/[slug]` resolves in this order:

1. cross-property redirects for experiments whose canonical home is another CREATE SOMETHING property
2. file-based experiments in `fileBasedExperiments.ts`
3. D1 `papers` rows by `slug`, with an `id` fallback for legacy/admin-created rows without `slug`

Local preview can run without a populated D1 `papers` table. In that case, `/experiments` and `sitemap.xml` fall back to file-based experiments.

## File-Based Experiments

File-based experiment metadata lives in:

```text
src/lib/config/fileBasedExperiments.ts
```

Required fields follow `FileBasedExperiment` from `@create-something/canon`:

```ts
{
  id: 'file-example',
  slug: 'example',
  title: 'Example Experiment',
  description: 'One-sentence public description.',
  excerpt_short: 'Short card copy',
  excerpt_long: 'Longer article/header copy',
  category: 'research',
  tags: ['MCP', 'Policy', 'Workflow'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  reading_time_minutes: 8,
  difficulty: 'intermediate',
  is_file_based: true,
  tests_principles: ['three-tier-framework'],
  ascii_art: '...'
}
```

Add the matching ID to `fileBasedExperimentVisuals` with `defineArtifactVisuals`.
`pnpm check:visuals` fails if the experiment metadata and visual definition maps
drift.

The shared transformer maps these records into the `Paper` shape used by archive cards, article headers, SEO, and sitemap generation.

For visual rules, use `packages/io/docs/ai-native-visual-communication.md`. Keep precise framework labels in `visual_summary`; use generated images for editorial tone and recognition.

## Markdown Bodies

Markdown bodies live in:

```text
content/experiments/{slug}.md
```

Markdown is loaded as raw text by `src/routes/experiments/[slug]/+page.server.ts`, frontmatter is stripped, and the body is rendered by the shared `.io` `ArticleContent` component with `marked`.

Current markdown files should contain normal Markdown only. Do not import Svelte components from experiment markdown; this route does not compile MDsveX component imports.

Use markdown bodies for documentation-first experiments that do not need a custom interactive route.

## Living Experiment Evidence

Experiments are allowed to be provisional, but their evidence status should be
inspectable when the experiment is used to support a product, paper, template,
or delivery claim.

Use the shared transparency template for new experiments and material updates:

```text
docs/examples/living-research-transparency.template.yaml
```

For the shared paper and experiment standard, see:

```text
packages/io/docs/research-content-transparency.md
```

At minimum, document:

- claim status: hypothesis, supported, validated, contested, or superseded
- confidence: low, medium, or high
- evidence grade: implementation evidence, benchmark, market signal, community sentiment, field signal, official docs, or anecdotal
- last reviewed date and next review date
- supporting evidence
- counter-signals
- open questions
- update log

This can live as a YAML block in Markdown content, as a visible section in a
dedicated Svelte route, or as route-local data rendered into the page. Do not
hide material uncertainty in comments or metadata that readers cannot inspect.

Existing experiments do not need bulk retrofits before small edits. Add the
living evidence block when an experiment is promoted, republished, compared
against newer research, or used as a reference for implementation decisions.

## Dedicated Interactive Routes

Interactive or highly custom experiments use dedicated Svelte routes:

```text
src/routes/experiments/{slug}/+page.svelte
src/routes/experiments/{slug}/+page.server.ts  # when route metadata/data is needed
```

If a file-based experiment has a dedicated route, add its slug to `FILE_BASED_WITH_ROUTES` in `src/routes/experiments/[slug]/+page.server.ts`. That prevents the dynamic markdown route from also trying to serve it.

Dedicated routes are appropriate for:

- canvas, WebGPU, SVG, or scroll-driven interactions
- demos that import experiment components from `@create-something/canon`
- pages that need custom controls, upload flows, or runtime state
- experiments whose article layout differs materially from the default article shell

## D1/Admin-Backed Experiments

Admin-created experiments are stored in D1 `papers`. Public routing requires a stable `slug`.

The admin API now writes `slug` on create and can update it on patch. Legacy rows without `slug` can still resolve by `id`, but new rows should treat `slug` as the public URL contract.

Minimum public fields:

- `id`
- `slug`
- `title`
- `description` or `excerpt_long`
- `content` or `html_content`
- `category`
- `published = 1`
- `is_hidden = 0`
- `archived = 0`

## Archive And Sitemap Rules

The archive and sitemap intentionally include file-based experiments even when D1 is unavailable.

They also exclude known paper slugs so `/experiments` does not become a duplicate papers archive. Known paper slugs come from:

- `src/lib/config/fileBasedPapers.ts`
- static paper route `meta.ts` files

## Adding A New Experiment

1. Add metadata to `src/lib/config/fileBasedExperiments.ts`.
2. Add `content/experiments/{slug}.md` if the default article shell is enough.
3. Create `src/routes/experiments/{slug}/` if the experiment needs a custom interactive page.
4. If using a dedicated route, add the slug to `FILE_BASED_WITH_ROUTES`.
5. Add a living evidence section when the experiment supports a claim that can drift.
6. Run:

```bash
pnpm --filter @create-something/io check
pnpm --filter @create-something/io build
```

For user-visible route changes, also run a local preview and smoke:

```bash
pnpm --filter @create-something/io preview --host 127.0.0.1 --port 4173
```

Verify `/experiments`, the new detail route, and `/sitemap.xml`.
