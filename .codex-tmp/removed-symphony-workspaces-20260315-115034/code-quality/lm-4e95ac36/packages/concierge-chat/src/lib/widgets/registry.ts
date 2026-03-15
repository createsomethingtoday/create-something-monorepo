import type { ComponentType, SvelteComponent } from 'svelte';
import type { WidgetType } from './types';
import AppointmentPickerCard from './AppointmentPickerCard.svelte';
import ConsentCard from './ConsentCard.svelte';
import DocumentUploadCard from './DocumentUploadCard.svelte';
import FieldConfirmationCard from './FieldConfirmationCard.svelte';
import HandoffCard from './HandoffCard.svelte';
import ProfileProgressCard from './ProfileProgressCard.svelte';
import ToolReconnectCard from './ToolReconnectCard.svelte';

type WidgetComponent = ComponentType<SvelteComponent<{ widget: any }>>;

export const widgetRegistry: Record<WidgetType, WidgetComponent> = {
	profile_progress: ProfileProgressCard,
	field_confirmation: FieldConfirmationCard,
	consent: ConsentCard,
	document_upload: DocumentUploadCard,
	appointment_picker: AppointmentPickerCard,
	tool_reconnect: ToolReconnectCard,
	handoff: HandoffCard
};
