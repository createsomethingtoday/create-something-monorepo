# Security Middleware Contract

This contract defines how `@create-something/composio-bridge` should handle sensitive data in tool responses.

## Goal

Apply one universal security middleware path for all clients while allowing per-client policy differences.

## Model

All Composio tool executions pass through `executionHooks` in `ComposioToolFactory`:

1. `beforeExecute` for request shaping and safety checks
2. `afterExecute` for output redaction before content is returned to MCP clients

The redaction policy is layered:

1. Global baseline (always on)
2. Toolkit overrides (for app-specific risk, e.g. Zoom)
3. Client overrides (contract-specific requirements)

## Policy Artifact Shape

```ts
interface SecureOutputPolicyArtifact {
  policyId: string;
  version: string;
  description?: string;
  baseline?: SecureOutputRuleSet;
  toolkitOverrides?: Record<string, SecureOutputRuleSet>;
  toolOverrides?: Record<string, SecureOutputRuleSet>;
}
```

## Example: Global + Client Composition

```ts
import {
  ComposioToolFactory,
  DEFAULT_SECURE_OUTPUT_POLICY,
  composeSecureOutputPolicies,
  createSecureOutputRedactionHook,
  type SecureOutputPolicyArtifact,
} from '@create-something/composio-bridge';

const clientPolicy: SecureOutputPolicyArtifact = {
  policyId: 'halfdozen-zoom',
  version: '2026-02-25',
  baseline: {
    maxStringLength: 5000,
  },
  toolkitOverrides: {
    ZOOM: {
      redactKeys: ['join_url', 'download_url', 'recording_play_passcode'],
      redactPaths: ['data.recording_files.*.download_url'],
    },
  },
  toolOverrides: {
    ZOOM_GET_MEETING_RECORDINGS: {
      dropKeys: ['download_access_token'],
    },
  },
};

const securePolicy = composeSecureOutputPolicies(
  [DEFAULT_SECURE_OUTPUT_POLICY, clientPolicy],
  {
    policyId: 'halfdozen-effective-policy',
    version: '2026-02-25',
  },
);

const factory = new ComposioToolFactory({
  apiKey: env.COMPOSIO_API_KEY,
  apps: [
    {
      app: 'ZOOM',
      prefix: 'zoom_api',
      readOnly: true,
      actions: [
        'ZOOM_GET_A_MEETING',
        'ZOOM_LIST_ALL_RECORDINGS',
        'ZOOM_GET_MEETING_RECORDINGS',
      ],
    },
  ],
  executionHooks: {
    afterExecute: [createSecureOutputRedactionHook(securePolicy)],
  },
});
```

## Baseline Requirements (All Clients)

1. Use `DEFAULT_SECURE_OUTPUT_POLICY` in every deployment.
2. Add a client policy artifact, even if minimal, so requirements are explicit and versioned.
3. Keep write/delete tools disabled by default unless explicitly required.
4. Keep auth scope least-privilege by using dedicated Composio Auth Configs.
5. Treat policy artifacts as versioned change-controlled files.

## Recommended Artifact Storage

- Global baseline: within shared infrastructure repo/package
- Client policy: client workspace repo (`policies/composio-security-policy.ts` or `.json`)
- Effective policy: composed at server startup

