<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    ClearQuoteMetricPanel,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearProofItem,
    type ClearQuoteMetric
  } from '@create-something/canon';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type ProofStateIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProofStateItem = ClearProofItem & { icon: ProofStateIconName };

  const featured = products.filter((product) => product.category === 'featured');
  const methodAndFramework = products.filter(
    (product) => product.category === 'framework' || product.category === 'developer-tools'
  );
  const integrations = products.filter((product) => product.category === 'integration');
  const clientWork = products.filter((product) => product.category === 'client');

  const proofReadingCards: ClearCardItem[] = [
    {
      eyebrow: 'Receipts',
      icon: 'document',
      title: 'Receipts show the operating result',
      detail:
        'Read the artifacts as receipts: what changed, what was verified, what stayed private, and what still needs an owner.'
    },
    {
      eyebrow: 'Primitives',
      icon: 'settings',
      title: 'Tools show the method',
      detail:
        'Ground, Loom MCP, and connector work expose the control principles before they become a client-specific workflow.'
    },
    {
      eyebrow: 'Boundary',
      icon: 'check',
      title: 'The service adds judgment states',
      detail:
        'The paid work turns proof primitives into run, wait, and stop paths your operator can inspect.'
    },
    {
      eyebrow: 'Funnel',
      icon: 'plus',
      title: 'Start by mapping the first workflow',
      detail:
        'Use proof as evidence for the method, then map the first controlled point for your own system.'
    }
  ];

  const faqItems = [
    {
      question: 'What counts as proof?',
      answer:
        'Proof means delivery records, tools, connectors, and client builds that show what changed, what was verified, what stayed private, who owns the decision, and what still needs an owner.'
    },
    {
      question: 'Why are Ground and Loom MCP included?',
      answer:
        'Ground shows the verify-before-claiming discipline, while Loom MCP shows why long-running agent work needs ownership, checkpoints, and handoff evidence.'
    },
    {
      question: 'How does proof become a client workflow?',
      answer:
        'The paid work turns proof primitives into scoped actions, approval states, blocked-state receipts, and an operating path the client can inspect.'
    }
  ];

  const proofLedger: ClearCardItem[] = [
    {
      eyebrow: 'Business signal',
      icon: 'folder',
      title: 'Delivery records use the same service path',
      detail:
        'Abundance and ShivWorks show the repeatable pattern: business model, access boundary, visible status, private evidence, and next owner decision.',
      points: [
        'Visible: status, decisions, handoff, next action',
        'Private: credentials, logs, raw client data, sensitive proof'
      ]
    },
    {
      eyebrow: 'Control signal',
      icon: 'check',
      title: 'Proof names what can run, wait, or stop',
      detail:
        'The service does not sell generic autonomy. Each workflow gets action boundaries, approval-needed states, and blocked-state receipts.',
      points: [
        'Run: bounded work can proceed',
        'Wait: owner approval is required',
        'Stop: reason-coded handoff is preserved'
      ]
    },
    {
      eyebrow: 'Ownership signal',
      icon: 'user',
      title: 'Clients keep account and approval authority',
      detail:
        'Proof is useful only when ownership stays clear: source accounts, business context, final decisions, and sensitive evidence remain under the right owner.',
      points: ['Account access stays scoped', 'Approval authority stays named']
    },
    {
      eyebrow: 'Transfer signal',
      icon: 'document',
      title: 'Handoff notes survive the build',
      detail:
        'Runbooks, validation output, release notes, and rollback paths make the workflow understandable after launch.',
      points: ['Evidence travels with the work', 'The next operator can inspect the path']
    }
  ];

  const proofStripItems: ProofStateItem[] = [
    {
      icon: 'actions',
      value: 'Run',
      label: 'Bounded work can proceed with named objects, actions, and receipts.'
    },
    {
      icon: 'states',
      value: 'Wait',
      label: 'Revenue, customer-trust, or production impact pauses for owner approval.'
    },
    {
      icon: 'objects',
      value: 'Stop',
      label: 'Out-of-lane work creates a reason-coded handoff instead of pretending to finish.'
    },
    {
      icon: 'receipts',
      value: 'Receipt',
      label: 'Commands, decisions, links, deploy IDs, and rollback notes stay with the work.'
    }
  ];

  const proofPathItems = [
    {
      label: 'Connect',
      detail: 'Name the system, account owner, and authority boundary.'
    },
    {
      label: 'Verify',
      detail: 'Check the claim with commands, traces, screenshots, or live status.'
    },
    {
      label: 'Coordinate',
      detail: 'Keep ownership, status, and evidence in Linear before the next handoff.'
    },
    {
      label: 'Control',
      detail: 'Ship the run, wait, stop, and rollback paths the operator can inspect.'
    }
  ];

  const proofMetrics: ClearQuoteMetric[] = [
    {
      value: '2',
      label: 'delivery records',
      detail: 'Abundance and ShivWorks show business-readable handoff and evidence surfaces.'
    },
    {
      value: '4',
      label: 'control states',
      detail: 'Run, wait, stop, and receipt are visible before broader automation is allowed.'
    },
    {
      value: '0',
      label: 'secret-bearing proof exposed',
      detail: 'Public pages show status and artifacts while private evidence stays behind owner lanes.'
    },
    {
      value: '1',
      label: 'workflow first',
      detail: 'The service starts with one business workflow rather than a generic agent demo.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Connect',
      icon: 'plus',
      title: 'Identify the first connection',
      detail: 'Name the safest connection point before expanding authority.'
    },
    {
      label: 'Verify',
      icon: 'check',
      title: 'Define the proof surface',
      detail: 'Decide what evidence proves the workflow worked or stopped correctly.'
    },
    {
      label: 'Control',
      icon: 'settings',
      title: 'Add the control layer',
      detail: 'Turn the primitive into approval states, blocked states, and operator briefs.'
    }
  ];

  function productCard(product: Product): ClearCardItem {
    const points = [product.tagline, product.npmPackage, product.client, product.timeline].filter(
      Boolean
    ) as string[];
    const icon =
      product.category === 'integration'
        ? 'plus'
        : product.category === 'client'
          ? 'folder'
          : product.category === 'featured'
            ? 'check'
            : 'settings';

    return {
      eyebrow: product.badge ?? product.category,
      icon,
      title: product.title,
      detail: product.description,
      href: product.href,
      points: points.length ? points : undefined
    };
  }

  function proofStateIcon(icon: string | undefined): ProofStateIconName {
    if (icon === 'objects' || icon === 'actions' || icon === 'states' || icon === 'receipts') {
      return icon;
    }

    return 'receipts';
  }
</script>

<SEO
  title="Proof and Receipts | CREATE SOMETHING .agency"
  description="Proof behind CREATE SOMETHING .agency: delivery records, tools, connectors, and client builds that show how AI workflow systems become inspectable."
  keywords="AI workflow systems proof, workflow control layer proof, workflow audit trails, MCP servers, grounded AI code analysis, workflow controls, operator surfaces"
  ogImage="/og-image.svg"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Proof"
  title="See the delivery record before the framework."
  description="The useful proof is business-readable first: what changed, what was controlled, what stayed private, what the client kept, and which decision still belongs to an owner."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}

  {#snippet aside()}
    <ClearCardGrid
      items={proofLedger}
      columns={1}
      density="compact"
      ariaLabel="Client delivery proof signals"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Client delivery records"
  title="Lead with what survived real delivery."
  description="Abundance and ShivWorks show the client-facing sequence: what changed, what was controlled, what stayed private, what the client kept, and what decision came next."
>
  {#snippet after()}
    <ClearCardGrid items={proofLedger} columns={4} ariaLabel="Business proof ledger" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="AI workflow systems proof"
  title="Then show the run, wait, stop, and receipt states."
  description="Every artifact on this page helps the decision owner understand what can run, what waits, what stops, who owns the decision, and which receipt proves it."
>
  {#snippet after()}
    <ClearProofStrip items={proofStripItems} ariaLabel="Workflow proof states">
      {#snippet icon(item)}
        <WorkflowSignalIcon name={proofStateIcon(item.icon)} />
      {/snippet}
    </ClearProofStrip>

    <div class="proof-path" aria-label="Inspectable workflow path">
      {#each proofPathItems as step, index}
        <article class="proof-path__item">
          <span class="proof-path__index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </div>
        </article>
      {/each}
    </div>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Proof canvas"
  title="Proof becomes useful when the map shows the commitment boundary."
  description="A receipt is not just a log. It names what can run, what waits for judgment, what must stop, and what evidence lets the next owner trust the handoff."
>
  {#snippet after()}
    <PublicAtlasStoryCanvas
      starterId="construction-rfi-submittal-control"
      storyId="products-construction-proof-story"
      eyebrow="Proof canvas"
      title="The receipt matters because the commitment boundary is visible."
      description="This read-only map shows proof as an operating path: collect evidence, route the packet, draft support, preserve human judgment, and stop before scope or contract commitment."
      compact
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="How to read this page"
  title="Tools are evidence. The service is the operating path."
  description="The free and open tools show the discipline underneath the service: grounded claims, agent continuity, constrained access, and evidence-backed decisions. The paid work turns those primitives into one delegated workflow your operator can trust."
>
  {#snippet after()}
    <ClearCardGrid items={proofReadingCards} columns={4} ariaLabel="How to read proof" />
  {/snippet}
</ClearPageSection>

<ClearQuoteMetricPanel
  eyebrow="Proof metrics"
  quote="Proof stays useful when it names what ran, what waited, and what stopped."
  source="CREATE SOMETHING .agency delegated-work control model"
  metrics={proofMetrics}
  ariaLabel="Workflow proof metrics"
/>

<ClearPageSection
  variant="white"
  eyebrow="Framework and tool proof"
  title="Open-source proof sits below the delivery record."
  description="Ground checks claims, Loom MCP shows why agent work needs ownership and handoff evidence, and connector work shows how capability becomes constrained access."
>
  {#snippet after()}
    <ClearCardGrid
      items={featured.map(productCard)}
      columns={2}
      ariaLabel="Flagship proof surfaces"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Method and control primitives"
  title="Framework tools make the delivery philosophy inspectable."
  description="These tools show the rules underneath the service before they become client workflow systems."
>
  {#snippet after()}
    <ClearCardGrid
      items={methodAndFramework.map(productCard)}
      columns={3}
      ariaLabel="Method and framework proof surfaces"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Connection tools"
  title="Connections prove the path first."
  description="When the workflow becomes strategic, the same connection can graduate into approvals, blocked states, and operator briefs."
>
  {#snippet after()}
    <ClearCardGrid
      items={integrations.map(productCard)}
      columns={3}
      ariaLabel="Connection MCPs"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Client workflow evidence"
  title="Real systems move from integration work into operating visibility."
  description="Selected builds show how code, runbooks, policy, handoffs, and evidence turn into work an operator can understand."
>
  {#snippet after()}
    <ClearCardGrid
      items={clientWork.map(productCard)}
      columns={2}
      ariaLabel="Client workflow evidence"
    />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Apply the proof"
  title="Apply the proof to the workflow your team still protects by hand."
  description="I’ll map the first workflow, identify the safest connection point, and define when the control layer should take over."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</ClearCtaBand>

<style>
  .proof-path {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    margin-top: 0.85rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    overflow: hidden;
  }

  .proof-path__item {
    display: grid;
    grid-template-columns: 2.35rem minmax(0, 1fr);
    gap: 0.8rem;
    min-height: 7.25rem;
    align-items: start;
    padding: 0.95rem;
    border-right: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .proof-path__item:last-child {
    border-right: 0;
  }

  .proof-path__index {
    display: inline-grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1;
  }

  .proof-path strong {
    display: block;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.18;
  }

  .proof-path p {
    margin: 0.38rem 0 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.88rem;
    line-height: 1.4;
  }

  @media (max-width: 980px) {
    .proof-path {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .proof-path__item:nth-child(2n) {
      border-right: 0;
    }

    .proof-path__item:nth-child(-n + 2) {
      border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    }
  }

  @media (max-width: 640px) {
    .proof-path {
      grid-template-columns: 1fr;
    }

    .proof-path__item,
    .proof-path__item:nth-child(2n),
    .proof-path__item:nth-child(-n + 2) {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    }

    .proof-path__item:last-child {
      border-bottom: 0;
    }
  }
</style>
