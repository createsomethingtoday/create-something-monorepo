import type { RequestHandler } from './$types';
import { catalog } from '$lib/server/foundation/catalog';
import { LIMITS, REFERENCE_POLICY } from '$lib/server/foundation/core';
import { apiJson, guard, preflight, RATE_LIMIT } from '$lib/server/foundation/guard';

export const OPTIONS: RequestHandler = () => preflight();
export const GET: RequestHandler = async (event) => (await guard(event)) ?? apiJson({
  name: 'CREATE SOMETHING Foundation', version: '1.0.0', access: 'public_read_only',
  catalogRevision: catalog.revision, lessons: catalog.entries.length,
  originalLessons: catalog.entries.filter(x => x.corpus === 'original').length,
  referenceLessons: catalog.entries.filter(x => x.corpus === 'reference').length,
  endpoints: { mcp: 'https://learn.createsomething.space/api/foundation/mcp', search: '/api/foundation/search', lesson: '/api/foundation/lesson' },
  limits: { ...LIMITS, requestsPerMinutePerAddress: RATE_LIMIT, bodyBytes: 8192 },
  policy: REFERENCE_POLICY, guide: 'https://learn.createsomething.space/foundation'
});
