export interface RequiredDocumentSpec {
	key: 'resume_pdf' | 'compact_license_image';
	title: string;
	acceptedTypes: string[];
	accept: string;
	allowedMimeTypes: string[];
	allowedExtensions: string[];
}

export const REQUIRED_DOCUMENT_SPECS: RequiredDocumentSpec[] = [
	{
		key: 'resume_pdf',
		title: 'Resume PDF',
		acceptedTypes: ['PDF'],
		accept: '.pdf,application/pdf',
		allowedMimeTypes: ['application/pdf'],
		allowedExtensions: ['.pdf']
	},
	{
		key: 'compact_license_image',
		title: 'Compact license image',
		acceptedTypes: ['PNG', 'JPG'],
		accept: '.png,.jpg,.jpeg,image/png,image/jpeg',
		allowedMimeTypes: ['image/png', 'image/jpeg'],
		allowedExtensions: ['.png', '.jpg', '.jpeg']
	}
];

export type RequiredDocumentKey = (typeof REQUIRED_DOCUMENT_SPECS)[number]['key'];

export const REQUIRED_DOCUMENTS = REQUIRED_DOCUMENT_SPECS.map((spec) => spec.title) as ReadonlyArray<
	string
>;

export function getRequiredDocumentSpecByKey(key: string) {
	return REQUIRED_DOCUMENT_SPECS.find((spec) => spec.key === key);
}

export function getRequiredDocumentSpecByTitle(title: string) {
	return REQUIRED_DOCUMENT_SPECS.find((spec) => spec.title === title);
}
