import { error } from '@sveltejs/kit';

export function assertAdminMutation(request: Request, locals: App.Locals): NonNullable<App.Locals['admin']> {
  if (!locals.admin) error(401, 'Admin login required.');
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) error(403, 'Cross-origin admin mutations are not allowed.');
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) error(415, 'Use application/json for admin mutations.');
  return locals.admin;
}
