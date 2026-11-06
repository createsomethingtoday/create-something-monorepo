import type { RequestHandler } from './$types';
import { productionProfile } from '../../../../../../production-profile.mjs';
import { bounded } from '../../../../../../production-browser.mjs';
import { createLoginHandler } from '@create-something/canon/auth/handlers';
const login = createLoginHandler({ audience: 'ona-agents', isProduction: true });
const reply = (error: string, status: number) => Response.json({ success: false, error }, {status, headers: {'Cache-Control':'no-store'}});
export const POST: RequestHandler = async (event) => {
  const env = event.platform?.env ?? {};
  let profile;
  try { profile = productionProfile(env); } catch { return reply('Sign-in disabled', 503); }
  if (event.url.origin !== profile.appOrigin || event.request.headers.get('Origin') !== profile.appOrigin ||
      event.request.headers.get('Sec-Fetch-Site') !== 'same-origin' || event.request.headers.has('Authorization')) return reply('Forbidden', 403);
  if (event.request.headers.get('Content-Type') !== 'application/json') return reply('JSON required', 400);
  let body;
  try {
    body = await bounded(event.request.body, 8192);
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (typeof parsed.email !== 'string' || !profile.staffEmails.includes(parsed.email.toLowerCase())) return reply('Forbidden', 403);
    productionProfile(env);
  } catch { return reply('Invalid body or expired profile', 400); }
  // Use the existing supported handler and pinned identity origin; no new provider or password flow.
  return login({ ...event, request: new Request(event.request, {body: new Uint8Array(body)}),
    platform: { ...event.platform, env: {...env, IDENTITY_API_URL: 'https://id.createsomething.space'} } });
};
