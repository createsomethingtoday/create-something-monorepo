/**
 * Court Reserve Types
 *
 * Core domain types for the autonomous court scheduling system.
 */

// ============================================================================
// Facility Types
// ============================================================================

export interface Facility {
	id: string;
	name: string;
	slug: string;
	timezone: string;
	status: FacilityStatus;
	opening_time: string; // HH:MM
	closing_time: string; // HH:MM
	slot_duration_minutes: number;
	advance_booking_days: number;
	cancellation_hours: number;
	cancellation_fee_cents: number;
	no_show_penalty_credits: number;
	email: string | null;
	phone: string | null;
	address: string | null;
	stripe_account_id: string | null;
	stripe_customer_id: string | null;
	config: FacilityConfig;
	created_at: string;
	updated_at: string;
}

export type FacilityStatus = 'configuring' | 'active' | 'suspended';

export interface FacilityConfig {
	logo_url?: string;
	primary_color?: string;
	court_types?: CourtType[];
	[key: string]: unknown;
}

// ============================================================================
// Court Types
// ============================================================================

export interface Court {
	id: string;
	facility_id: string;
	name: string;
	court_type: CourtType;
	surface_type: string | null;
	is_active: boolean;
	sort_order: number;
	price_per_slot_cents: number | null;
	peak_price_cents: number | null;
	created_at: string;
	updated_at: string;
}

export type CourtType =
	| 'pickleball'
	| 'tennis'
	| 'basketball'
	| 'badminton'
	| 'squash'
	| 'racquetball';

// ============================================================================
// Member Types
// ============================================================================

export interface Member {
	id: string;
	facility_id: string;
	email: string;
	name: string;
	phone: string | null;
	membership_type: MembershipType;
	membership_expires_at: string | null;
	max_advance_hours: number | null;
	max_active_reservations: number;
	identity_user_id: string | null;
	stripe_customer_id: string | null;
	credits_balance: number;
	no_show_count: number;
	total_bookings: number;
	status: MemberStatus;
	preferences: MemberPreferences;
	created_at: string;
	updated_at: string;
}

export type MembershipType = 'guest' | 'member' | 'premium' | 'unlimited';
export type MemberStatus = 'active' | 'suspended' | 'inactive';

export interface MemberPreferences {
	preferred_courts?: string[];
	preferred_times?: string[];
	notification_sms?: boolean;
	notification_email?: boolean;
	[key: string]: unknown;
}

// ============================================================================
// Reservation Types
// ============================================================================

export interface Reservation {
	id: string;
	facility_id: string;
	court_id: string;
	member_id: string;
	start_time: string; // ISO 8601
	end_time: string; // ISO 8601
	duration_minutes: number;
	status: ReservationStatus;
	booking_type: BookingType;
	participants: string | null; // JSON array
	notes: string | null;
	rate_cents: number | null;
	credits_used: number;
	payment_status: PaymentStatus;
	stripe_payment_intent_id: string | null;
	stripe_checkout_session_id: string | null;
	cancelled_at: string | null;
	cancellation_reason: string | null;
	confirmed_at: string | null;
	checked_in_at: string | null;
	completed_at: string | null;
	booking_source: BookingSource;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export type ReservationStatus =
	| 'pending'
	| 'confirmed'
	| 'in_progress'
	| 'completed'
	| 'cancelled'
	| 'no_show'
	| 'disputed'
	| 'refunded'
	| 'archived';

export type BookingType = 'standard' | 'recurring' | 'lesson' | 'event';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'waived';
export type BookingSource = 'web' | 'sms' | 'staff' | 'api' | 'waitlist';

// ============================================================================
// Waitlist Types
// ============================================================================

export interface WaitlistEntry {
	id: string;
	facility_id: string;
	member_id: string;
	court_id: string | null;
	court_type: CourtType | null;
	preferred_date: string; // YYYY-MM-DD
	preferred_start_time: string | null; // HH:MM
	preferred_end_time: string | null; // HH:MM
	duration_minutes: number;
	notify_sms: boolean;
	notify_email: boolean;
	auto_book: boolean;
	priority: number;
	status: WaitlistStatus;
	offered_reservation_id: string | null;
	offer_expires_at: string | null;
	created_at: string;
	updated_at: string;
}

export type WaitlistStatus = 'active' | 'offered' | 'converted' | 'expired' | 'cancelled';

// ============================================================================
// Availability Types
// ============================================================================

export interface AvailabilityBlock {
	id: string;
	facility_id: string;
	court_id: string | null;
	block_type: BlockType;
	start_time: string;
	end_time: string;
	recurrence_rule: string | null; // RFC 5545 RRULE
	title: string | null;
	description: string | null;
	created_at: string;
}

export type BlockType = 'blackout' | 'maintenance' | 'event' | 'extended';

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingRule {
	id: string;
	facility_id: string;
	rule_type: PricingRuleType;
	conditions: PricingConditions;
	price_cents: number;
	priority: number;
	is_active: boolean;
	created_at: string;
}

export type PricingRuleType = 'base' | 'peak' | 'off_peak' | 'member' | 'weekend' | 'holiday';

export interface PricingConditions {
	day_of_week?: number[]; // 0-6, Sunday = 0
	start_hour?: number;
	end_hour?: number;
	membership_type?: MembershipType[];
	court_ids?: string[];
	[key: string]: unknown;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AvailabilityResponse {
	facility: string;
	date: string;
	timezone: string;
	courts: CourtAvailability[];
}

export interface CourtAvailability {
	id: string;
	name: string;
	type: CourtType;
	slots: TimeSlot[];
}

export interface TimeSlot {
	start_time: string;
	end_time: string;
	status: SlotStatus;
	price_cents: number | null;
}

export type SlotStatus = 'available' | 'reserved' | 'pending' | 'maintenance';

// ============================================================================
// Utility Types
// ============================================================================

export type IdPrefix = 'fac' | 'crt' | 'mbr' | 'rsv' | 'wl' | 'blk' | 'prc';

export function generateId(prefix: IdPrefix): string {
	const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
	return `${prefix}_${random}`;
}
