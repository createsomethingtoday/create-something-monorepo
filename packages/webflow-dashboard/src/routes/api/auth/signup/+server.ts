import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateEmail } from '$lib/server/airtable';
import { checkRateLimit } from '$lib/server/kv';
import { isSameOriginRequest } from '$lib/server/security';
import { v4 as uuidv4 } from 'uuid';
import { isSupportedCountry } from '$lib/intake/countries';

type SignupBody = {
	country?: string;
	primaryEmail?: string;
	webflowEmail?: string;
	preferredName?: string;
	legalName?: string;
	websiteUrl?: string;
	biography?: string;
	avatarUrl?: string;
	agreedToTerms?: boolean;
};

function isValidOptionalUrl(value: string | undefined): boolean {
	if (!value) return true;

	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function isValidRequiredUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const sessions = platform?.env?.SESSIONS;

	if (!sessions) {
		return json({ error: 'Authentication service unavailable' }, { status: 503 });
	}

	if (!isSameOriginRequest(request, new URL(request.url).origin)) {
		return json({ error: 'Invalid request origin.' }, { status: 403 });
	}

	const rateLimitResult = await checkRateLimit(
		sessions,
		`auth:signup:${getClientAddress()}`,
		5,
		900,
		{ failOpen: false }
	);

	if (!rateLimitResult.allowed) {
		return json(
			{
				error: 'Too many signup attempts. Please try again later.',
				retryAfter: rateLimitResult.retryAfter
			},
			{ status: 429 }
		);
	}

	try {
		const body = (await request.json().catch(() => ({}))) as SignupBody;
		const country = String(body.country || '').trim();
		const legalName = String(body.legalName || '').trim();
		const preferredName = String(body.preferredName || '').trim();
		const biography = String(body.biography || '').trim();
		const websiteUrl = String(body.websiteUrl || '').trim() || undefined;
		const avatarUrl = String(body.avatarUrl || '').trim();

		if (!country) {
			return json({ error: 'Country is required.' }, { status: 400 });
		}

		let primaryEmail: string;
		let webflowEmail: string;
		try {
			primaryEmail = validateEmail(body.primaryEmail || '');
			webflowEmail = validateEmail(body.webflowEmail || '');
		} catch {
			return json({ error: 'A valid primary and Webflow email are required.' }, { status: 400 });
		}

		if (!legalName) {
			return json({ error: 'Legal name is required.' }, { status: 400 });
		}

		if (!biography) {
			return json({ error: 'Biography is required.' }, { status: 400 });
		}

		if (biography.length > 200) {
			return json({ error: 'Biography must be 200 characters or fewer.' }, { status: 400 });
		}

		if (!avatarUrl || !isValidRequiredUrl(avatarUrl)) {
			return json({ error: 'A valid profile image upload is required.' }, { status: 400 });
		}

		if (!body.agreedToTerms) {
			return json({ error: 'You must agree to the Webflow Marketplace Agreement.' }, { status: 400 });
		}

		if (!isValidOptionalUrl(websiteUrl)) {
			return json({ error: 'Personal website URL is invalid.' }, { status: 400 });
		}

		const airtable = getAirtableClient(platform?.env);
		const [existingPrimaryCreator, existingWebflowCreator, existingPrimaryUser, existingWebflowUser] =
			await Promise.all([
				airtable.getCreatorByEmail(primaryEmail),
				airtable.getCreatorByEmail(webflowEmail),
				airtable.findUserByEmail(primaryEmail),
				primaryEmail === webflowEmail ? Promise.resolve(null) : airtable.findUserByEmail(webflowEmail)
			]);

		if (
			existingPrimaryCreator ||
			existingWebflowCreator ||
			existingPrimaryUser ||
			existingWebflowUser
		) {
			return json(
				{
					error: 'A creator profile already exists for one of these emails. Please sign in instead.',
					existingCreator: true
				},
				{ status: 409 }
			);
		}

		const creator = await airtable.createCreator({
			email: primaryEmail,
			webflowEmail,
			name: preferredName || legalName,
			legalName,
			biography,
			avatarUrl,
			websiteUrl
		});

		const primaryUser = await airtable.createUserByEmail(primaryEmail, creator.id);

		if (webflowEmail !== primaryEmail) {
			await airtable.createUserByEmail(webflowEmail, creator.id);
		}

		const token = uuidv4();
		const expirationTime = new Date(Date.now() + 60 * 60000);
		await airtable.triggerVerificationEmailAutomation(primaryUser.id, token, expirationTime);

		return json({
			message: 'Creator signup created. Check your email for a verification link.',
			countrySupported: isSupportedCountry(country)
		});
	} catch (error) {
		console.error('Signup error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'An error occurred during signup.'
			},
			{ status: 500 }
		);
	}
};
