<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceContrastChapter,
    PerformanceFieldSequence,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition,
    type PerformanceFieldStudyMetric,
    type PerformanceFieldStudyProof
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import PublicAtlasCanvas from '$lib/components/PublicAtlasCanvas.svelte';

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
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing care for live AI-assisted work: approvals, release checks, blocked states, recovery notes, and review rhythm.',
      type: 'Operating Plan',
      price: 'Custom',
      priceDescription: 'Monthly'
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
        'The first offer is a fixed-scope Workflow Map. Workflow Pilot follows only when the first controlled path is clear enough to build.'
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

  const readinessItems: PerformanceCondition[] = [
    {
      label: 'Boundary',
      title: 'Named',
      detail: 'Object, owner, allowed action, and stop condition before build',
      tone: 'signal'
    },
    {
      label: 'Pressure',
      title: 'Held',
      detail: 'Customer, money, production, and account-touching work pauses for proof',
      tone: 'pressure'
    },
    {
      label: 'Evidence',
      title: 'Attached',
      detail: 'Map, approval, runbook, and proof record travel with the pilot',
      tone: 'growth'
    }
  ];

  const pressureStudyMetrics: PerformanceFieldStudyMetric[] = [
    { label: 'Boundary', value: 'Named', detail: 'Allowed action, approval pause, and stop are explicit.' },
    { label: 'Pressure', value: 'Held', detail: 'Customer, money, production, and account work stay gated.' },
    { label: 'Recovery', value: 'Required', detail: 'The downstream path is visible before implementation.' }
  ];

  const pressureStudyProof: PerformanceFieldStudyProof = {
    id: 'SERVICE-METHOD-20260710',
    owner: 'CREATE SOMETHING',
    state: 'BOUNDARY NAMED',
    verified: '2026-07-10',
    version: 'v1',
    classification: 'Public service method'
  };
</script>

<SEO
  title="AI Workflow Systems | How I Work"
  description="How CREATE SOMETHING turns one messy business handoff into a reliable AI-assisted workflow with connected tools, approvals, stop conditions, and an audit trail."
  keywords="AI workflow systems, workflow mapping, AI interaction design, governed AI workflow, workflow pilot, production automation, agent reliability"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="services-performance property-performance">
  <PerformanceCampaignOpening
    eyebrow="How I Work"
    title="Map the workflow before deciding to build."
    lede="Bring one real handoff your team still protects by hand. Atlas maps the signal, owner, AI boundary, approval pause, stop condition, and proof record before anything touches customers, money, production, or accounts."
    media={{ src: '/images/performance-lab/pressure-boundary-natural.webp', mobileSrc: '/images/performance-lab/pressure-boundary-natural-mobile.webp', alt: 'Black-and-white wave impact against a concrete boundary' }}
    proof={[{ label: 'Boundary', value: 'Named' }, { label: 'Pressure', value: 'Held' }, { label: 'Evidence', value: 'Attached' }]}
  >
    {#snippet actions()}
      <Button href="#atlas-warmup">
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceFieldSequence
    eyebrow="Service condition"
    title="Governance is the channel, not the dam."
    studies={[{
      image: '/images/performance-lab/trace-wake-natural.webp',
      mobileImage: '/images/performance-lab/trace-wake-natural-mobile.webp',
      alt: 'Aerial black-and-white view of a survey craft leaving a directional wake.',
      title: 'Control the conditions.',
      description: 'The work does not stop moving. It enters a designed boundary where ownership, approval, evidence, and recovery make the next action reliable.',
      principle: 'Every action leaves a wake.',
      metrics: pressureStudyMetrics,
      proof: pressureStudyProof,
      stage: 'pressure-visible',
      mediaSide: 'right'
    }]}
  />

  <PerformanceThesisConditions
    title="Build only when the workflow is ready."
    description="The first map establishes the boundary, pressure gate, and evidence package before implementation begins."
    conditions={readinessItems}
    ariaLabel="Delegation readiness"
  />

  <div id="atlas-warmup">
  <PerformanceContrastChapter
    eyebrow="Map before booking"
    title="See the workflow before deciding to build."
    description="The public Atlas map turns one workflow into a first plan: the systems involved, which signals matter, what AI can handle, where people approve, and what proof records the outcome. It does not touch production systems."
    intervention={{ label: 'Read-only warmup', title: 'Public Atlas canvas', detail: 'Explore the operating path without touching production systems.' }}
    artifactPlacement="full-width"
  >
    {#snippet artifact()}
      <PublicAtlasCanvas />
    {/snippet}
  </PerformanceContrastChapter>
  </div>
</div>
