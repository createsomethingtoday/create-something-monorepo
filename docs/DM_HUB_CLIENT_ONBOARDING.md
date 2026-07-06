# DM Hub Client Onboarding

This runbook governs operator-assisted onboarding for a direct-message client Hub lane.
It is intentionally non-secret: never paste bearer tokens, basic-auth passwords, OAuth
codes, private trace payloads, or raw vault values into this file.

## Purpose

DM Hub onboarding is a controlled delivery path for setting up a client-specific MCP
lane when the operator is actively configuring the customer runtime, host URL, account
mapping, and follow-on `.agency` access surface.

Use this runbook when:

- A client needs a dedicated Hub URL or named lane before self-service setup is complete.
- The operator is performing a white-glove credential handoff under partner policy.
- A third-party host requires a compatibility lane while managed bearer governance remains
  enforced through `identity-worker`.

Do not use this path to bypass consent, identity mapping, exception approval, or vault
governance.

## Preconditions

Before delivery:

1. Confirm the client, account, tenant, lane slug, host URL, and intended tool prefix set.
2. Confirm active consent or the approved policy prerequisite for the selected credential
   type.
3. Confirm the runtime secrets live in Infisical or the approved Worker secret store, not
   in docs, tickets, or chat logs.
4. Confirm the lane can be revoked or regenerated through the canonical `.agency` or
   `identity-worker` path.
5. Confirm telemetry and Langfuse attribution will include account, tenant, and lane
   context.

## Controlled Delivery Steps

1. Create or verify the client lane record and bound host.
2. Generate the managed bearer, strict session bundle, or approved legacy exception through
   the governed partner or identity API.
3. Record non-secret delivery metadata:
   - actor
   - recipient
   - delivery channel
   - client slug
   - lane slug
   - host URL
   - credential type
   - effective allowed tool prefixes
   - expiration or sunset timestamp when applicable
4. Deliver the secret only through the approved secure handoff channel.
5. Immediately verify one representative routed MCP call against the lane.
6. Record validation evidence without exposing plaintext credentials.
7. Point the client to the follow-on self-service surface for revoke, regenerate, password
   rotation, and account visibility.

## Required Evidence

Store evidence in the relevant Linear issue, partner delivery record, or approved audit
surface:

- Lane URL and bound host.
- Effective allowed tool prefixes.
- Credential type and whether it is managed bearer, strict session, OAuth-facade managed
  bearer, or approved legacy exception.
- Delivery channel, actor, and recipient.
- Verification command name or route exercised.
- Pass/fail result and timestamp.
- Rollback or revocation path.

Evidence must not include:

- `Authorization` headers.
- Bearer tokens.
- Basic-auth passwords.
- OAuth authorization codes or access tokens.
- Raw Langfuse, Langfuse, or telemetry trace payloads containing private data.
- Vault paths with secret values.

## Revocation And Rotation

Use the narrowest governed path for the credential type:

- Managed bearer: revoke or regenerate through `.agency` or `identity-worker`.
- Strict session bundle: expire and reissue through the governed session path.
- Legacy exception: revoke through the exception-governed legacy key endpoint and confirm
  the sunset window remains valid.
- Runtime worker secret: rotate through the Infisical-backed Hub rotation workflow only
  when explicitly performing rotation or incident response.

Routine sync, deploy, or verification work must not silently replace a working runtime
secret.

## Policy References

- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.legacy-compat-sunset.v1.md`
- `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`
