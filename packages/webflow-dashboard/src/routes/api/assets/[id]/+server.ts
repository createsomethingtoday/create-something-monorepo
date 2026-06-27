import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateAssetsCache } from '$lib/server/assets-cache';
import { getAirtableClient, type AssetUpdateData } from '$lib/server/airtable';
import { shouldCreateAssetVersionForChanges } from '$lib/utils/asset-version-changes';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

function assertOptionalString(
  value: unknown,
  message: string
): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw error(400, message);
  }
}

function assertOptionalNullableString(
  value: unknown,
  message: string
): asserts value is string | null | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw error(400, message);
  }
}

function assertOptionalStringArray(
  value: unknown,
  message: string
): asserts value is string[] | undefined {
  if (value !== undefined) {
    if (!Array.isArray(value)) {
      throw error(400, message);
    }
    if (value.some((entry) => typeof entry !== 'string')) {
      throw error(400, message);
    }
  }
}

function assertOptionalAssetVersionChanges(
  value: unknown,
  message: string
): asserts value is Record<string, unknown> | string | undefined {
  if (value === undefined) return;
  if (typeof value === 'string') return;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return;
  throw error(400, message);
}

function validateAssetUpdateBody(body: AssetUpdateData): void {
  assertOptionalString(body.name, 'Name must be a string');
  assertOptionalString(body.description, 'Description must be a string');
  assertOptionalString(body.descriptionShort, 'Short description must be a string');
  assertOptionalString(body.descriptionLongHtml, 'Long description must be a string');
  assertOptionalString(body.websiteUrl, 'Website URL must be a string');
  assertOptionalString(body.previewUrl, 'Preview URL must be a string');
  assertOptionalNullableString(body.thumbnailUrl, 'Thumbnail URL must be a string or null');
  assertOptionalNullableString(
    body.secondaryThumbnailUrl,
    'Secondary thumbnail URL must be a string or null'
  );
  assertOptionalStringArray(
    body.secondaryThumbnails,
    'Secondary thumbnails must be an array of strings'
  );
  assertOptionalStringArray(body.carouselImages, 'Carousel images must be an array of strings');
  assertOptionalString(body.appCapabilities, 'App capabilities must be a string');
  assertOptionalString(body.appInstallUrl, 'App install URL must be a string');
  assertOptionalStringArray(body.appScopes, 'App scopes must be an array of strings');
  assertOptionalString(body.appAvatarAltText, 'App icon alt text must be a string');
  assertOptionalStringArray(body.paymentType, 'Payment types must be an array of strings');
  assertOptionalString(body.visibility, 'Visibility must be a string');
  assertOptionalStringArray(body.appCategory, 'App categories must be an array of strings');
  assertOptionalString(body.creatorName, 'Creator name must be a string');
  assertOptionalString(
    body.creatorWebsite,
    'Creator Webflow account email override must be a string'
  );
  assertOptionalString(body.creatorContactEmail, 'Creator contact email must be a string');
  assertOptionalStringArray(body.appFeaturesOverview, 'App features must be an array of strings');
  assertOptionalString(body.appDeveloperNotes, 'Developer notes must be a string');
  assertOptionalString(body.appAccessCredentials, 'App access credentials must be a string');
  assertOptionalString(body.appVideoUrl, 'App promo video URL must be a string');
  assertOptionalString(body.appDemoVideoUrl, 'App demo video URL must be a string');
  assertOptionalString(body.appPrivacyPolicyUrl, 'Privacy policy URL must be a string');
  assertOptionalString(body.appSupportEmail, 'Support email must be a string');
  assertOptionalString(body.appSupportUrl, 'Support URL must be a string');
  assertOptionalString(body.appTermsUrl, 'Terms URL must be a string');
  assertOptionalStringArray(
    body.appScreenshotAltTexts,
    'App screenshot alt texts must be an array of strings'
  );
  assertOptionalAssetVersionChanges(
    body.assetVersionChanges,
    'Asset version changes must be a structured object or string'
  );
}

function normalizeAssetUpdateBody(body: AssetUpdateData): AssetUpdateData {
  if (body.descriptionLongHtml === undefined) return body;
  return {
    ...body,
    descriptionLongHtml: sanitizeLongDescriptionHtml(body.descriptionLongHtml)
  };
}

// GET - Fetch single asset
export const GET: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Single Airtable call: fetch the record once, derive both ownership and the asset from it.
  const { asset, isOwner } = await airtable.getAssetForOwner(params.id, locals.user.email);
  if (!asset) {
    throw error(404, 'Asset not found');
  }
  if (!isOwner) {
    throw error(403, 'You do not have permission to view this asset');
  }

  return json({ asset });
};

// PATCH - Update asset (text fields only, legacy)
export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Verify ownership
  const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
  if (!isOwner) {
    throw error(403, 'You do not have permission to edit this asset');
  }

  const body = normalizeAssetUpdateBody((await request.json()) as AssetUpdateData);
  validateAssetUpdateBody(body);
  const { assetVersionChanges: _assetVersionChanges, ...updateBody } = body;

  // Check name uniqueness if name is being changed
  if (updateBody.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(updateBody.name, params.id);
    if (!nameCheck.unique) {
      throw error(400, 'An asset with this name already exists');
    }
  }

  const updatedAsset = await airtable.updateAsset(params.id, updateBody);
  if (!updatedAsset) {
    throw error(500, 'Failed to update asset');
  }

  await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

  return json({ asset: updatedAsset });
};

// PUT - Update asset with images
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Fetch the original record once so version history can keep the pre-change snapshot.
  const { asset: originalAsset, isOwner } = await airtable.getAssetForOwner(
    params.id,
    locals.user.email
  );
  if (!originalAsset) {
    throw error(404, 'Asset not found');
  }
  if (!isOwner) {
    throw error(403, 'You do not have permission to edit this asset');
  }

  const body = normalizeAssetUpdateBody((await request.json()) as AssetUpdateData);
  validateAssetUpdateBody(body);
  const { assetVersionChanges, ...updateBody } = body;

  // Check name uniqueness if name is being changed
  if (updateBody.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(updateBody.name, params.id);
    if (!nameCheck.unique) {
      throw error(400, 'An asset with this name already exists');
    }
  }

  const updatedAsset = await airtable.updateAssetWithImages(params.id, updateBody);
  if (!updatedAsset) {
    throw error(500, 'Failed to update asset');
  }

  let versionWarning: string | undefined;
  if (
    assetVersionChanges !== undefined &&
    shouldCreateAssetVersionForChanges(assetVersionChanges)
  ) {
    const version = await airtable.createAssetVersionFromAsset(
      originalAsset,
      locals.user.email,
      assetVersionChanges
    );
    if (!version) {
      versionWarning = 'Asset updated, but version history could not be recorded.';
    }
  }

  await invalidateAssetsCache(platform.env.SESSIONS, locals.user.email);

  return json({ asset: updatedAsset, versionWarning });
};
