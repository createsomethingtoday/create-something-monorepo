import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildReferenceMissionReadModel } from '$lib/governance/reference-mission';
import { loadReferenceMissionReadModel } from '$lib/server/reference-mission';

const CURRENT_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';
const FAIL_CLOSED_CACHE_CONTROL = 'no-store';

export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env?.DB;
  if (!db) return unavailableResponse(503);

  try {
    const model = await loadReferenceMissionReadModel(db);
    return json(
      { mission: model.public },
      {
        status: 200,
        headers: {
          'cache-control':
            model.public.state === 'unavailable' ? FAIL_CLOSED_CACHE_CONTROL : CURRENT_CACHE_CONTROL
        }
      }
    );
  } catch {
    return unavailableResponse(503);
  }
};

function unavailableResponse(status: number): Response {
  const model = buildReferenceMissionReadModel({
    signals: [],
    decisions: [],
    proofs: [],
    receipts: []
  });
  return json(
    { mission: model.public },
    { status, headers: { 'cache-control': FAIL_CLOSED_CACHE_CONTROL } }
  );
}
