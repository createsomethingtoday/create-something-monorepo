import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireNpgUser, requireChat, readHealthcareAnalystUrl } from '$lib/server/npg/access';
import { NpgStore } from '$lib/server/npg/store';
export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
  setHeaders({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'same-origin',
    'X-Robots-Tag': 'noindex, nofollow'
  });
  const owner = requireNpgUser(locals, platform);
  if (platform?.env?.NPG_HEALTHCARE_CHAT_ENABLED !== 'true')
    throw redirect(303, readHealthcareAnalystUrl(platform));
  const env = requireChat(platform);
  return { conversations: await new NpgStore(env.DB).list(owner) };
};
