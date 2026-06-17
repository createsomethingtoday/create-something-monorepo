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
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const featured = products.filter((product) => product.category === 'featured');
  const methodAndFramework = products.filter(
    (product) => product.category === 'framework' || product.category === 'developer-tools'
  );
  const integrations = products.filter((product) => product.category === 'integration');
  const clientWork = products.filter((product) => product.category === 'client');

  const proofRoles: ClearCardItem[] = [
    {
      eyebrow: 'Ground',
      icon: 'check',
      title: 'Judgment needs evidence',
      detail:
        'Agents must check before they claim. That principle becomes release evidence and blocked-state logic.'
    },
    {
      eyebrow: 'Loom',
      icon: 'users',
      title: 'Operators need continuity',
      detail:
        'Agent work needs memory, ownership, checkpoints, and evidence so progress survives handoffs.'
    },
    {
      eyebrow: 'Connections',
      icon: 'plus',
      title: 'Connections prove the path',
      detail:
        'Read-only or constrained connections prove the path before the workflow earns more authority.'
    },
    {
      eyebrow: 'Control',
      icon: 'settings',
      title: 'The service adds the boundary',
      detail:
        'The products are proof primitives. The paid work turns them into controlled operating paths.'
    }
  ];

  const proofReadingCards: ClearCardItem[] = [
    {
      eyebrow: 'Receipts',
      icon: 'document',
      title: 'Proof shows the operating result',
      detail:
        'Read the artifacts as receipts: what changed, what was verified, what stayed private, and what still needs an owner.'
    },
    {
      eyebrow: 'Primitives',
      icon: 'settings',
      title: 'Tools show the discipline',
      detail:
        'Ground, Loom, and connector work expose the control principles before they become a client-specific workflow.'
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
        'Use proof as evidence for the method, then map the first safe delegation point for your own system.'
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
</script>

<SEO
  title="Proof | CREATE SOMETHING .agency"
  description="Proof behind CREATE SOMETHING .agency: delivery records, tools, connectors, and client builds that show how workflow control becomes inspectable."
  keywords="MCP servers, trust layer, agent coordination, grounded AI code analysis, workflow controls, operator surfaces"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Proof"
  title="The service is backed by inspectable parts."
  description="Loom, Ground, connectors, and client builds are not a random product shelf. They show the same path the service follows: connect the system, verify the claim, coordinate the work, then control the workflow."
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
    <ClearCardGrid items={proofRoles} columns={1} density="compact" ariaLabel="Proof primitives" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="How to read this page"
  title="Tools are evidence. The service is the operating path."
  description="The free and open tools show the discipline underneath the service: grounded claims, agent continuity, constrained MCP access, and evidence-backed decisions. The paid work turns those primitives into one workflow your operator can trust."
>
  {#snippet after()}
    <ClearCardGrid items={proofReadingCards} columns={4} ariaLabel="How to read proof" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Proof ledger"
  title="The evidence is business-readable before it is technical."
  description="Elite workflow buyers need to see the path from problem to control. The proof ledger shows how each build preserves business context, owner authority, and inspectable receipts."
>
  {#snippet after()}
    <ClearCardGrid items={proofLedger} columns={4} ariaLabel="Business proof ledger" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Flagship proof"
  title="Verify before claiming, then coordinate the work."
  description="The two core open tools behind the operating-layer thesis: Ground checks claims, and Loom gives agent work memory, ownership, and evidence."
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
      ariaLabel="Connection wedge MCPs"
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
  title="Need the proof applied to your workflow?"
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
