import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readShare } from '$lib/share';

export const load: PageServerLoad = async ({ params, platform, setHeaders }) => {
  const db = platform?.env.DRAW_DB;
  if (!db) error(404, 'Snapshot not found.');
  const share = await readShare(db, params.shareId);
  if (!share) error(404, 'Snapshot not found.');
  setHeaders({ 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  return { share };
};
