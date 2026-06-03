import type { ProfileFieldEvent } from '$lib/profile/types';
import type { MatchingOpportunity } from '$chat/matching-model';

export interface WidgetBase<TType extends string, TData> {
	id: string;
	type: TType;
	title: string;
	placement: 'inline' | 'rail';
	priority: number;
	data: TData;
}

export type ConciergeWidget =
	| WidgetBase<
			'profile_progress',
			{
				completion: number;
				confirmedCount: number;
				inferredCount: number;
				missingFields: string[];
				nextPrompt: string;
			}
	  >
	| WidgetBase<
			'field_confirmation',
			{
				description: string;
				fields: Array<
					Pick<
						ProfileFieldEvent,
						'key' | 'label' | 'value' | 'status' | 'confidence' | 'fieldClass' | 'note'
					>
				>;
				confirmLabel: string;
				rejectLabel: string;
			}
	  >
	| WidgetBase<
			'consent',
			{
				body: string;
				policyReference: string;
				status: 'needed' | 'captured';
				confirmLabel: string;
			}
	  >
	| WidgetBase<
			'document_upload',
			{
				description: string;
				documents: Array<{
					key: string;
					title: string;
					acceptedTypes: string[];
					accept: string;
					status: 'needed' | 'uploaded';
					fileName?: string;
					byteSize?: number;
					href?: string;
				}>;
				status: 'needed' | 'partial' | 'uploaded';
				uploadLabel: string;
			}
	  >
	| WidgetBase<
			'appointment_picker',
			{
				description: string;
				recruiterName: string;
				recruiterTitle: string;
				status: 'ready' | 'booked' | 'completed';
				selectedSlotId?: string;
				bookedLabel?: string;
				matches: MatchingOpportunity[];
				slots: Array<{
					id: string;
					label: string;
					window: string;
					availability: 'open' | 'limited' | 'held';
				}>;
				confirmLabel: string;
				completionLabel?: string;
			}
	  >
	| WidgetBase<
			'tool_reconnect',
			{
				toolName: string;
				reason: string;
				status: 'required' | 'recovering' | 'connected';
				connectHref: string;
				reconnectLabel: string;
			}
	  >
	| WidgetBase<
			'staffing_queue',
			{
				status:
					| 'queued'
					| 'outreach_started'
					| 'submitted'
					| 'interview_requested'
					| 'placement_confirmed'
					| 'closed';
				statusLabel: string;
				coordinatorName: string;
				roleTitle: string;
				facility: string;
				description: string;
				completedSteps: string[];
				pendingSteps: string[];
				actionLabel?: string;
				actionType?: 'start_staffing_outreach' | 'submit_to_facility';
				actionPendingLabel?: string;
			}
	  >
	| WidgetBase<
			'onboarding_queue',
			{
				status: 'queued' | 'in_progress' | 'completed';
				statusLabel: string;
				ownerName: string;
				roleTitle: string;
				facility: string;
				startDate: string;
				description: string;
				completedSteps: string[];
				pendingSteps: string[];
				actionLabel?: string;
				actionType?: 'start_onboarding' | 'complete_onboarding';
				actionPendingLabel?: string;
			}
	  >
	| WidgetBase<
			'facility_response',
			{
				status: 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed';
				statusLabel: string;
				summary: string;
				detail: string;
				completedSteps: string[];
				pendingSteps: string[];
				actions: Array<{
					label: string;
					type:
						| 'record_facility_interview'
						| 'confirm_placement'
						| 'close_staffing_request';
					pendingLabel: string;
					tone: 'primary' | 'secondary' | 'danger';
				}>;
			}
	  >
	| WidgetBase<
			'handoff',
			{
				kind: 'escalation' | 'staffing_queue' | 'onboarding_queue';
				tone: 'danger' | 'good';
				statusLabel: string;
				queueName: string;
				eta: string;
				reasonCodes: string[];
				summary: string;
				actionLabel: string;
			}
	  >;

export type WidgetType = ConciergeWidget['type'];

export type WidgetOf<TType extends WidgetType> = Extract<ConciergeWidget, { type: TType }>;
