/**
 * Dental Practice Vertical Types
 * 
 * Type definitions specific to dental practice operations.
 * Extends core TEND types with dental-specific metadata and sources.
 */

import type { DataItem, Source, AutomationDefinition, AgentDefinition, AutomationContext } from '../../sdk/types';

// =============================================================================
// DENTAL SOURCE TYPES
// =============================================================================

export type DentalSourceType =
	| 'pms'           // Practice Management System (Open Dental, Dentrix, etc.)
	| 'phone'         // VoIP/Call system (Weave, Adit, RingCentral)
	| 'insurance'     // Insurance/Eligibility (Zuub, pVerify)
	| 'reviews'       // Review platforms (Google, Yelp)
	| 'imaging'       // DICOM/PACS imaging
	| 'accounting'    // QuickBooks, financial
	| 'patient_comms' // NexHealth, RevenueWell
	| 'claims';       // Clearinghouse, claim status

export interface DentalSource extends Omit<Source, 'type'> {
	type: DentalSourceType;
	vendor?: string; // e.g., 'open_dental', 'dentrix', 'weave', 'zuub'
}

// =============================================================================
// DENTAL ITEM CATEGORIES
// =============================================================================

export type DentalItemCategory =
	| 'call'              // Inbound/outbound call
	| 'appointment'       // Scheduled appointment
	| 'recall'            // Hygiene recall due
	| 'claim'             // Insurance claim
	| 'eligibility'       // Coverage verification
	| 'review'            // Patient review
	| 'treatment_plan'    // Proposed treatment
	| 'payment'           // Payment received/due
	| 'no_show'           // Missed appointment
	| 'cancellation'      // Cancelled appointment
	| 'new_patient'       // New patient inquiry
	| 'imaging'           // X-ray, scan
	| 'lab_case'          // Lab work
	| 'referral';         // Specialist referral

// =============================================================================
// DENTAL-SPECIFIC METADATA
// =============================================================================

export interface DentalCallMetadata {
	direction: 'inbound' | 'outbound';
	duration_seconds: number;
	caller_phone: string;
	caller_name?: string;
	patient_id?: string;
	converted: boolean;
	conversion_type?: 'appointment' | 'callback' | 'none';
	transcript?: string;
	sentiment?: 'positive' | 'neutral' | 'negative';
	call_reason?: string;
	handled_by?: string;
}

export interface DentalAppointmentMetadata {
	patient_id: string;
	patient_name: string;
	provider: string;
	procedure_codes: string[];
	procedure_names: string[];
	duration_minutes: number;
	operatory?: string;
	confirmed: boolean;
	confirmation_method?: 'text' | 'email' | 'phone' | 'portal';
	insurance_verified: boolean;
	estimated_production: number;
	notes?: string;
}

export interface DentalRecallMetadata {
	patient_id: string;
	patient_name: string;
	recall_type: 'hygiene' | 'perio' | 'exam' | 'other';
	last_visit: Date;
	due_date: Date;
	days_overdue: number;
	attempts: number;
	last_attempt?: Date;
	preferred_contact: 'text' | 'email' | 'phone';
	insurance_coverage?: string;
}

export interface DentalClaimMetadata {
	claim_id: string;
	patient_id: string;
	patient_name: string;
	payer: string;
	procedure_codes: string[];
	billed_amount: number;
	status: 'submitted' | 'pending' | 'paid' | 'denied' | 'appealed';
	submitted_date: Date;
	response_date?: Date;
	paid_amount?: number;
	denial_reason?: string;
	era_received: boolean;
}

export interface DentalEligibilityMetadata {
	patient_id: string;
	patient_name: string;
	payer: string;
	plan_name: string;
	subscriber_id: string;
	coverage_status: 'active' | 'inactive' | 'pending' | 'unknown';
	annual_max: number;
	annual_used: number;
	annual_remaining: number;
	deductible: number;
	deductible_met: number;
	preventive_coverage: number;
	basic_coverage: number;
	major_coverage: number;
	waiting_periods?: Record<string, number>;
	frequency_limits?: Record<string, string>;
	verified_at: Date;
}

export interface DentalReviewMetadata {
	platform: 'google' | 'yelp' | 'facebook' | 'healthgrades';
	rating: number;
	reviewer_name: string;
	patient_id?: string;
	review_text: string;
	response_status: 'pending' | 'drafted' | 'responded' | 'flagged';
	response_text?: string;
	sentiment: 'positive' | 'neutral' | 'negative';
	keywords: string[];
}

export interface DentalTreatmentPlanMetadata {
	patient_id: string;
	patient_name: string;
	provider: string;
	procedures: Array<{
		code: string;
		name: string;
		tooth?: string;
		surface?: string;
		fee: number;
		insurance_estimate: number;
		patient_portion: number;
	}>;
	total_fee: number;
	insurance_estimate: number;
	patient_portion: number;
	status: 'proposed' | 'presented' | 'accepted' | 'declined' | 'scheduled';
	presented_date?: Date;
	acceptance_date?: Date;
	financing_offered: boolean;
	financing_accepted?: boolean;
}

export interface DentalPaymentMetadata {
	patient_id: string;
	patient_name: string;
	amount: number;
	payment_type: 'insurance' | 'patient' | 'financing';
	method?: 'card' | 'check' | 'cash' | 'ach' | 'care_credit';
	invoice_ids: string[];
	remaining_balance: number;
}

export interface DentalImagingMetadata {
	patient_id: string;
	patient_name: string;
	image_type: 'bitewing' | 'periapical' | 'pano' | 'cbct' | 'intraoral_photo';
	tooth_numbers?: string[];
	acquired_date: Date;
	acquired_by: string;
	dicom_uid?: string;
	ai_analysis?: {
		findings: string[];
		confidence: number;
		flagged: boolean;
	};
}

// =============================================================================
// DENTAL DATA ITEM
// =============================================================================

export interface DentalDataItem extends Omit<DataItem, 'sourceType' | 'metadata'> {
	sourceType: DentalSourceType;
	category: DentalItemCategory;
	metadata: 
		| DentalCallMetadata
		| DentalAppointmentMetadata
		| DentalRecallMetadata
		| DentalClaimMetadata
		| DentalEligibilityMetadata
		| DentalReviewMetadata
		| DentalTreatmentPlanMetadata
		| DentalPaymentMetadata
		| DentalImagingMetadata
		| Record<string, unknown>;
}

// =============================================================================
// DENTAL AUTOMATION CONTEXT
// =============================================================================

export interface DentalAutomationContext extends AutomationContext {
	practice: {
		name: string;
		npi: string;
		providers: Array<{
			id: string;
			name: string;
			npi: string;
			specialties: string[];
		}>;
		operatories: string[];
		hours: Record<string, { open: string; close: string }>;
	};
	
	// Scoring weights
	weights: {
		new_patient_value: number;      // Score boost for new patients
		high_production_threshold: number; // $ amount for high-value flag
		vip_patients: string[];         // Patient IDs with VIP status
		priority_procedures: string[];  // Procedure codes to prioritize
	};
	
	// Communication preferences
	communication: {
		recall_sequence: Array<{
			days_before: number;
			channel: 'text' | 'email' | 'phone';
			template: string;
		}>;
		confirmation_sequence: Array<{
			hours_before: number;
			channel: 'text' | 'email';
			template: string;
		}>;
		review_request_delay_hours: number;
		review_request_time: string; // e.g., "16:00"
	};
}

// =============================================================================
// DENTAL METRICS
// =============================================================================

export interface DentalDashboardMetrics {
	// Today
	appointments_today: number;
	production_scheduled: number;
	production_completed: number;
	no_shows_today: number;
	cancellations_today: number;
	new_patients_today: number;
	
	// Calls
	calls_today: number;
	calls_converted: number;
	calls_missed: number;
	conversion_rate: number;
	
	// Recalls
	recalls_due: number;
	recalls_overdue: number;
	recalls_scheduled: number;
	
	// Revenue
	collections_today: number;
	ar_current: number;
	ar_30_days: number;
	ar_60_days: number;
	ar_90_plus: number;
	
	// Claims
	claims_pending: number;
	claims_denied: number;
	claims_to_appeal: number;
	
	// Reviews
	reviews_pending_response: number;
	average_rating: number;
	reviews_this_month: number;
}
