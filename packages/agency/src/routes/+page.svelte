<script lang="ts">
  import {
    Button,
    ClearActionFooter,
    ClearCardGrid,
    ClearMetadataRail,
    ClearPageSection,
    ClearPillarGrid,
    ClearPlatformHero,
    ClearProofStrip,
    ClearReceiptGrid,
    SEO,
    type ClearActionFooterItem,
    type ClearCardItem,
    type ClearMetadataGroup,
    type ClearPillarItem,
    type ClearPlatformHeroProof,
    type ClearProofItem,
    type ClearReceipt
  } from '@create-something/canon';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Fixed scope',
      priceDescription: 'Map before any build decision'
    },
    {
      name: 'Workflow Pilot',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Trust Layer',
      description:
        'The Workflow Trust Layer: scoped actions, approval states, release checks, and incident loops once delegated work touches revenue or customer trust.',
      type: 'Workflow Control Plan',
      price: 'Custom',
      priceDescription: 'Monthly trust layer'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Cross-system control for regulated, high-volume, or multi-team workflows where auditability and recovery matter.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const faqItems = [
    {
      question: 'What is Delegated Work Control?',
      answer:
        'Delegated Work Control is the operating boundary around delegated work: source systems, owners, scoped actions, approval states, stop conditions, and receipts.'
    },
    {
      question: 'What is a Workflow Trust Layer?',
      answer:
        'A Workflow Trust Layer is the current service path for one workflow: map the work, build the first safe delegation path, and keep evidence visible.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'The work starts with one manual workflow your team still protects by hand, then maps the first safe delegation path before expanding automation.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'Clients leave with a visible workflow map, action boundary, approval path, run/wait/stop states, and evidence that a team can inspect.'
    }
  ];

  const heroProofItems: ClearPlatformHeroProof[] = [
    {
      value: 'Run',
      label: 'Safe actions move\ninside the lane.'
    },
    {
      value: 'Wait',
      label: 'Judgment calls pause\nfor the owner.'
    },
    {
      value: 'Stop',
      label: 'Outside work stops\nwith a reason.'
    },
    {
      value: 'Receipt',
      label: 'Evidence names the\nowner and outcome.'
    }
  ];

  const painCards: ClearCardItem[] = [
    {
      eyebrow: 'Trust gap',
      icon: 'warning',
      title: 'Your tools can act before the workflow is safe',
      detail:
        'AI tools, automations, and connectors can move work. The risk is unclear owners, unsafe writes, missing approvals, hidden credentials, and no receipt when the work moves.'
    },
    {
      eyebrow: 'Buyer pain',
      icon: 'user',
      title: 'Someone still has to babysit the edge cases',
      detail:
        'The workflow touches customers, revenue, production, credentials, or approvals, so the team keeps watching instead of safely delegating.'
    },
    {
      eyebrow: 'First answer',
      icon: 'check',
      title: 'Make one risky workflow inspectable',
      detail:
        'Start by defining what can run, what waits, what stops, who decides, and what proof survives the handoff.'
    }
  ];

  const serviceFlowPillars: ClearPillarItem[] = [
    {
      eyebrow: '01 Map',
      title: 'Bring one workflow',
      detail:
        'Name the support recovery, revenue, customer-trust, or production handoff the team already protects by hand, with accounts and access still client-owned.',
      proof: 'Output: object map, owner map, action boundary, receipt plan.',
      links: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      eyebrow: '02 Pilot',
      title: 'Build the first safe path',
      detail:
        'Turn the map into scoped actions, approval-needed states, blocked states, and an operator surface.',
      proof: 'Output: working path, runbook, release evidence.',
      links: [{ label: 'See service path', href: '/services#service-path' }]
    },
    {
      eyebrow: '03 Control',
      title: 'Add the trust layer',
      detail:
        'Wrap delegated work with decision rules, least-privilege access, receipts, recovery notes, and accountable ownership.',
      proof:
        'Output: control plan for work that touches revenue, customers, or production.',
      links: [{ label: 'See stack boundary', href: '/stack' }]
    }
  ];

  const workflowMetadataGroups: ClearMetadataGroup[] = [
    {
      title: 'Primitive stack',
      items: [
        { label: 'Database', value: 'Objects and source state' },
        { label: 'Automation', value: 'Tools and run paths' },
        { label: 'Judgment', value: 'Policy and approval rules' }
      ]
    },
    {
      title: 'Control points',
      items: [
        { label: 'Run', value: 'Bounded write or notification' },
        { label: 'Wait', value: 'Human approval before revenue or trust impact' },
        { label: 'Stop', value: 'Reason-coded handoff when the lane is exceeded' }
      ]
    },
    {
      title: 'Evidence',
      items: [
        { label: 'Delivery page', value: 'Client-safe status surface' },
        { label: 'Private receipt', value: 'Commands, pass/fail output, deploy IDs' }
      ]
    }
  ];

  const deliveryReceipts: ClearReceipt[] = [
    {
      number: '01',
      label: 'Workflow map',
      detail: 'Objects, owners, source systems, handoffs, and known failure points.'
    },
    {
      number: '02',
      label: 'Control boundary',
      detail: 'What can run, what needs approval, and what must stop with a reason.'
    },
    {
      number: '03',
      label: 'Delivery page',
      detail:
        'A client-safe record of what changed, what stayed private, what is blocked, and who decides next.'
    },
    {
      number: '04',
      label: 'Private evidence',
      detail: 'Commands, pass/fail output, endpoints, deploy IDs, and rollback notes.'
    }
  ];

  const proofStripItems: ClearProofItem[] = [
    {
      value: 'Run / wait / stop',
      label: 'Execution states are visible before an agent acts.'
    },
    {
      value: '4 receipts',
      label: 'The map, boundary, delivery page, and private evidence stay separate.'
    },
    {
      value: 'No secret spill',
      label: 'Public proof surfaces avoid credentials, raw logs, and private client data.'
    },
    {
      value: 'Owner handoff',
      label: 'Blocked work names the decision owner and the reason it stopped.'
    }
  ];

  const actionFooterItems: ClearActionFooterItem[] = [
    { label: 'Bring', value: 'One manual workflow that keeps needing rescue' },
    { label: 'Map', value: 'Objects, actions, approvals, stops, and receipts' },
    { label: 'Bound', value: 'Named systems, scoped access, owner approval, and stop states' },
    { label: 'Decide', value: 'A fixed-scope Workflow Trust Map before any build commitment' }
  ];
</script>

<SEO
  title="Delegated Work Control | CREATE SOMETHING .agency"
  description="CREATE SOMETHING makes delegated work trustworthy: one workflow map, one safe delegation path, clear approvals, stop states, decision owners, and receipts."
  keywords="delegated work control, workflow trust layer, governed workflow infrastructure, safe AI workflow delegation, agent workflow controls, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one risky workflow safe to delegate."
    description="CREATE SOMETHING maps what can run, what waits for approval, what must stop, who owns the decision, and what receipt proves the work before agents or automations touch customers, revenue, production, or credentials."
    proofItems={heroProofItems}
    hideAsideOnMobile={true}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        Map one workflow
      </Button>
      <Button href="/products" variant="secondary">
        See proof
      </Button>
    {/snippet}

    {#snippet aside()}
      <HeroTrustArtifact />
    {/snippet}
  </ClearPlatformHero>

  <ClearPageSection
    variant="white"
    eyebrow="The pain"
    title="The problem is not capability. The problem is trust."
    description="Your team already has AI tools, automations, and connectors. The missing layer is the operating boundary around delegated work."
  >
    {#snippet after()}
      <ClearCardGrid items={painCards} columns={3} ariaLabel="Delegated work buyer pain" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="workflow-pattern"
    variant="white"
    layout="split"
    eyebrow="Default wedge"
    title="Start with support recovery and customer-trust work."
    description="Support recovery is easy to understand and hard to fake: one lane can show what runs, what waits for a person, what stops, and which receipt survives the handoff."
  >
    {#snippet aside()}
      <ClearMetadataRail
        eyebrow="Workflow metadata"
        title="What the agent knows"
        description="The agent only receives the objects, tools, policies, and receipts that match the lane."
        groups={workflowMetadataGroups}
        tags={['objects', 'actions', 'states', 'receipts']}
        ariaLabel="Controlled workflow metadata"
      />
    {/snippet}

    {#snippet after()}
      <ExecutionWorkbench />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="service-flow"
    variant="white"
    class="home-process-section"
    eyebrow="Service path"
    title="Map. Pilot. Control."
    description="The work stays narrow until the first safe delegation point is visible, proven, owned, and bounded by client-controlled accounts, access, and evidence."
  >
    {#snippet after()}
      <ClearPillarGrid items={serviceFlowPillars} columns={3} ariaLabel="CREATE SOMETHING service flow" />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="white"
    eyebrow="Atlas entry point"
    title="The map is the productized wedge."
    description="Atlas turns the workflow into an inspectable artifact: human tasks, AI tasks, system operations, source data, constraints, touchpoints, owners, stop conditions, and receipts."
  >
    {#snippet after()}
      <PublicAtlasStoryCanvas
        starterId="marketplace-review-queue"
        storyId="home-support-recovery-atlas-story"
        eyebrow="Workflow Trust Map"
        title="A buyer should see the boundary before the build."
        description="This read-only Atlas canvas shows how a workflow becomes safe to discuss: source state, allowed action, approval owner, hard stop, and receipt surface."
        compact
      />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    variant="soft"
    eyebrow="Receipts"
    title="The operating path should be visible."
    description="Each delivery record separates the public story, private evidence, and clear rules for what delegated work is allowed to do."
  >
    {#snippet after()}
      <div class="home-proof-stack">
        <ClearReceiptGrid receipts={deliveryReceipts} ariaLabel="Delivery receipts" />
        <ClearProofStrip items={proofStripItems} ariaLabel="Workflow proof artifacts" />
      </div>
    {/snippet}
  </ClearPageSection>

  <ClearActionFooter
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a Workflow Trust Map. If the map does not show a safe delegation path, the work stops there; if it does, the first pilot has a clear boundary."
    items={actionFooterItems}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </ClearActionFooter>
</div>

<style>
  .home-pilot {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .home-pilot :global(.clear-platform-hero) {
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.04) 1px, transparent 1px) 0 0 / 4.25rem
        4.25rem,
      linear-gradient(180deg, var(--color-clear-panel, #ffffff) 0%, #fbfbfb 100%);
  }

  .home-pilot :global(.clear-platform-hero__kicker),
  .home-pilot :global(.clear-platform-hero__proof article) {
    background: rgba(255, 255, 255, 0.86);
  }

  .home-proof-stack {
    display: grid;
    gap: 0.85rem;
  }

  .home-pilot :global(.clear-platform-hero__proof span) {
    white-space: pre-line;
  }

  .home-pilot :global(.home-process-section) {
    padding-block: 3.35rem;
  }

  .home-pilot :global(.home-process-section .clear-page-section__copy) {
    max-width: 42rem;
    gap: 0.78rem;
  }

  .home-pilot :global(.home-process-section .clear-page-section__title) {
    max-width: 14ch;
    font-size: clamp(2.25rem, 4.5vw, 3.15rem);
    line-height: 1.02;
  }

  .home-pilot :global(.home-process-section .clear-page-section__description) {
    max-width: 38rem;
  }

  .home-pilot :global(.home-process-section .clear-page-section__after) {
    margin-top: 2rem;
  }

  .home-pilot :global(.home-process-section .clear-pillar) {
    min-height: 12.6rem;
    padding: 0.9rem;
  }

  .home-pilot :global(.home-process-section .clear-pillar strong),
  .home-pilot :global(.home-process-section .clear-pillar__title-link) {
    font-size: 1.04rem;
  }

  .home-pilot :global(.home-process-section .clear-pillar p) {
    font-size: 0.9rem;
    line-height: 1.42;
  }

  .home-pilot :global(.home-process-section .clear-pillar small) {
    font-size: 0.72rem;
  }

  @media (max-width: 640px) {
    .home-pilot :global(.clear-platform-hero__proof) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.62rem;
      margin-top: 1.4rem;
    }

    .home-pilot :global(.clear-platform-hero__proof article) {
      min-height: 5.45rem;
      padding: 0.72rem;
    }
  }
</style>
