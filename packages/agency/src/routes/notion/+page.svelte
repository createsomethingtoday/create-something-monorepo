<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusCards: ClearCardItem[] = [
    {
      eyebrow: 'Primary',
      icon: 'users',
      title: 'Solutions Partner',
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
      title: 'Technology Partner',
      detail: 'Only after a public OAuth integration, docs, demo, support plan, and usage proof.'
    }
  ];

  const proofCards: ClearCardItem[] = [
    {
      eyebrow: 'Operating model',
      icon: 'folder',
      title: 'Agency Ops PM Cockpit',
      detail:
        'Notion is the PM and operator-facing layer while Linear stays the engineering tracker and canonical state stays outside Notion.'
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
        'A Notion-native human review layer with raw traces, costs, and evaluator output kept in external systems.'
    }
  ];

  const audienceCards: ClearCardItem[] = [
    {
      eyebrow: 'Operators',
      icon: 'user',
      title: 'Turn Notion into the reviewable operating layer.',
      detail:
        'Give PMs and client teams views for timelines, risks, decisions, evidence, and approved next actions.'
    },
    {
      eyebrow: 'Builders',
      icon: 'settings',
      title: 'Use Notion Workers only where they fit.',
      detail: 'Pilot narrow read-only Custom Agent tools before adding approved writes or managed syncs.'
    },
    {
      eyebrow: 'Teams',
      icon: 'users',
      title: 'Keep source-of-truth boundaries legible.',
      detail: 'Make it explicit what Notion owns, what Linear owns, and what canonical systems own.'
    }
  ];

  const routeSteps: ClearCardItem[] = [
    {
      eyebrow: 'Apply',
      icon: 'document',
      title: 'Solutions Partner first',
      detail: 'Lead with consulting, implementation, training, optimization, and measurable operating outcomes.'
    },
    {
      eyebrow: 'Publish',
      icon: 'upload',
      title: 'Template and builder proof',
      detail: 'Package sanitized systems for Agency Ops, agent evals, evidence review, and client updates.'
    },
    {
      eyebrow: 'Productize',
      icon: 'warning',
      title: 'Technology Partner readiness',
      detail: 'Wait for a public OAuth integration, public docs, a demo video, support plan, and usage evidence.'
    }
  ];

  const ecosystemCards: ClearCardItem[] = [
    {
      eyebrow: 'Agent runtime',
      icon: 'settings',
      title: 'Dify',
      detail: 'Client-facing agent workflows, eval gates, marketplace proof, and affiliate-ready adoption.',
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

  const complianceCards: ClearCardItem[] = [
    {
      eyebrow: 'Claim',
      icon: 'warning',
      title: 'No partner claim before acceptance',
      detail: 'No official Notion Partner or certified consultant claim before acceptance.'
    },
    {
      eyebrow: 'Integration',
      icon: 'warning',
      title: 'Technology Partner waits',
      detail: 'No Technology Partner claim until a public integration and Notion approval exist.'
    },
    {
      eyebrow: 'Privacy',
      icon: 'folder',
      title: 'No private workspace data',
      detail: 'No client-private records, live page IDs, raw traces, or credential references in public templates.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
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
      detail: 'What Notion owns, what Linear owns, and what production systems own.'
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
  title="Notion Partner Lane | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Notion operating systems for AI-enabled teams, with PM views, Worker automation, tool boundaries, and Policy OS control."
  keywords="Notion partner, Notion Solutions Partner, Notion operating systems, Notion Workers, Notion MCP, Policy OS"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Notion Partner Lane"
  title="Notion operating systems with controlled automation."
  description="CREATE SOMETHING designs Notion as the PM and operator layer for AI-enabled teams. The partner path is Solutions Partner first, template and builder proof second, and Technology Partner later."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/partners" variant="secondary">See Partner Stack</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid items={statusCards} columns={1} density="compact" ariaLabel="Notion status" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Proof"
  title="Notion is useful when the operating boundary is clear."
  description="The page should show where Notion helps humans inspect the workflow without pretending it owns every source of truth."
>
  {#snippet after()}
    <ClearCardGrid items={proofCards} columns={4} ariaLabel="Notion proof cards" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Audience"
  title="The workspace has to serve operators, builders, and teams."
  description="Each group needs a different level of visibility, but the source-of-truth boundaries stay explicit."
>
  {#snippet after()}
    <ClearCardGrid items={audienceCards} columns={3} ariaLabel="Notion audience fit" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Route"
  title="Consulting first, templates second, technology later."
  description="The partner path becomes credible when the implementation and template proof exist before a technology-partner claim."
>
  {#snippet after()}
    <ClearCardGrid items={routeSteps} columns={3} ariaLabel="Notion partner route" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Ecosystem"
  title="Notion is the workspace, not the whole stack."
  description="Dify, Cloudflare, and the stack boundary keep their own jobs so the operating model stays explainable."
>
  {#snippet after()}
    <ClearCardGrid items={ecosystemCards} columns={3} ariaLabel="Notion ecosystem lanes" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Compliance"
  title="Keep the public claim conservative."
  description="The lane can show readiness and proof without implying Notion approval or exposing client-private workspaces."
>
  {#snippet after()}
    <ClearCardGrid items={complianceCards} columns={3} ariaLabel="Notion compliance guardrails" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Map the workspace"
  title="Bring the Notion surface that needs an operating boundary."
  description="I’ll map what Notion should own, what the workflow should keep elsewhere, and which automation path is safe to test first."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}
</ClearCtaBand>
