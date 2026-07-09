<script lang="ts">
  import {
    Button,
    ClearPageSection,
    SEO
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

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="How I Work"
  title="Map the workflow before deciding to build."
  description="Bring one real handoff your team still protects by hand. Atlas maps the signal, owner, AI boundary, approval pause, stop condition, and proof record before anything touches customers, money, production, or accounts."
>
  {#snippet actions()}
    <Button href="#atlas-warmup">
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  id="atlas-warmup"
  variant="soft"
  eyebrow="Map before booking"
  title="See the workflow before deciding to build."
  description="The public Atlas map turns one workflow into a first plan: the systems involved, which signals matter, what AI can handle, where people approve, and what proof records the outcome. It does not touch production systems."
>
  {#snippet after()}
    <PublicAtlasCanvas />
  {/snippet}
</ClearPageSection>
