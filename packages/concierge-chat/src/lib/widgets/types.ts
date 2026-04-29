import type { ProfileFieldEvent } from '$lib/profile/types';

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
				requestedDocuments: string[];
				acceptedTypes: string[];
				status: 'needed' | 'uploaded';
				uploadLabel: string;
			}
	  >
	| WidgetBase<
			'appointment_picker',
			{
				description: string;
				slots: Array<{
					id: string;
					label: string;
					window: string;
					availability: 'open' | 'limited' | 'held';
				}>;
				confirmLabel: string;
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
			'handoff',
			{
				queueName: string;
				eta: string;
				reasonCodes: string[];
				summary: string;
				actionLabel: string;
			}
	  >;

export type WidgetType = ConciergeWidget['type'];

export type WidgetOf<TType extends WidgetType> = Extract<ConciergeWidget, { type: TType }>;
