import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { hasAdminAccess } from '$lib/server/security';
import {
	normalizeTemplateOfferRequestBody,
	requireString,
	type TemplateOfferRequestBody
} from '$lib/server/template-offer-requests';

const CREATE_CONFIRMATION = 'CREATE_TEMPLATE_OFFER_REQUEST';

interface ReproduceOfferRequestBody extends TemplateOfferRequestBody {
	assetId?: unknown;
	creatorEmail?: unknown;
	dryRun?: unknown;
	confirmCreate?: unknown;
}

function getBearerToken(request: Request): string | null {
	const authorization = request.headers.get('authorization');
	if (!authorization?.toLowerCase().startsWith('bearer ')) return null;
	const token = authorization.slice(7).trim();
	return token || null;
}

function isAuthorizedDiagnosticRequest(
	request: Request,
	localsUserEmail: string | undefined,
	env: App.Platform['env']
): boolean {
	const configuredToken = env.TEMPLATE_OFFER_DIAGNOSTIC_TOKEN?.trim();
	const providedToken = getBearerToken(request);

	if (configuredToken && providedToken === configuredToken) {
		return true;
	}

	return hasAdminAccess(localsUserEmail, {
		adminEmailsCsv: env.ADMIN_EMAILS,
		environment: env.ENVIRONMENT
	});
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	if (!isAuthorizedDiagnosticRequest(request, locals.user?.email, platform.env)) {
		throw error(403, 'Forbidden');
	}

	const body = (await request.json()) as ReproduceOfferRequestBody;
	const assetId = requireString(body.assetId, 'Asset ID');
	const creatorEmail = requireString(body.creatorEmail, 'Creator email').toLowerCase();
	const dryRun = body.dryRun !== false;

	if (!dryRun && body.confirmCreate !== CREATE_CONFIRMATION) {
		throw error(
			400,
			`confirmCreate must be ${CREATE_CONFIRMATION} when dryRun is false`
		);
	}

	const airtable = getAirtableClient(platform.env);
	const isOwner = await airtable.verifyAssetOwnership(assetId, creatorEmail);
	if (!isOwner) {
		throw error(403, 'Creator email does not own this asset');
	}

	const asset = await airtable.getAsset(assetId);
	if (!asset) {
		throw error(404, 'Asset not found');
	}

	if (asset.type !== 'Template') {
		throw error(400, 'Limited offers are only available for templates');
	}

	if (asset.status !== 'Published') {
		throw error(400, 'Limited offers can only be requested for published templates');
	}

	const input = normalizeTemplateOfferRequestBody(body, creatorEmail, new Date(), {
		marketplacePrice: asset.priceAmount,
		recoveryOfferUsed: asset.recoveryOfferUsed
	});
	const approvalStatus =
		input.postOfferAction === 'Delist / archive after expiry' ? 'Pending' : 'Approved';

	if (dryRun) {
		return json({
			success: true,
			dryRun: true,
			asset: {
				id: asset.id,
				name: asset.name,
				type: asset.type,
				status: asset.status,
				priceString: asset.priceString,
				qualifiedSales30d: asset.qualifiedSales30d,
				recoveryOfferUsed: asset.recoveryOfferUsed
			},
			wouldCreate: {
				templateFulfillmentLink: true,
				templateOffer: true,
				approvalStatus,
				offerMode: 'Fulfillment link',
				visibility: 'Detail only',
				offerLabel: input.offerLabel,
				offerPrice: input.offerPrice,
				offerStrategy: input.offerStrategy,
				postOfferAction: input.postOfferAction,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
				notesLength: input.notes?.length ?? 0
			}
		});
	}

	const result = await airtable.createTemplateOfferRequest(assetId, input);
	if (!result) {
		throw error(500, 'Failed to submit offer request');
	}

	return json({
		success: true,
		dryRun: false,
		asset: {
			id: asset.id,
			name: asset.name,
			type: asset.type,
			status: asset.status
		},
		...result
	});
};
