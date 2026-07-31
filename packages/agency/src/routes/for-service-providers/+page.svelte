<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem
  } from '@create-something/canon';

  const deliverySteps: PerformanceCardItem[] = [
    {
      eyebrow: '01 Map',
      icon: 'document',
      title: 'Map the client workflow',
      detail:
        'Name the handoff, accountable owner, source systems, decisions, stop conditions, and proof before proposing a build.',
      points: ['One workflow', 'Named owner', 'Visible current state']
    },
    {
      eyebrow: '02 Bound',
      icon: 'settings',
      title: 'Confirm ownership and authority',
      detail:
        'Agree which accounts stay client-owned, what the system may read or change, and where a person must approve.',
      points: ['Client-owned accounts', 'Run / wait / stop', 'No implied write access']
    },
    {
      eyebrow: '03 Build',
      icon: 'check',
      title: 'Build and verify the approved path',
      detail:
        'Connect only the approved tools, test normal and blocked cases, and keep release and recovery evidence with the work.',
      points: ['Scoped integration', 'Acceptance checks', 'Recovery path']
    },
    {
      eyebrow: '04 Handoff',
      icon: 'arrow-right',
      title: 'Hand over proof or operate with Control',
      detail:
        'Give the client an inspectable map and operating record. Add Control only when the launched workflow needs ongoing operation.',
      points: ['Client-safe receipt', 'Owned documentation', 'Optional managed operation']
    }
  ];

  const boundaries: PerformanceCardItem[] = [
    {
      eyebrow: 'Reusable',
      title: 'Reuse the structure, not the client data.',
      detail:
        'Workflow shapes, checks, and receipt patterns can repeat. Credentials, records, approvals, and account authority cannot.'
    },
    {
      eyebrow: 'Relationship',
      title: 'Name who owns delivery and support.',
      detail:
        'The engagement must state who leads the client relationship, who implements, who approves, and who responds after launch.'
    },
    {
      eyebrow: 'Commercial boundary',
      title: 'No automatic white-label, reseller, or certification rights.',
      detail:
        'Current use is scoped delivery with explicit ownership. Any broader commercial program requires a separate written agreement.'
    }
  ];

  const faqItems = [
    {
      question: 'Can I include CREATE SOMETHING in my client services?',
      answer:
        'Yes. Start with one client workflow and an explicit delivery boundary. Reusable structure is allowed; client data, credentials, and authority stay isolated.'
    },
    {
      question: 'Who owns the client accounts and approval decisions?',
      answer:
        'The client keeps its accounts, data, and approval rights. The written delivery scope names who implements, supports, and operates each workflow.'
    },
    {
      question: 'Is this a reseller or white-label program?',
      answer:
        'No. The current path supports scoped client delivery. Reseller, white-label, certification, and commercial partner rights require a separate agreement.'
    }
  ];
</script>

<SEO
  title="Use CREATE SOMETHING With Clients | Service Providers"
  description="A bounded client-delivery path for consultants and service providers using CREATE SOMETHING Map, Build, and Control."
  keywords="AI workflow service provider, client workflow mapping, governed client delivery, workflow implementation service"
  propertyName="agency"
  {faqItems}
/>

<main class="service-provider-page">
  <PerformancePageSection
    variant="hero"
    layout="stack"
    titleLevel="h1"
    eyebrow="For service providers"
    title="Use CREATE SOMETHING with your clients."
    description="Bring one client workflow. Map the ownership and tool boundary, build only the approved path, and leave the client with proof they can inspect."
  >
    {#snippet actions()}
      <Button href="/map?source=service-provider&intent=client-workflow">Start a client map</Button>
      <Button
        href="/book?source=service-provider&intent=client-workflow&stage=qualify&lane=build"
        variant="secondary">Talk through one client workflow</Button
      >
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="white"
    eyebrow="Client delivery lifecycle"
    title="One governed path from first map to operating handoff."
    description="The same Map → Build → Control system applies. The client boundary stays visible at every step."
  >
    {#snippet after()}
      <PerformanceCardGrid
        items={deliverySteps}
        columns={4}
        ariaLabel="Service-provider client delivery lifecycle"
      />
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="soft"
    eyebrow="What can travel"
    title="Carry the method forward without carrying hidden authority."
    description="Reusable delivery should make the next engagement clearer. It must not blur account ownership, consent, or responsibility."
  >
    {#snippet after()}
      <PerformanceCardGrid items={boundaries} columns={3} ariaLabel="Service-provider boundaries" />
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
    eyebrow="Start with one client"
    title="Name the workflow and the accountable client owner."
    description="Use the public Map to prepare the current state. Bring that map into a scoped delivery conversation only when the owner and workflow are clear."
    handoff={{
      owner: 'Client workflow owner',
      authority: 'Named delivery boundary',
      proof: 'Map + scope + handoff receipt',
      state: 'review'
    }}
  >
    {#snippet actions()}
      <Button href="/map?source=service-provider&intent=client-workflow">Start a client map</Button>
      <Button href="/partners" variant="secondary">Check a tool path</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .service-provider-page {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }
</style>
