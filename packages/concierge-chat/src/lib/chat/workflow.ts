import type { ChatArtifact } from './artifact-model';
import {
	getRequiredDocumentSpecByKey,
	REQUIRED_DOCUMENT_SPECS,
	type RequiredDocumentSpec
} from './document-requirements';
import { PREFERRED_LOCATION_LABEL } from './location-resolver';
import type { ConciergeThread } from '$chat/thread-store';
import type { ProfileFieldEvent } from '$lib/profile/types';

export const CONFIRMABLE_FIELD_KEYS = ['preferred_shift', 'preferred_region'] as const;
export const REQUIRED_INTAKE_FIELD_KEYS = [
	'specialty',
	'preferred_shift',
	'preferred_region',
	'compact_license'
] as const;

const REQUIRED_INTAKE_FIELD_LABELS: Record<
	(typeof REQUIRED_INTAKE_FIELD_KEYS)[number],
	string
> = {
	specialty: 'Specialty',
	preferred_shift: 'Preferred shift',
	preferred_region: PREFERRED_LOCATION_LABEL,
	compact_license: 'Compact license status'
};

export function getProfileField(thread: ConciergeThread, key: string): ProfileFieldEvent | undefined {
	return thread.profile.fields.find((field) => field.key === key);
}

function hasCollectedField(field?: ProfileFieldEvent) {
	return Boolean(field && field.status !== 'rejected' && String(field.value ?? '').trim().length > 0);
}

export function hasStartedIntake(thread: ConciergeThread): boolean {
	return (
		thread.messages.some((message) => message.role === 'user') ||
		thread.profile.fields.length > 0 ||
		hasCollectedIntakeData(thread)
	);
}

export function getMissingIntakeFieldLabels(thread: ConciergeThread): string[] {
	return REQUIRED_INTAKE_FIELD_KEYS.flatMap((key) =>
		hasCollectedField(getProfileField(thread, key)) ? [] : [REQUIRED_INTAKE_FIELD_LABELS[key]]
	);
}

export function hasCollectedIntakeData(thread: ConciergeThread): boolean {
	return getMissingIntakeFieldLabels(thread).length === 0;
}

export function getConfirmableFields(thread: ConciergeThread): ProfileFieldEvent[] {
	return thread.profile.fields.filter(
		(field) =>
			CONFIRMABLE_FIELD_KEYS.includes(field.key as (typeof CONFIRMABLE_FIELD_KEYS)[number]) &&
			(field.status === 'candidate' || field.status === 'inferred')
	);
}

export function getRejectedConfirmableFields(thread: ConciergeThread): ProfileFieldEvent[] {
	return thread.profile.fields.filter(
		(field) =>
			CONFIRMABLE_FIELD_KEYS.includes(field.key as (typeof CONFIRMABLE_FIELD_KEYS)[number]) &&
			field.status === 'rejected'
	);
}

export function getUploadedDocumentArtifact(
	thread: ConciergeThread,
	documentKey: string
): ChatArtifact | undefined {
	const spec = getRequiredDocumentSpecByKey(documentKey);

	if (!spec) {
		return undefined;
	}

	return thread.artifacts.find(
		(artifact) =>
			artifact.kind === 'upload' &&
			artifact.status === 'ready' &&
			(artifact.documentKey === spec.key || artifact.title === spec.title)
	);
}

export function getUploadedDocuments(thread: ConciergeThread): string[] {
	return REQUIRED_DOCUMENT_SPECS.flatMap((spec) =>
		getUploadedDocumentArtifact(thread, spec.key) ? [spec.title] : []
	);
}

export function getMissingRequiredDocumentSpecs(
	thread: ConciergeThread
): RequiredDocumentSpec[] {
	return REQUIRED_DOCUMENT_SPECS.filter((spec) => !getUploadedDocumentArtifact(thread, spec.key));
}

export function needsDocumentUpload(thread: ConciergeThread): boolean {
	if (!hasCollectedIntakeData(thread)) {
		return false;
	}

	return getMissingRequiredDocumentSpecs(thread).length > 0;
}

export function needsConsent(thread: ConciergeThread): boolean {
	if (!hasCollectedIntakeData(thread)) {
		return false;
	}

	const consentField = getProfileField(thread, 'background_check_consent');
	if (!consentField) {
		return false;
	}

	return consentField.status !== 'confirmed';
}

export function needsToolReconnect(thread: ConciergeThread): boolean {
	return thread.connectedTools.some((tool) => tool.status === 'action_required');
}

export function getReconnectTool(thread: ConciergeThread) {
	return thread.connectedTools.find((tool) => tool.status === 'action_required');
}

export function hasHandoffPacket(thread: ConciergeThread): boolean {
	return Boolean(thread.handoff);
}

export function hasEscalationHandoff(thread: ConciergeThread): boolean {
	return thread.handoff?.kind === 'escalation';
}

export function isMatchingReady(thread: ConciergeThread): boolean {
	return (
		!hasHandoffPacket(thread) &&
		hasCollectedIntakeData(thread) &&
		getConfirmableFields(thread).length === 0 &&
		getRejectedConfirmableFields(thread).length === 0 &&
		!needsDocumentUpload(thread) &&
		!needsConsent(thread) &&
		!needsToolReconnect(thread)
	);
}
