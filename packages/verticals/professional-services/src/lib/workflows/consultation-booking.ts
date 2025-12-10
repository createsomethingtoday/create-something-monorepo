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

// Types for the workflow (WORKWAY SDK types will be imported when integrated)
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

interface WorkflowConfig {
	calendarId?: string;
	slackChannel?: string;
	emailTemplateId?: string;
	crmPipelineId?: string;
}

/**
 * Workflow definition stub
 *
 * When WORKWAY SDK is integrated, this will use:
 * - defineWorkflow() from @workwayco/sdk
 * - Typed integrations from @workwayco/integrations
 *
 * For now, this serves as the specification.
 */
export const consultationBookingWorkflow = {
	name: 'Consultation Booking',
	description: 'Automates the consultation booking process for professional services',
	version: '1.0.0',

	// Integrations required
	integrations: ['calendly', 'hubspot', 'slack'] as const,

	// User-configurable inputs
	inputs: {
		calendarId: {
			type: 'string',
			label: 'Calendar ID',
			description: 'Calendly or Google Calendar ID for scheduling',
			required: true
		},
		slackChannel: {
			type: 'string',
			label: 'Slack Channel',
			description: 'Channel to notify when new consultations are booked',
			required: false,
			default: '#new-consultations'
		},
		crmPipelineId: {
			type: 'string',
			label: 'CRM Pipeline',
			description: 'HubSpot pipeline for new consultation leads',
			required: false
		}
	},

	// Trigger: webhook from consultation form
	trigger: {
		type: 'webhook',
		event: 'consultation.requested'
	},

	// Execution logic (placeholder - will be implemented with WORKWAY SDK)
	async execute(context: {
		trigger: { data: ConsultationRequest };
		config: WorkflowConfig;
		integrations: {
			calendly: unknown;
			hubspot: unknown;
			slack: unknown;
		};
	}) {
		const { data } = context.trigger;
		const { config, integrations } = context;

		// Step 1: Create calendar event
		// const calendarEvent = await integrations.calendly.createEvent({
		//   summary: `Consultation: ${data.name} - ${data.service}`,
		//   attendees: [{ email: data.email, name: data.name }],
		//   start: `${data.preferredDate}T${data.preferredTime}`,
		//   duration: 30
		// });

		// Step 2: Create/update CRM contact
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
		// await integrations.slack.sendMessage({
		//   channel: config.slackChannel,
		//   text: `New consultation request from ${data.name} (${data.company || 'Individual'})\nService: ${data.service}\nPreferred time: ${data.preferredDate} ${data.preferredTime}`
		// });

		return {
			success: true,
			data: {
				// calendarEventId: calendarEvent.id,
				// contactId: contact.id,
				message: 'Consultation booking workflow completed'
			}
		};
	}
};

export type ConsultationBookingWorkflow = typeof consultationBookingWorkflow;
