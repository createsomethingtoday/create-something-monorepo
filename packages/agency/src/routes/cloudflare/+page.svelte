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
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Primary',
      icon: 'settings',
      title: 'PowerUP Consult',
      detail: 'Architecture, implementation, controls, optimization, and delivery support.'
    },
    {
      eyebrow: 'Account',
      icon: 'users',
      title: 'Self-Serve Agency',
      detail:
        'Client account management, tenant administration, and centralized billing when needed.'
    },
    {
      eyebrow: 'Later',
      icon: 'warning',
      title: 'Technology Alliance',
      detail: 'Only after a public integration, docs, demo, support path, and usage proof exist.'
    }
  ];

  const proofCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Operating model',
      icon: 'folder',
      title: 'Cloudflare Runtime Stack',
      detail:
        'Workers, Pages, D1, queues, routes, and durable primitives carry the deployable workflow substrate for operators, builders, and agencies.'
    },
    {
      eyebrow: 'Implementation proof',
      icon: 'settings',
      title: 'Remote MCP Fleet',
      detail:
        'Cloudflare-hosted MCP endpoints expose scoped tools with bearer-token controls and tenant boundaries.'
    },
    {
      eyebrow: 'Control proof',
      icon: 'check',
      title: 'Control routes',
      detail:
        'Action previews, approval checks, blocked states, and evidence records sit before risky execution.'
    },
    {
      eyebrow: 'Delivery proof',
      icon: 'document',
      title: 'Client Review Surfaces',
      detail:
        'Pages and Workers support review builds, operator consoles, delivery updates, rollback-ready handoffs, and client-safe evidence.'
    }
  ];

  const faqItems = [
    {
      question: 'Why use Cloudflare for workflow systems?',
      answer:
        'Cloudflare Workers, Pages, D1, queues, routes, and durable primitives provide a deployable runtime substrate for controlled workflow paths.'
    },
    {
      question: 'What does CREATE SOMETHING add around Cloudflare?',
      answer:
        'CREATE SOMETHING adds scoped tool surfaces, bearer-token boundaries, control checks, durable records, and rollback-ready handoff evidence.'
    },
    {
      question: 'When should a workflow run on Cloudflare?',
      answer:
        'Use Cloudflare when the workflow needs owned runtime behavior, clear account boundaries, fast review surfaces, and evidence attached to execution.'
    }
  ];

  const runtimeFlow: PerformanceCardItem[] = [
    {
      eyebrow: '01 Route',
      icon: 'arrow-right',
      title: 'Cloudflare route',
      detail: 'Expose the workflow as a Worker, Pages route, or review surface with a clear owner.'
    },
    {
      eyebrow: '02 Gate',
      icon: 'check',
      title: 'Control check',
      detail:
        'Classify the action as allowed, approval-needed, blocked, or recoverable before execution.'
    },
    {
      eyebrow: '03 State',
      icon: 'folder',
      title: 'Durable record',
      detail:
        'Store request state, approvals, retries, and evidence in D1 or another durable primitive.'
    },
    {
      eyebrow: '04 Act',
      icon: 'settings',
      title: 'Tool or API call',
      detail:
        'Execute against scoped tools or APIs with tenant, account, and bearer boundaries intact.'
    },
    {
      eyebrow: '05 Prove',
      icon: 'document',
      title: 'Handoff evidence',
      detail: 'Return a reviewable result, rollback note, runbook update, or escalation path.'
    }
  ];

  const ecosystemCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Agent runtime',
      icon: 'settings',
      title: 'Dify',
      detail: 'Client-facing agent workflows and marketplace-ready agent packaging.',
      href: '/dify'
    },
    {
      eyebrow: 'Operator workspace',
      icon: 'document',
      title: 'Notion',
      detail: 'Workspace systems, templates, and reviewable operating receipts.',
      href: '/notion'
    },
    {
      eyebrow: 'Vendor boundary',
      icon: 'check',
      title: 'Stack',
      detail:
        'Ownership boundaries across Cloudflare, Dify, Notion, tools, delivery surfaces, account data, billing, tokens, and public proof.',
      href: '/stack'
    }
  ];

  const ctaItems: PerformanceCtaItem[] = [
    {
      label: 'Route',
      icon: 'arrow-right',
      title: 'Expose the workflow',
      detail: 'Worker, Pages route, or review surface with ownership named.'
    },
    {
      label: 'Gate',
      icon: 'check',
      title: 'Classify the action',
      detail: 'Allowed, approval-needed, blocked, or recoverable before execution.'
    },
    {
      label: 'Prove',
      icon: 'document',
      title: 'Attach the receipt',
      detail: 'Return the runbook, deploy note, rollback path, or client-safe evidence.'
    }
  ];
</script>

<SEO
  title="Cloudflare Workflow Runtime | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Cloudflare-native workflow systems with Workers, Pages, D1, scoped tool surfaces, and runtime control paths."
  keywords="Cloudflare workflow runtime, Cloudflare Workers, scoped tools, D1, workflow control, AI workflow infrastructure"
  ogImage="/og/cloudflare-lane.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Cloudflare Workflow Runtime"
  title="Cloudflare runtime with controlled workflows."
  description="Cloudflare is the deployable substrate for controlled workflow surfaces: routes, state, queues, approvals, scoped tool endpoints, and rollback-ready handoffs."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/partners" variant="secondary">See Workflow Tool Stack</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={statusCards}
      columns={1}
      density="compact"
      ariaLabel="Cloudflare workflow runtime status"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Runtime proof"
  title="The runtime carries routes, tools, and evidence."
  description="Cloudflare is strongest when workflow infrastructure needs ownership, durability, a reviewable delivery path, and clear account boundaries before anything runs."
>
  {#snippet after()}
    <PerformanceCardGrid items={proofCards} columns={4} ariaLabel="Cloudflare runtime proof" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Runtime flow"
  title="Route. Gate. State. Act. Prove."
  description="The operating model makes the Cloudflare layer easy to explain before it becomes a hidden infrastructure decision."
>
  {#snippet after()}
    <PerformanceCardGrid items={runtimeFlow} columns={4} ariaLabel="Cloudflare runtime flow" />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Ecosystem"
  title="Cloudflare is the runtime, not the whole operating model."
  description="The workflow tool stack works because each adjacent surface keeps a distinct role. Public claims stay conservative: show readiness, proof, and client-safe evidence without implying official authorization before acceptance."
>
  {#snippet after()}
    <PerformanceCardGrid items={ecosystemCards} columns={3} ariaLabel="Cloudflare ecosystem roles" />
  {/snippet}
</PerformancePageSection>

<PerformanceCtaBand
  eyebrow="Map the runtime"
  title="Bring the workflow that needs a controlled route."
  description="I’ll map the route, state, permissions, tool boundary, and evidence your team needs before a Cloudflare build becomes production work."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}
</PerformanceCtaBand>
