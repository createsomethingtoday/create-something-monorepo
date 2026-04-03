export interface IntakeVerificationSupport {
	available: boolean;
	mode: 'email' | 'preview' | 'unavailable';
	detail: string;
}
