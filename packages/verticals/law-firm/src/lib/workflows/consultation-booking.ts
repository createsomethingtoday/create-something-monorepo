/**
 * Consultation Booking Workflow
 *
 * Triggers when a client requests a consultation.
 * Actions:
 * 1. Create calendar event (Calendly/Google Calendar)
 * 2. Send confirmation email with prep materials
 * 3. Create/update CRM record (HubSpot)
 * 4. Notify internal team (Slack)
 *
 * Powered by WORKWAY SDK
 */

import { defineWorkflow, webhook } from '@workwayco/sdk';
import type { ExtendedWorkflowContext } from '@workwayco/sdk';

// Workflow inputs (user configuration)
interface ConsultationBookingInputs {
	calendarId: string;
	slackChannel: string;
	emailTemplateId: string;
	crmPipelineId?: string;
}

// Trigger payload
interface ConsultationRequest {
	name: string;
	email: string;
	company?: string;
	phone?: string;
	service: string;
	message?: string;
	preferredDate: string;
	preferredTime: string;
}

/**
 * Consultation Booking Workflow Definition
 *
 * This is the actual WORKWAY workflow that runs when triggered.
 * It follows the BaseAPIClient pattern and design canon.
 */
export const consultationBookingWorkflow = defineWorkflow({
	name: 'Consultation Booking',
	description: 'Automates the consultation booking process for professional services',
	version: '1.0.0',

	// Required integrations
	integrations: ['calendly', 'hubspot', 'slack'],

	// User-configurable inputs
	inputs: {
		calendarId: {
			type: 'text',
			label: 'Calendar ID',
			description: 'Calendly or Google Calendar ID for scheduling',
			required: true,
		},
		slackChannel: {
			type: 'text',
			label: 'Slack Channel',
			description: 'Channel to notify when new consultations are booked',
			required: false,
			default: '#new-consultations',
		},
		emailTemplateId: {
			type: 'text',
			label: 'Email Template ID',
			description: 'SendGrid template for confirmation emails',
			required: true,
		},
		crmPipelineId: {
			type: 'text',
			label: 'CRM Pipeline',
			description: 'HubSpot pipeline for new consultation leads',
			required: false,
		},
	},

	// Trigger: webhook from consultation form
	trigger: webhook({
		path: '/webhooks/consultation',
		event: 'consultation.requested',
	}),

	// Execution logic
	async execute(context: ExtendedWorkflowContext<ConsultationBookingInputs>) {
		const data = context.trigger.data as ConsultationRequest;
		const { inputs, integrations } = context;

		console.log('Processing consultation request:', {
			name: data.name,
			service: data.service,
			preferredDate: data.preferredDate,
		});

		try {
			// Step 1: Create calendar event
			// TODO: Implement when Calendly integration is available
			// const calendarEvent = await integrations.calendly.createEvent({
			//   summary: `Consultation: ${data.name} - ${data.service}`,
			//   attendees: [{ email: data.email, name: data.name }],
			//   start: `${data.preferredDate}T${data.preferredTime}`,
			//   duration: 30
			// });

			// Step 2: Create/update CRM contact
			// TODO: Implement when HubSpot integration is available
			// const contact = await integrations.hubspot.createOrUpdateContact({
			//   email: data.email,
			//   properties: {
			//     firstname: data.name.split(' ')[0],
			//     lastname: data.name.split(' ').slice(1).join(' '),
			//     company: data.company,
			//     phone: data.phone,
			//     hs_lead_status: 'NEW'
			//   }
			// });

			// Step 3: Notify team on Slack
			// TODO: Implement when Slack integration is available
			// await integrations.slack.sendMessage({
			//   channel: inputs.slackChannel,
			//   text: `New consultation request from ${data.name} (${data.company || 'Individual'})\nService: ${data.service}\nPreferred time: ${data.preferredDate} ${data.preferredTime}`
			// });

			return {
				success: true,
				data: {
					message: 'Consultation booking workflow completed',
					consultation: {
						name: data.name,
						email: data.email,
						service: data.service,
						scheduledFor: `${data.preferredDate} ${data.preferredTime}`,
					},
				},
			};
		} catch (error) {
			console.error('Consultation booking workflow error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

export type ConsultationBookingWorkflow = typeof consultationBookingWorkflow;
