const NPG_EMAIL_DOMAIN = 'thenursepractitionergroup.com';

function parseEmailList(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean)
	);
}

export function canAccessNpgHealthcareAnalyst(
	email: string | null | undefined,
	agencyOperatorEmails: string | undefined
): boolean {
	const normalized = email?.trim().toLowerCase();
	if (!normalized) return false;

	const [, domain, ...extra] = normalized.split('@');
	if (extra.length === 0 && domain === NPG_EMAIL_DOMAIN) return true;

	return parseEmailList(agencyOperatorEmails).has(normalized);
}
