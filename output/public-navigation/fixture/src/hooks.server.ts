// Local-only no-JavaScript fixture: block application scripts while allowing browser inspection.
export const handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.url.searchParams.has('nojs')) response.headers.set('Content-Security-Policy', "script-src 'none'");
  return response;
};
