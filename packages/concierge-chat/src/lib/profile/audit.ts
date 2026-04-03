import type { ProfileFieldEvent, ProfileSnapshot } from './types';

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
