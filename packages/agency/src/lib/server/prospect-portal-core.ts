interface ProspectPortalUserLike {
	id: string;
	email: string;
}

export interface ProspectPortalDeps {
	listPartnerProspectClaimsForAgencyUser: (input: {
		db: D1Database;
		authSubject: string;
		email: string;
		env?: App.Platform['env'];
	}) => Promise<unknown[]>;
}

export async function loadProspectPortalData(
	deps: ProspectPortalDeps,
	input: {
		user: ProspectPortalUserLike | null;
		db?: D1Database | null;
		env?: App.Platform['env'];
	},
) {
	if (!input.user) {
		return {
			user: null,
			prospects: [],
			error: null,
		};
	}

	if (!input.db) {
		return {
			user: input.user,
			prospects: [],
			error: 'Database is unavailable',
		};
	}

	try {
		const prospects = await deps.listPartnerProspectClaimsForAgencyUser({
			db: input.db,
			authSubject: input.user.id,
			email: input.user.email,
			env: input.env,
		});

		return {
			user: input.user,
			prospects,
			error: null,
		};
	} catch (error) {
		return {
			user: input.user,
			prospects: [],
			error: error instanceof Error ? error.message : 'Unexpected error',
		};
	}
}
