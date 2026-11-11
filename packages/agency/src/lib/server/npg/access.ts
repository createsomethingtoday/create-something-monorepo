import { error } from '@sveltejs/kit';
import { canAccessNpgHealthcareAnalyst } from '../abundance-client-access';
export function readHealthcareAnalystUrl(platform: App.Platform | undefined): string {
  const raw = platform?.env?.NPG_HEALTHCARE_ANALYST_URL?.trim();
  if (!raw) throw error(503, 'NPG healthcare analyst access is not configured');

  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'udify.app' ||
      !url.pathname.startsWith('/agent/')
    ) {
      throw new Error('Unexpected analyst URL');
    }
    return url.toString();
  } catch {
    throw error(503, 'NPG healthcare analyst access is not configured');
  }
}

export function requireNpgUser(locals: App.Locals, platform: App.Platform | undefined) {
  if (!locals.user?.id) throw error(401, 'Sign in to use the NPG analyst.');
  if (!canAccessNpgHealthcareAnalyst(locals.user.email, platform?.env?.AGENCY_OPERATOR_EMAILS))
    throw error(403, 'NPG client access required');
  return locals.user.id;
}
export function requireChat(platform: App.Platform | undefined) {
  if (platform?.env?.NPG_HEALTHCARE_CHAT_ENABLED !== 'true' || !platform.env.DB)
    throw error(503, 'NPG analyst chat is not available.');
  return platform.env;
}
export function requireSameOrigin(request: Request, url: URL) {
  if (
    request.headers.get('origin') !== url.origin ||
    !['same-origin', null].includes(request.headers.get('sec-fetch-site'))
  )
    throw error(403, 'Open this page directly before continuing.');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw error(415, 'JSON request required.');
}
