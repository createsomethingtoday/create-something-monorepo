<script lang="ts">
  import { Button, PerformanceCampaignOpening, SEO } from '@create-something/canon';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import ControlledWaterwayStory from '$lib/components/ControlledWaterwayStory.svelte';
  import ServicesMapPreview from '$lib/components/ServicesMapPreview.svelte';
  import ServicesProductPath from '$lib/components/ServicesProductPath.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';

  const mapProduct = getPublicProduct('map');
  const buildProduct = getPublicProduct('build');
  const controlProduct = getPublicProduct('control');

  const services = [
    {
      name: mapProduct.name,
      description: mapProduct.customerJob,
      type: 'Standalone product',
      price: 'Monthly / yearly',
      priceDescription: 'Pricing configured at launch'
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
      price: 'From $900/month',
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
        'Start with CREATE SOMETHING Map when the workflow still needs definition. Use CREATE SOMETHING Build for implementation, then CREATE SOMETHING Control when the workflow needs governed operation. Control includes Map.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'Agents can add operating capacity, but Control is not sold as a human-equivalent employee. There are no per-agent fees; the managed production environment and its accountable operating boundary are what you buy.'
    },
    {
      question: 'How are AI usage and new workflows billed?',
      answer:
        'AI usage stays in your account when practical or is separately metered and reported. At 75% of forecasted monthly coverage, we schedule a capacity review rather than an automatic charge. New workflows and integrations are separately scoped through CREATE SOMETHING Build.'
    },
    {
      question: 'Do we need to understand MCP first?',
      answer:
        'No. Bring the workflow and the accounts involved. I translate the technical choices into a stack boundary and implementation path.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, operating documentation, and approval authority.'
    }
  ];
</script>

<SEO
  title="AI Workflow Systems | How It Works"
  description="How CREATE SOMETHING turns one messy business handoff into a reliable AI-assisted workflow with connected tools, approvals, stop conditions, and an audit trail."
  keywords="AI workflow systems, workflow mapping, AI interaction design, governed AI workflow, workflow pilot, production automation, agent reliability"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="services-performance property-performance">
  <PerformanceCampaignOpening
    eyebrow="How It Works"
    title="Nothing gets built until the map says what it should do."
    lede="Bring one handoff your team still checks manually. We name the decision owner and the stop condition first, then build only what that map requires — before anything touches customers, money, or production."
    media={{
      src: '/images/performance-lab/trace-wake-natural.webp',
      mobileSrc: '/images/performance-lab/trace-wake-natural-mobile.webp',
      alt: 'Aerial black-and-white view of a survey craft leaving a directional wake'
    }}
    proof={[
      { label: 'Owner', value: 'Named' },
      { label: 'Protected action', value: 'Held' },
      { label: 'Evidence', value: 'Attached' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <ServicesProductPath />
  <AgencyPerformanceReadback embedded={true} />

  <section class="services-pipeline" aria-label="Controlled work pipeline">
    <ControlledWaterwayStory />
  </section>

  <ServicesMapPreview />
</div>

<style>
  .services-performance {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .services-pipeline {
    padding: clamp(2rem, 5vw, 4.5rem) clamp(1.25rem, 5vw, 6rem);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
  }

  .services-pipeline :global(.waterway) {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }
</style>
