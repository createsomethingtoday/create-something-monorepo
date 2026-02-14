import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const queryString = url.searchParams.toString();
  const destination = `/paths/codex-mcp/what-is-codex-and-mcp${queryString ? `?${queryString}` : ''}`;
  throw redirect(308, destination);
};
