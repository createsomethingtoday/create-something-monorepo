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
  title="Delegated Work Control | CREATE SOMETHING .agency"
  description="CREATE SOMETHING makes one business workflow safe to delegate: map the work, build the first safe lane, and keep the owner and receipt visible."
  keywords="delegated work control, workflow trust layer, governed workflow infrastructure, safe AI workflow delegation, agent workflow controls, workflow pilot, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one business workflow safe to hand to AI."
    description="Bring the workflow your team still watches by hand. CREATE SOMETHING maps the safe lane: what can run, what pauses for approval, what stops, who owns it, and what record proves the handoff."
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
    eyebrow="Atlas entry point"
    title="The map is the productized wedge."
    description="Atlas turns the workflow into an inspectable artifact: human tasks, AI tasks, system operations, source data, constraints, touchpoints, owners, stop conditions, and receipts."
  >
    {#snippet after()}
      <PublicAtlasStoryCanvas
        starterId="marketplace-review-queue"
        storyId="home-support-recovery-atlas-story"
        eyebrow="Workflow Trust Map"
        title="The map comes before the automation."
        description="This read-only Atlas canvas shows how a workflow becomes safe to discuss: source state, allowed action, approval owner, hard stop, and receipt surface."
        compact
      />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
    id="service-flow"
    variant="white"
    class="home-process-section"
    eyebrow="Service path"
    title="Map. Pilot. Control."
    description="The work stays narrow: first name the workflow, then prove one safe lane, then add the control layer only when live work needs it."
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
    description="Start with a Workflow Trust Map. If the map does not show a safe lane, the work stops there; if it does, the first pilot has a clear boundary."
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
