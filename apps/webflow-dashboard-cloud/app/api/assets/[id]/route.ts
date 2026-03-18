import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

type AssetUpdateBody = {
  name?: string;
  description?: string;
  descriptionShort?: string;
  descriptionLongHtml?: string;
  websiteUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string | null;
  secondaryThumbnailUrl?: string | null;
  secondaryThumbnails?: string[];
  carouselImages?: string[];
};

async function getRouteParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await getRouteParams(context);
  const airtable = await getServerAirtable();
  const debug = new URL(request.url).searchParams.get('debug') === '1';

  const isOwner = await airtable.verifyAssetOwnership(id, user.email);
  if (!isOwner) {
    if (debug) {
      const details = await airtable.debugAssetOwnership(id, user.email);
      return jsonNoStore(
        {
          error: 'Forbidden',
          message: 'You do not have permission to view this asset',
          debug: details.debug
        },
        { status: 403 }
      );
    }

    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to view this asset' },
      { status: 403 }
    );
  }

  const asset = await airtable.getAsset(id);
  if (!asset) {
    return jsonNoStore({ error: 'Asset not found' }, { status: 404 });
  }

  return jsonNoStore({ asset });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await getRouteParams(context);
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);
  if (!isOwner) {
    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to edit this asset' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as AssetUpdateBody;
  if (body.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(body.name, id);
    if (!nameCheck.unique) {
      return jsonNoStore({ error: 'An asset with this name already exists' }, { status: 400 });
    }
  }

  const updatedAsset = await airtable.updateAsset(id, body);
  if (!updatedAsset) {
    return jsonNoStore({ error: 'Failed to update asset' }, { status: 500 });
  }

  return jsonNoStore({ asset: updatedAsset });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await getRouteParams(context);
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);
  if (!isOwner) {
    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to edit this asset' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as AssetUpdateBody;
  if (body.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(body.name, id);
    if (!nameCheck.unique) {
      return jsonNoStore({ error: 'An asset with this name already exists' }, { status: 400 });
    }
  }

  if (body.carouselImages !== undefined) {
    if (!Array.isArray(body.carouselImages) || body.carouselImages.some((url) => typeof url !== 'string')) {
      return jsonNoStore({ error: 'Carousel images must be an array of strings' }, { status: 400 });
    }
  }

  const updatedAsset = await airtable.updateAssetWithImages(id, body);
  if (!updatedAsset) {
    return jsonNoStore({ error: 'Failed to update asset' }, { status: 500 });
  }

  return jsonNoStore({ asset: updatedAsset });
}
