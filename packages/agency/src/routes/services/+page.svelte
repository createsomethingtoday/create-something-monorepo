<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceContrastChapter,
    PerformancePageSection,
    SEO
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';
  import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';

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
      type: 'Standalone product',
      price: 'Monthly / yearly',
      priceDescription: 'Control includes Map; pricing configured at launch'
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

  const familyCards = [
    {
      eyebrow: 'Standalone subscription',
      title: mapProduct.name,
      detail: mapProduct.outcome,
      href: mapProduct.route,
      points: ['Living workflow definition', 'Monthly or yearly', 'Useful without Build or Control']
    },
    {
      eyebrow: 'Implementation service',
      title: buildProduct.name,
      detail: buildProduct.outcome,
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Scoped implementation', 'Owned system and handoff', 'Quoted separately from software']
    },
    {
      eyebrow: 'Standalone subscription',
      title: controlProduct.name,
      detail: controlProduct.outcome,
      href: controlProduct.route,
      points: ['Control includes Map', 'Monthly or yearly', 'Inbox / Map / Proof']
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
        'They can be, when the workflow gives them a clear job, scoped tools, approval boundaries, named ownership, and evidence.'
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
    title="Map the workflow before deciding to build."
    lede="Bring one handoff your team still checks manually. We map the owner, systems, safe actions, approval point, stop condition, and evidence before anything touches customers, money, production, or accounts."
    media={{ src: '/images/performance-lab/trace-wake-natural.webp', mobileSrc: '/images/performance-lab/trace-wake-natural-mobile.webp', alt: 'Aerial black-and-white view of a survey craft leaving a directional wake' }}
    proof={[{ label: 'Boundary', value: 'Named' }, { label: 'Pressure', value: 'Held' }, { label: 'Evidence', value: 'Attached' }]}
  >
    {#snippet actions()}
      <Button href="#map-warmup">
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformancePageSection
    variant="white"
    eyebrow="Product and service path"
    title="Map -> Build -> Control"
    description="Map and Control are standalone subscriptions. Build is the implementation service between them when a team wants CREATE SOMETHING to turn the approved definition into an owned system. Control includes Map."
  >
    {#snippet after()}
      <PerformanceCardGrid items={familyCards} columns={3} ariaLabel="CREATE SOMETHING product and service family" />
    {/snippet}
  </PerformancePageSection>

  <div id="map-warmup">
  <PerformanceContrastChapter
    eyebrow="Map before booking"
    title="See the workflow before deciding to build."
    description="CREATE SOMETHING Map turns one workflow into a first plan: the systems involved, which signals matter, what AI can handle, where people approve, and what proof records the outcome. It does not touch production systems."
    intervention={{ label: 'Read-only warmup', title: 'Public Map canvas', detail: 'Explore the operating path without touching production systems.' }}
    artifactPlacement="full-width"
  >
    {#snippet artifact()}
      <PublicAtlasCanvas />
    {/snippet}
  </PerformanceContrastChapter>
  </div>
</div>
