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
        'List the task, the person responsible, the tools involved, and the approvals needed before proposing a build.',
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
        'Give the client the workflow plan and work history. Add Control when the live system needs ongoing support.',
      points: ['Client-safe receipt', 'Owned documentation', 'Optional managed operation']
    }
  ];

  const boundaries: PerformanceCardItem[] = [
    {
      eyebrow: 'Reusable',
      title: 'Reuse the structure, not the client data.',
      detail:
        'Reuse workflow structures and checks. Keep each client’s logins, data, approvals, and access separate.'
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
  description="Plan, build, and support AI workflows for your clients. Agree on responsibilities and keep each client’s data and access separate."
  keywords="AI workflow service provider, client workflow mapping, governed client delivery, workflow implementation service"
  propertyName="agency"
  {faqItems}
/>

<main class="service-provider-page">
  <PerformancePageSection
    variant="hero"
    layout="stack"
    titleLevel="h1"
    expression="editorial"
    eyebrow="For service providers"
    title="Use CREATE SOMETHING with your clients."
    description="Bring one client task. We agree on who owns the work, what to build, and who approves it. The client keeps the plan and results."
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
    title="From planning to client handover."
    description="Use Map to plan, Build to implement, and Control for support. Agree on each party’s responsibilities at every step."
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
    title="Reuse the approach. Keep client access separate."
    description="Reusable delivery should make the next engagement clearer. It must not blur account ownership, consent, or responsibility."
  >
    {#snippet after()}
      <PerformanceCardGrid items={boundaries} columns={3} ariaLabel="Service-provider boundaries" />
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Start with one client"
    title="Name the workflow and the accountable client owner."
    description="Draft the task in the public Map. Bring the plan and the person responsible to a conversation about the project."
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
