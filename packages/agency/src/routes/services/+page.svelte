<script lang="ts">
  import WorkflowSignalBand from '$lib/components/WorkflowSignalBand.svelte';
  import AgencyWayfindingHero from '$lib/components/AgencyWayfindingHero.svelte';
  import AgencyWayfindingOpening from '$lib/components/AgencyWayfindingOpening.svelte';
  import BuiltWork from '$lib/components/BuiltWork.svelte';
  import MembershipOffer from '$lib/components/MembershipOffer.svelte';
  import ProjectReviewEntry from '$lib/components/ProjectReviewEntry.svelte';
  import { Button, PerformanceCampaignOpening, PerformancePageSection, SEO } from '@create-something/canon';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import ServicesMapPreview from '$lib/components/ServicesMapPreview.svelte';
  import ServicesProductPath from '$lib/components/ServicesProductPath.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const mapProduct = getPublicProduct('map');
  const buildProduct = getPublicProduct('build');
  const controlProduct = getPublicProduct('control');

  const services = [
    { name: 'AI-native technical support membership', description: 'Recurring diagnosis, engineering improvements and learning support within an agreed scope.', type: 'Membership', price: PUBLIC_PRICING.membership.label, priceDescription: PUBLIC_PRICING.membership.terms },
    {
      name: mapProduct.name,
      description: mapProduct.customerJob,
      type: 'Standalone product',
      price: PUBLIC_PRICING.map.publicStarterLabel,
      priceDescription: PUBLIC_PRICING.map.workspaceLabel
    },
    {
      name: buildProduct.name,
      description: buildProduct.customerJob,
      type: 'Implementation service',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: controlProduct.name,
      description: controlProduct.customerJob,
      type: 'Managed AI Operations',
      price: PUBLIC_PRICING.managedControl.label,
      priceDescription: 'After launch; Control includes Map'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Audit-ready orchestration for regulated, high-volume, or multi-system workflows that need deterministic recovery.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation'
    }
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'We provide AI-native technical support: diagnosis, engineering improvements and help using what we deliver. Focused is $900/month for one workstream and one milestone, with two check-ins and two remote work sessions. Team is $2,500/month for up to two workstreams and two milestones, with two check-ins and four remote sessions. Larger Builds, managed Control and project costs are separate.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'Agents can help with tasks, but Control is not a replacement employee. You pay to manage the agreed live system, with no per-agent fees.'
    },
    {
      question: 'How are AI usage and new workflows billed?',
      answer:
        'AI usage stays in your account when practical or is separately metered and reported. At 75% of forecasted monthly coverage, we schedule a capacity review rather than an automatic charge. New workflows and integrations are separately scoped through CREATE SOMETHING Build.'
    },
    {
      question: 'Do we need to understand MCP first?',
      answer:
        'No. Bring the task and the tools you use. We explain the technical choices and agree on what to build.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'You retain your materials and approval authority. After full payment, you own commissioned code, workflows and documentation, except reusable provider tools licensed for continued use.'
    }
  ];
</script>

<SEO
  title="AI-native Technical Support | How It Works"
  description="Recurring technical support for your tools and workflows. We diagnose problems, engineer improvements and help your team use the result within an agreed scope."
  keywords="AI workflow systems, workflow mapping, AI interaction design, governed AI workflow, workflow pilot, production automation, agent reliability"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="services-performance property-performance">
  <div class="services-opening">
  <AgencyWayfindingOpening>
  <PerformanceCampaignOpening
    eyebrow="AI-native technical support"
    expression="editorial"
    title="Bring a workflow, software problem or existing product."
    lede="We diagnose problems, implement improvements and help your team use what we deliver. Focused is $900/month for one agreed workstream and one milestone. Team is $2,500/month for up to two workstreams and two milestones. Both include two check-ins; Focused has two remote work sessions and Team has four. Delivered code follows your agreement; reusable provider tools are licensed for continued use. Your team keeps approval authority. Managed Control starts at $900/month for agreed live operations under a separate agreement. Larger Builds and project costs are separate."
    density="compact"
    artifactMobilePlacement="flow"
    proof={[
      { label: 'Owner', value: 'Named' },
      { label: 'Protected action', value: 'Held' },
      { label: 'Evidence', value: 'Attached' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.membershipInquiryHref}>
        {agencyCoreMessaging.membershipInquiryLabel}
      </Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
    {#snippet artifact()}<AgencyWayfindingHero route="services" />{/snippet}
  </PerformanceCampaignOpening>
  </AgencyWayfindingOpening>
  </div>

  <WorkflowSignalBand motionOnly quiet tall />

  <BuiltWork />

  <MembershipOffer />

  <ProjectReviewEntry />

  <ServicesProductPath />
  <PerformancePageSection
    id="remote-support"
    eyebrow="Remote support"
    title="Get help where the problem happens."
    description="If a sign-in, local agent, or integration blocks your work, we can troubleshoot it together on your Mac."
    variant="white"
    layout="split"
    density="compact"
    ariaLabel="Remote support for client workflows"
  >
    <p>
      Remote support is available when needed within an agreed client engagement.
      Ask your CREATE SOMETHING contact to arrange a session. We confirm the task with you before connecting.
    </p>
    <p>
      Our current setup kit supports Apple Silicon Macs.
      Support scope and response times follow your agreement.
      We do not enable unattended access as part of this setup.
    </p>
    {#snippet aside()}
      <ol class="support-steps">
        <li>
          <h3>Set up once</h3>
          <p>We send a Mac setup kit. You install RustDesk and grant the screen-sharing permissions yourself.</p>
        </li>
        <li>
          <h3>Approve the session</h3>
          <p>Share a one-time password when we agree to connect. You approve account sign-ins and any new permissions.</p>
        </li>
        <li>
          <h3>Verify and close</h3>
          <p>We test the fix together and record what changed. Quit RustDesk when the session ends.</p>
        </li>
      </ol>
    {/snippet}
  </PerformancePageSection>

  <AgencyPerformanceReadback embedded={true} wayfinding />

  <ServicesMapPreview />
</div>

<style>
  .services-opening :global(.performance-campaign-opening[data-density='compact']) { min-height: 0; }
  .services-opening :global(.performance-campaign-opening[data-expression='editorial'][data-density='compact'] .performance-campaign-opening__content) { padding-bottom: var(--space-performance-xl); }

  .services-performance {
    background: var(--color-performance-paper, #f3f3f0);
  }
  .support-steps {
    display: grid;
    gap: 1.5rem;
    margin: 0;
    padding-left: 1.5rem;
  }

  .support-steps li {
    padding-left: 0.5rem;
  }

  .support-steps h3 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: var(--font-performance-semibold);
  }

  .support-steps p {
    margin: 0;
    color: var(--color-performance-muted);
    line-height: 1.6;
  }
</style>
