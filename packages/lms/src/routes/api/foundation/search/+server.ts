import type { RequestHandler } from './$types';
import { catalog } from '$lib/server/foundation/catalog';
import { searchFoundation } from '$lib/server/foundation/core';
import { apiJson, guard, preflight } from '$lib/server/foundation/guard';
import { searchSchema } from '$lib/server/foundation/service';

export const OPTIONS: RequestHandler = () => preflight();
export const GET: RequestHandler = async (event) => {
  const rejected = await guard(event);
  if (rejected) return rejected;
  const params = Object.fromEntries(event.url.searchParams);
  const parsed = searchSchema.safeParse({ ...params, ...(params.limit !== undefined ? { limit: Number(params.limit) } : {}) });
  if (!parsed.success) return apiJson({ error: 'Use query (1–200 characters) and optional limit (integer 1–10) only.' }, 400);
  return apiJson(searchFoundation(catalog, parsed.data.query, parsed.data.limit));
};
