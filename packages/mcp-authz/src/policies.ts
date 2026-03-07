import { compileConstraintPolicy } from '@create-something/policy-os-engine';
import type { AuthzPolicyDefinition, PolicyManifest } from './types.js';

const POLICY_DEFINITIONS: AuthzPolicyDefinition[] = [
  {
    manifest: {
      policyId: 'policy.hub-route-authorization.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Centralized broker authorization for proxy route discovery and execution.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
        mismatchThreshold: 0.005,
        fallbackRateThreshold: 0.01,
      },
    },
    policy: {
      id: 'policy.hub-route-authorization.v1',
      name: 'Hub route authorization',
      description: 'Fine-grained broker policy for route discovery and proxy execution.',
      rules: [
        {
          id: 'hub_route_block_unresolved_context',
          priority: 5,
          when: {
            resourceKinds: ['hub_route'],
            introspectionOk: false,
          },
          then: {
            decision: 'block',
            reason: 'Protected remote hub routes require resolved actor and tenant context before discovery or execution.',
          },
        },
        {
          id: 'hub_discover_readonly_blocks_mutations',
          priority: 10,
          when: {
            actionNames: ['discover'],
            toolModes: ['read_only'],
            accessTypes: ['write', 'destructive', 'auth_admin', 'control_plane'],
          },
          then: {
            decision: 'block',
            reason: 'Read-only sessions cannot discover mutable or administrative routes.',
          },
        },
        {
          id: 'hub_execute_readonly_blocks_mutations',
          priority: 20,
          when: {
            actionNames: ['execute'],
            toolModes: ['read_only'],
            accessTypes: ['write', 'destructive', 'auth_admin', 'control_plane'],
          },
          then: {
            decision: 'block',
            reason: 'Read-only sessions cannot execute mutable or administrative routes.',
          },
        },
        {
          id: 'hub_execute_destructive_requires_review',
          priority: 30,
          when: {
            actionNames: ['execute'],
            accessTypes: ['destructive', 'control_plane'],
          },
          then: {
            decision: 'require_human_review',
            reason: 'Destructive or control-plane proxy routes require human review.',
          },
        },
        {
          id: 'hub_discover_allow',
          priority: 900,
          when: {
            actionNames: ['discover'],
            resourceKinds: ['hub_route'],
            introspectionOk: true,
          },
          then: {
            decision: 'allow',
            reason: 'Route is visible for discovery.',
          },
        },
        {
          id: 'hub_execute_allow',
          priority: 910,
          when: {
            actionNames: ['execute'],
            resourceKinds: ['hub_route'],
            introspectionOk: true,
          },
          then: {
            decision: 'allow',
            reason: 'Proxy route execution is allowed.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.judgment-baseline.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Baseline hard-gate policy for Atlas workflow and MCP mapping operations.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
        mismatchThreshold: 0.005,
        fallbackRateThreshold: 0.01,
      },
    },
    policy: {
      id: 'policy.judgment-baseline.v1',
      name: 'Judgment baseline',
      description: 'Baseline hard-gate decision policy for workflow and MCP mapping operations.',
      guardrails: {
        maxReviewDelta: 2,
        maxBlockDelta: 1,
      },
      rules: [
        {
          id: 'jr_block_readonly_write_01',
          priority: 10,
          when: {
            hasWriteIntent: true,
            accountIds: ['public'],
          },
          then: {
            decision: 'block',
            reason: 'Public read-only account cannot run write-intent path.',
          },
        },
        {
          id: 'jr_review_introspection_failure_02',
          priority: 20,
          when: {
            toolNames: ['mcp_map_to_workflow'],
            introspectionOk: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Introspection failed; operator review required.',
          },
        },
        {
          id: 'jr_review_missing_human_step_03',
          priority: 30,
          when: {
            hasWriteIntent: true,
            hasHumanReviewStep: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Write-intent path without explicit human review.',
          },
        },
        {
          id: 'jr_allow_default_99',
          priority: 999,
          when: {},
          then: {
            decision: 'allow',
            reason: 'No restrictive rules matched.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.mcp-session-self-service.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Self-service MCP session minting for authenticated users.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
      },
    },
    policy: {
      id: 'policy.mcp-session-self-service.v1',
      name: 'MCP session self-service',
      description: 'Authenticated callers may mint scoped MCP sessions for themselves.',
      rules: [
        {
          id: 'self_service_mint_allow',
          priority: 10,
          when: {
            actionNames: ['mint_session'],
            resourceKinds: ['mcp_session'],
          },
          then: {
            decision: 'allow',
            reason: 'Authenticated user may mint a scoped session for their account.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.partner-auth-governance.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Partner-admin auth operations require consent evidence and review traceability.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
      },
    },
    policy: {
      id: 'policy.partner-auth-governance.v1',
      name: 'Partner auth governance',
      description: 'Partner-admin auth operations require explicit consent evidence and review traceability.',
      rules: [
        {
          id: 'admin_mint_block_without_consent',
          priority: 10,
          when: {
            actionNames: ['admin_mint_session'],
            resourceKinds: ['mcp_session'],
            introspectionOk: false,
          },
          then: {
            decision: 'block',
            reason: 'Admin mint requires consent evidence.',
          },
        },
        {
          id: 'admin_mint_review_without_trace',
          priority: 20,
          when: {
            actionNames: ['admin_mint_session'],
            resourceKinds: ['mcp_session'],
            hasHumanReviewStep: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Admin mint requires human review trace.',
          },
        },
        {
          id: 'admin_mint_allow',
          priority: 30,
          when: {
            actionNames: ['admin_mint_session'],
            resourceKinds: ['mcp_session'],
            introspectionOk: true,
            hasHumanReviewStep: true,
          },
          then: {
            decision: 'allow',
            reason: 'Consent and review evidence present.',
          },
        },
        {
          id: 'partner_toolkit_block_without_consent',
          priority: 40,
          when: {
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: false,
          },
          then: {
            decision: 'block',
            reason: 'Partner toolkit auth actions require an active consent record.',
          },
        },
        {
          id: 'partner_toolkit_pin_requires_review',
          priority: 50,
          when: {
            actionNames: ['pin_toolkit_account'],
            resourceKinds: ['partner_toolkit_account'],
            hasHumanReviewStep: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Pinning a partner toolkit account requires a human review trace.',
          },
        },
        {
          id: 'partner_toolkit_disable_requires_review',
          priority: 60,
          when: {
            actionNames: ['disable_toolkit_account'],
            resourceKinds: ['partner_toolkit_account'],
            hasHumanReviewStep: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Disabling a partner toolkit account requires a human review trace.',
          },
        },
        {
          id: 'partner_toolkit_view_allow',
          priority: 70,
          when: {
            actionNames: ['view_toolkit_auth'],
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: true,
            actorRoles: ['partner_admin'],
          },
          then: {
            decision: 'allow',
            reason: 'Partner admin may inspect toolkit auth state with active consent.',
          },
        },
        {
          id: 'partner_toolkit_upsert_allow',
          priority: 80,
          when: {
            actionNames: ['upsert_toolkit_account'],
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: true,
            actorRoles: ['partner_admin'],
          },
          then: {
            decision: 'allow',
            reason: 'Partner admin may create or update toolkit auth bindings with active consent.',
          },
        },
        {
          id: 'partner_toolkit_connect_allow',
          priority: 90,
          when: {
            actionNames: ['create_toolkit_connect_link'],
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: true,
            actorRoles: ['partner_admin'],
          },
          then: {
            decision: 'allow',
            reason: 'Partner admin may issue toolkit connect links with active consent.',
          },
        },
        {
          id: 'partner_toolkit_pin_allow',
          priority: 100,
          when: {
            actionNames: ['pin_toolkit_account'],
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: true,
            hasHumanReviewStep: true,
            actorRoles: ['partner_admin'],
          },
          then: {
            decision: 'allow',
            reason: 'Partner admin may pin toolkit accounts after human review.',
          },
        },
        {
          id: 'partner_toolkit_disable_allow',
          priority: 110,
          when: {
            actionNames: ['disable_toolkit_account'],
            resourceKinds: ['partner_toolkit_account'],
            introspectionOk: true,
            hasHumanReviewStep: true,
            actorRoles: ['partner_admin'],
          },
          then: {
            decision: 'allow',
            reason: 'Partner admin may disable toolkit accounts after human review.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.user-bearer-token-governance.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Managed long-lived user bearer tokens for .agency-issued MCP access.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
      },
    },
    policy: {
      id: 'policy.user-bearer-token-governance.v1',
      name: 'User bearer token governance',
      description: 'Managed bearer tokens are issued and revoked through governed service paths.',
      rules: [
        {
          id: 'user_bearer_issue_allow',
          priority: 10,
          when: {
            actionNames: ['issue_user_bearer_token'],
            resourceKinds: ['managed_bearer_token'],
          },
          then: {
            decision: 'allow',
            reason: 'Governed service path may issue a managed bearer token.',
          },
        },
        {
          id: 'user_bearer_revoke_allow',
          priority: 20,
          when: {
            actionNames: ['revoke_user_bearer_token'],
            resourceKinds: ['managed_bearer_token'],
          },
          then: {
            decision: 'allow',
            reason: 'Governed service path may revoke a managed bearer token.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.mcp-credential-delivery.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Legacy credential issuance requires exception approval and review traceability.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
      },
    },
    policy: {
      id: 'policy.mcp-credential-delivery.v1',
      name: 'MCP credential delivery',
      description: 'Legacy credential issuance requires approved exception evidence and review.',
      rules: [
        {
          id: 'legacy_issue_block_without_exception',
          priority: 10,
          when: {
            actionNames: ['issue_legacy_key'],
            resourceKinds: ['legacy_key'],
            introspectionOk: false,
          },
          then: {
            decision: 'block',
            reason: 'Legacy key issuance requires approved exception.',
          },
        },
        {
          id: 'legacy_issue_review_without_trace',
          priority: 20,
          when: {
            actionNames: ['issue_legacy_key'],
            resourceKinds: ['legacy_key'],
            hasHumanReviewStep: false,
          },
          then: {
            decision: 'require_human_review',
            reason: 'Legacy key issuance requires review trace.',
          },
        },
        {
          id: 'legacy_issue_allow',
          priority: 30,
          when: {
            actionNames: ['issue_legacy_key'],
            resourceKinds: ['legacy_key'],
            introspectionOk: true,
            hasHumanReviewStep: true,
          },
          then: {
            decision: 'allow',
            reason: 'Approved exception and review trace present.',
          },
        },
        {
          id: 'legacy_revoke_allow',
          priority: 40,
          when: {
            actionNames: ['revoke_legacy_key'],
            resourceKinds: ['legacy_key'],
          },
          then: {
            decision: 'allow',
            reason: 'Legacy key revocation is always permitted for operators.',
          },
        },
      ],
    },
  },
  {
    manifest: {
      policyId: 'policy.legacy-compat-sunset.v1',
      version: 1,
      commitSha: 'workspace',
      status: 'draft',
      description: 'Legacy bearer compatibility must have bounded sunset windows.',
      rolloutDefaults: {
        mode: 'legacy_enforce',
        canaryPercent: 0,
      },
    },
    policy: {
      id: 'policy.legacy-compat-sunset.v1',
      name: 'Legacy compatibility sunset',
      description: 'Legacy bearer compatibility must have bounded sunset windows.',
      rules: [
        {
          id: 'legacy_sunset_block_out_of_window',
          priority: 10,
          when: {
            actionNames: ['issue_legacy_key'],
            resourceKinds: ['legacy_key'],
            introspectionOk: false,
          },
          then: {
            decision: 'block',
            reason: 'Legacy key sunset window exceeds policy limits.',
          },
        },
        {
          id: 'legacy_sunset_allow',
          priority: 20,
          when: {
            actionNames: ['issue_legacy_key'],
            resourceKinds: ['legacy_key'],
            introspectionOk: true,
          },
          then: {
            decision: 'allow',
            reason: 'Legacy key sunset window is policy compliant.',
          },
        },
      ],
    },
  },
];

const policyRegistry = new Map(
  POLICY_DEFINITIONS.map((definition) => {
    const compiled = compileConstraintPolicy(definition.policy);
    const manifest: PolicyManifest = {
      ...definition.manifest,
      polar: compiled.policyPolar,
      fallbackIrJson: compiled.fallbackIrJson,
      compilerVersion: compiled.compilerVersion,
      policyHash: compiled.policyHash,
    };
    return [
      definition.policy.id,
      {
        policy: definition.policy,
        compiled,
        manifest,
      },
    ];
  }),
);

export function getPolicyRegistry() {
  return policyRegistry;
}

export function getPolicyManifest(policyId: string): PolicyManifest {
  const entry = policyRegistry.get(policyId);
  if (!entry) {
    throw new Error(`Unknown authz policy: ${policyId}`);
  }
  return entry.manifest;
}

export function getConstraintPolicy(policyId: string) {
  const entry = policyRegistry.get(policyId);
  if (!entry) {
    throw new Error(`Unknown authz policy: ${policyId}`);
  }
  return entry.policy;
}

export function getCompiledPolicy(policyId: string) {
  const entry = policyRegistry.get(policyId);
  if (!entry) {
    throw new Error(`Unknown authz policy: ${policyId}`);
  }
  return entry.compiled;
}

export function listPolicyManifests(): PolicyManifest[] {
  return Array.from(policyRegistry.values())
    .map((entry) => entry.manifest)
    .sort((a, b) => a.policyId.localeCompare(b.policyId));
}
