/**
 * Proposal System Types
 *
 * Standardized proposals following the Subtractive Triad methodology.
 * Each proposal answers: what will we remove, and what value does that create?
 */

import type { Service } from '../data/services';

export interface ProspectInfo {
	company: string;
	contact: string;
	email: string;
	role?: string;
	website?: string;
	referralSource?: string;
}

export interface ProblemStatement {
	summary: string; // 1-2 sentence problem
	currentState: string[]; // What they're dealing with now
	impact: string[]; // Business impact of the problem
	desiredState: string; // Where they want to be
}

export interface ProposalScope {
	serviceId: string;
	customizations?: string[];
	exclusions?: string[];
	assumptions?: string[];
}

export interface ProposalTimeline {
	phases: TimelinePhase[];
	totalWeeks: number;
	startDate?: string;
}

export interface TimelinePhase {
	name: string;
	description: string;
	duration: string;
	deliverables: string[];
}

export interface ProposalPricing {
	type: 'fixed' | 'monthly' | 'tiered';
	basePrice: number;
	currency: string;
	breakdown?: PriceBreakdownItem[];
	paymentTerms: string;
	validUntil: string;
}

export interface PriceBreakdownItem {
	item: string;
	price: number;
	note?: string;
}

export interface Proposal {
	id: string;
	version: string;
	createdAt: string;
	validUntil: string;

	// Who
	prospect: ProspectInfo;

	// What & Why (Subtractive Triad framing)
	problem: ProblemStatement;
	triad: {
		level: 'implementation' | 'artifact' | 'system';
		question: string;
		action: string;
		whatWeRemove: string[];
	};

	// How
	scope: ProposalScope;
	service: Service;
	timeline: ProposalTimeline;

	// Investment
	pricing: ProposalPricing;

	// Next Steps
	nextSteps: string[];

	// Optional
	caseStudyRef?: string;
	additionalNotes?: string;
}

export interface ProposalInput {
	prospect: ProspectInfo;
	problem: ProblemStatement;
	serviceId: string;
	customizations?: string[];
	startDate?: string;
	priceOverride?: number;
	additionalNotes?: string;
}
