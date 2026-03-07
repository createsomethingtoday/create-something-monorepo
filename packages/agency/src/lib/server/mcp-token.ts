import { error } from '@sveltejs/kit';
import { createSessionManager, getAuth0Config, getDomainConfig } from '@create-something/canon/auth';
import type { SessionManagerOptions } from '@create-something/canon/auth';

type AgencyPlatform = App.Platform | undefined;

export interface AgencySessionUser {
	id: string;
	email: string;
	tier?: 'free' | 'pro' | 'agency';
	source?: string;
}

export async function requireAgencySessionUser(input: {
	cookies: Parameters<typeof createSessionManager>[0];
	platform: AgencyPlatform;
}): Promise<AgencySessionUser> {
	const domainConfig = getDomainConfig(input.platform?.env?.ENVIRONMENT);
	const auth0Config = getAuth0Config(input.platform?.env as Record<string, string | undefined> | undefined);
	const authProvider: SessionManagerOptions['authProvider'] = auth0Config
		? { type: 'auth0', ...auth0Config }
		: undefined;
	const sessionManager = createSessionManager(input.cookies, {
		isProduction: input.platform?.env?.ENVIRONMENT === 'production',
		domain: domainConfig.domain,
		authProvider,
	});
	const user = await sessionManager.getUser();
	if (!user?.id || !user.email) {
		throw error(401, 'Authentication required');
	}

	return user as AgencySessionUser;
}
