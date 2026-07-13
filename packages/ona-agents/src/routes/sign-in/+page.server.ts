import type { PageServerLoad } from './$types';

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/agents';
  return value;
}

export const load: PageServerLoad = async ({ url }) => ({
  redirectTo: safeRedirect(url.searchParams.get('redirect'))
});
