/**
 * Funnel Dashboard Types
 *
 * GTM Funnel: Awareness → Consideration → Decision → Conversion
 */

export type FunnelStage = 'awareness' | 'consideration' | 'decision' | 'won' | 'lost';
export type LeadSource = 'linkedin' | 'website' | 'referral' | 'cold' | 'event' | 'other';

export interface FunnelMetrics {
	id: string;
	date: string;

	// Awareness
	linkedin_impressions: number;
	linkedin_reach: number;
	linkedin_followers: number;
	linkedin_follower_delta: number;

	// Consideration
	linkedin_engagements: number;
	linkedin_profile_views: number;
	website_visits: number;
	website_unique_visitors: number;
	content_downloads: number;

	// Decision
	discovery_calls_scheduled: number;
	discovery_calls_completed: number;
	proposals_sent: number;

	// Conversion
	deals_closed: number;
	revenue_closed: number;

	notes?: string;
	created_at: string;
	updated_at: string;
}

export interface FunnelMetricsInput {
	date: string;
	linkedin_impressions?: number;
	linkedin_reach?: number;
	linkedin_followers?: number;
	linkedin_follower_delta?: number;
	linkedin_engagements?: number;
	linkedin_profile_views?: number;
	website_visits?: number;
	website_unique_visitors?: number;
	content_downloads?: number;
	discovery_calls_scheduled?: number;
	discovery_calls_completed?: number;
	proposals_sent?: number;
	deals_closed?: number;
	revenue_closed?: number;
	notes?: string;
}

export interface LinkedInPostMetrics {
	id: string;
	post_id?: string;
	social_post_id?: string;
	date: string;
	content_preview?: string;
	thread_id?: string;
	thread_index?: number;
	campaign?: string;
	impressions: number;
	reach: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
	engagement_rate?: number;
	last_updated: string;
	created_at: string;
}

export interface Lead {
	id: string;
	name: string;
	email?: string;
	company?: string;
	role?: string;
	linkedin_url?: string;
	source: LeadSource;
	source_detail?: string;
	campaign?: string;
	stage: FunnelStage;
	estimated_value?: number;
	actual_value?: number;
	service_interest?: string;
	first_touch_at?: string;
	last_touch_at?: string;
	discovery_call_at?: string;
	proposal_sent_at?: string;
	closed_at?: string;
	notes?: string;
	created_at: string;
	updated_at: string;
}

export interface LeadInput {
	name: string;
	email?: string;
	company?: string;
	role?: string;
	linkedin_url?: string;
	source: LeadSource;
	source_detail?: string;
	campaign?: string;
	stage?: FunnelStage;
	estimated_value?: number;
	service_interest?: string;
	notes?: string;
}

export interface FunnelSummary {
	// Current period
	period: {
		start: string;
		end: string;
	};

	// Totals for period
	totals: {
		impressions: number;
		reach: number;
		engagements: number;
		website_visits: number;
		discovery_calls: number;
		proposals_sent: number;
		deals_closed: number;
		revenue: number;
	};

	// Week-over-week changes
	changes: {
		impressions_delta: number;
		reach_delta: number;
		engagements_delta: number;
	};

	// Leads by stage
	pipeline: {
		awareness: number;
		consideration: number;
		decision: number;
		won: number;
		lost: number;
	};

	// Pipeline value
	pipeline_value: {
		total_estimated: number;
		total_closed: number;
	};

	// Conversion rates
	conversion_rates: {
		impression_to_engagement: number; // engagements / impressions
		visit_to_lead: number; // leads / visits
		lead_to_call: number; // calls / leads
		call_to_proposal: number; // proposals / calls
		proposal_to_close: number; // closes / proposals
	};
}
