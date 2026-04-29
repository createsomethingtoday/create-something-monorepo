import {
  getWebPDimensions,
  validateMimeType,
  validateWebP
} from '../../../../vendor/core/upload-validation';
import { getEnvOrThrow } from '../../../../lib/server/env';
import { getUploadsWorkerUrl } from '../../../../lib/server/uploads-worker';
import { jsonNoStore } from '../../../../lib/server/responses';

const CONSTRAINTS = {
  avatar: { width: 256, height: 256, maxSize: 100 * 1024 },
  thumbnail: { width: 750, height: 995, maxSize: 300 * 1024 },
  'secondary-thumbnail': { width: 750, height: 995, maxSize: 300 * 1024 },
  gallery: { width: 1440, height: 900, maxSize: 250 * 1024 }
} as const;

type UploadKind = keyof typeof CONSTRAINTS;

function isUploadKind(value: string): value is UploadKind {
  return value in CONSTRAINTS;
}

export async function POST(request: Request) {
  try {
    const env = await getEnvOrThrow();
    const uploadsWorkerUrl = getUploadsWorkerUrl(env);
    const uploadsWorkerSecret = env.UPLOADS_WORKER_SECRET?.trim();

    if (!uploadsWorkerSecret) {
      return jsonNoStore({ error: 'Storage not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const kind = String(formData.get('kind') || '');
    const email = String(formData.get('email') || '').trim().toLowerCase();

    if (!file || !(file instanceof File)) {
      return jsonNoStore({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!isUploadKind(kind)) {
      return jsonNoStore({ error: 'Unknown upload kind.' }, { status: 400 });
    }

    const constraints = CONSTRAINTS[kind];

    if (!validateMimeType(file.type)) {
      return jsonNoStore({ error: 'Only WebP images are allowed.' }, { status: 400 });
    }

    if (file.size > constraints.maxSize) {
      return jsonNoStore(
        {
          error: `File exceeds the ${Math.round(constraints.maxSize / 1024)}KB limit for ${kind}.`
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    if (!validateWebP(arrayBuffer)) {
      return jsonNoStore({ error: 'Invalid WebP file format.' }, { status: 400 });
    }

    const dimensions = getWebPDimensions(arrayBuffer);
    if (!dimensions) {
      return jsonNoStore({ error: 'Unable to determine image dimensions.' }, { status: 400 });
    }

    if (dimensions.width !== constraints.width || dimensions.height !== constraints.height) {
      return jsonNoStore(
        {
          error: `${kind} images must be exactly ${constraints.width}x${constraints.height}.`
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${uploadsWorkerUrl}/upload`, {
      method: 'POST',
      headers: {
        'content-type': 'image/webp',
        'x-upload-filename': file.name || `${kind}.webp`,
        'x-upload-email': email,
        'x-upload-kind': kind,
        'x-uploads-secret': uploadsWorkerSecret
      },
      body: arrayBuffer
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; key?: string; size?: number; url?: string }
      | null;

    if (!response.ok || !payload?.key || !payload.url) {
      return jsonNoStore(
        {
          error: payload?.error || 'Failed to upload file.'
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    return jsonNoStore({
      ...payload,
      width: dimensions.width,
      height: dimensions.height
    });
  } catch (error) {
    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : 'Failed to upload file.'
      },
      { status: 500 }
    );
  }
}
