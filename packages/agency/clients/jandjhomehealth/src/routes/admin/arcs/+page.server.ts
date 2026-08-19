import type { PageServerLoad } from './$types';
import { getOrCreateAppReviewArc, listArcReceipts } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  requireAdmin(locals, url);
  const db = getDb(platform);
  const document = await getOrCreateAppReviewArc(db);
  const receipts = await listArcReceipts(db, document.id, 8);
  return { document, receipts };
};
