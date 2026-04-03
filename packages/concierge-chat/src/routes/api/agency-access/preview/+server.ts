import { json, type RequestHandler } from '@sveltejs/kit';
import { isAgencyAccessPreviewMode, type AgencyAccessPreviewMode } from '$lib/agency-access';
import { setAgencyAccessPreviewModeCookie } from '$lib/server/agency-access';
import { isAgencyAccessPreviewEnabled } from '$lib/server/runtime';

interface PreviewModeBody {
	mode?: unknown;
}

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	if (!isAgencyAccessPreviewEnabled(platform)) {
		return json({ message: 'Not found.' }, { status: 404 });
	}

	let payload: PreviewModeBody | null = null;

	try {
		payload = (await request.json()) as PreviewModeBody;
	} catch {
		payload = null;
	}

	const rawMode = payload?.mode;
	const nextMode =
		rawMode === null || rawMode === undefined
			? null
			: typeof rawMode === 'string' && isAgencyAccessPreviewMode(rawMode)
				? rawMode
				: undefined;

	if (nextMode === undefined) {
		return json({ message: 'A valid preview mode is required.' }, { status: 400 });
	}

	setAgencyAccessPreviewModeCookie(cookies, nextMode, url.protocol === 'https:');

	return json({
		ok: true,
		mode: nextMode
	});
};
