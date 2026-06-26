<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const updatedDate = 'March 9, 2026';

  const securityPath: ClearCardItem[] = [
    {
      eyebrow: 'Identity',
      icon: 'user',
      title: 'Person and tenant boundary',
      detail:
        'Portal sign-in establishes who is acting and which organization boundary the request belongs to.'
    },
    {
      eyebrow: 'Entitlement',
      icon: 'check',
      title: 'Live access check',
      detail:
        'Membership, allowed workflow, contract standing, billing state, and policy acceptance are checked at request time.'
    },
    {
      eyebrow: 'Credential',
      icon: 'warning',
      title: 'Separate managed tokens',
      detail:
        'Portal identity, managed bearer tokens, and hosted product credentials remain distinct so compromise and revocation stay deliberate.'
    },
    {
      eyebrow: 'Control',
      icon: 'document',
      title: 'Receipts and recovery',
      detail:
        'Revocation, regeneration, anomaly review, blocked states, and audit trails stay attached to the workflow.'
    }
  ];

  const runtimeRules: ClearCardItem[] = [
    {
      eyebrow: 'Allowed',
      icon: 'success',
      title: 'Run still needs the right lane',
      detail:
        'A token can exist, but execution still depends on the allowed workflow, scoped action, owner, and current access state.'
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

  const ctaItems: ClearCtaItem[] = [
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
  description="How CREATE SOMETHING .agency turns identity, entitlement, blocked states, and audit trails into controlled execution for production automation."
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Security"
  title="A token can exist and access can still stop."
  description="Credentials are not permission by themselves. Identity, workflow lane, access scope, commercial state, approval rules, and receipts all participate before delegated work can run."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/bearer-token-policy" variant="secondary">Read Token Policy</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={runtimeRules}
      columns={1}
      density="compact"
      ariaLabel="Runtime security rules"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow={`Last updated ${updatedDate}`}
  title="Safe delegation needs an explicit access chain."
  description="Each request passes through a clear path so approval requirements, blocked states, and recovery paths stay legible instead of hiding inside a prompt or a vendor account."
>
  {#snippet after()}
    <ClearCardGrid items={securityPath} columns={4} ariaLabel="Security control path" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Access boundary"
  title="Map the workflow before you hand it credentials."
  description="Security is strongest when the Workflow Trust Map names its objects, permissions, stop conditions, approval owner, and receipts before any agent acts."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="mailto:legal@createsomething.io" variant="secondary">Security Contact</Button>
  {/snippet}
</ClearCtaBand>
