import {
  getWebPDimensions,
  validateMimeType,
  validateWebP
} from '@create-something/webflow-dashboard-core/upload-validation';
import { uploadToR2 } from '@create-something/webflow-dashboard-core/r2';
import { getEnvOrThrow } from '../../../../lib/server/env';
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
    if (!env.UPLOADS) {
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

    const origin = new URL(request.url).origin;
    const upload = await uploadToR2(env.UPLOADS, arrayBuffer, {
      filename: file.name || `${kind}.webp`,
      userEmail: email || undefined,
      contentType: 'image/webp',
      origin,
      metadata: { uploadType: kind }
    });

    return jsonNoStore({
      ...upload,
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
