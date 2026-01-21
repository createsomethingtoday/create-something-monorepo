/**
 * Dental Practice Vertical
 * 
 * Complete configuration for dental practice operations.
 * This is the reference implementation for a TEND vertical.
 */

export * from './types';
export * from './automations';
export * from './agents';

import { dentalAutomations } from './automations';
import { dentalAgents } from './agents';
import type { DentalAutomationContext, DentalDashboardMetrics } from './types';

/**
 * Default dental automation context.
 * Customize per-practice during onboarding.
 */
export const defaultDentalContext: DentalAutomationContext = {
	practice: {
		name: 'Demo Dental Practice',
		npi: '1234567890',
		providers: [
			{ id: 'dr-smith', name: 'Dr. Sarah Smith', npi: '1234567891', specialties: ['general'] },
			{ id: 'dr-jones', name: 'Dr. Michael Jones', npi: '1234567892', specialties: ['general', 'implants'] },
		],
		operatories: ['Op 1', 'Op 2', 'Op 3', 'Hygiene 1', 'Hygiene 2'],
		hours: {
			monday: { open: '08:00', close: '17:00' },
			tuesday: { open: '08:00', close: '17:00' },
			wednesday: { open: '08:00', close: '17:00' },
			thursday: { open: '08:00', close: '17:00' },
			friday: { open: '08:00', close: '14:00' },
		},
	},

	weights: {
		new_patient_value: 0.3,
		high_production_threshold: 500,
		vip_patients: [],
		priority_procedures: ['D6010', 'D6065', 'D6066', 'D2740', 'D2750'], // Implants, crowns
	},

	communication: {
		recall_sequence: [
			{ days_before: 30, channel: 'email', template: 'recall-30-day' },
			{ days_before: 14, channel: 'text', template: 'recall-14-day' },
			{ days_before: 7, channel: 'text', template: 'recall-7-day' },
			{ days_before: 0, channel: 'phone', template: 'recall-due-call' },
		],
		confirmation_sequence: [
			{ hours_before: 48, channel: 'text', template: 'confirm-48h' },
			{ hours_before: 24, channel: 'text', template: 'confirm-24h' },
		],
		review_request_delay_hours: 4,
		review_request_time: '16:00',
	},
};

/**
 * Dental vertical configuration export.
 */
export const dentalVertical = {
	id: 'dental',
	name: 'Dental Practice',
	description: 'Complete dental practice management with patient communication, insurance, and clinical workflows',
	
	automations: dentalAutomations,
	agents: dentalAgents,
	defaultContext: defaultDentalContext,
	
	// Source types this vertical uses
	sourceTypes: [
		'pms',
		'phone', 
		'insurance',
		'reviews',
		'imaging',
		'accounting',
		'patient_comms',
		'claims',
	],
	
	// Recommended integrations
	integrations: {
		pms: ['open_dental', 'dentrix', 'eaglesoft', 'curve_dental', 'carestack'],
		phone: ['weave', 'adit', 'ringcentral', 'mango_voice'],
		insurance: ['zuub', 'pverify', 'dental_xchange'],
		reviews: ['google', 'yelp', 'facebook', 'healthgrades'],
		accounting: ['quickbooks', 'xero'],
		middleware: ['nexhealth', 'dentalbridge'],
	},
};
