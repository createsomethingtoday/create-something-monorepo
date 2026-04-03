import type { ComponentType, SvelteComponent } from 'svelte';
import type { AgencyGovernedActionGate } from '$lib/agency-access';
import type { WidgetType } from './types';
import AppointmentPickerCard from './AppointmentPickerCard.svelte';
import ConsentCard from './ConsentCard.svelte';
import DocumentUploadCard from './DocumentUploadCard.svelte';
import FacilityResponseCard from './FacilityResponseCard.svelte';
import FieldConfirmationCard from './FieldConfirmationCard.svelte';
import HandoffCard from './HandoffCard.svelte';
import OnboardingQueueCard from './OnboardingQueueCard.svelte';
import ProfileProgressCard from './ProfileProgressCard.svelte';
import StaffingQueueCard from './StaffingQueueCard.svelte';
import ToolReconnectCard from './ToolReconnectCard.svelte';

type WidgetComponent = ComponentType<
	SvelteComponent<{
		widget: any;
		threadId?: string;
		governedActionGate?: AgencyGovernedActionGate | null;
		intakeProtectedActionsBlocked?: boolean;
		intakeProtectionMessage?: string;
		showInternalControls?: boolean;
	}>
>;

export const widgetRegistry: Record<WidgetType, WidgetComponent> = {
	profile_progress: ProfileProgressCard,
	field_confirmation: FieldConfirmationCard,
	consent: ConsentCard,
	document_upload: DocumentUploadCard,
	appointment_picker: AppointmentPickerCard,
	tool_reconnect: ToolReconnectCard,
	staffing_queue: StaffingQueueCard,
	onboarding_queue: OnboardingQueueCard,
	facility_response: FacilityResponseCard,
	handoff: HandoffCard
};
