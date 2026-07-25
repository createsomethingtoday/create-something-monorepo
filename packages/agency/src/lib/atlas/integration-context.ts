export type IntegrationMapContext = {
	slug: string;
	name: string;
};

const connectorSlugPattern = /^[_a-z0-9][a-z0-9_-]{0,79}$/i;

export function normalizeIntegrationMapContext(
	slugInput: unknown,
	nameInput: unknown
): IntegrationMapContext | null {
	if (typeof slugInput !== 'string' || !connectorSlugPattern.test(slugInput)) return null;

	const name =
		typeof nameInput === 'string'
			? nameInput.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80)
			: '';
	if (!name) return null;

	return { slug: slugInput.toLocaleLowerCase(), name };
}
