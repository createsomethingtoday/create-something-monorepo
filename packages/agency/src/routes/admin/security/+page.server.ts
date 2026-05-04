import {
	evaluateAgencyMcpEntitlement,
	listAgencyIdentitySeeds,
	listAgencyCommercialState,
	listAgencyContractState,
	listAgencyMcpEntitlements,
} from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const operator = await requireAgencyOperator({ locals, platform });
	const db = platform!.env.DB;

	const [entitlements, contracts, commercial, identitySeeds] = await Promise.all([
		listAgencyMcpEntitlements(db, { limit: 200 }),
		listAgencyContractState(db, { limit: 100 }),
		listAgencyCommercialState(db, { limit: 100 }),
		listAgencyIdentitySeeds(db, { limit: 100 }),
	]);

	const evaluated = entitlements.map((row) => ({
		...row,
		decision: evaluateAgencyMcpEntitlement(row),
	}));

	return {
		operator: {
			email: operator.email,
		},
		summary: {
			totalEntitlements: evaluated.length,
			deniedEntitlements: evaluated.filter((row) => !row.decision.allowed).length,
			manualOverrides: evaluated.filter((row) => {
				try {
					const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
					return metadata.manual_override === true;
				} catch {
					return false;
				}
			}).length,
			activeContracts: contracts.filter((row) => row.contract_active === 1).length,
			inactiveBilling: commercial.filter((row) => row.billing_active !== 1).length,
			activeBilling: commercial.filter((row) => row.billing_active === 1).length,
			seededUsers: identitySeeds.length,
			unboundSeeds: identitySeeds.filter((row) => !row.auth_subject).length,
		},
		recentDeniedEntitlements: evaluated.filter((row) => !row.decision.allowed).slice(0, 10),
		recentContracts: contracts.slice(0, 10),
		recentCommercialAccounts: commercial.slice(0, 10),
		recentIdentitySeeds: identitySeeds.slice(0, 10),
	};
};
