<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem
  } from '@create-something/canon';

  const effectiveDate = 'March 6, 2026';

  const controls: PerformanceCardItem[] = [
    {
      eyebrow: 'Token',
      icon: 'user',
      title: 'One active token per authenticated user',
      detail: 'The token is personal to one user and governed by .agency.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'warning',
      title: 'Not a raw identity token',
      detail: 'The managed bearer token is not a replacement for portal identity or organization checks.'
    },
    {
      eyebrow: 'Check',
      icon: 'check',
      title: 'Live entitlement at request time',
      detail: 'Membership, policy acceptance, contract status, billing status, and service entitlement are checked before access.'
    },
    {
      eyebrow: 'Audit',
      icon: 'document',
      title: 'Issuance and revocation logs',
      detail: 'Issuance, regeneration, revocation, and request-time authorization are recorded.'
    }
  ];

  const responsibilities: PerformanceCardItem[] = [
    {
      eyebrow: 'Do not share',
      icon: 'users',
      title: 'No shared team tokens',
      detail: 'Do not share a personal token with another person, team, repository, or uncontrolled environment.'
    },
    {
      eyebrow: 'Store',
      icon: 'folder',
      title: 'Use a secret manager',
      detail: 'Store tokens in a secure secret manager or equivalent controlled runtime environment.'
    },
    {
      eyebrow: 'Rotate',
      icon: 'refresh',
      title: 'Regenerate on suspected compromise',
      detail: 'Regeneration invalidates the prior token immediately unless a managed transition is explicitly provided.'
    },
    {
      eyebrow: 'Expect stops',
      icon: 'error',
      title: 'Access can end immediately',
      detail: 'Access may stop when a user, organization, contract, billing state, or policy state is no longer in good standing.'
    }
  ];
</script>

<SEO
  title="Bearer Token Policy"
  description="CREATE SOMETHING .agency bearer token policy: one long-lived token per user, live entitlement checks, revocation, audit controls, and enforcement."
  propertyName="agency"
/>

<PerformancePageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Bearer Token Policy"
  title="The token is portable. Authorization is conditional."
  description="CREATE SOMETHING .agency issues one managed bearer token per authenticated user for approved hosts, local tools, and background agents. A valid token does not guarantee access unless current policy and entitlement checks pass."
>
  {#snippet actions()}
    <Button href="/security">Security Contact</Button>
  {/snippet}

  {#snippet after()}
    <PerformanceCardGrid items={controls} columns={4} ariaLabel="Bearer token controls" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow={`Effective ${effectiveDate}`}
  title="User responsibilities are part of the control model."
  description="Bearer tokens are useful because they are managed, revocable, and auditable. They become risky when treated as shared credentials or bypass paths."
>
  {#snippet after()}
    <PerformanceCardGrid items={responsibilities} columns={4} ariaLabel="Bearer token responsibilities" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Enforcement"
  title="Revocation terminates token usability at once."
  description="CREATE SOMETHING may revoke or suspend bearer-token access immediately where compromise, misuse, billing delinquency, contract failure, policy violation, or other legal, operational, or security risk is detected."
/>
