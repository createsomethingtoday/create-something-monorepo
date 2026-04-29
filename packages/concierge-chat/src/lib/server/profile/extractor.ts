import type { ConciergeThread } from '$chat/thread-store';
import type { ProfileFieldEvent, ProfileSnapshot } from '$lib/profile/types';

export interface ProfileAudit {
	snapshot: ProfileSnapshot;
	sections: Array<{
		label: string;
		items: ProfileFieldEvent[];
	}>;
}

export function buildProfileAudit(snapshot: ProfileSnapshot): ProfileAudit {
	return {
		snapshot,
		sections: [
			{ label: 'Confirmed', items: snapshot.fields.filter((field) => field.status === 'confirmed') },
			{ label: 'Inferred', items: snapshot.fields.filter((field) => field.status === 'inferred') },
			{ label: 'Candidate', items: snapshot.fields.filter((field) => field.status === 'candidate') },
			{ label: 'Rejected', items: snapshot.fields.filter((field) => field.status === 'rejected') }
		]
	};
}

export function extractProfileSnapshot(thread: ConciergeThread): ProfileSnapshot {
	return thread.profile;
}
