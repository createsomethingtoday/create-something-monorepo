export const SUPPORTED_COUNTRIES = [
	'Albania',
	'Algeria',
	'Angola',
	'Antigua & Barbuda',
	'Argentina',
	'Armenia',
	'Australia',
	'Austria',
	'Azerbaijan',
	'Bahamas',
	'Bahrain',
	'Bangladesh',
	'Belgium',
	'Benin',
	'Bhutan',
	'Bolivia',
	'Bosnia and Herzegovina',
	'Botswana',
	'Brunei',
	'Bulgaria',
	'Cambodia',
	'Canada',
	'Chile',
	'Colombia',
	'Costa Rica',
	"Cote d'Ivoire",
	'Croatia',
	'Cyprus',
	'Czech Republic',
	'Denmark',
	'Dominican Republic',
	'Ecuador',
	'Egypt',
	'El Salvador',
	'Estonia',
	'Ethiopia',
	'Finland',
	'France',
	'Gabon',
	'Gambia',
	'Germany',
	'Ghana',
	'Greece',
	'Guatemala',
	'Guyana',
	'Hong Kong',
	'Hungary',
	'Iceland',
	'India',
	'Indonesia',
	'Ireland',
	'Israel',
	'Italy',
	'Jamaica',
	'Japan',
	'Jordan',
	'Kazakhstan',
	'Kenya',
	'Kuwait',
	'Laos',
	'Latvia',
	'Liechtenstein',
	'Lithuania',
	'Luxembourg',
	'Macao SAR China',
	'Madagascar',
	'Malaysia',
	'Malta',
	'Mauritius',
	'Mexico',
	'Moldova',
	'Monaco',
	'Mongolia',
	'Morocco',
	'Mozambique',
	'Namibia',
	'Netherlands',
	'New Zealand',
	'Niger',
	'Nigeria',
	'North Macedonia',
	'Norway',
	'Oman',
	'Pakistan',
	'Panama',
	'Paraguay',
	'Peru',
	'Philippines',
	'Poland',
	'Portugal',
	'Qatar',
	'Romania',
	'Rwanda',
	'San Marino',
	'Saudi Arabia',
	'Senegal',
	'Serbia',
	'Singapore',
	'Slovakia',
	'Slovenia',
	'South Africa',
	'South Korea',
	'Spain',
	'Sri Lanka',
	'St. Lucia',
	'Sweden',
	'Switzerland',
	'Taiwan',
	'Tanzania',
	'Thailand',
	'Trinidad & Tobago',
	'Tunisia',
	'Turkey',
	'United Arab Emirates',
	'United Kingdom',
	'United States',
	'Uruguay',
	'Uzbekistan'
] as const;

export const COUNTRIES_REQUIRING_STRIPE_ONBOARDING = ['India'] as const;

function normalizeCountryToken(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\*/g, '')
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/gi, ' ')
		.trim()
		.toLowerCase();
}

const COUNTRY_ALIASES = new Map<string, string>([
	['antigua and barbuda', 'antigua & barbuda'],
	['saint lucia', 'st. lucia'],
	['trinidad and tobago', 'trinidad & tobago'],
	['macau', 'macao sar china'],
	['macedonia', 'north macedonia'],
	['the bahamas', 'bahamas'],
	['the gambia', 'gambia']
]);

const SUPPORTED_COUNTRY_TOKENS = new Set(
	SUPPORTED_COUNTRIES.map((value) => normalizeCountryToken(value))
);

const STRIPE_ONBOARDING_COUNTRY_TOKENS = new Set(
	COUNTRIES_REQUIRING_STRIPE_ONBOARDING.map((value) => normalizeCountryToken(value))
);

function normalizeCountryAlias(country: string): string {
	const normalized = normalizeCountryToken(country);
	const alias = COUNTRY_ALIASES.get(normalized);
	return alias ? normalizeCountryToken(alias) : normalized;
}

export function isSupportedCountry(country: string): boolean {
	const normalized = normalizeCountryAlias(country);
	if (!normalized) return false;

	return SUPPORTED_COUNTRY_TOKENS.has(normalized);
}

export function requiresSpecificStripeOnboarding(country: string): boolean {
	const normalized = normalizeCountryAlias(country);
	if (!normalized) return false;

	return (
		STRIPE_ONBOARDING_COUNTRY_TOKENS.has(normalized) ||
		!SUPPORTED_COUNTRY_TOKENS.has(normalized)
	);
}
