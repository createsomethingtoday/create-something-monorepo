import { json, type RequestEvent } from '@sveltejs/kit';
import type { AgencyMcpEntitlementRow } from './mcp-entitlements';

export const AGENCY_ACCESS_POLICY_REFERENCE = 'policy.user-bearer-token-governance.v1';

type AgencySessionUser = {
  id: string;
  email: string;
  source?: string;
};

type AgencyEntitlementResult = {
  row: AgencyMcpEntitlementRow;
};

type PolicyAcceptanceDependencies = {
  requireAgencySessionUser: (input: {
    cookies: RequestEvent['cookies'];
    platform: App.Platform | undefined;
  }) => Promise<AgencySessionUser>;
  ensureAgencyMcpEntitlement: (input: {
    platform: App.Platform | undefined;
    user: AgencySessionUser;
  }) => Promise<AgencyEntitlementResult>;
  recordAgencyMcpPolicyAcceptance: (
    db: D1Database,
    input: { authSubject: string; metadata: Record<string, unknown> }
  ) => Promise<AgencyMcpEntitlementRow | null>;
  now?: () => Date;
};

export function createMcpPolicyAcceptancePostHandler(dependencies: PolicyAcceptanceDependencies) {
  return async ({ cookies, platform }: Pick<RequestEvent, 'cookies' | 'platform'>) => {
    try {
      const db = platform?.env?.DB;
      if (!db) {
        return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
      }

      const user = await dependencies.requireAgencySessionUser({ cookies, platform });
      await dependencies.ensureAgencyMcpEntitlement({ platform, user });
      const acceptedAt = (dependencies.now ?? (() => new Date()))().toISOString();
      const updated = await dependencies.recordAgencyMcpPolicyAcceptance(db, {
        authSubject: user.id,
        metadata: {
          policy_accepted_at: acceptedAt,
          policy_accepted_via: 'agency_dashboard',
          policy_reference: AGENCY_ACCESS_POLICY_REFERENCE
        }
      });

      if (!updated) {
        return json(
          { error: 'not_found', message: 'Entitlement record not found' },
          { status: 404 }
        );
      }

      return json({
        success: true,
        message:
          'Access policy accepted. Existing commercial, membership, and credential state is unchanged.',
        entitlement: updated
      });
    } catch (error) {
      return json(
        {
          error: 'internal_error',
          message: error instanceof Error ? error.message : 'Unexpected error'
        },
        { status: 500 }
      );
    }
  };
}
