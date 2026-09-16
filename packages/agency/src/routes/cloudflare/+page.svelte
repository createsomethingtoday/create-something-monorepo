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
        'Cloudflare can host the application, store its records, and queue tasks for later. We choose the services that fit the workflow.'
    },
    {
      eyebrow: 'Implementation proof',
      icon: 'settings',
      title: 'Remote MCP Fleet',
      detail:
        'An MCP server lets AI use approved tools. We check access tokens and keep each customer’s data separate.'
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
        'Cloudflare provides application hosting, data storage, and task queues. We connect these services to support the agreed workflow.'
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
      title: 'Choose hosting that your team can manage.',
      detail:
        'Cloudflare hosts the workflow. We document account ownership, permissions, stored records, and the steps to recover from a failed release.',
      tone: 'allow',
      receipts: ['Workers + Pages', 'scoped MCP tools', 'control routes', 'review surfaces']
    },
    {
      id: 'flow',
      label: 'Flow',
      summary: 'Route → gate → prove',
      title: 'Follow a task from start to result.',
      detail:
        'See how a task arrives, which checks it passes, what is saved, and what result comes back.',
      tone: 'review',
      evidence: ['Route', 'Control gate', 'Durable state', 'Scoped action', 'Handoff evidence']
    },
    {
      id: 'ecosystem',
      label: 'Boundary',
      summary: 'One runtime role',
      title: 'Understand what Cloudflare provides.',
      detail:
        'Your team can see which services provide AI, store records, and host the application. That helps you review, move, or recover the system.',
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
  description="CREATE SOMETHING builds Cloudflare-native workflow systems on Workers, Pages, and D1, with scoped tool surfaces and runtime control."
  keywords="Cloudflare workflow runtime, Cloudflare Workers, scoped tools, D1, workflow control, AI workflow infrastructure"
  ogImage="/og/cloudflare-lane.png"
  propertyName="agency"
  {faqItems}
/>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  expression="editorial"
  eyebrow="Cloudflare Workflow Runtime"
  title="Cloudflare runtime with controlled workflows."
  description="Cloudflare hosts the application, stores records, and runs background tasks. We build the workflow around your access rules and document how to undo a release."
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
  title="Hosting, storage, and background work in one place."
  description="See which services the workflow uses, how a task moves through them, and who owns the accounts."
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
  expression="editorial"
  eyebrow="Map the runtime"
  title="Bring the workflow that needs a controlled route."
  description="We’ll plan the task, permissions, and checks before launching it on Cloudflare."
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
