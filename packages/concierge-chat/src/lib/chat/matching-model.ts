export interface MatchingOpportunity {
	id: string;
	roleTitle: string;
	facility: string;
	location: string;
	payPackage: string;
	shift: string;
	startWindow: string;
}

export interface RecruiterReviewSlot {
	id: string;
	label: string;
	window: string;
	availability: 'open' | 'limited' | 'held';
	baseAvailability: 'open' | 'limited';
}

export interface MatchingState {
	status: 'ready' | 'booked' | 'completed';
	recruiterName: string;
	recruiterTitle: string;
	generatedAt: string;
	shortlist: MatchingOpportunity[];
	slots: RecruiterReviewSlot[];
	selectedOpportunityId?: string;
	selectedSlotId?: string;
	bookedAt?: string;
	reviewCompletedAt?: string;
}

export function getSelectedRecruiterSlot(matching?: MatchingState) {
	if (!matching?.selectedSlotId) {
		return null;
	}

	return matching.slots.find((slot) => slot.id === matching.selectedSlotId) ?? null;
}

export function getSelectedMatchingOpportunity(matching?: MatchingState) {
	if (!matching?.selectedOpportunityId) {
		return matching?.shortlist[0] ?? null;
	}

	return matching.shortlist.find((match) => match.id === matching.selectedOpportunityId) ?? null;
}

export function formatRecruiterSlot(slot: Pick<RecruiterReviewSlot, 'label' | 'window'>) {
	return `${slot.label} (${slot.window})`;
}
