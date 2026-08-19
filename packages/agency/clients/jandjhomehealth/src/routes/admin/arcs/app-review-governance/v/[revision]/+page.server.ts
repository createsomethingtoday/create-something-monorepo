import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArcVersion } from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
  requireAdmin(locals, url);
  const revision = Number(params.revision);
  if (!Number.isInteger(revision) || revision < 1) error(404, 'Arc version not found.');
  const document = await getArcVersion(getDb(platform), 'app-review-governance', revision);
  if (!document) error(404, 'Arc version not found.');
  return { document };
};
