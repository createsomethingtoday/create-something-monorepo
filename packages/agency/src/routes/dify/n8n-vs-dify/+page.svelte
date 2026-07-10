<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem
  } from '@create-something/canon';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const timelineCards: PerformanceCardItem[] = [
    {
      eyebrow: 'n8n',
      icon: 'settings',
      title: 'Workflow automation phase',
      detail:
        'n8n was the right early tool when the job was wiring app triggers, API calls, notifications, and repeatable operations.'
    },
    {
      eyebrow: 'Cloudflare',
      icon: 'folder',
      title: 'Runtime ownership phase',
      detail:
        'Cloudflare became necessary when workflows needed deployable endpoints, tenant boundaries, queues, D1 state, auth, and rollback paths.'
    },
    {
      eyebrow: 'Dify',
      icon: 'user',
      title: 'Client agent phase',
      detail:
        'Dify became first-class when the workflow needed a usable agent surface with chat, app publishing, MCP tools, and eval coverage.'
    }
  ];

  const layerFit: PerformanceCardItem[] = [
    {
      eyebrow: 'Internal workflow',
      icon: 'settings',
      title: 'Use n8n when the workflow is internal.',
      detail:
        'It is still strong for deterministic automations, app-to-app movement, webhook or schedule triggers, and operator-managed workflow logic.'
    },
    {
      eyebrow: 'Infrastructure',
      icon: 'folder',
      title: 'Use Cloudflare when the workflow becomes infrastructure.',
      detail:
        'It owns runtime behavior: routes, state, queues, permissions, observability, tenant boundaries, and durable recovery.'
    },
    {
      eyebrow: 'Agent surface',
      icon: 'user',
      title: 'Use Dify when the workflow becomes an agent app.',
      detail:
        'It gives clients and operators a direct agent surface while MCP carries the tool boundary and the repo carries evidence.'
    }
  ];

  const decisionCards: PerformanceCardItem[] = [
    {
      eyebrow: 'n8n',
      icon: 'settings',
      title: 'Internal app-to-app automation',
      detail: 'Scheduled syncs, routing, notifications, and operator-owned workflow logic.'
    },
    {
      eyebrow: 'Cloudflare',
      icon: 'folder',
      title: 'Production runtime ownership',
      detail: 'Custom endpoints, auth, queues, tenant boundaries, observability, and durable state.'
    },
    {
      eyebrow: 'Dify',
      icon: 'user',
      title: 'Client-facing agent UI',
      detail: 'Published agent apps with governed MCP tool access and usable operator surfaces.'
    },
    {
      eyebrow: 'Repo + Policy OS',
      icon: 'document',
      title: 'Portable evidence',
      detail:
        'Prompts, Dify DSL snapshots, MCP inventory, eval gates, release evidence, and policy artifacts.'
    }
  ];

  const migrationCards: PerformanceCardItem[] = [
    {
      eyebrow: '01',
      icon: 'search',
      title: 'Name the layer',
      detail:
        'Is the workflow internal automation, production infrastructure, or a client agent surface?'
    },
    {
      eyebrow: '02',
      icon: 'settings',
      title: 'Keep n8n where it fits',
      detail:
        'Keep n8n workflows when the value is app-to-app movement and the operator owns the runbook.'
    },
    {
      eyebrow: '03',
      icon: 'folder',
      title: 'Move runtime-critical paths',
      detail:
        'Use Cloudflare when auth, state, queues, tenant boundaries, or rollback paths matter.'
    },
    {
      eyebrow: '04',
      icon: 'user',
      title: 'Package client-facing agents in Dify',
      detail: 'Use Dify when users need chat, app publishing, MCP tools, and usable access.'
    }
  ];

  const sourceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'n8n',
      icon: 'external-link',
      title: 'n8n integrations',
      detail: 'Documentation for available integration surfaces.',
      href: 'https://docs.n8n.io/integrations/'
    },
    {
      eyebrow: 'n8n',
      icon: 'external-link',
      title: 'n8n MCP access',
      detail: 'Documentation for exposing n8n workflows through MCP.',
      href: 'https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Dify app concepts',
      detail: 'Documentation for Dify app concepts and workflow surfaces.',
      href: 'https://docs.dify.ai/en/use-dify/getting-started/key-concepts'
    },
    {
      eyebrow: 'Dify',
      icon: 'external-link',
      title: 'Dify MCP tools',
      detail: 'Documentation for connecting MCP tools inside Dify.',
      href: 'https://docs.dify.ai/en/use-dify/build/mcp'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Automate',
      icon: 'settings',
      title: 'n8n',
      detail: 'Internal workflow logic and app-to-app movement.'
    },
    {
      label: 'Operate',
      icon: 'folder',
      title: 'Cloudflare',
      detail: 'Runtime ownership, state, auth, and rollback paths.'
    },
    {
      label: 'Surface',
      icon: 'user',
      title: 'Dify',
      detail: 'Agent app, MCP tool access, and operator-facing experience.'
    }
  ];
</script>

<SEO
  title="Dify vs n8n | Agent Apps vs Automation"
  description="A practical comparison of n8n, Cloudflare, and Dify: workflow automation, runtime ownership, and client-facing agent apps."
  keywords="Dify vs n8n, n8n vs Dify, workflow automation vs agent apps, Dify MCP, n8n MCP, AI workflow automation"
  canonical="https://createsomething.agency/dify/n8n-vs-dify"
  ogType="article"
  ogImage="/og/dify-vs-n8n.png"
  publishedTime="2026-05-18"
  modifiedTime="2026-06-22"
  articleSection="Dify Implementation"
  articleTags={['Dify', 'n8n', 'workflow automation', 'agent apps', 'MCP']}
  propertyName="agency"
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Dify vs n8n"
  title="The question is what layer the workflow has become."
  description="n8n was useful when the work was internal automation. Cloudflare became necessary when workflows needed production runtime ownership. Dify became first-class when clients needed a clean agent interface with governed MCP access."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowTeardownHref}>
      {agencyCoreMessaging.workflowTeardownLabel}
    </Button>
    <Button href="/dify" variant="secondary">Back To Dify</Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={timelineCards}
      columns={1}
      density="compact"
      ariaLabel="Workflow layer timeline"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Layer fit"
  title="The stack changed because the job changed."
  description="A workflow that starts as an internal automation can become a production route, then a client-facing agent product. Each shift changes the best tool."
>
  {#snippet after()}
    <PerformanceCardGrid items={layerFit} columns={3} ariaLabel="Dify n8n layer fit" />
    <ArticleVisualFigure
      src="/images/articles/dify-vs-n8n/dify-n8n-layer-map.png"
      alt="Layer map comparing n8n for internal automation, Cloudflare for runtime ownership, Dify for client-facing agent surfaces, and Policy OS for governance."
      eyebrow="Generated visual"
      title="Choose the tool by the operating layer."
      caption="This owned layer map keeps the comparison from becoming a winner-take-all ranking: n8n, Cloudflare, Dify, MCP, and Policy OS each have a different job."
      sourceLabel="Created by CREATE SOMETHING for this article."
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Decision map"
  title="Choose the tool by the operating layer."
  description="The practical comparison is not a winner-take-all ranking. It is a map of where the workflow should live."
>
  {#snippet after()}
    <PerformanceCardGrid items={decisionCards} columns={4} ariaLabel="Dify n8n decision map" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Migration"
  title="Move only the part of the workflow that changed."
  description="The safest migration keeps internal automation, runtime ownership, agent surface, and policy evidence separate."
>
  {#snippet after()}
    <PerformanceCardGrid items={migrationCards} columns={4} ariaLabel="Dify n8n migration path" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Sources"
  title="The recommendation is grounded in the tool surfaces."
  description="The docs show why n8n is strongest as workflow automation and Dify is strongest as an agent app surface."
>
  {#snippet after()}
    <PerformanceCardGrid items={sourceCards} columns={4} ariaLabel="Dify n8n source notes" />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Next step"
  title="Map the layer before changing tools."
  description="Bring the workflow and I’ll identify whether it should stay internal automation, move to runtime infrastructure, or become a governed agent app."
  steps={ctaItems}
  handoff={{ owner: 'Workflow owner', authority: 'Layer decision', proof: 'Mapped automation boundary', state: 'review' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/dify/agent-eval-gates" variant="secondary">Read Eval Gates</Button>
    <Button href="/dify/mcp-control-plane" variant="secondary">Read Control Plane</Button>
  {/snippet}
</PerformanceConversionHandoff>
