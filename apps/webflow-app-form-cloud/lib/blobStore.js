import { getCloudflareEnv } from './cloudflareRuntime';

function buildObjectKey(filename) {
  const safeFilename = (filename || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '-');
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `${datePrefix}/${crypto.randomUUID()}-${safeFilename}`;
}

function trimTrailingSlash(value) {
  return value ? value.replace(/\/$/, '') : value;
}

export async function uploadPublicFile(file, runtime = {}) {
  const env = await getCloudflareEnv(runtime);
  const bucket = env?.FORM_UPLOADS;
  const publicBaseUrl = trimTrailingSlash(env?.FORM_UPLOADS_PUBLIC_URL || process.env.FORM_UPLOADS_PUBLIC_URL);

  if (bucket) {
    if (!publicBaseUrl) {
      throw new Error('FORM_UPLOADS_PUBLIC_URL must be configured when using the FORM_UPLOADS R2 binding');
    }

    const key = buildObjectKey(file.filename);
    await bucket.put(key, file.buffer, {
      httpMetadata: {
        contentType: file.contentType || 'application/octet-stream'
      }
    });

    return {
      key,
      url: `${publicBaseUrl}/${key}`
    };
  }

  const { put } = await import('@vercel/blob');
  const blob = await put(file.filename, file.buffer, {
    access: 'public',
    contentType: file.contentType,
    addRandomSuffix: true,
  });

  return {
    key: blob.pathname || blob.url,
    url: blob.url
  };
}

export async function deletePublicFile(url, runtime = {}) {
  const env = await getCloudflareEnv(runtime);
  const bucket = env?.FORM_UPLOADS;
  const publicBaseUrl = trimTrailingSlash(env?.FORM_UPLOADS_PUBLIC_URL || process.env.FORM_UPLOADS_PUBLIC_URL);

  if (bucket && publicBaseUrl && url.startsWith(`${publicBaseUrl}/`)) {
    const key = url.slice(publicBaseUrl.length + 1);
    await bucket.delete(key);
    return;
  }

  const { del } = await import('@vercel/blob');
  await del(url);
}
