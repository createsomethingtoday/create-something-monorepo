import {
	resolvePreferredLocation,
	shouldAttemptPreferredLocationRecovery,
	type PreferredLocationResolution
} from '$chat/location-resolver';
import { getGeoMapboxAccessToken } from './runtime';

interface MapboxFeatureContextItem {
	name?: string;
}

interface MapboxFeature {
	id?: string;
	geometry?: {
		coordinates?: [number, number];
	};
	properties?: {
		mapbox_id?: string;
		feature_type?: string;
		name?: string;
		place_formatted?: string;
		context?: {
			place?: MapboxFeatureContextItem;
			region?: MapboxFeatureContextItem;
			district?: MapboxFeatureContextItem;
			locality?: MapboxFeatureContextItem;
			neighborhood?: MapboxFeatureContextItem;
			country?: MapboxFeatureContextItem;
		};
	};
}

interface MapboxForwardResponse {
	features?: MapboxFeature[];
}

export interface PreferredLocationRecoveryResult {
	resolution: PreferredLocationResolution | null;
	clarify: boolean;
}

function detectRadiusMiles(input: string) {
	const normalizedInput = input.toLowerCase();
	const radiusMatch = normalizedInput.match(/\bwithin\s+(\d{1,3})\s*(?:mile|miles|mi)\b/);
	if (radiusMatch) {
		return Number(radiusMatch[1]);
	}

	const aroundMatch = normalizedInput.match(
		/\b(\d{1,3})\s*(?:mile|miles|mi)\s+(?:radius|around|from)\b/
	);
	if (aroundMatch) {
		return Number(aroundMatch[1]);
	}

	return null;
}

function buildExternalLocationLabel(feature: MapboxFeature) {
	const properties = feature.properties;
	const featureType = properties?.feature_type;
	const name = properties?.name?.trim();
	const placeName = properties?.context?.place?.name?.trim();
	const regionName = properties?.context?.region?.name?.trim();

	if (!name) {
		return null;
	}

	if (featureType === 'region') {
		return name;
	}

	if (featureType === 'place') {
		return regionName ? `${name}, ${regionName}` : name;
	}

	if (featureType === 'district' || featureType === 'locality' || featureType === 'neighborhood') {
		if (placeName && regionName) {
			return `${placeName}, ${regionName}`;
		}

		if (regionName) {
			return `${name}, ${regionName}`;
		}
	}

	return properties?.place_formatted?.trim() ?? name;
}

function toExternalResolution(
	input: string,
	feature: MapboxFeature,
	options?: { currentValue?: string }
): PreferredLocationResolution | null {
	const locationLabel = buildExternalLocationLabel(feature);
	if (!locationLabel) {
		return null;
	}

	const radiusMiles = detectRadiusMiles(input);
	const featureType = feature.properties?.feature_type;
	const value = radiusMiles ? `Within ${radiusMiles} miles of ${locationLabel}` : locationLabel;
	const priorValue = options?.currentValue?.trim();

	return {
		value,
		status: 'confirmed',
		confidence: featureType === 'region' ? 0.82 : 0.79,
		confirmedBy: 'user',
		note:
			priorValue && priorValue !== value
				? `Recovered preferred location from "${priorValue}" to "${value}" with external geo fallback. If this is not the right market, reply here with a different metro, state, or radius.`
				: `Recovered preferred location as "${value}" with external geo fallback. If this is not the right market, reply here with a different metro, state, or radius.`,
		matchedMarketIds: [],
		specificity: featureType === 'region' ? 2 : 3,
		radiusMiles,
		marketScope: featureType === 'region' ? 'state' : 'metro',
		needsClarification: false
	};
}

async function resolveWithMapbox(
	input: string,
	token: string,
	options?: { currentValue?: string }
) {
	const params = new URLSearchParams({
		q: input,
		access_token: token,
		autocomplete: 'false',
		country: 'us',
		language: 'en',
		limit: '3',
		permanent: 'true',
		types: 'place,region,district,locality,neighborhood'
	});

	const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);
	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as MapboxForwardResponse;
	const feature = payload.features?.[0];
	if (!feature) {
		return null;
	}

	return toExternalResolution(input, feature, options);
}

export async function recoverPreferredLocationWithFallback(
	input: string,
	options?: {
		currentValue?: string;
		requestedByPrompt?: boolean;
		platform?: App.Platform;
	}
): Promise<PreferredLocationRecoveryResult> {
	const internalResolution = resolvePreferredLocation(input, {
		requestedByPrompt: options?.requestedByPrompt,
		currentValue: options?.currentValue
	});

	if (internalResolution) {
		return {
			resolution: null,
			clarify: false
		};
	}

	if (!shouldAttemptPreferredLocationRecovery(input, options)) {
		return {
			resolution: null,
			clarify: false
		};
	}

	const mapboxToken = getGeoMapboxAccessToken(options?.platform);
	if (!mapboxToken) {
		return {
			resolution: null,
			clarify: true
		};
	}

	try {
		const externalResolution = await resolveWithMapbox(input, mapboxToken, {
			currentValue: options?.currentValue
		});

		return {
			resolution: externalResolution,
			clarify: externalResolution === null
		};
	} catch {
		return {
			resolution: null,
			clarify: true
		};
	}
}
