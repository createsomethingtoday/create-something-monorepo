<script lang="ts">
  import {
    Button,
    ClearActionFooter,
    ClearPageSection,
    ClearPillarGrid,
    ClearPlatformHero,
    SEO,
    type ClearActionFooterItem,
    type ClearPillarItem,
    type ClearPlatformHeroProof
  } from '@create-something/canon';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow Map',
      description:
        'A fixed first map of the workflow, systems, AI tasks, approval path, and first controlled pilot.',
      type: 'First workflow map',
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
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing care for live AI-assisted work: approvals, release checks, blocked states, recovery notes, and review rhythm.',
      type: 'Operating Plan',
      price: 'Custom',
      priceDescription: 'Monthly control plan'
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
      question: 'What does CREATE SOMETHING build?',
      answer:
        'CREATE SOMETHING builds AI workflow systems for business operations: mapped handoffs, connected tools, scoped AI tasks, approval points, stop conditions, and audit trails.'
    },
    {
      question: 'What makes a workflow reliable?',
      answer:
        'A workflow becomes reliable when the team can see what can run, what needs approval, what must stop, who owns the decision, and what evidence stays visible.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'The work starts with one messy handoff your team still protects by hand, then maps the first controlled pilot before expanding automation.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'Clients leave with a visible workflow map, connected-system plan, approval path, run/wait/stop states, and an audit trail the team can inspect.'
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

  const serviceFlowPillars: ClearPillarItem[] = [
    {
      eyebrow: '01 Map',
      title: 'Name the work',
      detail:
        'Pick the support, revenue, production, or credential-touching handoff the team still protects by hand.',
      proof: 'Output: workflow map, owner, systems, and risk.',
      links: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      eyebrow: '02 Pilot',
      title: 'Build the lane',
      detail:
        'Turn that map into scoped actions, approval pauses, blocked states, and a surface the operator can inspect.',
      proof: 'Output: working path, runbook, and release evidence.',
      links: [{ label: 'See service path', href: '/services#service-path' }]
    },
    {
      eyebrow: '03 Control',
      title: 'Keep it governed',
      detail:
        'Add decision rules, least-privilege access, receipts, recovery notes, and accountable ownership when the lane goes live.',
      proof: 'Output: control plan for revenue, customer, or production risk.',
      links: [{ label: 'See stack boundary', href: '/stack' }]
    }
  ];

  const actionFooterItems: ClearActionFooterItem[] = [
    { label: 'Bring', value: 'One workflow your team still has to watch' },
    { label: 'Map', value: 'Systems, owner, allowed actions, pauses, and stops' },
    { label: 'Leave', value: 'A fixed-scope map before any build commitment' }
  ];
</script>

<SEO
  title="AI Workflow Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING turns one messy business handoff into a reliable AI-assisted workflow with connected tools, approvals, stop conditions, and an audit trail."
  keywords="AI workflow systems, workflow automation consultant, governed AI workflows, workflow trust layer, workflow mapping, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="AI workflow systems for business operations."
    description="Turn one messy handoff into a reliable AI-assisted workflow. CREATE SOMETHING maps the process, connects the tools, defines what AI can do, and gives your team approvals, stop conditions, and an audit trail."
    proofItems={heroProofItems}
    hideAsideOnMobile={true}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>Map one workflow</Button>
      <Button href="/products" variant="secondary">See proof</Button>
    {/snippet}

    {#snippet aside()}
      <HeroTrustArtifact />
    {/snippet}
  </ClearPlatformHero>

  <ClearPageSection
    variant="white"
    eyebrow="Workflow plan"
    title="See the workflow before we build it."
    description="Atlas turns the current process into a clear plan: the systems involved, where work moves, what AI can handle, where people approve, and what evidence proves the workflow ran correctly."
  >
    {#snippet after()}
      <PublicAtlasStoryCanvas
        starterId="marketplace-review-queue"
        storyId="home-support-recovery-atlas-story"
        eyebrow="Workflow map"
        title="The map comes before the automation."
        description="This read-only Atlas canvas shows the workflow in plain language: systems, allowed actions, decision owner, stop point, and audit trail."
        compact
      />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="service-flow"
    variant="white"
    class="home-process-section"
    eyebrow="Service path"
    title="Map the handoff. Build the pilot. Leave with control."
    description="The work stays narrow: first understand the handoff, then build one controlled pilot, then add operating rules only when live work needs them."
  >
    {#snippet after()}
      <ClearPillarGrid
        items={serviceFlowPillars}
        columns={3}
        ariaLabel="CREATE SOMETHING service flow"
      />
    {/snippet}
  </ClearPageSection>

  <ClearActionFooter
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a workflow map. If the map does not show a useful controlled pilot, the work stops there; if it does, the first build has a clear boundary."
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
      linear-gradient(90deg, rgba(10, 14, 25, 0.04) 1px, transparent 1px) 0 0 / 4.25rem 4.25rem,
      linear-gradient(180deg, var(--color-clear-panel, #ffffff) 0%, #fbfbfb 100%);
  }

  .home-pilot :global(.clear-platform-hero__kicker),
  .home-pilot :global(.clear-platform-hero__proof article) {
    background: rgba(255, 255, 255, 0.86);
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
