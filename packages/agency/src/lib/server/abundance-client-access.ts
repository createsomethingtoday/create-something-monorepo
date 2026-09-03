const NPG_EMAIL_DOMAINS = new Set(['thenursepractitionergroup.com', 'thenpgroup.com']);

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
	if (extra.length === 0 && NPG_EMAIL_DOMAINS.has(domain)) return true;

	return parseEmailList(agencyOperatorEmails).has(normalized);
}
