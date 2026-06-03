import { json, type RequestHandler } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import type { RequiredDocumentKey } from '$chat/document-requirements';
import {
	createCandidateIntakeClaim,
	type CreateCandidateIntakeClaimInput
} from '$lib/server/intake-claims';
import { getIntakeBridgeSecret } from '$lib/server/runtime';
import type {
	IntakeClaimImportedDocument,
	IntakeClaimThreadSeed
} from '$lib/intake/claim-seed';

interface CreateIntakeClaimRequestBody {
	source?: 'indeed_apply';
	applicant?: {
		name?: string;
		email?: string;
		phone?: string;
	};
	application?: {
		indeedApplyId?: string;
		localApplicationId?: string;
		localJobId?: string;
		referenceNumber?: string;
		roleTitle?: string;
		facility?: string;
		location?: string;
	};
	profile?: {
		specialty?: string;
		preferredShift?: string;
		preferredRegion?: string;
		compactLicense?: string;
	};
	documents?: Array<{
		documentKey?: string;
		fileName?: string;
		contentType?: string;
		byteSize?: number;
	}>;
	ttlSeconds?: number;
}

function normalizeNullableString(value: unknown) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function secureSecretEquals(left: string, right: string) {
	const leftBuffer = Buffer.from(left, 'utf8');
	const rightBuffer = Buffer.from(right, 'utf8');
	return (
		leftBuffer.byteLength === rightBuffer.byteLength &&
		timingSafeEqual(leftBuffer, rightBuffer)
	);
}

function readSuppliedSecret(request: Request) {
	const authorizationHeader = request.headers.get('authorization')?.trim() ?? '';
	if (/^bearer\s+/i.test(authorizationHeader)) {
		return authorizationHeader.replace(/^bearer\s+/i, '').trim();
	}

	return request.headers.get('x-api-key')?.trim() ?? '';
}

function requireBridgeAuthorization(request: Request, platform?: App.Platform) {
	const configuredSecret = getIntakeBridgeSecret(platform);
	if (!configuredSecret) {
		return {
			ok: false as const,
			status: 503,
			error: 'ABUNDANCE_INTAKE_BRIDGE_SECRET is not configured for inbound intake claims.'
		};
	}

	const suppliedSecret = readSuppliedSecret(request);
	if (!suppliedSecret || !secureSecretEquals(configuredSecret, suppliedSecret)) {
		return {
			ok: false as const,
			status: 401,
			error: 'Unauthorized intake-claim request.'
		};
	}

	return { ok: true as const };
}

function isRequiredDocumentKey(value: string): value is RequiredDocumentKey {
	return value === 'resume_pdf' || value === 'compact_license_image';
}

function coerceDocuments(value: CreateIntakeClaimRequestBody['documents']): IntakeClaimImportedDocument[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((document) => {
		const documentKey = normalizeNullableString(document?.documentKey);
		if (!documentKey || !isRequiredDocumentKey(documentKey)) {
			return [];
		}

		return [
			{
				documentKey,
				fileName: normalizeNullableString(document?.fileName),
				contentType: normalizeNullableString(document?.contentType),
				byteSize:
					typeof document?.byteSize === 'number' && Number.isFinite(document.byteSize)
						? document.byteSize
						: undefined
			}
		];
	});
}

function buildThreadSeed(body: CreateIntakeClaimRequestBody): IntakeClaimThreadSeed | null {
	const indeedApplyId = normalizeNullableString(body.application?.indeedApplyId);
	if (!indeedApplyId) {
		return null;
	}

	return {
		source: 'indeed_apply',
		applicant: {
			name: normalizeNullableString(body.applicant?.name),
			email: normalizeNullableString(body.applicant?.email),
			phone: normalizeNullableString(body.applicant?.phone)
		},
			application: {
				indeedApplyId,
				localApplicationId: normalizeNullableString(body.application?.localApplicationId),
				localJobId: normalizeNullableString(body.application?.localJobId),
				referenceNumber: normalizeNullableString(body.application?.referenceNumber),
			roleTitle: normalizeNullableString(body.application?.roleTitle),
			facility: normalizeNullableString(body.application?.facility),
			location: normalizeNullableString(body.application?.location)
		},
		profile: {
			specialty: normalizeNullableString(body.profile?.specialty),
			preferredShift: normalizeNullableString(body.profile?.preferredShift),
			preferredRegion: normalizeNullableString(body.profile?.preferredRegion),
			compactLicense: normalizeNullableString(body.profile?.compactLicense)
		},
		documents: coerceDocuments(body.documents),
		importedAt: new Date().toISOString()
	};
}

export const POST: RequestHandler = async ({ request, platform, url }) => {
	const authorization = requireBridgeAuthorization(request, platform);
	if (!authorization.ok) {
		return json({ ok: false, error: authorization.error }, { status: authorization.status });
	}

	let body: CreateIntakeClaimRequestBody;

	try {
		body = (await request.json()) as CreateIntakeClaimRequestBody;
	} catch {
		return json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
	}

	const threadSeed = buildThreadSeed(body);
	if (!threadSeed) {
		return json(
			{ ok: false, error: '`application.indeedApplyId` is required to create an intake claim.' },
			{ status: 400 }
		);
	}

	const createInput: CreateCandidateIntakeClaimInput = {
		platform,
		baseUrl: url.origin,
		source: threadSeed.source,
		applicantEmail: threadSeed.applicant.email,
		applicantPhone: threadSeed.applicant.phone,
		localJobId: threadSeed.application.localJobId,
		indeedApplyId: threadSeed.application.indeedApplyId,
		threadSeed,
		ttlSeconds:
			typeof body.ttlSeconds === 'number' && Number.isFinite(body.ttlSeconds)
				? body.ttlSeconds
				: undefined
	};

	try {
		const claim = await createCandidateIntakeClaim(createInput);

		return json({
			ok: true,
			claimId: claim.id,
			claimToken: claim.token,
			claimUrl: claim.claimUrl,
			expiresAt: claim.expiresAt
		});
	} catch (error) {
		return json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: 'Unable to create the intake claim.'
			},
			{ status: 500 }
		);
	}
};
