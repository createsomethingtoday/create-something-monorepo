import type { AssetVersion, AssetVersionSnapshot } from './airtable';

export interface AssetVersionDifference {
	field: string;
	oldValue: unknown;
	newValue: unknown;
	changed: boolean;
}

function areVersionValuesEqual(oldValue: unknown, newValue: unknown): boolean {
	if (Array.isArray(oldValue) || Array.isArray(newValue)) {
		return JSON.stringify(oldValue) === JSON.stringify(newValue);
	}

	if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object') {
		return JSON.stringify(oldValue) === JSON.stringify(newValue);
	}

	return oldValue === newValue;
}

function compareVersionRecords(
	oldRecord: Record<string, unknown>,
	newRecord: Record<string, unknown>
): AssetVersionDifference[] {
	const fields = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

	return [...fields]
		.map((field) => {
			const oldValue = oldRecord[field];
			const newValue = newRecord[field];

			return {
				field,
				oldValue,
				newValue,
				changed: !areVersionValuesEqual(oldValue, newValue)
			} satisfies AssetVersionDifference;
		})
		.filter((diff) => diff.changed);
}

export function compareAssetVersionSnapshots(
	oldSnapshot: AssetVersionSnapshot,
	newSnapshot: AssetVersionSnapshot
): AssetVersionDifference[] {
	return compareVersionRecords(
		oldSnapshot as Record<string, unknown>,
		newSnapshot as Record<string, unknown>
	);
}

function buildLegacyComparisonRecord(version: AssetVersion): Record<string, unknown> {
	return {
		reviewType: version.reviewType,
		reviewStatus: version.reviewStatus,
		changes: version.changes,
		versionNotes: version.versionNotes ?? undefined,
		metaUpdateLog: version.metaUpdateLog ?? undefined
	};
}

export function compareAssetVersions(
	fromVersion: AssetVersion,
	toVersion: AssetVersion
): AssetVersionDifference[] {
	if (fromVersion.snapshot && toVersion.snapshot) {
		return compareAssetVersionSnapshots(fromVersion.snapshot, toVersion.snapshot);
	}

	return compareVersionRecords(
		buildLegacyComparisonRecord(fromVersion),
		buildLegacyComparisonRecord(toVersion)
	);
}
