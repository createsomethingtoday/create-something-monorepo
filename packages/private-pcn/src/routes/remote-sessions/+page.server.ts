import { redirect, error } from '@sveltejs/kit';
export const load = async ({ locals, fetch, url }) => {
  if (!locals.identity)
    redirect(303, '/login?next=' + encodeURIComponent(url.pathname + url.search));
  const response = await fetch('/api/remote-sessions');
  if (!response.ok) error(response.status, 'Remote sessions unavailable.');
  return { ...(await response.json()), network: url.searchParams.get('network') || '' };
};
