export type ProfileFieldStatus = 'candidate' | 'inferred' | 'confirmed' | 'rejected';

export type ProfileFieldClass =
	| 'identity'
	| 'contact'
	| 'consent'
	| 'billing'
	| 'credential'
	| 'regulated'
	| 'external_write_key'
	| 'preference';

export interface ProfileFieldEvent {
	key: string;
	label: string;
	value: string;
	status: ProfileFieldStatus;
	confidence: number;
	fieldClass: ProfileFieldClass;
	sourceMessageIds: string[];
	sourceArtifactIds: string[];
	updatedAt: string;
	confirmedBy?: 'user' | 'agent' | 'operator';
	note?: string;
}

export interface ProfileSnapshot {
	completion: number;
	confirmedCount: number;
	inferredCount: number;
	candidateCount: number;
	missingRequired: string[];
	blockers: string[];
	fields: ProfileFieldEvent[];
}

export function requiresExplicitConfirmation(field: ProfileFieldEvent): boolean {
	return field.fieldClass !== 'preference';
}

export function getFieldConfidenceBand(confidence: number): 'low' | 'medium' | 'high' {
	if (confidence < 0.7) {
		return 'low';
	}

	if (confidence < 0.9) {
		return 'medium';
	}

	return 'high';
}
