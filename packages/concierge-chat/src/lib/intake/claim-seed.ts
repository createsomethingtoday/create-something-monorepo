import type { RequiredDocumentKey } from '$chat/document-requirements';

export type IntakeClaimSource = 'indeed_apply';

export interface IntakeClaimImportedDocument {
	documentKey: RequiredDocumentKey;
	fileName?: string;
	contentType?: string;
	byteSize?: number;
}

export interface IntakeClaimThreadSeed {
	source: IntakeClaimSource;
	applicant: {
		name?: string;
		email?: string;
		phone?: string;
	};
	application: {
		indeedApplyId: string;
		localApplicationId?: string;
		localJobId?: string;
		referenceNumber?: string;
		roleTitle?: string;
		facility?: string;
		location?: string;
	};
	profile?: {
		specialty?: string;
		preferredShift?: string;
		preferredRegion?: string;
		compactLicense?: string;
	};
	documents?: IntakeClaimImportedDocument[];
	importedAt?: string;
}
