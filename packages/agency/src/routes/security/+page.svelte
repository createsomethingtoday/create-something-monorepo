<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const updatedDate = 'March 9, 2026';

  const securityPath: PerformanceCardItem[] = [
    {
      eyebrow: 'Identity',
      icon: 'user',
      title: 'Person and tenant boundary',
      detail:
        'Signing in identifies the person and the organization making the request.'
    },
    {
      eyebrow: 'Entitlement',
      icon: 'check',
      title: 'Live access check',
      detail:
        'Each request checks membership, workflow access, contract and billing status, and acceptance of the access policy.'
    },
    {
      eyebrow: 'Credential',
      icon: 'warning',
      title: 'Separate managed tokens',
      detail:
        'Portal logins, access tokens, and hosted product credentials are separate. Access can be removed without treating every credential as the same login.'
    },
    {
      eyebrow: 'Control',
      icon: 'document',
      title: 'Receipts and recovery',
      detail:
        'Revocation, regeneration, anomaly review, blocked states, and audit trails stay attached to the workflow.'
    }
  ];

  const runtimeRules: PerformanceCardItem[] = [
    {
      eyebrow: 'Allowed',
      icon: 'success',
      title: 'Run still needs the right lane',
      detail:
        'Having an access token does not allow every action. Each request must also pass the workflow and permission checks.'
    },
    {
      eyebrow: 'Blocked',
      icon: 'error',
      title: 'Wait or stop before risk',
      detail:
        'Revenue, customer trust, production, credential, contract, billing, or policy issues can pause or deny execution before the workflow acts.'
    },
    {
      eyebrow: 'Recover',
      icon: 'refresh',
      title: 'Compromise has a direct path',
      detail:
        'Access can be revoked or regenerated immediately without waiting for a token expiry window.'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Map',
      icon: 'folder',
      title: 'Name the protected workflow',
      detail: 'Define which objects, actions, and systems need security review.'
    },
    {
      label: 'Gate',
      icon: 'check',
      title: 'Define allowed and blocked states',
      detail: 'Separate routine execution from approval, denial, and recovery.'
    },
    {
      label: 'Prove',
      icon: 'document',
      title: 'Keep the audit trail',
      detail: 'Attach evidence to the workflow path instead of relying on prompt memory.'
    }
  ];
</script>

<SEO
  title="Security"
  description="How we check identity and permissions, limit access, record actions, and revoke credentials for live AI workflows."
  propertyName="agency"
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  expression="editorial"
  eyebrow="Security"
  title="A token can exist and access can still stop."
  description="The system checks who is asking, what they can access, and whether approval is needed before it acts. A login alone is not enough."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/bearer-token-policy" variant="secondary">Read Token Policy</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={runtimeRules}
      columns={1}
      density="compact"
      ariaLabel="Runtime security rules"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow={`Last updated ${updatedDate}`}
  title="Check access at every step."
  description="Each request passes identity and permission checks. The system records approvals and reasons for stopping, so your team can review what happened."
>
  {#snippet after()}
    <PerformanceCardGrid items={securityPath} columns={4} ariaLabel="Security control path" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="Access boundary"
  title="Agree on permissions before granting access."
  description="Decide what the agent may do, when it must stop, and who approves exceptions. Grant access only after those rules are clear."
  steps={ctaItems}
  handoff={{ owner: 'Security owner', authority: 'Identity + entitlement boundary', proof: 'Audit trail', state: 'review' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="mailto:legal@createsomething.io" variant="secondary">Security Contact</Button>
  {/snippet}
</PerformanceConversionHandoff>
