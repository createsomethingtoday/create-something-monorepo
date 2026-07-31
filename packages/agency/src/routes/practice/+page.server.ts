import type { PageServerLoad } from './$types';
import { buildReferenceMissionReadModel } from '$lib/governance/reference-mission';
import { loadReferenceMissionReadModel } from '$lib/server/reference-mission';

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
  const db = platform?.env?.DB;
  if (!db) {
    setHeaders({ 'cache-control': 'no-store' });
    return { reference_mission: unavailableMission() };
  }

  try {
    const model = await loadReferenceMissionReadModel(db);
    setHeaders({
      'cache-control':
        model.public.state === 'unavailable'
          ? 'no-store'
          : 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
    });
    return { reference_mission: model.public };
  } catch {
    setHeaders({ 'cache-control': 'no-store' });
    return { reference_mission: unavailableMission() };
  }
};

function unavailableMission() {
  return buildReferenceMissionReadModel({
    signals: [],
    decisions: [],
    proofs: [],
    receipts: []
  }).public;
}
