const LONG_DESCRIPTION_CHANGE_KEY = 'ℹ️Description (Long).html';
const LONG_DESCRIPTION_CHANGE_KEY_WITH_SPACE = 'ℹ️ Description (Long).html';
const LONG_DESCRIPTION_CHANGE_KEY_WITHOUT_ICON = 'Description (Long).html';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeChangeKey(key: string): string {
	return key.trim().replace(/\s+/g, ' ');
}

export function isLongDescriptionAssetVersionField(key: string): boolean {
	const normalized = normalizeChangeKey(key);
	return (
		normalized === LONG_DESCRIPTION_CHANGE_KEY ||
		normalized === LONG_DESCRIPTION_CHANGE_KEY_WITH_SPACE ||
		normalized === LONG_DESCRIPTION_CHANGE_KEY_WITHOUT_ICON
	);
}

export function isLongDescriptionOnlyAssetVersionChange(changes: unknown): boolean {
	if (!isRecord(changes)) return false;

	const keys = Object.keys(changes);
	return keys.length === 1 && isLongDescriptionAssetVersionField(keys[0]);
}

export function shouldCreateAssetVersionForChanges(changes: unknown): boolean {
	if (typeof changes === 'string') return changes.trim().length > 0;
	if (!isRecord(changes)) return false;
	if (Object.keys(changes).length === 0) return false;

	return !isLongDescriptionOnlyAssetVersionChange(changes);
}
