function parseBooleanFlag(value: string | undefined): boolean | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	switch (value.trim().toLowerCase()) {
		case '1':
		case 'true':
		case 'yes':
		case 'on':
			return true;
		case '0':
		case 'false':
		case 'no':
		case 'off':
			return false;
		default:
			return undefined;
	}
}

export function readRuntimeEnv(platform: App.Platform | undefined, key: string) {
	if (typeof process !== 'undefined') {
		const processValue = process.env?.[key];
		if (typeof processValue === 'string' && processValue.length > 0) {
			return processValue;
		}
	}

	const platformEnv = platform?.env as Record<string, unknown> | undefined;
	const platformValue = platformEnv?.[key];
	if (typeof platformValue === 'string' && platformValue.length > 0) {
		return platformValue;
	}

	return undefined;
}

export function isProductionRuntime(platform?: App.Platform) {
	return readRuntimeEnv(platform, 'ENVIRONMENT') === 'production';
}

export function isAgencyAccessPreviewEnabled(platform?: App.Platform) {
	const explicitFlag = parseBooleanFlag(readRuntimeEnv(platform, 'ALLOW_AGENCY_ACCESS_PREVIEW'));
	if (explicitFlag !== undefined) {
		return explicitFlag;
	}

	return !isProductionRuntime(platform);
}

export function isSignedIntakeRequired(platform?: App.Platform) {
	const explicitFlag = parseBooleanFlag(readRuntimeEnv(platform, 'ABUNDANCE_REQUIRE_SIGNED_INTAKE'));
	if (explicitFlag !== undefined) {
		return explicitFlag;
	}

	return isProductionRuntime(platform);
}

export function getIntakeSigningSecret(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'ABUNDANCE_INTAKE_SIGNING_SECRET')?.trim();
	return value ? value : null;
}

export function getIntakeBridgeSecret(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'ABUNDANCE_INTAKE_BRIDGE_SECRET')?.trim();
	return value ? value : null;
}

export function getIndeedMcpBaseUrl(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'INDEED_MCP_BASE_URL')?.trim();
	return value ? value : null;
}

export function getIndeedMcpApiKey(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'INDEED_MCP_API_KEY')?.trim();
	return value ? value : null;
}

export function getGeoMapboxAccessToken(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'ABUNDANCE_GEO_MAPBOX_ACCESS_TOKEN')?.trim();
	return value ? value : null;
}

export function getResendApiKey(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'RESEND_API_KEY')?.trim();
	return value ? value : null;
}

export function getIntakeEmailFrom(platform?: App.Platform) {
	const value = readRuntimeEnv(platform, 'ABUNDANCE_INTAKE_EMAIL_FROM')?.trim();
	return value ? value : 'Abundance Concierge <hello@createsomething.io>';
}

export function getConciergeSeedMode(platform?: App.Platform): 'demo' | 'empty' {
	return isProductionRuntime(platform) ? 'empty' : 'demo';
}
