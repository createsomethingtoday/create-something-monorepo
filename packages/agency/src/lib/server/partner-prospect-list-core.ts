interface AgencySessionUserLike {
	id: string;
	email: string;
}

interface ProspectClaimListEventLike {
	cookies: unknown;
	platform?: {
		env?: {
			DB?: D1Database;
			[key: string]: unknown;
		};
	};
}

export interface PartnerProspectListDeps {
	requireAgencySessionUser: (input: {
		cookies: unknown;
		platform: App.Platform | undefined;
	}) => Promise<AgencySessionUserLike>;
	listPartnerProspectClaimsForAgencyUser: (input: {
		db: D1Database;
		authSubject: string;
		email: string;
		env?: App.Platform['env'];
	}) => Promise<unknown[]>;
}

export function createPartnerProspectListGetHandler(deps: PartnerProspectListDeps) {
	return async ({ cookies, platform }: ProspectClaimListEventLike): Promise<Response> => {
		const db = platform?.env?.DB;
		if (!db) {
			return Response.json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const user = await deps.requireAgencySessionUser({ cookies, platform });
		const prospects = await deps.listPartnerProspectClaimsForAgencyUser({
			db,
			authSubject: user.id,
			email: user.email,
			env: platform?.env,
		});

		return Response.json({
			user: {
				auth_subject: user.id,
				email: user.email,
			},
			prospects,
		});
	};
}
