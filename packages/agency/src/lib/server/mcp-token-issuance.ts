import type { AgencyMcpEntitlementRow } from './mcp-entitlements.js';
import { resolveMcpAccessAssignment, type McpAccessAssignment } from './mcp-access-assignments.js';
import type { AgencySessionUser } from './mcp-token.js';

type AgencyPlatform = App.Platform | undefined;

export interface ManagedBearerScopeRequest {
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
}

export interface ManagedBearerTokenScope {
	assignment: McpAccessAssignment | null;
	toolkitProfile: string[] | undefined;
	allowedToolPrefixes: string[] | undefined;
}

export function resolveManagedBearerTokenScopeValues(input: {
	assignment?: Pick<McpAccessAssignment, 'toolkitProfile' | 'allowedToolPrefixes'> | null;
	requestedToolkitProfile?: string[];
	requestedAllowedToolPrefixes?: string[];
}): Pick<ManagedBearerTokenScope, 'toolkitProfile' | 'allowedToolPrefixes'> {
	if (input.assignment) {
		return {
			toolkitProfile: [...input.assignment.toolkitProfile],
			allowedToolPrefixes: [...input.assignment.allowedToolPrefixes],
		};
	}

	return {
		toolkitProfile: normalizeOptionalStringArray(input.requestedToolkitProfile),
		allowedToolPrefixes: normalizeOptionalStringArray(input.requestedAllowedToolPrefixes),
	};
}

export async function resolveAgencyManagedBearerTokenScope(input: {
	platform: AgencyPlatform;
	user: AgencySessionUser;
	entitlement: AgencyMcpEntitlementRow;
	body: ManagedBearerScopeRequest | null | undefined;
}): Promise<ManagedBearerTokenScope> {
	const assignment = await resolveMcpAccessAssignment(input.platform?.env?.DB, {
		email: input.user.email,
		accountId: input.entitlement.account_id,
		tenantId: input.entitlement.tenant_id,
		workspaceAccountId: input.entitlement.workspace_account_id,
		authSubject: input.user.id,
	});
	const scope = resolveManagedBearerTokenScopeValues({
		assignment,
		requestedToolkitProfile: input.body?.toolkit_profile,
		requestedAllowedToolPrefixes: input.body?.allowed_tool_prefixes,
	});

	return {
		assignment,
		...scope,
	};
}

function normalizeOptionalStringArray(value: string[] | undefined): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const normalized = value
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter(Boolean);
	return [...new Set(normalized)];
}
