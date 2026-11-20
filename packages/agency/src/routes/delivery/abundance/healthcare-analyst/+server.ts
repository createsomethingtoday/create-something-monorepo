import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireNpgUser, requireChat, readHealthcareAnalystUrl } from '$lib/server/npg/access';
import { NpgStore } from '$lib/server/npg/store';
import { renderNpgDocument, NPG_DOCUMENT_HEADERS } from '$lib/server/npg/document';
import assets from '$lib/server/npg/astryx-assets.generated.json';
const privacy = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow'
};
export const GET: RequestHandler = async ({ locals, platform, setHeaders }) => {
  setHeaders(privacy);
  const owner = requireNpgUser(locals, platform);
  if (platform?.env?.NPG_HEALTHCARE_CHAT_ENABLED !== 'true')
    throw redirect(303, readHealthcareAnalystUrl(platform));
  const env = requireChat(platform);
  const conversations = await new NpgStore(env.DB).list(owner);
  return new Response(renderNpgDocument({ owner, conversations }, assets), {
    headers: NPG_DOCUMENT_HEADERS
  });
};
