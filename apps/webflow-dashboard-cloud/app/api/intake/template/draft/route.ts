import type { Asset } from '@create-something/webflow-dashboard-core/airtable';
import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { jsonNoStore } from '../../../../../lib/server/responses';
import { getServerAirtable } from '../../../../../lib/server/airtable';
import { getEnvOrThrow } from '../../../../../lib/server/env';
import { getUserFromRequest } from '../../../../../lib/server/session';
import {
  appendTemplateDraftMetadata,
  normalizeTemplateDraftPayload,
  normalizeTemplateDraftVerificationState,
  parseTemplateDraftMetadata,
  stripTemplateDraftMetadata,
  type TemplateDraftPayload
} from '../../../../../lib/intake/template-draft';
import {
  buildTemplateDetailsHtml,
  buildTemplateSummary
} from '../../../../../lib/intake/template-content';
import {
  createTemplateDraftAccessToken,
  verifyTemplateDraftAccessToken
} from '../../../../../lib/server/template-draft-access';

type TemplateDraftBody = {
  draftId?: string;
  draftAccessToken?: string;
  creatorName?: string;
  creatorEmail?: string;
  templateName?: string;
  publishedUrl?: string;
  previewUrl?: string;
  priceModel?: 'Free' | 'Paid';
  category?: string;
  tags?: string[];
  styleTags?: string[];
  siteTypes?: string[];
  featureFlags?: string[];
  shortDescription?: string;
  longDescription?: string;
  notes?: string;
  thumbnailUrl?: string;
  secondaryThumbnailUrl?: string;
  galleryUrls?: string[];
  checklistConfirmed?: boolean;
  agreementConfirmed?: boolean;
  verification?: TemplateDraftPayload['verification'];
};

function isDraftStatus(status: string | undefined): boolean {
  return String(status || '')
    .trim()
    .toLowerCase() === 'draft';
}

function buildFallbackDraft(asset: Asset): TemplateDraftPayload {
  return normalizeTemplateDraftPayload({
    creatorName: asset.creatorName || '',
    creatorEmail: asset.creatorContactEmail || '',
    templateName: asset.name,
    publishedUrl: asset.websiteUrl || '',
    previewUrl: asset.previewUrl || '',
    priceModel: asset.priceString === 'Paid' ? 'Paid' : 'Free',
    category: asset.category || '',
    shortDescription: asset.descriptionShort || '',
    longDescription: stripTemplateDraftMetadata(asset.descriptionLongHtml || ''),
    notes: '',
    thumbnailUrl: asset.thumbnailUrl || '',
    secondaryThumbnailUrl: asset.secondaryThumbnailUrl || '',
    galleryUrls: asset.carouselImages || [],
    verification: normalizeTemplateDraftVerificationState(undefined)
  });
}

async function canAccessDraft(
  request: Request,
  asset: Asset,
  creatorEmail: string,
  providedToken: string | null | undefined
): Promise<boolean> {
  const airtable = await getServerAirtable();
  const requestUser = await getUserFromRequest(request);

  if (requestUser && (await airtable.verifyAssetOwnership(asset.id, requestUser.email))) {
    return true;
  }

  const env = await getEnvOrThrow();
  if (!verifyTemplateDraftAccessToken(asset.id, creatorEmail, env.AIRTABLE_API_KEY || '', providedToken)) {
    return false;
  }

  return airtable.verifyAssetOwnership(asset.id, creatorEmail);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const draftId = url.searchParams.get('id')?.trim();
  const creatorEmailParam = url.searchParams.get('email')?.trim() || '';
  const draftAccessToken = url.searchParams.get('token')?.trim();

  if (!draftId) {
    return jsonNoStore({ error: 'Draft ID is required.' }, { status: 400 });
  }

  try {
    const airtable = await getServerAirtable();
    const asset = await airtable.getAsset(draftId);
    if (!asset) {
      return jsonNoStore({ error: 'Draft not found.' }, { status: 404 });
    }

    const creatorEmail = validateEmail(creatorEmailParam || asset.creatorContactEmail || '');
    if (!(await canAccessDraft(request, asset, creatorEmail, draftAccessToken))) {
      return jsonNoStore({ error: 'You do not have permission to access this draft.' }, { status: 403 });
    }

    if (!isDraftStatus(asset.status)) {
      return jsonNoStore(
        { error: 'This draft is no longer editable.', asset },
        { status: 409 }
      );
    }

    const env = await getEnvOrThrow();
    const draft = parseTemplateDraftMetadata(asset.descriptionLongHtml) || buildFallbackDraft(asset);
    const resolvedToken = createTemplateDraftAccessToken(
      asset.id,
      draft.creatorEmail || creatorEmail,
      env.AIRTABLE_API_KEY || ''
    );

    return jsonNoStore({
      asset,
      draft,
      draftId: asset.id,
      draftAccessToken: resolvedToken
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : 'Failed to load draft.' },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as TemplateDraftBody;
    const creatorEmail = validateEmail(body.creatorEmail || '');
    const airtable = await getServerAirtable();
    const creator = await airtable.getCreatorByEmail(creatorEmail);

    if (!creator) {
      return jsonNoStore(
        { error: 'Creator profile not found. Complete creator registration first.' },
        { status: 404 }
      );
    }

    const draft = normalizeTemplateDraftPayload({
      creatorName: body.creatorName,
      creatorEmail,
      templateName: body.templateName,
      publishedUrl: body.publishedUrl,
      previewUrl: body.previewUrl,
      priceModel: body.priceModel,
      category: body.category,
      tags: body.tags,
      styleTags: body.styleTags,
      siteTypes: body.siteTypes,
      featureFlags: body.featureFlags,
      shortDescription: body.shortDescription,
      longDescription: body.longDescription,
      notes: body.notes,
      thumbnailUrl: body.thumbnailUrl,
      secondaryThumbnailUrl: body.secondaryThumbnailUrl,
      galleryUrls: body.galleryUrls,
      checklistConfirmed: body.checklistConfirmed,
      agreementConfirmed: body.agreementConfirmed,
      verification: body.verification,
      savedAt: new Date().toISOString()
    });

    const descriptionLongHtml = appendTemplateDraftMetadata(
      buildTemplateDetailsHtml({
        longDescription: draft.longDescription,
        notes: draft.notes,
        category: draft.category,
        tags: draft.tags,
        styleTags: draft.styleTags,
        siteTypes: draft.siteTypes,
        featureFlags: draft.featureFlags,
        publishedUrl: draft.publishedUrl,
        gsapDetected: draft.verification.gsapDetected
      }),
      draft
    );

    const submissionData = {
      creatorEmail,
      creatorWebflowEmail: creator.emails?.find((value) => value !== creatorEmail) || creatorEmail,
      name: draft.templateName || undefined,
      description: buildTemplateSummary({
        category: draft.category,
        tags: draft.tags,
        siteTypes: draft.siteTypes,
        featureFlags: draft.featureFlags,
        notes: draft.notes
      }),
      descriptionShort: draft.shortDescription,
      descriptionLongHtml,
      websiteUrl: draft.publishedUrl,
      previewUrl: draft.previewUrl,
      priceString: draft.priceModel,
      thumbnailUrl: draft.thumbnailUrl || undefined,
      secondaryThumbnailUrl: draft.secondaryThumbnailUrl || undefined,
      carouselImages: draft.galleryUrls,
      metadata: {
        creatorName: draft.creatorName,
        category: draft.category,
        tags: draft.tags,
        styleTags: draft.styleTags,
        siteTypes: draft.siteTypes,
        featureFlags: draft.featureFlags,
        notes: draft.notes,
        verification: draft.verification,
        savedAt: draft.savedAt,
        draft: true
      }
    };

    let asset: Asset | null;
    if (body.draftId) {
      const existingAsset = await airtable.getAsset(body.draftId);
      if (!existingAsset) {
        return jsonNoStore({ error: 'Draft not found.' }, { status: 404 });
      }

      const ownerEmail = validateEmail(existingAsset.creatorContactEmail || creatorEmail);
      if (ownerEmail !== creatorEmail) {
        return jsonNoStore(
          { error: 'Draft owner email does not match the current creator email.' },
          { status: 409 }
        );
      }

      if (!(await canAccessDraft(request, existingAsset, ownerEmail, body.draftAccessToken))) {
        return jsonNoStore({ error: 'You do not have permission to update this draft.' }, { status: 403 });
      }

      if (!isDraftStatus(existingAsset.status)) {
        return jsonNoStore(
          { error: 'This draft is no longer editable.', asset: existingAsset },
          { status: 409 }
        );
      }

      asset = await airtable.updateTemplateDraft(existingAsset.id, submissionData);
    } else {
      asset = await airtable.createTemplateDraft(submissionData);
    }

    if (!asset) {
      return jsonNoStore({ error: 'Failed to save draft.' }, { status: 500 });
    }

    const env = await getEnvOrThrow();
    const draftAccessToken = createTemplateDraftAccessToken(asset.id, creatorEmail, env.AIRTABLE_API_KEY || '');

    return jsonNoStore({
      asset,
      draft,
      draftId: asset.id,
      draftAccessToken
    });
  } catch (error) {
    return jsonNoStore(
      { error: error instanceof Error ? error.message : 'Failed to save draft.' },
      { status: 400 }
    );
  }
}
