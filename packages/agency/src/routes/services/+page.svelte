<script lang="ts">
  import BuiltWork from '$lib/components/BuiltWork.svelte';
  import MembershipOffer from '$lib/components/MembershipOffer.svelte';
  import ProjectReviewEntry from '$lib/components/ProjectReviewEntry.svelte';
  import { Button, PerformanceCampaignOpening, PerformancePageSection, SEO } from '@create-something/canon';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import ServicesMapPreview from '$lib/components/ServicesMapPreview.svelte';
  import ServicesProductPath from '$lib/components/ServicesProductPath.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const mapProduct = getPublicProduct('map');
  const buildProduct = getPublicProduct('build');
  const controlProduct = getPublicProduct('control');

  const services = [
    { name: 'Agent engineering membership', description: 'Skills, workflow guidance, Slack support and weekly check-ins.', type: 'Membership', price: PUBLIC_PRICING.membership.label, priceDescription: PUBLIC_PRICING.membership.terms },
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
        'The membership provides skills, guidance and operator support for $900/month. Map, custom Build projects and managed Control remain separate paths for planning, implementation and live operations.'
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
    expression="editorial"
    title="Support for the work ahead."
    lede="Bring a task to automate or a product you have already built. Our $900/month membership helps you learn, troubleshoot and improve one workflow at a time. Custom implementation is scoped separately."
    media={playbookHeroMedia.services}
    mediaMobilePlacement="background"
    density="compact"
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
  </PerformanceCampaignOpening>

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

  <AgencyPerformanceReadback embedded={true} />

  <ServicesMapPreview />
</div>

<style>
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
