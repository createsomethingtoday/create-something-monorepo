interface Env {
  UPLOADS: R2Bucket;
  UPLOADS_WORKER_SECRET: string;
}

const UPLOAD_KINDS = new Set([
  'avatar',
  'thumbnail',
  'secondary-thumbnail',
  'gallery'
] as const);

type UploadKind = 'avatar' | 'thumbnail' | 'secondary-thumbnail' | 'gallery';

function isUploadKind(value: string): value is UploadKind {
  return UPLOAD_KINDS.has(value as UploadKind);
}

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  headers.set('cache-control', 'no-store');

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeName}${ext}`;
}

function generateStorageKey(filename: string, userEmail?: string): string {
  const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
  const safeName = sanitizeFilename(filename || 'upload.webp');

  if (userEmail) {
    const userPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    return `${userPrefix}/${uniqueSuffix}_${safeName}`;
  }

  return `uploads/${uniqueSuffix}_${safeName}`;
}

function getUploadSecret(request: Request): string {
  return request.headers.get('x-uploads-secret')?.trim() || '';
}

function getPublicAssetHeaders(object: R2ObjectBody | R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');

  if ('httpEtag' in object && object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }

  return headers;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  if (getUploadSecret(request) !== env.UPLOADS_WORKER_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filename = request.headers.get('x-upload-filename')?.trim() || 'upload.webp';
  const userEmail = request.headers.get('x-upload-email')?.trim().toLowerCase() || undefined;
  const uploadKind = request.headers.get('x-upload-kind')?.trim() || '';
  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  const file = await request.arrayBuffer();

  if (!isUploadKind(uploadKind)) {
    return json({ error: 'Unknown upload kind.' }, { status: 400 });
  }

  if (file.byteLength === 0) {
    return json({ error: 'No file uploaded.' }, { status: 400 });
  }

  const key = generateStorageKey(filename, userEmail);
  await env.UPLOADS.put(key, file, {
    httpMetadata: { contentType },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      uploadedBy: userEmail || 'anonymous',
      uploadType: uploadKind
    }
  });

  const origin = new URL(request.url).origin;
  return json({
    key,
    size: file.byteLength,
    url: `${origin}/uploads/${key}`
  });
}

async function handleFetchAsset(request: Request, env: Env, pathname: string): Promise<Response> {
  const key = pathname.replace(/^\/uploads\//, '');
  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.UPLOADS.get(decodeURIComponent(key));
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: getPublicAssetHeaders(object)
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return json({
        ok: true,
        service: 'template-form-uploads'
      });
    }

    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        return await handleUpload(request, env);
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : 'Failed to upload file.'
          },
          { status: 500 }
        );
      }
    }

    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      return handleFetchAsset(request, env, url.pathname);
    }

    return new Response('Not found', { status: 404 });
  }
};
