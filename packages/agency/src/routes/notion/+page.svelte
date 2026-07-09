<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceCtaBand,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Primary',
      icon: 'users',
      title: 'Consulting path',
      detail: 'Consulting-led implementation, training, optimization, and ongoing support.'
    },
    {
      eyebrow: 'Proof',
      icon: 'document',
      title: 'Templates + Builders',
      detail: 'Sanitized Agency Ops, eval review, and evidence systems for public reuse.'
    },
    {
      eyebrow: 'Later',
      icon: 'warning',
      title: 'Integration path',
      detail: 'Only after a public OAuth integration, docs, demo, support plan, and usage proof.'
    }
  ];

  const proofCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Operating model',
      icon: 'folder',
      title: 'Agency Ops PM Cockpit',
      detail:
        'Notion is the PM and operator-facing layer for timelines, risks, decisions, and evidence while Linear and canonical systems keep their own ownership.'
    },
    {
      eyebrow: 'Developer surface',
      icon: 'document',
      title: 'Notion Workers Guide',
      detail:
        'A documented decision path for MCPs, Notion Worker Agent Tools, Syncs, hosted MCP, and the Notion CLI.'
    },
    {
      eyebrow: 'Implementation proof',
      icon: 'settings',
      title: 'Client Notion MCP Fleet',
      detail:
        'Multiple deployed Notion MCP surfaces show the cross-client integration pattern without exposing private records.'
    },
    {
      eyebrow: 'Template candidate',
      icon: 'check',
      title: 'Agent Evals And Review',
      detail:
        'A Notion-native human review layer with approved next actions visible and raw traces, costs, and evaluator output kept in external systems.'
    }
  ];

  const faqItems = [
    {
      question: 'What role should Notion play in AI workflow systems?',
      answer:
        'Notion should be the PM, capture, and operator-facing review layer. When a workflow needs API/MCP operation, source rows transfer into Substrate, the CREATE SOMETHING database layer, while Linear engineering state and external system records keep their own ownership.'
    },
    {
      question: 'When should Notion Workers or MCP be used?',
      answer:
        'Start with narrow read-only Custom Agent tools or MCP paths, then add approved writes or managed syncs only after ownership and review behavior are clear.'
    },
    {
      question: 'What does a Notion operating system need?',
      answer:
        'It needs visible timelines, risks, decisions, evidence, approved next actions, and explicit boundaries for what Notion owns versus other systems.'
    }
  ];

  const routeSteps: PerformanceCardItem[] = [
    {
      eyebrow: 'Apply',
      icon: 'document',
      title: 'Consulting first',
      detail:
        'Lead with consulting, implementation, training, optimization, and measurable operating outcomes.'
    },
    {
      eyebrow: 'Publish',
      icon: 'upload',
      title: 'Template and builder proof',
      detail:
        'Package sanitized systems for Agency Ops, agent evals, evidence review, and client updates.'
    },
    {
      eyebrow: 'Productize',
      icon: 'warning',
      title: 'Integration readiness',
      detail:
        'Wait for a public OAuth integration, public docs, a demo video, support plan, usage evidence, and approval before making official claims.'
    }
  ];

  const ecosystemCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Agent runtime',
      icon: 'settings',
      title: 'Dify',
      detail:
        'Client-facing agent workflows, MCP tool boundaries, eval gates, and readable evidence.',
      href: '/dify'
    },
    {
      eyebrow: 'Runtime substrate',
      icon: 'folder',
      title: 'Cloudflare',
      detail: 'Workers, Pages, D1, and hosted tool surfaces for workflows Notion makes reviewable.',
      href: '/cloudflare'
    },
    {
      eyebrow: 'Vendor boundary',
      icon: 'check',
      title: 'Stack',
      detail: 'Ownership boundaries across Notion, Dify, Cloudflare, tools, and client systems.',
      href: '/stack'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Workspace',
      icon: 'document',
      title: 'Operator view',
      detail: 'The page or database surface where humans inspect decisions.'
    },
    {
      label: 'Boundary',
      icon: 'check',
      title: 'Source of truth',
      detail:
        'What Notion owns, what transfers to Substrate, and what production systems own.'
    },
    {
      label: 'Automation',
      icon: 'settings',
      title: 'Worker or MCP path',
      detail: 'The smallest safe read or write path before broader automation.'
    }
  ];
</script>

<SEO
  title="Notion Review Workspace | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps Notion as the operator review workspace around AI-enabled work, with PM views, Worker automation, tool boundaries, and Policy OS control."
  keywords="Notion review workspace, Notion operating systems, Notion Workers, Notion MCP, Policy OS"
  ogImage="/og/notion-lane.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Notion Review Workspace"
  title="Notion workspaces for reviewable automation."
  description="CREATE SOMETHING maps Notion as the PM, capture, and operator layer around one workflow: what people inspect, what transfers into Substrate, what stays in source systems, and which automation path is safe to test first."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/partners" variant="secondary">See Workflow Tool Stack</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid items={statusCards} columns={1} density="compact" ariaLabel="Notion status" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Proof"
  title="Notion is useful when the operating boundary is clear."
  description="The page should show where Notion helps operators, builders, and teams inspect the workflow without pretending it owns every source of truth."
>
  {#snippet after()}
    <PerformanceCardGrid items={proofCards} columns={4} ariaLabel="Notion proof cards" />
    <ArticleVisualFigure
      src="/images/articles/notion-ops-workspace/notion-operator-workspace.png"
      alt="Diagram showing Notion as the operator workspace, with Linear, production systems, and policy evidence kept in their own source-of-truth boundaries."
      eyebrow="Generated visual"
      title="Notion is the reviewable workspace, not the whole system."
      caption="This owned diagram makes the workspace role concrete: Notion helps humans inspect timelines, risks, decisions, and evidence while source-of-truth systems keep their own ownership."
      sourceLabel="Created by CREATE SOMETHING for this workflow tool stack."
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Route"
  title="Consulting first, templates second, technology later."
  description="The public Notion path becomes credible when implementation, template proof, privacy boundaries, and support readiness exist before any integration approval claim."
>
  {#snippet after()}
    <PerformanceCardGrid items={routeSteps} columns={3} ariaLabel="Notion public route" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Ecosystem"
  title="Notion is the workspace, not the whole stack."
  description="Dify, Cloudflare, and the stack boundary keep their own jobs so the operating model stays explainable."
>
  {#snippet after()}
    <PerformanceCardGrid items={ecosystemCards} columns={3} ariaLabel="Notion ecosystem roles" />
  {/snippet}
</PerformancePageSection>

<PerformanceCtaBand
  eyebrow="Map the workspace"
  title="Bring the Notion surface that needs an operating boundary."
  description="I’ll map what Notion should own, what should transfer into Substrate, what stays elsewhere, and which automation path is safe to test first."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}
</PerformanceCtaBand>
