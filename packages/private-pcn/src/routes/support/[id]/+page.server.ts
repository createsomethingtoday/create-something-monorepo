import { redirect, error } from '@sveltejs/kit';
export const load = async ({ locals, params, fetch, url, platform }) => {
  if (!locals.identity) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  const response = await fetch(`/api/support/${encodeURIComponent(params.id)}`);
  if (!response.ok) error(response.status, 'Support workspace unavailable.');
  return {
    ...(await response.json()),
    supportEnabled: platform?.env.PCN_SUPPORT_ENABLED === 'true'
  };
};
