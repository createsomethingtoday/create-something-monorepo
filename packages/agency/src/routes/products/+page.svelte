<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearProofItem
  } from '@create-something/canon';
  import { listGovernanceProducts } from '@create-something/canon/governance';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type ProofStateIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProofStateItem = ClearProofItem & { icon: ProofStateIconName };

  const featured = products.filter((product) => product.category === 'featured');
  const governanceProducts = listGovernanceProducts();

  const faqItems = [
    {
      question: 'What counts as proof?',
      answer:
        'Proof means delivery records, tools, connectors, and client builds that show which signal arrived, who decided, what evidence was used, what changed, what stayed private, and what still needs an owner.'
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
      eyebrow: 'Delivery proof',
      icon: 'folder',
      title: 'Delivered work shows the operating loop',
      detail:
        'A useful delivery record explains the signal, business problem, access boundary, visible status, private evidence, and next owner decision.',
      points: [
        'Visible: signal, status, decisions, handoff, next action',
        'Private: credentials, logs, raw client data, sensitive proof'
      ]
    },
    {
      eyebrow: 'Control signal',
      icon: 'check',
      title: 'Proof names what was decided',
      detail:
        'The service does not sell generic autonomy. Each workflow gets signal sources, action boundaries, approval-needed states, and blocked-state receipts.',
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
      title: 'The Proof Graph survives the build',
      detail:
        'Signals, decisions, runbooks, validation output, release notes, and rollback paths make the workflow understandable after launch.',
      points: ['Evidence travels with the work', 'The next operator can inspect the path']
    }
  ];

  const proofStripItems: ProofStateItem[] = [
    {
      icon: 'actions',
      value: 'Signal',
      label: 'Slack posts, API changes, PRs, schema diffs, tool calls, and exceptions enter one queue.'
    },
    {
      icon: 'states',
      value: 'Decision',
      label: 'Human, agent, or policy judgment routes the next action before risk moves downstream.'
    },
    {
      icon: 'objects',
      value: 'Map',
      label: 'Atlas shows where the decision sits, which systems it touches, and who owns the path.'
    },
    {
      icon: 'receipts',
      value: 'Proof',
      label: 'Evidence, policy, owner, outcome, receipt, and rollback notes stay with the work.'
    }
  ];

  const proofPathItems = [
    {
      label: 'Signal',
      detail: 'Name the source, change, account owner, and authority boundary.'
    },
    {
      label: 'Decision',
      detail: 'Route the judgment to the right human, agent, policy, or workflow state.'
    },
    {
      label: 'Map',
      detail: 'Show the affected systems, downstream impact, and review owner before action.'
    },
    {
      label: 'Proof',
      detail: 'Record the evidence, outcome, receipt, and recovery path the operator can inspect.'
    }
  ];

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Signal',
      icon: 'plus',
      title: 'Identify the first source',
      detail: 'Name the signal source before expanding authority.'
    },
    {
      label: 'Decision',
      icon: 'check',
      title: 'Define the decision path',
      detail: 'Decide who acts, what can run, what waits, and what must stop.'
    },
    {
      label: 'Proof',
      icon: 'settings',
      title: 'Add the proof layer',
      detail: 'Turn the workflow into approval states, blocked states, receipts, and operator briefs.'
    }
  ];

  const governanceProductCards: ClearCardItem[] = governanceProducts.map((product) => ({
    eyebrow: product.surface,
    icon:
      product.id === 'signal'
        ? 'plus'
        : product.id === 'decision'
          ? 'check'
          : product.id === 'proof'
            ? 'document'
            : 'folder',
    title: product.name,
    detail: product.description,
    href: product.id === 'atlas' ? '/atlas' : `/products/${product.id}`,
    points: [
      product.headline,
      `Owns: ${product.owns.slice(0, 2).join(', ')}`,
      product.requiredForProduction ? 'Required for production' : 'Optional'
    ]
  }));

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
  title="Proof for AI Workflow Systems | CREATE SOMETHING .agency"
  description="Proof behind CREATE SOMETHING .agency: Signals, Decisions, delivery records, tools, connectors, and client builds that show how AI workflow systems become inspectable."
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
  title="Signals turn into Decisions. Decisions leave Proof."
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
  title="Start with delivered work, not theory."
  description="The delivery records show the method in practice: which signal mattered, what decision was made, the control boundary, what stayed private, what the client owned, and what happened next."
>
  {#snippet after()}
    <ClearCardGrid items={proofLedger} columns={4} ariaLabel="Business proof ledger" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="AI workflow systems proof"
  title="Then show the Inbox, Map, and Proof states."
  description="Every artifact on this page helps the decision owner understand which signals matter, what can run, what waits, what stops, who owns the decision, and which proof record backs it. Tools are evidence; the service is the operating path."
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
  eyebrow="Governance products"
  title="Atlas connects Signal, Decision, and Proof."
  description="Signal is the inbox, Decision is the queue, Proof is the ledger, and Atlas is the map that lets each surface attach to the same workflow."
>
  {#snippet after()}
    <ClearCardGrid
      items={governanceProductCards}
      columns={4}
      ariaLabel="Composable governance product surfaces"
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Framework and tool proof"
  title="Product proof should point back to the service path."
  description="Ground and Loom MCP are useful because they show the same operating rule in public: watch the signal, verify before deciding, preserve ownership, and keep evidence with the work."
>
  {#snippet after()}
    <ClearCardGrid
      items={featured.map(productCard)}
      columns={2}
      ariaLabel="Flagship proof surfaces"
    />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Apply the proof"
  title="Apply the proof to the workflow your team still protects by hand."
  description="I’ll map the first workflow, identify the safest signal source, define who decides, and name what proof the control layer should leave behind."
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
