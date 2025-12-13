/**
 * Appointment Reminder Workflow
 *
 * Sends automated reminders before scheduled consultations.
 * Triggers: 24 hours before appointment
 *
 * Actions:
 * 1. Send SMS reminder (if phone provided)
 * 2. Send email reminder with prep instructions
 * 3. Update CRM with reminder status
 *
 * Powered by WORKWAY SDK
 */

interface AppointmentData {
	id: string;
	clientName: string;
	clientEmail: string;
	clientPhone?: string;
	consultantName: string;
	scheduledTime: string;
	service: string;
	meetingLink?: string;
}

interface ReminderConfig {
	smsEnabled: boolean;
	emailTemplateId: string;
	prepMaterialsLink?: string;
}

/**
 * 24-Hour Reminder Workflow Stub
 */
export const reminderWorkflow = {
	name: 'Appointment Reminder',
	description: 'Sends 24-hour reminders before scheduled consultations',
	version: '1.0.0',

	integrations: ['twilio', 'sendgrid', 'hubspot'] as const,

	inputs: {
		smsEnabled: {
			type: 'boolean',
			label: 'Enable SMS Reminders',
			description: 'Send SMS reminders in addition to email',
			required: false,
			default: true
		},
		emailTemplateId: {
			type: 'string',
			label: 'Email Template ID',
			description: 'SendGrid template for reminder emails',
			required: true
		},
		prepMaterialsLink: {
			type: 'string',
			label: 'Preparation Materials URL',
			description: 'Link to client preparation materials',
			required: false
		}
	},

	// Trigger: scheduled job running daily at 9 AM
	trigger: {
		type: 'schedule',
		cron: '0 9 * * *' // Daily at 9 AM
	},

	async execute(context: {
		config: ReminderConfig;
		storage: { get: (key: string) => Promise<unknown> };
		integrations: {
			twilio: unknown;
			sendgrid: unknown;
			hubspot: unknown;
		};
	}) {
		const { config, integrations } = context;

		// Step 1: Query appointments scheduled for tomorrow
		// const tomorrow = new Date();
		// tomorrow.setDate(tomorrow.getDate() + 1);

		// const appointments = await integrations.hubspot.getAppointments({
		//   startDate: tomorrow.toISOString().split('T')[0],
		//   endDate: tomorrow.toISOString().split('T')[0]
		// });

		// Step 2: For each appointment, send reminders
		// for (const apt of appointments) {
		//   // Send email reminder
		//   await integrations.sendgrid.send({
		//     to: apt.clientEmail,
		//     templateId: config.emailTemplateId,
		//     dynamicData: {
		//       clientName: apt.clientName,
		//       consultantName: apt.consultantName,
		//       scheduledTime: apt.scheduledTime,
		//       meetingLink: apt.meetingLink,
		//       prepMaterialsLink: config.prepMaterialsLink
		//     }
		//   });
		//
		//   // Send SMS if enabled and phone available
		//   if (config.smsEnabled && apt.clientPhone) {
		//     await integrations.twilio.sendSms({
		//       to: apt.clientPhone,
		//       body: `Reminder: Your consultation with ${apt.consultantName} is tomorrow at ${apt.scheduledTime}. See your email for details.`
		//     });
		//   }
		// }

		return {
			success: true,
			data: {
				// remindersSet: appointments.length,
				message: 'Reminder workflow completed'
			}
		};
	}
};

export type ReminderWorkflow = typeof reminderWorkflow;
