/**
 * Post-Meeting Follow-Up Workflow
 *
 * Automates follow-up after consultations complete.
 * Triggers: When a meeting ends (Calendly webhook)
 *
 * Actions:
 * 1. Send thank-you email with meeting summary
 * 2. Create follow-up tasks in CRM
 * 3. Schedule proposal generation (if applicable)
 * 4. Request feedback/review
 *
 * Powered by WORKWAY SDK
 */

interface MeetingEndedData {
	meetingId: string;
	clientName: string;
	clientEmail: string;
	consultantName: string;
	service: string;
	duration: number; // minutes
	notes?: string;
	nextSteps?: string[];
}

interface FollowUpConfig {
	thankYouTemplateId: string;
	proposalTemplateId?: string;
	reviewRequestDelay: number; // days
	slackChannel?: string;
}

/**
 * Post-Meeting Follow-Up Workflow Stub
 */
export const followUpWorkflow = {
	name: 'Post-Meeting Follow-Up',
	description: 'Automates follow-up after consultations with thank-you, next steps, and review request',
	version: '1.0.0',

	integrations: ['calendly', 'sendgrid', 'hubspot', 'slack', 'notion'] as const,

	inputs: {
		thankYouTemplateId: {
			type: 'string',
			label: 'Thank You Email Template',
			description: 'SendGrid template for post-meeting thank you',
			required: true
		},
		proposalTemplateId: {
			type: 'string',
			label: 'Proposal Template ID',
			description: 'Notion template for generating proposals',
			required: false
		},
		reviewRequestDelay: {
			type: 'number',
			label: 'Review Request Delay (days)',
			description: 'Days to wait before requesting a review',
			required: false,
			default: 3
		},
		slackChannel: {
			type: 'string',
			label: 'Internal Notifications Channel',
			description: 'Slack channel for follow-up notifications',
			required: false,
			default: '#consultations-completed'
		}
	},

	// Trigger: webhook from calendar when meeting ends
	trigger: {
		type: 'webhook',
		event: 'calendly.meeting.ended'
	},

	async execute(context: {
		trigger: { data: MeetingEndedData };
		config: FollowUpConfig;
		integrations: {
			calendly: unknown;
			sendgrid: unknown;
			hubspot: unknown;
			slack: unknown;
			notion: unknown;
		};
	}) {
		const { data } = context.trigger;
		const { config, integrations } = context;

		// Step 1: Send thank-you email
		// await integrations.sendgrid.send({
		//   to: data.clientEmail,
		//   templateId: config.thankYouTemplateId,
		//   dynamicData: {
		//     clientName: data.clientName,
		//     consultantName: data.consultantName,
		//     service: data.service,
		//     nextSteps: data.nextSteps || ['We will follow up within 48 hours']
		//   }
		// });

		// Step 2: Update CRM with meeting notes
		// await integrations.hubspot.updateDeal({
		//   contactEmail: data.clientEmail,
		//   properties: {
		//     hs_lastmodifieddate: Date.now(),
		//     notes_last_updated: data.notes,
		//     dealstage: 'consultation_completed'
		//   }
		// });

		// Step 3: Create proposal if applicable
		// if (config.proposalTemplateId && data.service !== 'general_inquiry') {
		//   const proposal = await integrations.notion.createPage({
		//     parentId: 'proposals-database-id',
		//     templateId: config.proposalTemplateId,
		//     properties: {
		//       'Client Name': data.clientName,
		//       'Service': data.service,
		//       'Status': 'Draft',
		//       'Created': new Date().toISOString()
		//     }
		//   });
		// }

		// Step 4: Notify internal team
		// await integrations.slack.sendMessage({
		//   channel: config.slackChannel,
		//   text: `Consultation completed: ${data.clientName}\nService: ${data.service}\nDuration: ${data.duration} min\nNext: Follow-up in 48h`
		// });

		// Step 5: Schedule review request (delayed action)
		// This would create a scheduled job for N days later
		// await context.scheduleAction('request-review', {
		//   delay: config.reviewRequestDelay * 24 * 60 * 60 * 1000, // days to ms
		//   data: { clientEmail: data.clientEmail, clientName: data.clientName }
		// });

		return {
			success: true,
			data: {
				// proposalCreated: !!config.proposalTemplateId,
				// reviewScheduled: true,
				message: 'Follow-up workflow completed'
			}
		};
	}
};

export type FollowUpWorkflow = typeof followUpWorkflow;
