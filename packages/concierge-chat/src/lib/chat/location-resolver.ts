import type { ProfileFieldStatus } from '$lib/profile/types';

export const PREFERRED_LOCATION_LABEL = 'Preferred location';

type MarketScope = 'metro' | 'state' | 'region';
type FacilityTemplate = {
	name: string;
	location: string;
	lat: number;
	lng: number;
};

interface PreferredLocationMarket {
	id: string;
	label: string;
	scope: MarketScope;
	aliases: string[];
	states: string[];
	lat: number;
	lng: number;
	facilities: readonly FacilityTemplate[];
}

export interface PreferredLocationResolution {
	value: string;
	status: ProfileFieldStatus;
	confidence: number;
	confirmedBy?: 'user';
	note: string;
	matchedMarketIds: string[];
	specificity: number;
	radiusMiles: number | null;
	marketScope: MarketScope | 'multi';
	needsClarification: boolean;
}

const LOCATION_BLOCKED_TOKENS = new Set([
	'compact',
	'license',
	'resume',
	'consent',
	'background',
	'phone',
	'email',
	'specialty',
	'shift',
	'day',
	'days',
	'night',
	'nights',
	'weekend',
	'weekends',
	'yes',
	'no',
	'dont',
	"don't",
	'know',
	'maybe'
]);

const LOCATION_FILLER_TOKENS = new Set([
	'i',
	'im',
	'looking',
	'for',
	'work',
	'in',
	'near',
	'around',
	'the',
	'area',
	'metro',
	'open',
	'to',
	'within',
	'miles',
	'mile',
	'radius',
	'based',
	'want',
	'anywhere',
	'or',
	'and',
	'travel',
	'city',
	'state',
	'states',
	'stay',
	'prefer',
	'preferred'
]);

const DEFAULT_FACILITIES: readonly FacilityTemplate[] = [
	{
		name: 'Mercy Regional Medical Center',
		location: 'Tulsa, OK',
		lat: 36.154,
		lng: -95.9928
	},
	{
		name: 'Saint Francis Midtown',
		location: 'Little Rock, AR',
		lat: 34.7465,
		lng: -92.2896
	},
	{
		name: 'Presbyterian Rust Medical Center',
		location: 'Rio Rancho, NM',
		lat: 35.2481,
		lng: -106.663
	}
];

const METRO_MARKETS: readonly PreferredLocationMarket[] = [
	{
		id: 'dfw',
		label: 'Dallas-Fort Worth metro',
		scope: 'metro',
		aliases: [
			'dfw',
			'dallas-fort worth',
			'dallas fort worth',
			'dallas/fort worth',
			'dallas',
			'fort worth',
			'arlington'
		],
		states: ['Texas'],
		lat: 32.7767,
		lng: -96.797,
		facilities: [
			{
				name: 'Baylor University Medical Center',
				location: 'Dallas, TX',
				lat: 32.7843,
				lng: -96.7808
			},
			{
				name: 'Medical City Fort Worth',
				location: 'Fort Worth, TX',
				lat: 32.7335,
				lng: -97.3387
			},
			{
				name: 'Texas Health Presbyterian Hospital',
				location: 'Dallas, TX',
				lat: 32.881,
				lng: -96.7601
			}
		]
	},
	{
		id: 'austin',
		label: 'Austin metro',
		scope: 'metro',
		aliases: ['austin', 'greater austin'],
		states: ['Texas'],
		lat: 30.2672,
		lng: -97.7431,
		facilities: [
			{
				name: "St. David's Medical Center",
				location: 'Austin, TX',
				lat: 30.2907,
				lng: -97.7274
			},
			{
				name: 'Ascension Seton Medical Center Austin',
				location: 'Austin, TX',
				lat: 30.3072,
				lng: -97.7442
			},
			{
				name: "St. David's South Austin Medical Center",
				location: 'Austin, TX',
				lat: 30.2294,
				lng: -97.8249
			}
		]
	},
	{
		id: 'houston',
		label: 'Houston metro',
		scope: 'metro',
		aliases: ['houston', 'greater houston'],
		states: ['Texas'],
		lat: 29.7604,
		lng: -95.3698,
		facilities: [
			{
				name: 'Memorial Hermann Memorial City',
				location: 'Houston, TX',
				lat: 29.7831,
				lng: -95.5601
			},
			{
				name: 'Houston Methodist West',
				location: 'Houston, TX',
				lat: 29.7836,
				lng: -95.7365
			},
			{
				name: 'HCA Houston Healthcare Medical Center',
				location: 'Houston, TX',
				lat: 29.8049,
				lng: -95.3965
			}
		]
	},
	{
		id: 'san_antonio',
		label: 'San Antonio metro',
		scope: 'metro',
		aliases: ['san antonio', 'greater san antonio'],
		states: ['Texas'],
		lat: 29.4241,
		lng: -98.4936,
		facilities: [
			{
				name: 'Methodist Stone Oak Hospital',
				location: 'San Antonio, TX',
				lat: 29.6462,
				lng: -98.493
			},
			{
				name: 'University Hospital',
				location: 'San Antonio, TX',
				lat: 29.5073,
				lng: -98.5798
			},
			{
				name: 'Baptist Medical Center',
				location: 'San Antonio, TX',
				lat: 29.4308,
				lng: -98.4819
			}
		]
	},
	{
		id: 'phoenix',
		label: 'Phoenix metro',
		scope: 'metro',
		aliases: ['phoenix', 'greater phoenix', 'scottsdale', 'mesa'],
		states: ['Arizona'],
		lat: 33.4484,
		lng: -112.074,
		facilities: [
			{
				name: 'Banner University Medical Center Phoenix',
				location: 'Phoenix, AZ',
				lat: 33.4654,
				lng: -112.0417
			},
			{
				name: "St. Joseph's Hospital and Medical Center",
				location: 'Phoenix, AZ',
				lat: 33.4807,
				lng: -112.0732
			},
			{
				name: 'HonorHealth Scottsdale Osborn Medical Center',
				location: 'Scottsdale, AZ',
				lat: 33.488,
				lng: -111.9254
			}
		]
	},
	{
		id: 'tucson',
		label: 'Tucson metro',
		scope: 'metro',
		aliases: ['tucson'],
		states: ['Arizona'],
		lat: 32.2226,
		lng: -110.9747,
		facilities: [
			{
				name: 'Tucson Medical Center',
				location: 'Tucson, AZ',
				lat: 32.2533,
				lng: -110.8888
			},
			{
				name: 'Banner University Medical Center Tucson',
				location: 'Tucson, AZ',
				lat: 32.2394,
				lng: -110.9454
			},
			{
				name: 'Northwest Medical Center',
				location: 'Tucson, AZ',
				lat: 32.3416,
				lng: -111.0125
			}
		]
	},
	{
		id: 'bay_area',
		label: 'San Francisco Bay Area',
		scope: 'metro',
		aliases: ['bay area', 'san francisco', 'oakland', 'san jose', 'sf bay area'],
		states: ['California'],
		lat: 37.7749,
		lng: -122.4194,
		facilities: [
			{
				name: 'UCSF Medical Center',
				location: 'San Francisco, CA',
				lat: 37.7631,
				lng: -122.4586
			},
			{
				name: 'Stanford Health Care',
				location: 'Palo Alto, CA',
				lat: 37.4336,
				lng: -122.1757
			},
			{
				name: 'Kaiser Permanente Oakland Medical Center',
				location: 'Oakland, CA',
				lat: 37.8113,
				lng: -122.2652
			}
		]
	},
	{
		id: 'los_angeles',
		label: 'Los Angeles metro',
		scope: 'metro',
		aliases: ['los angeles', 'la area', 'la metro', 'orange county'],
		states: ['California'],
		lat: 34.0522,
		lng: -118.2437,
		facilities: [
			{
				name: 'Cedars-Sinai Medical Center',
				location: 'Los Angeles, CA',
				lat: 34.075,
				lng: -118.3807
			},
			{
				name: 'UCLA Medical Center',
				location: 'Los Angeles, CA',
				lat: 34.0656,
				lng: -118.4453
			},
			{
				name: 'Hoag Hospital',
				location: 'Newport Beach, CA',
				lat: 33.625,
				lng: -117.9305
			}
		]
	}
];

const STATE_MARKETS: readonly PreferredLocationMarket[] = [
	{
		id: 'texas',
		label: 'Texas',
		scope: 'state',
		aliases: ['texas'],
		states: ['Texas'],
		lat: 31.9686,
		lng: -99.9018,
		facilities: [
			{
				name: "St. David's Medical Center",
				location: 'Austin, TX',
				lat: 30.2907,
				lng: -97.7274
			},
			{
				name: 'Methodist Stone Oak Hospital',
				location: 'San Antonio, TX',
				lat: 29.6462,
				lng: -98.493
			},
			{
				name: 'Memorial Hermann Memorial City',
				location: 'Houston, TX',
				lat: 29.7831,
				lng: -95.5601
			}
		]
	},
	{
		id: 'arizona',
		label: 'Arizona',
		scope: 'state',
		aliases: ['arizona'],
		states: ['Arizona'],
		lat: 34.0489,
		lng: -111.0937,
		facilities: [
			{
				name: 'Banner Desert Medical Center',
				location: 'Mesa, AZ',
				lat: 33.4147,
				lng: -111.8043
			},
			{
				name: 'Chandler Regional Medical Center',
				location: 'Chandler, AZ',
				lat: 33.2966,
				lng: -111.8392
			},
			{
				name: 'Tucson Medical Center',
				location: 'Tucson, AZ',
				lat: 32.2533,
				lng: -110.8888
			}
		]
	},
	{
		id: 'california',
		label: 'California',
		scope: 'state',
		aliases: ['california'],
		states: ['California'],
		lat: 36.7783,
		lng: -119.4179,
		facilities: [
			{
				name: 'Cedars-Sinai Medical Center',
				location: 'Los Angeles, CA',
				lat: 34.075,
				lng: -118.3807
			},
			{
				name: 'UC San Diego Medical Center',
				location: 'San Diego, CA',
				lat: 32.7534,
				lng: -117.1654
			},
			{
				name: 'Kaiser Permanente South Sacramento Medical Center',
				location: 'Sacramento, CA',
				lat: 38.4755,
				lng: -121.4161
			}
		]
	},
	{
		id: 'florida',
		label: 'Florida',
		scope: 'state',
		aliases: ['florida'],
		states: ['Florida'],
		lat: 27.6648,
		lng: -81.5158,
		facilities: [
			{
				name: 'Tampa General Hospital',
				location: 'Tampa, FL',
				lat: 27.9382,
				lng: -82.4584
			},
			{
				name: 'AdventHealth Orlando',
				location: 'Orlando, FL',
				lat: 28.5766,
				lng: -81.3727
			},
			{
				name: 'UF Health Jacksonville',
				location: 'Jacksonville, FL',
				lat: 30.3438,
				lng: -81.6823
			}
		]
	},
	{
		id: 'washington',
		label: 'Washington',
		scope: 'state',
		aliases: ['washington'],
		states: ['Washington'],
		lat: 47.7511,
		lng: -120.7401,
		facilities: [
			{
				name: 'Harborview Medical Center',
				location: 'Seattle, WA',
				lat: 47.6044,
				lng: -122.3232
			},
			{
				name: 'Providence Sacred Heart Medical Center',
				location: 'Spokane, WA',
				lat: 47.6549,
				lng: -117.4147
			},
			{
				name: 'MultiCare Tacoma General Hospital',
				location: 'Tacoma, WA',
				lat: 47.2641,
				lng: -122.4443
			}
		]
	},
	{
		id: 'new_jersey',
		label: 'New Jersey',
		scope: 'state',
		aliases: ['new jersey', 'jersey'],
		states: ['New Jersey'],
		lat: 40.0583,
		lng: -74.4057,
		facilities: [
			{
				name: 'Hackensack University Medical Center',
				location: 'Hackensack, NJ',
				lat: 40.8858,
				lng: -74.0561
			},
			{
				name: 'Morristown Medical Center',
				location: 'Morristown, NJ',
				lat: 40.7968,
				lng: -74.4815
			},
			{
				name: 'Jersey Shore University Medical Center',
				location: 'Neptune, NJ',
				lat: 40.2126,
				lng: -74.0358
			}
		]
	}
];

const REGION_MARKETS: readonly PreferredLocationMarket[] = [
	{
		id: 'texas_nearby',
		label: 'Texas and nearby states',
		scope: 'region',
		aliases: ['texas and nearby states', 'tx and nearby states'],
		states: ['Texas', 'Oklahoma', 'Arkansas', 'New Mexico'],
		lat: 32.0,
		lng: -98.8,
		facilities: [
			{
				name: "St. David's Medical Center",
				location: 'Austin, TX',
				lat: 30.2907,
				lng: -97.7274
			},
			{
				name: 'Saint Francis Midtown',
				location: 'Little Rock, AR',
				lat: 34.7465,
				lng: -92.2896
			},
			{
				name: 'Presbyterian Rust Medical Center',
				location: 'Rio Rancho, NM',
				lat: 35.2481,
				lng: -106.663
			}
		]
	}
];

const SAFE_STATE_ABBREVIATIONS = new Map<string, string>([
	['tx', 'Texas'],
	['az', 'Arizona'],
	['ca', 'California'],
	['fl', 'Florida'],
	['wa', 'Washington'],
	['ga', 'Georgia'],
	['nc', 'North Carolina'],
	['sc', 'South Carolina'],
	['tn', 'Tennessee'],
	['co', 'Colorado'],
	['ok', 'Oklahoma'],
	['nm', 'New Mexico'],
	['ny', 'New York'],
	['nj', 'New Jersey'],
	['pa', 'Pennsylvania']
]);

const MARKET_BY_ID = new Map(
	[...REGION_MARKETS, ...STATE_MARKETS, ...METRO_MARKETS].map((market) => [market.id, market])
);

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAlias(input: string, alias: string) {
	return new RegExp(`\\b${escapeRegExp(alias)}\\b`).test(input);
}

function detectRadiusMiles(input: string) {
	const radiusMatch = input.match(/\bwithin\s+(\d{1,3})\s*(?:mile|miles|mi)\b/);
	if (radiusMatch) {
		return Number(radiusMatch[1]);
	}

	const aroundMatch = input.match(/\b(\d{1,3})\s*(?:mile|miles|mi)\s+(?:radius|around|from)\b/);
	if (aroundMatch) {
		return Number(aroundMatch[1]);
	}

	return null;
}

function hasLocationIntentCue(input: string) {
	return [
		/\bwork in\b/,
		/\blooking for work in\b/,
		/\blooking in\b/,
		/\bopen to\b/,
		/\banywhere in\b/,
		/\btravel (?:to|in)\b/,
		/\bbased in\b/,
		/\brelocat(?:e|ing) to\b/,
		/\bnear\b/,
		/\baround\b/,
		/\bmetro\b/,
		/\barea\b/,
		/\bradius\b/,
		/\bwithin\s+\d{1,3}\s*(?:mile|miles|mi)\b/
	].some((pattern) => pattern.test(input));
}

function hasCorrectionCue(input: string) {
	return /\b(actually|instead|rather|change|switch|update|correct|open to)\b/.test(input);
}

function hasExplicitMultiMarketCue(input: string) {
	return /\b(and|or|either)\b/.test(input);
}

function isLikelyLocationOnlyReply(input: string, matchedMarkets: PreferredLocationMarket[]) {
	const tokens = input
		.replace(/[^\w\s/,-]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);

	if (tokens.length === 0 || tokens.length > 8) {
		return false;
	}

	if (tokens.some((token) => LOCATION_BLOCKED_TOKENS.has(token))) {
		return false;
	}

	return tokens.every(
		(token) =>
			LOCATION_FILLER_TOKENS.has(token) ||
			SAFE_STATE_ABBREVIATIONS.has(token) ||
			matchedMarkets.some((market) =>
				market.aliases.some((alias) =>
					alias
						.toLowerCase()
						.split(/[\s/-]+/)
						.includes(token)
				)
			)
	);
}

function formatOrList(values: string[]) {
	if (values.length <= 1) {
		return values[0] ?? '';
	}

	if (values.length === 2) {
		return `${values[0]} or ${values[1]}`;
	}

	return `${values.slice(0, -1).join(', ')}, or ${values.at(-1)}`;
}

function uniqueStrings(values: string[]) {
	return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function findRegionMatches(input: string) {
	return REGION_MARKETS.filter((market) => market.aliases.some((alias) => hasAlias(input, alias)));
}

function findMetroMatches(input: string) {
	return uniqueStrings(
		METRO_MARKETS.flatMap((market) =>
			market.aliases.some((alias) => hasAlias(input, alias)) ? [market.id] : []
		)
	)
		.map((id) => MARKET_BY_ID.get(id))
		.filter((market): market is PreferredLocationMarket => Boolean(market));
}

function findStateMatches(input: string) {
	const directMatches = STATE_MARKETS.filter((market) =>
		market.aliases.some((alias) => hasAlias(input, alias))
	);

	const abbreviationMatches = [...SAFE_STATE_ABBREVIATIONS.entries()].flatMap(([abbreviation, label]) =>
		new RegExp(`(?:^|[\\s,(\\/])${escapeRegExp(abbreviation)}(?:$|[\\s),./])`).test(input)
			? [label]
			: []
	);

	return uniqueStrings([
		...directMatches.map((market) => market.id),
		...abbreviationMatches
			.map((label) => STATE_MARKETS.find((market) => market.label === label)?.id)
			.filter((value): value is string => Boolean(value))
	])
		.map((id) => MARKET_BY_ID.get(id))
		.filter((market): market is PreferredLocationMarket => Boolean(market));
}

function buildLocationValue(markets: PreferredLocationMarket[], radiusMiles: number | null) {
	if (markets.length === 1) {
		const baseLabel = markets[0].label;
		return radiusMiles ? `Within ${radiusMiles} miles of ${baseLabel}` : baseLabel;
	}

	return formatOrList(markets.map((market) => market.label));
}

function getSpecificity(markets: PreferredLocationMarket[], radiusMiles: number | null) {
	if (markets.length === 1 && markets[0]?.scope === 'metro') {
		return radiusMiles ? 4 : 3;
	}

	if (markets.length === 1 && markets[0]?.scope === 'state') {
		return 2;
	}

	if (markets.length > 1) {
		return 2;
	}

	return 1;
}

function getConfidence(markets: PreferredLocationMarket[], radiusMiles: number | null) {
	if (markets.length === 1 && markets[0]?.scope === 'metro') {
		return radiusMiles ? 0.97 : 0.95;
	}

	if (markets.length === 1 && markets[0]?.scope === 'state') {
		return 0.92;
	}

	if (markets.length === 1 && markets[0]?.scope === 'region') {
		return 0.89;
	}

	if (markets.length > 1) {
		return 0.88;
	}

	return 0.78;
}

function getCurrentSpecificity(currentValue?: string) {
	if (!currentValue) {
		return 0;
	}

	return (
		resolvePreferredLocation(currentValue, {
			requestedByPrompt: true,
			currentValue: undefined
		})?.specificity ?? 0
	);
}

function getSuggestedMetroExamples(markets: PreferredLocationMarket[]) {
	const state = markets[0]?.states[0];
	if (!state) {
		return [];
	}

	return METRO_MARKETS.filter((market) => market.states.includes(state))
		.slice(0, 2)
		.map((market) => market.label);
}

function buildResolutionNote(
	value: string,
	markets: PreferredLocationMarket[],
	options: { currentValue?: string; explicitMultiMarket: boolean },
	radiusMiles: number | null
) {
	const priorValue = options.currentValue;
	const marketScope =
		markets.length > 1 ? 'multi' : (markets[0]?.scope ?? 'region');

	const normalizedNote =
		priorValue && priorValue !== value
			? `Updated preferred location from "${priorValue}" to "${value}" after a more specific nurse message.`
			: `Captured preferred location as "${value}".`;

	if (marketScope === 'multi') {
		return `${normalizedNote} I can search across both markets, and if one matters most later you can name it here in chat.`;
	}

	if (marketScope === 'region') {
		return `${normalizedNote} If you want a tighter search later, reply with a metro or a travel radius.`;
	}

	if (marketScope === 'state') {
		const examples = getSuggestedMetroExamples(markets);
		if (examples.length > 0) {
			return `${normalizedNote} If you want to tighten it later, reply with a metro like ${formatOrList(
				examples
			)} or a radius.`;
		}

		return `${normalizedNote} If you want to tighten it later, reply with a metro or a radius.`;
	}

	if (radiusMiles) {
		return `${normalizedNote} I will keep the search inside that radius unless you update it later.`;
	}

	if (options.explicitMultiMarket) {
		return `${normalizedNote} I can search across those locations and tighten later if you want.`;
	}

	return normalizedNote;
}

function haversineMiles(
	left: { lat: number; lng: number },
	right: { lat: number; lng: number }
) {
	const toRadians = (value: number) => (value * Math.PI) / 180;
	const earthRadiusMiles = 3958.8;
	const deltaLat = toRadians(right.lat - left.lat);
	const deltaLng = toRadians(right.lng - left.lng);
	const lat1 = toRadians(left.lat);
	const lat2 = toRadians(right.lat);

	const a =
		Math.sin(deltaLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadiusMiles * c;
}

function getFacilitiesForMarkets(marketIds: string[]) {
	const facilities: FacilityTemplate[] = [];
	for (const marketId of marketIds) {
		const market = MARKET_BY_ID.get(marketId);
		if (!market) {
			continue;
		}

		for (const facility of market.facilities) {
			if (
				facilities.some(
					(existing) =>
						existing.name === facility.name && existing.location === facility.location
				)
			) {
				continue;
			}

			facilities.push(facility);
		}
	}

	return facilities;
}

function getInterleavedFacilitiesForMarkets(marketIds: string[]) {
	const facilityGroups = marketIds.map((marketId) => MARKET_BY_ID.get(marketId)?.facilities ?? []);
	const selected: FacilityTemplate[] = [];
	let index = 0;

	while (selected.length < 3) {
		let addedInPass = false;

		for (const group of facilityGroups) {
			const facility = group[index];
			if (!facility) {
				continue;
			}

			if (
				selected.some(
					(existing) =>
						existing.name === facility.name && existing.location === facility.location
				)
			) {
				continue;
			}

			selected.push(facility);
			addedInPass = true;

			if (selected.length === 3) {
				return selected;
			}
		}

		if (!addedInPass) {
			return selected;
		}

		index += 1;
	}

	return selected;
}

export function resolvePreferredLocation(
	input: string,
	options?: { requestedByPrompt?: boolean; currentValue?: string }
): PreferredLocationResolution | null {
	const normalizedInput = input.toLowerCase();
	const radiusMiles = detectRadiusMiles(normalizedInput);
	const explicitMultiMarket = hasExplicitMultiMarketCue(normalizedInput);
	const regionMatches = findRegionMatches(normalizedInput);
	const metroMatches = findMetroMatches(normalizedInput);
	const stateMatches = findStateMatches(normalizedInput).filter(
		(stateMarket) => !metroMatches.some((metroMarket) => metroMarket.states.includes(stateMarket.label))
	);

	const matchedMarkets =
		metroMatches.length > 0
			? metroMatches
			: regionMatches.length > 0
				? regionMatches
				: stateMatches;

	if (matchedMarkets.length === 0) {
		return null;
	}

	const looksLikeLocationOnlyReply = isLikelyLocationOnlyReply(normalizedInput, matchedMarkets);
	if (!options?.requestedByPrompt && !looksLikeLocationOnlyReply && !hasLocationIntentCue(normalizedInput)) {
		return null;
	}

	const value = buildLocationValue(matchedMarkets, radiusMiles);
	const specificity = getSpecificity(matchedMarkets, radiusMiles);
	const currentSpecificity = getCurrentSpecificity(options?.currentValue);
	const correctionCue = hasCorrectionCue(normalizedInput);

	if (options?.currentValue && value !== options.currentValue) {
		if (!correctionCue && specificity < currentSpecificity) {
			return null;
		}
	}

	const marketScope = matchedMarkets.length > 1 ? 'multi' : matchedMarkets[0].scope;
	const needsClarification = marketScope === 'multi' && !explicitMultiMarket;

	return {
		value,
		status: needsClarification ? 'candidate' : 'confirmed',
		confidence: getConfidence(matchedMarkets, radiusMiles),
		confirmedBy: needsClarification ? undefined : 'user',
		note: buildResolutionNote(
			value,
			matchedMarkets,
			{
				currentValue: options?.currentValue,
				explicitMultiMarket
			},
			radiusMiles
		),
		matchedMarketIds: matchedMarkets.map((market) => market.id),
		specificity,
		radiusMiles,
		marketScope,
		needsClarification
	};
}

export function normalizePreferredLocationLabel(input?: string | null) {
	if (!input) {
		return null;
	}

	return resolvePreferredLocation(input, { requestedByPrompt: true })?.value ?? input.trim();
}

export function shouldAttemptPreferredLocationRecovery(
	input: string,
	options?: { requestedByPrompt?: boolean }
) {
	const normalizedInput = input.toLowerCase();
	if (resolvePreferredLocation(input, options)) {
		return false;
	}

	const tokens = normalizedInput
		.replace(/[^\w\s/,-]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);

	if (tokens.length === 0 || tokens.length > 10) {
		return false;
	}

	if (tokens.some((token) => LOCATION_BLOCKED_TOKENS.has(token))) {
		return false;
	}

	if (options?.requestedByPrompt) {
		return tokens.some(
			(token) => token.length >= 3 && !LOCATION_FILLER_TOKENS.has(token)
		);
	}

	return (
		hasLocationIntentCue(normalizedInput) ||
		/\b(area|metro|county|jersey|cities|valley|bay|radius|miles?)\b/.test(normalizedInput)
	);
}

function normalizeGenericLocationLabel(value: string) {
	return value.replace(/^within\s+\d{1,3}\s+miles?\s+of\s+/i, '').trim();
}

function getGenericFacilitiesForLocationValue(value: string) {
	const baseLocation = normalizeGenericLocationLabel(value);
	const genericLocations = baseLocation.split(/\s+or\s+/i).filter(Boolean);
	const locationA = genericLocations[0] ?? baseLocation;
	const locationB = genericLocations[1] ?? locationA;

	return [
		['Regional Medical Center', locationA] as const,
		['University Hospital', locationB] as const,
		['Metro Clinical Center', locationA] as const
	];
}

export function getMatchingFacilitiesForPreferredLocation(value?: string | null) {
	if (!value) {
		return DEFAULT_FACILITIES.map(({ name, location }) => [name, location] as const);
	}

	const resolution = resolvePreferredLocation(value, { requestedByPrompt: true });
	if (!resolution) {
		return getGenericFacilitiesForLocationValue(value);
	}

	const facilities = getFacilitiesForMarkets(resolution.matchedMarketIds);
	if (facilities.length === 0) {
		return DEFAULT_FACILITIES.map(({ name, location }) => [name, location] as const);
	}

	if (resolution.matchedMarketIds.length > 1) {
		return getInterleavedFacilitiesForMarkets(resolution.matchedMarketIds).map((facility) => [
			facility.name,
			facility.location
		] as const);
	}

	if (resolution.radiusMiles && resolution.matchedMarketIds.length === 1) {
		const market = MARKET_BY_ID.get(resolution.matchedMarketIds[0]);
		if (market) {
			const radiusMiles = resolution.radiusMiles;
			const withDistance = facilities
				.map((facility) => ({
					facility,
					distanceMiles: haversineMiles(
						{ lat: market.lat, lng: market.lng },
						{ lat: facility.lat, lng: facility.lng }
					)
				}))
				.sort((left, right) => left.distanceMiles - right.distanceMiles);

			const withinRadius = withDistance.filter(
				(entry) => entry.distanceMiles <= radiusMiles
			);
			const selected = withinRadius.length > 0 ? withinRadius : withDistance;
			return selected
				.slice(0, 3)
				.map(({ facility }) => [facility.name, facility.location] as const);
		}
	}

	return facilities.slice(0, 3).map((facility) => [facility.name, facility.location] as const);
}
