import { error } from '@sveltejs/kit';
export const load = async ({ params, fetch }) => {
  const response = await fetch(`/api/networks/${params.slug}/field-notes`);
  if (!response.ok) error(response.status, 'Field notes unavailable.');
  return await response.json();
};
