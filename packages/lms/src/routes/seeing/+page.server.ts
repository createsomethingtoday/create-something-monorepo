import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  throw redirect(302, '/paths/codex-mcp/what-is-codex-and-mcp');
};
