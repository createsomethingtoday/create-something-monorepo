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
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const channelRoles: ClearCardItem[] = [
    {
      eyebrow: 'Canonical',
      icon: 'document',
      title: 'Agency page portfolio',
      detail:
        'Dify guides, internal links, proof summaries, route decisions, and next steps live on the CREATE SOMETHING site.'
    },
    {
      eyebrow: 'Distribution',
      icon: 'mail',
      title: 'Distribution notes',
      detail:
        'Short notes summarize one idea, point back to the canonical page, and collect reader questions.'
    },
    {
      eyebrow: 'Discovery',
      icon: 'share',
      title: 'Social and video clips',
      detail:
        'Native snippets and demos create reach, but the explanation and next step resolve to the canonical page.'
    }
  ];

  const targets: ClearCardItem[] = [
    {
      eyebrow: '30 days',
      icon: 'calendar',
      title: '4 canonical posts',
      detail: 'Every page has a clear job, internal route, CTA, and evidence hook.'
    },
    {
      eyebrow: '90 days',
      icon: 'calendar',
      title: '8-12 canonical posts',
      detail: 'Each support page links back to the Dify pillar and one next action.'
    },
    {
      eyebrow: '6 months',
      icon: 'calendar',
      title: 'Search-ready cluster',
      detail: 'The portfolio scores route strength, schema, internal links, copy quality, and sitemap state.'
    },
    {
      eyebrow: '12 months',
      icon: 'calendar',
      title: 'Archive or route review',
      detail: 'Thin, stale, duplicate, or off-language pages get routed, repaired, or archived.'
    }
  ];

  const contentCluster: ClearCardItem[] = [
    {
      eyebrow: 'Builders',
      icon: 'document',
      title: 'Dify + MCP Control Plane',
      detail: 'Dify is the surface. MCP is the boundary.',
      href: '/dify/mcp-control-plane'
    },
    {
      eyebrow: 'Operators',
      icon: 'check',
      title: 'Dify Agent Eval Gates',
      detail: 'The evals that make Dify safer to operate.',
      href: '/dify/agent-eval-gates'
    },
    {
      eyebrow: 'Teams',
      icon: 'settings',
      title: 'Ship A Dify App With MCP Tools',
      detail: 'A practical shipping checklist for Dify plus MCP.',
      href: '/dify/ship-dify-app-with-mcp-tools'
    },
    {
      eyebrow: 'Comparison',
      icon: 'search',
      title: 'Dify vs n8n',
      detail: 'The job changed: n8n for workflows, Dify for agent apps.',
      href: '/dify/n8n-vs-dify'
    }
  ];

  const strengthSignals: ClearCardItem[] = [
    {
      eyebrow: 'Job',
      icon: 'check',
      title: 'One page, one purpose',
      detail: 'The page declares its audience, funnel stage, route decision, and primary action.'
    },
    {
      eyebrow: 'Evidence',
      icon: 'document',
      title: 'Proof before claims',
      detail: 'The page points to concrete maps, gates, checklists, receipts, or shipping steps.'
    },
    {
      eyebrow: 'Language',
      icon: 'warning',
      title: 'Plain words win',
      detail: 'The page explains workflow, owner, approval, stop point, audit trail, and runbook.'
    }
  ];

  const operatingLoop: ClearCardItem[] = [
    {
      eyebrow: '01',
      icon: 'upload',
      title: 'Publish the canonical page first',
      detail: 'The agency site owns the explanation, proof summary, route, and next step.'
    },
    {
      eyebrow: '02',
      icon: 'arrow-right',
      title: 'Link the cluster together',
      detail: 'Keep the Dify pillar, control model, eval gates, shipping guide, and comparison connected.'
    },
    {
      eyebrow: '03',
      icon: 'warning',
      title: 'Keep claims grounded',
      detail: 'Public language should describe what the workflow does and what evidence exists.'
    },
    {
      eyebrow: '04',
      icon: 'document',
      title: 'Review page strength',
      detail: 'Score the page for schema, links, terms, CTA, sitemap state, and plain language.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Canonical',
      icon: 'document',
      title: 'Own the source of truth',
      detail: 'The agency domain carries the proof and next step.'
    },
    {
      label: 'Route',
      icon: 'mail',
      title: 'Send readers forward',
      detail: 'Every page points to the next useful explanation or action.'
    },
    {
      label: 'Measure',
      icon: 'check',
      title: 'Track the routing',
      detail: 'Scores make weak pages visible before they drift.'
    }
  ];
</script>

<SEO
  title="Dify Page Portfolio | CREATE SOMETHING .agency"
  description="CREATE SOMETHING keeps Dify marketing pages clear, routed, scored, and aligned with workflow-first language."
  keywords="Dify content system, Dify page portfolio, Dify workflow pages, Dify MCP content, Dify SEO"
  canonical="https://createsomething.agency/dify/content-engine"
  ogType="article"
  ogImage="/og/dify-content-engine.svg"
  publishedTime="2026-05-18"
  modifiedTime="2026-06-22"
  articleSection="Dify Page Portfolio"
  articleTags={['Dify', 'page portfolio', 'content strategy', 'MCP']}
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify Page Portfolio"
  title="Each Dify page should have one clear job."
  description="The agency domain owns the canonical explanation, proof, route, and next step. Distribution channels point readers back to that source of truth."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.governanceChecklistHref}>
      {agencyCoreMessaging.governanceChecklistLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify</Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={channelRoles}
      columns={1}
      density="compact"
      ariaLabel="Dify content channel roles"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Channel split"
  title="Each surface has one job."
  description="Canonical pages, distribution notes, and discovery clips should reinforce each other without confusing the source of truth."
>
  {#snippet after()}
    <ClearCardGrid items={channelRoles} columns={3} ariaLabel="Dify content channel split" />
    <ArticleVisualFigure
      src="/images/articles/dify-content-engine/content-engine-funnel.svg"
      alt="Diagram showing the CREATE SOMETHING site as the canonical content hub, with distribution notes and discovery clips routing readers back to owned proof and next steps."
      eyebrow="Original visual"
      title="The canonical page owns proof, disclosure, and routing."
      caption="This owned diagram makes the page system visible: long-form proof lives on the agency domain, distribution channels point back to it, and route strength stays measurable."
      sourceLabel="Created by CREATE SOMETHING for this article."
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Content cluster"
  title="Start with pieces that explain the operating model."
  description="The cluster should teach Dify plus MCP, eval gates, app packaging, delivery evidence, and practical comparison before asking for a purchase."
>
  {#snippet after()}
    <ClearCardGrid items={contentCluster} columns={4} ariaLabel="Dify content cluster" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Targets"
  title="The content engine has measurable milestones."
  description="Milestones should measure whether the cluster is clear, connected, and strong enough to stay indexable."
>
  {#snippet after()}
    <ClearCardGrid items={targets} columns={4} ariaLabel="Dify content targets" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Strength"
  title="A strong page earns its route."
  description="The registry should make weak, redundant, stale, or off-language pages easy to repair or remove."
>
  {#snippet after()}
    <ClearCardGrid items={strengthSignals} columns={3} ariaLabel="Dify page strength signals" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Operating loop"
  title="Publish, link, ground, and score."
  description="The content workflow is a control path, not just a publishing cadence."
>
  {#snippet after()}
    <ClearCardGrid items={operatingLoop} columns={4} ariaLabel="Dify content operating loop" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Next"
  title="Use content to clarify the workflow, not hide it."
  description="If the reader has a concrete Dify workflow, the next step is to map the workflow, tool boundary, approval path, and evidence."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
    <Button href="/dify/ship-dify-app-with-mcp-tools" variant="secondary">Read Shipping Guide</Button>
    <Button href="/dify/n8n-vs-dify" variant="secondary">Read Dify vs n8n</Button>
  {/snippet}
</ClearCtaBand>
