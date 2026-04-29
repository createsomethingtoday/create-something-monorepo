import { getEnvOrThrow } from '../../../../lib/server/env';
import { getUploadsWorkerUrl } from '../../../../lib/server/uploads-worker';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const env = await getEnvOrThrow();
  const uploadsWorkerUrl = getUploadsWorkerUrl(env);

  const { path } = await context.params;
  const key = path.map((segment) => encodeURIComponent(segment)).join('/');
  const response = await fetch(`${uploadsWorkerUrl}/uploads/${key}`);
  const headers = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    headers
  });
}
