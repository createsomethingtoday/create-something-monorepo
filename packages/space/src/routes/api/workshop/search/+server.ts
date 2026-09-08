import { json } from '@sveltejs/kit';
import { filterProjects, workbenchTools } from '$lib/workshop/catalog';
import type { RequestHandler } from './$types';

/** Search only the curated public catalog and retained local tools. */
export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('query' in body) || typeof body.query !== 'string') {
    return json({ error: 'A search query is required' }, { status: 400 });
  }
  const query = body.query.trim().slice(0, 200);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = query
    ? [
        ...filterProjects(query).map((project) => ({
          id: project.slug,
          title: project.name,
          description: project.summary,
          path: `/projects/${project.slug}`
        })),
        ...workbenchTools
          .filter((tool) =>
            terms.every((term) => `${tool.name} ${tool.description}`.toLowerCase().includes(term))
          )
          .map((tool) => ({
            id: tool.href,
            title: tool.name,
            description: tool.description,
            path: tool.href
          }))
      ]
    : [];
  const results = matches
    .slice(0, 30)
    .map((entry) => ({ ...entry, property: 'space', url: entry.path, score: 1 }));
  return json({ results, byProperty: { space: results }, total: results.length, query, took: 0 });
};
