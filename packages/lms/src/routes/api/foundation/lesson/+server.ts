import type { RequestHandler } from './$types';
import { catalog, loadFoundationContent } from '$lib/server/foundation/catalog';
import { FoundationError, getFoundationLesson } from '$lib/server/foundation/core';
import { apiJson, guard, preflight } from '$lib/server/foundation/guard';
import { lessonSchema } from '$lib/server/foundation/service';

export const OPTIONS: RequestHandler = () => preflight();
export const GET: RequestHandler = async (event) => {
  const rejected = await guard(event);
  if (rejected) return rejected;
  const params: Record<string, string | number> = Object.fromEntries(event.url.searchParams);
  for (const key of ['offset', 'maxChars']) if (key in params) params[key] = Number(params[key]);
  const parsed = lessonSchema.safeParse(params);
  if (!parsed.success) return apiJson({ error: 'Use id, optional section, offset (0–1000000), maxChars (500–12000), and revision (content hash) only.' }, 400);
  try { return apiJson(await getFoundationLesson(catalog, loadFoundationContent, parsed.data)); }
  catch (error) { return apiJson({ error: error instanceof FoundationError ? error.message : 'Content unavailable.' }, error instanceof FoundationError ? error.status : 503); }
};
