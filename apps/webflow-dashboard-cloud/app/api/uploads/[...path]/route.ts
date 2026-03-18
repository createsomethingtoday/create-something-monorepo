import { getEnvOrThrow } from '../../../../lib/server/env';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const env = await getEnvOrThrow();
  if (!env.UPLOADS) {
    return new Response('Storage not configured', { status: 500 });
  }

  const { path } = await context.params;
  const key = path.join('/');
  const object = await env.UPLOADS.get(key);

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
