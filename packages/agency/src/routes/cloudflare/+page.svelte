<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformancePageSection,
    SEO,
    type PerformanceCardItem,
    type PerformanceCtaItem,
    type PerformanceNarrativeScene
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
      eyebrow: 'Intelligence',
      icon: 'settings',
      title: 'OpenAI',
      detail: 'Model intelligence and agent execution behind CREATE SOMETHING-owned contracts.',
      href: '/stack'
    },
    {
      eyebrow: 'Owned operating layer',
      icon: 'document',
      title: 'Substrate',
      detail:
        'Source records, operator review, decisions, and receipts remain in the owned system.',
      href: '/products'
    },
    {
      eyebrow: 'Vendor boundary',
      icon: 'check',
      title: 'Stack',
      detail:
        'Ownership boundaries across Substrate, OpenAI, Cloudflare, client tools, account data, billing, tokens, and public proof.',
      href: '/stack'
    }
  ];

  const cloudflareScenes: PerformanceNarrativeScene[] = [
    {
      id: 'proof',
      label: 'Proof',
      summary: 'Routes, tools, evidence',
      title: 'The runtime earns its place through an owned delivery path.',
      detail:
        'Cloudflare carries deployable workflow infrastructure while account boundaries, control checks, durable state, and client-safe evidence remain explicit.',
      tone: 'allow',
      receipts: ['Workers + Pages', 'scoped MCP tools', 'control routes', 'review surfaces']
    },
    {
      id: 'flow',
      label: 'Flow',
      summary: 'Route → gate → prove',
      title: 'The runtime should be explainable before it becomes infrastructure.',
      detail:
        'Every path names where work enters, how risk is classified, where state persists, what may act, and which receipt returns.',
      tone: 'review',
      evidence: ['Route', 'Control gate', 'Durable state', 'Scoped action', 'Handoff evidence']
    },
    {
      id: 'ecosystem',
      label: 'Boundary',
      summary: 'One runtime role',
      title: 'Cloudflare is the runtime, not the whole operating model.',
      detail:
        'Intelligence, owned operating state, and vendor infrastructure stay separate so the workflow can be inspected, transferred, and recovered.',
      tone: 'neutral',
      actions: [
        { label: 'See what you keep', href: '/stack' },
        { label: 'Inspect the products', href: '/products' },
        { label: 'See the tool stack', href: '/partners' }
      ]
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
  description="Cloudflare is the deployable runtime for controlled workflow surfaces: routes, state, queues, approvals, scoped tool endpoints, and rollback-ready handoffs."
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

<PerformanceNarrativeStage
  id="cloudflare-runtime-story"
  eyebrow="One runtime story"
  title="Proof. Flow. Boundary."
  description="Cloudflare becomes legible as one controlled path: show what the runtime already carries, trace how work moves through it, and keep the surrounding ownership boundary explicit."
  scenes={cloudflareScenes}
  ariaLabel="Cloudflare runtime story"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    {#if scene.id === 'proof'}
      <PerformanceCardGrid items={proofCards} columns={4} ariaLabel="Cloudflare runtime proof" />
    {:else if scene.id === 'flow'}
      <PerformanceCardGrid items={runtimeFlow} columns={4} ariaLabel="Cloudflare runtime flow" />
    {:else}
      <PerformanceCardGrid
        items={ecosystemCards}
        columns={3}
        ariaLabel="Cloudflare ecosystem roles"
      />
      <p class="boundary-note">
        Public claims stay conservative: show readiness, proof, and client-safe evidence without
        implying official authorization before acceptance.
      </p>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Map the runtime"
  title="Bring the workflow that needs a controlled route."
  description="I’ll map the route, state, permissions, tool boundary, and evidence your team needs before a Cloudflare build becomes production work."
  steps={ctaItems}
  handoff={{
    owner: 'Runtime owner',
    authority: 'Controlled Cloudflare route',
    proof: 'Deploy note + rollback path',
    state: 'review'
  }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See what you keep</Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .boundary-note {
    max-width: 52rem;
    margin: 1rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.55;
  }
</style>
