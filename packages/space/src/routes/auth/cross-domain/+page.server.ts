import type { PageServerLoad } from './$types';
import { exchangeCrossDomainToken } from '@create-something/canon/auth';

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirect') || '/account';
	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.space' : undefined;

	// Use shared cross-domain exchange logic
	await exchangeCrossDomainToken({
		token: token || '',
		cookies,
		domain: domain || '',
		isProduction: isProduction ?? true,
		propertyLabel: '.space',
		redirectTo,
	});
};
