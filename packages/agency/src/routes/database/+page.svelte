<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    ClearReceiptGrid,
    SEO,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearProofItem,
    type ClearReceipt
  } from '@create-something/canon';
  import { databaseLayerDemoState, type DatabaseLayerSourceRecord } from '@create-something/database-layer';
  import ArticleVisualFigure from '$lib/components/ArticleVisualFigure.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const records = databaseLayerDemoState.records;
  const bindings = databaseLayerDemoState.bindings;
  const workflowActions = databaseLayerDemoState.actions;
  const receipts = databaseLayerDemoState.receipts;
  const capabilities = databaseLayerDemoState.capabilities;
  const runtime = databaseLayerDemoState.runtime;
  const performanceBudgets = databaseLayerDemoState.performanceBudgets;
  const systemDesignPrinciples = databaseLayerDemoState.systemDesignPrinciples;

  let selectedRecordId = $state(records[0]?.id ?? '');
  let filter = $state('');

  const filteredRecords = $derived(
    records.filter((record) => {
      const query = filter.trim().toLowerCase();
      if (!query) return true;

      return [record.title, record.source, record.owner, record.status, record.bindingHealth]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
  );

  const selectedRecord = $derived(
    records.find((record) => record.id === selectedRecordId) ?? filteredRecords[0] ?? records[0]
  );

  const selectedBinding = $derived(
    bindings.find((binding) => binding.recordId === selectedRecord?.id) ?? null
  );

  const selectedAction = $derived(
    workflowActions.find((action) => action.recordId === selectedRecord?.id) ?? null
  );

  const selectedReceipt = $derived(
    receipts.find((receipt) => receipt.recordId === selectedRecord?.id) ?? null
  );

  const proofItems: ClearProofItem[] = [
    {
      value: String(records.length),
      label: 'Sample records from the reusable database-layer contract.'
    },
    {
      value: String(bindings.length),
      label: 'Atlas bindings that keep maps connected to record truth.'
    },
    {
      value: String(workflowActions.length),
      label: 'Workflow actions with run, wait, stop, and complete state.'
    },
    {
      value: String(receipts.length),
      label: 'Receipts that explain why the current state can be trusted.'
    }
  ];

  const capabilityCards: ClearCardItem[] = capabilities.map((capability) => ({
    eyebrow: capability.surface,
    icon:
      capability.surface === 'API'
        ? 'document'
        : capability.surface === 'MCP'
          ? 'plus'
          : capability.surface === 'Agent'
            ? 'settings'
            : 'check',
    title: capability.label,
    detail: capability.detail
  }));

  const receiptCards: ClearReceipt[] = receipts.map((receipt, index) => ({
    number: String(index + 1).padStart(2, '0'),
    label: receipt.summary,
    detail: `${receipt.type}: ${receipt.evidence}`
  }));

  const performanceCards: ClearCardItem[] = performanceBudgets.map((budget) => ({
    eyebrow: budget.surface,
    icon: budget.surface === 'local' ? 'check' : budget.surface === 'cloud' ? 'folder' : 'settings',
    title: budget.label,
    detail: `${budget.target} Baseline: ${budget.baseline} ${budget.detail}`
  }));

  const principleCards: ClearCardItem[] = systemDesignPrinciples.map((principle) => ({
    eyebrow: principle.tier,
    icon:
      principle.tier === 'Database'
        ? 'document'
        : principle.tier === 'Automation'
          ? 'settings'
          : 'check',
    title: principle.label,
    detail: `${principle.principle} Evidence: ${principle.evidence}`
  }));

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Map',
      icon: 'folder',
      title: 'Bring one workflow',
      detail: 'Source systems, owners, handoffs, and stop states.'
    },
    {
      label: 'Record',
      icon: 'document',
      title: 'Transfer the source truth',
      detail: 'Rows become source records before they become Atlas nodes.'
    },
    {
      label: 'Operate',
      icon: 'check',
      title: 'Run through API and MCP',
      detail: 'Actions and receipts stay inspectable for humans and agents.'
    }
  ];

  const faqItems = [
    {
      question: 'Is this the app governance dashboard?',
      answer:
        'No. App Governance is the first internal instance. This page shows the reusable CREATE SOMETHING database-layer shape with safe sample data.'
    },
    {
      question: 'Does this replace Notion?',
      answer:
        'Not as a headline. Notion remains useful for PM, capture, review, and distribution. The database layer becomes the operating substrate when workflows need API, MCP, Atlas, actions, and receipts.'
    },
    {
      question: 'Why show records on the front end if the layer is AI-native?',
      answer:
        'AI-native does not mean invisible. Agents and APIs can operate the data, while humans can inspect the same records, bindings, actions, receipts, and audit evidence.'
    }
  ];

  function selectRecord(record: DatabaseLayerSourceRecord) {
    selectedRecordId = record.id;
  }

  function statusLabel(record: DatabaseLayerSourceRecord) {
    return `${record.status} / ${record.bindingHealth}`;
  }
</script>

<SEO
  title="Substrate Database Layer | Fast AI-native workflow records"
  description="Inspect Substrate, the CREATE SOMETHING database-layer system: source records, Atlas bindings, workflow actions, proof receipts, speed budgets, and API/MCP-ready state."
  keywords="Substrate database layer, CREATE SOMETHING database layer, AI-native database, workflow records, Atlas bindings, MCP database, Cloudflare D1 workflow system, Obsidian-like database UI"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="Substrate Database Layer"
  title="A fast database for mapped AI workflows."
  description="Substrate is the CREATE SOMETHING database-layer system design: topology as records, execution as actions and runs, judgment as receipts, and UI/API/MCP surfaces over the same state."
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
    <Button href="/products" variant="secondary">See Product System</Button>
  {/snippet}

  {#snippet aside()}
    <div class="demo-shell demo-shell--compact" aria-label="Database layer summary">
      <div class="demo-shell__bar">
        <span>READ ONLY</span>
        <strong>{runtime.name.toLowerCase()}://database-layer</strong>
      </div>
      <div class="demo-shell__metrics">
        <div><strong>{records.length}</strong><span>records</span></div>
        <div><strong>{bindings.length}</strong><span>bindings</span></div>
        <div><strong>{workflowActions.length}</strong><span>actions</span></div>
        <div><strong>{receipts.length}</strong><span>receipts</span></div>
      </div>
      <p>
        App Governance proved the instance. Substrate is the reusable runtime:
        Cloudflare durability, direct object URLs, Atlas topology, and fast
        inspection across UI, API, MCP, and agents.
      </p>
    </div>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Interactive sample"
  title="System design you can inspect at record speed."
  description="Filter the sample records, select a row, and inspect the Atlas binding, current action, and proof receipt. The active working set stays local-feeling; the canonical model remains API/MCP-readable."
>
  {#snippet after()}
    <ArticleVisualFigure
      id="substrate-record-visual"
      src="/images/pages/substrate-record-proof.png"
      alt="Diagram showing source records, a selected record, Atlas binding, workflow action, and proof receipt."
      eyebrow="Canon visual"
      title="Substrate has to be inspectable before it is agent-operable."
      caption="The image mirrors the live sample below: records, bindings, actions, and receipts are the same operating object, not separate marketing ideas."
      sourceLabel="Generated PNG with SVG source brief and prompt metadata retained."
    />
    <section class="database-demo" aria-label="Read-only database layer sample">
      <div class="database-demo__toolbar">
        <label>
          <span>Filter records</span>
          <input
            bind:value={filter}
            type="search"
            placeholder="Source, owner, status..."
            aria-label="Filter database layer records"
          />
        </label>
        <span>{filteredRecords.length} of {records.length} records</span>
      </div>

      <div class="database-demo__grid">
        <div class="record-list" role="listbox" aria-label="Source records">
          {#each filteredRecords as record (record.id)}
            <button
              type="button"
              class:active={selectedRecord?.id === record.id}
              onclick={() => selectRecord(record)}
              role="option"
              aria-selected={selectedRecord?.id === record.id}
            >
              <span>{record.source}</span>
              <strong>{record.title}</strong>
              <small>{statusLabel(record)}</small>
            </button>
          {/each}
        </div>

        {#if selectedRecord}
          <article class="record-detail" aria-label="Selected record detail">
            <div class="record-detail__header">
              <span>{selectedRecord.sourceType} / {selectedRecord.id}</span>
              <strong>{selectedRecord.title}</strong>
              <p>{selectedRecord.summary}</p>
            </div>

            <div class="detail-grid">
              <div>
                <span>Owner</span>
                <strong>{selectedRecord.owner}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedRecord.status}</strong>
              </div>
              <div>
                <span>Binding</span>
                <strong>{selectedRecord.bindingHealth}</strong>
              </div>
              <div>
                <span>Relations</span>
                <strong>{selectedRecord.relationCount}</strong>
              </div>
            </div>

            <section class="runtime-panel" aria-label="Substrate runtime profile">
              <div>
                <span>Runtime</span>
                <strong>{runtime.name} / {runtime.posture}</strong>
              </div>
              <p>{runtime.uiBoundary}</p>
              <ul>
                {#each runtime.storage as storage}
                  <li>{storage}</li>
                {/each}
              </ul>
            </section>

            {#if selectedBinding}
              <section class="detail-panel">
                <span>Atlas binding</span>
                <strong>{selectedBinding.canvasTitle}</strong>
                <p>{selectedBinding.nodeLabel}: {selectedBinding.relationEvidence}</p>
                <code>{selectedBinding.canvasId} / {selectedBinding.nodeId}</code>
              </section>
            {/if}

            {#if selectedAction}
              <section class="detail-panel">
                <span>Workflow action</span>
                <strong>{selectedAction.state}: {selectedAction.title}</strong>
                <p>{selectedAction.detail}</p>
                <code>{selectedAction.policy}</code>
              </section>
            {/if}

            {#if selectedReceipt}
              <section class="detail-panel">
                <span>Proof receipt</span>
                <strong>{selectedReceipt.summary}</strong>
                <p>{selectedReceipt.evidence}</p>
                <code>{selectedReceipt.createdAt}</code>
              </section>
            {/if}
          </article>
        {/if}
      </div>
    </section>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Speed budget"
  title="Use Obsidian as the feel baseline, then add shared durability."
  description="The target is not another heavy workspace. The operator path should feel immediate on loaded records while Cloudflare keeps collaboration, audit, files, API, and MCP durable."
>
  {#snippet after()}
    <ClearCardGrid items={performanceCards} columns={4} ariaLabel="Substrate performance budgets" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="System design"
  title="The database is the workflow topology."
  description="Substrate is strongest when maps, records, policies, execution, and proof are one object model. UI, desktop, API, MCP, and agents become projections over that model."
>
  {#snippet after()}
    <ClearCardGrid items={principleCards} columns={4} ariaLabel="Substrate system design principles" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="API-native"
  title="The same state has to work for UI, API, MCP, and agents."
  description="The database layer is not special because it stores rows. It is special because workflow records, map bindings, policy actions, runs, and receipts are durable objects any approved surface can inspect."
>
  {#snippet after()}
    <ClearProofStrip items={proofItems} ariaLabel="Database layer sample counts" />
    <div class="mt-4">
      <ClearCardGrid items={capabilityCards} columns={4} ariaLabel="Database layer capabilities" />
    </div>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Receipts"
  title="Proof is part of the record, not a follow-up note."
  description="A workflow can only be delegated when the record shows what happened, who owns the next step, why the current state should be trusted, and which surface can inspect it."
>
  {#snippet after()}
    <ClearReceiptGrid receipts={receiptCards} ariaLabel="Database layer proof receipts" />
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow="Build from one workflow"
  title="Bring the workflow that deserves its own operating database."
  description="I’ll map the source system, transfer path, Atlas topology, record model, speed budget, API/MCP boundary, and receipts needed to make the workflow operable."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
    <Button href="/stack" variant="secondary">See Stack Boundary</Button>
  {/snippet}
</ClearCtaBand>

<style>
  .demo-shell,
  .database-demo {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .demo-shell {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
  }

  .demo-shell__bar,
  .database-demo__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .demo-shell__bar span,
  .database-demo__toolbar span,
  .record-list span,
  .record-list small,
  .record-detail__header span,
  .detail-grid span,
  .detail-panel span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .demo-shell__bar strong {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-medium);
  }

  .demo-shell__metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .demo-shell__metrics div {
    display: grid;
    gap: 0.15rem;
    padding: 0.7rem;
    border-right: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .demo-shell__metrics div:last-child {
    border-right: 0;
  }

  .demo-shell__metrics strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 1.05rem;
  }

  .demo-shell__metrics span,
  .demo-shell p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .database-demo {
    overflow: hidden;
  }

  .database-demo__toolbar {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .database-demo__toolbar label {
    display: flex;
    min-width: min(100%, 26rem);
    align-items: center;
    gap: 0.75rem;
  }

  .database-demo__toolbar input {
    width: 100%;
    min-height: 2.45rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-onyx, #0a0e19);
    font: inherit;
    padding: 0.55rem 0.7rem;
  }

  .database-demo__grid {
    display: grid;
    grid-template-columns: minmax(17rem, 0.78fr) minmax(0, 1.22fr);
    min-height: 32rem;
  }

  .record-list {
    display: grid;
    align-content: start;
    border-right: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .record-list button {
    display: grid;
    gap: 0.28rem;
    min-height: 6.7rem;
    padding: 0.9rem 1rem;
    border: 0;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-panel, #ffffff);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .record-list button:hover,
  .record-list button.active {
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .record-list button.active {
    box-shadow: inset 3px 0 0 var(--color-clear-cobalt, #0048ff);
  }

  .record-list strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.96rem;
    font-weight: var(--font-medium);
    line-height: 1.22;
  }

  .record-detail {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: 1rem;
  }

  .record-detail__header {
    display: grid;
    gap: 0.45rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .record-detail__header strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: clamp(1.35rem, 2.5vw, 2rem);
    font-weight: var(--font-medium);
    line-height: 1.05;
  }

  .record-detail__header p,
  .detail-panel p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    line-height: 1.48;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .detail-grid div {
    display: grid;
    gap: 0.2rem;
    padding: 0.75rem;
    border-right: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .detail-grid div:last-child {
    border-right: 0;
  }

  .detail-grid strong,
  .detail-panel strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.95rem;
    font-weight: var(--font-medium);
    line-height: 1.25;
  }

  .detail-panel {
    display: grid;
    gap: 0.38rem;
    padding: 0.85rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .runtime-panel {
    display: grid;
    gap: 0.55rem;
    padding: 0.85rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
  }

  .runtime-panel div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .runtime-panel span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .runtime-panel strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.86rem;
    font-weight: var(--font-medium);
  }

  .runtime-panel p,
  .runtime-panel ul {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .runtime-panel ul {
    display: grid;
    gap: 0.25rem;
    padding-left: 1rem;
  }

  .detail-panel code {
    width: 100%;
    overflow-wrap: anywhere;
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }

  @media (max-width: 900px) {
    .database-demo__grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .record-list {
      border-right: 0;
      border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    }

    .detail-grid div,
    .demo-shell__metrics div {
      border-right: 0;
      border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    }

    .detail-grid div:last-child,
    .demo-shell__metrics div:last-child {
      border-bottom: 0;
    }
  }

  @media (max-width: 640px) {
    .demo-shell__metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .database-demo__toolbar,
    .database-demo__toolbar label {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
