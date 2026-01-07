/**
 * TypeScript type definitions for Airtable/Mongo integrations
 * 
 * These types document the data structures used in automations.
 * Not directly used in Airtable scripts (which are plain JS).
 */

// ==================== AIRTABLE INPUT CONFIGS ====================

export interface ExpertsSyncInputConfig {
	environment: 'production' | 'acceptance';
	recordID: string;
	workspaceID: string;
	createdOn?: string; // Determines POST vs PUT
	useNewSystem: boolean;
}

export interface EPPEnrollmentInputConfig {
	environment: 'production' | 'acceptance';
	recordID: string;
	workspaceSlug: string;
}

// ==================== MONGO API TYPES ====================

export type BusinessType = 'FREELANCER' | 'AGENCY' | 'STARTUP';
export type ExpertType = 'PARTNER' | 'EXPERT' | 'CERTIFIED';
export type ExpertStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface MoneyValue {
	value: number;
	unit: 'USD';
}

export interface ImageMetadata {
	url: string;
	filename: string;
}

export interface FeaturedAsset {
	type: 'COVER_IMAGE' | 'MADE_IN_WEBFLOW';
	slug?: string;
	coverImageMetadata?: {
		imageUrl: string;
		filename: string;
		title: string;
		websiteUrl: string;
	};
}

export interface ServiceOffered {
	name: string;
	type: string;
}

export interface ExpertProfilePayload {
	workspaceId: string;
	name: string;
	bio?: string;
	businessType?: BusinessType;
	city?: string;
	country?: string;
	featuredAssets?: FeaturedAsset[];
	inquiryEmailAddress?: string;
	languages?: string[];
	thumbnailImage?: ImageMetadata;
	websiteUrl?: string;
	expertsMetadata: {
		airtableId: string;
		expertSince: string;
		expertType?: ExpertType;
		partnerType?: string;
		availabilityLastUpdated?: string;
		availabilityStatus?: string;
		directoryImage?: ImageMetadata;
		directoryTagline?: string;
		hourlyDesignRate?: MoneyValue;
		hourlyDevelopmentRate?: MoneyValue;
		industrySpecialties?: string[];
		lastAvailabilityResponse?: string;
		migratablePlatforms?: string[];
		partnerstackEmail?: string;
		projectMinimum: MoneyValue;
		reviews?: string | null;
		servicesOffered: ServiceOffered[];
		status: ExpertStatus;
		typicalProjectSize?: MoneyValue;
		unavailableUntilDate?: string;
	};
}

export interface ExpertProfileResponse {
	id?: string; // Only in POST response
	slug?: string; // Only in POST response
	createdOn?: string; // Only in POST response
	updatedOn: string;
	// ... other fields echoed back
}

export interface MongoAPIError {
	code: string;
	message: string;
	details?: unknown;
}

// ==================== EPP ENROLLMENT ====================

export interface EPPEnrollmentPayload {
	workspaceSlug: string;
	submitterEmail: string;
	submitterName: string;
	enrollmentSource: 'airtable_form' | 'direct' | 'other';
	timestamp: string;
}

export interface EPPEnrollmentResponse {
	success: boolean;
	workspaceId: string;
	enrolledDate: string;
	programDetails?: {
		benefits: string[];
		effectiveDate: string;
	};
}

export interface EPPEnrollmentError {
	error: string;
	message: string;
	code?: 'INVALID_SLUG' | 'DUPLICATE_ENROLLMENT' | 'WORKSPACE_NOT_FOUND' | 'API_ERROR';
}

// ==================== AIRTABLE RECORD UPDATES ====================

export interface ExpertsSyncRecordUpdate {
	'fld5bOMS6HLpPyvds': string; // Mongo Sync Response (JSON)
	'fldsgf3WwTlocnNJx': { id: string }; // Mongo Sync Status (select)
	'fldeRHn8R3nUqmXLb'?: string; // Mongo Last Updated
	'fldr8LY63os8wo0OQ'?: string; // Mongo Created On (POST only)
	'fldK5cr2ZG6JcQkPf'?: string; // Mongo Profile ID (POST only)
	'fldtyyo0RoVD4AgJ0'?: string; // Mongo Profile Slug (POST only)
}

export interface EPPEnrollmentRecordUpdate {
	fldAPIStatus: { id: string }; // Status select field
	fldAPIResponse: string; // JSON response
	fldErrorMessage?: string | null;
	fldEnrolledDate?: string;
	fldIterableSynced?: boolean;
	fldMarketoSynced?: boolean;
	fldRetryCount?: number;
}

// ==================== NOTIFICATION PAYLOADS ====================

export interface IterableEventPayload {
	email: string;
	eventName: string;
	dataFields: {
		status: 'success' | 'error';
		workspaceSlug: string;
		timestamp: string;
		[key: string]: unknown;
	};
}

export interface MarketoPayload {
	// TODO: Define based on actual Marketo integration
	email: string;
	status: string;
	workspaceSlug: string;
	[key: string]: unknown;
}

// ==================== RE-EXPORTS ====================

// Submission tracking types (30-day rolling window)
export * from './submission-types';
