import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrCreateAppReviewArc, listArcReceipts } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

const views = new Set(['studio', 'playbook', 'runbook']);

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
  requireAdmin(locals, url);
  if (!views.has(params.view)) error(404, 'Arc view not found.');
  const db = getDb(platform);
  const document = await getOrCreateAppReviewArc(db);
  return {
    document,
    receipts: await listArcReceipts(db, document.id, 20),
    view: params.view as 'studio' | 'playbook' | 'runbook'
  };
};
