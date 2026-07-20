<script lang="ts">
  import type { PublicAgentTrustCard, PublicMcpTrustCard } from '$lib/config/publicTrustCatalog';
  import CatalogCopyField from './CatalogCopyField.svelte';
  import CatalogDetailOpening from './CatalogDetailOpening.svelte';

  let {
    kind,
    card
  }: {
    kind: 'agent' | 'mcp';
    card: PublicAgentTrustCard | PublicMcpTrustCard;
  } = $props();

  const isMcp = $derived(kind === 'mcp');
  const collectionName = $derived(isMcp ? 'MCP catalog' : 'agent catalog');
  const collectionHref = $derived(isMcp ? '/mcp' : '/agents');
  const externalListings = $derived.by(() => {
    const entries = Object.entries(card.externalListings) as Array<[string, string]>;
    return entries.filter(([, href]) => Boolean(href));
  });

  function formatLabel(value: string): string {
    return value.replace(/_/g, ' ');
  }
</script>

<CatalogDetailOpening
  backHref={collectionHref}
  backLabel={collectionName}
  eyebrow={isMcp ? 'MCP trust card' : 'Agent trust card'}
  title={card.name}
  description={card.description}
  badges={[formatLabel(card.status), formatLabel(card.accessModel), card.authModel]}
  summary={[
    { label: 'Runtime', value: card.transport },
    { label: 'Tools', value: String(card.toolCount) },
    { label: 'Review', value: card.evalStatus },
    { label: 'Checked', value: card.lastVerifiedDate }
  ]}
  action={{ href: '#start', label: 'See how to start' }}
/>

<section class="catalog-detail-chapter" aria-labelledby="fit-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>01 / Fit</p>
      <h2 id="fit-title">Decide if this boundary fits</h2>
      <span>Read the allowed behavior and the limits together.</span>
    </header>

    <div class="fit-grid">
      <article>
        <h3>What the public record supports</h3>
        <p>{card.evidenceSummary}</p>
      </article>
      <article>
        <h3>Where it stops</h3>
        <p>{card.riskSummary}</p>
        <details class="inline-limits">
          <summary>Read the detailed limits</summary>
          <ul>
            {#each card.limitations as limitation}
              <li>{limitation}</li>
            {/each}
          </ul>
        </details>
      </article>
    </div>
  </div>
</section>

<section id="start" class="catalog-detail-chapter" aria-labelledby="start-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>02 / Start</p>
      <h2 id="start-title">{isMcp ? 'Choose your MCP host' : 'Open the public agent'}</h2>
      <span>
        {isMcp
          ? 'Use the configuration for the host you already work in.'
          : 'The public link opens the read-only agent described by this record.'}
      </span>
    </header>

    {#if isMcp}
      <div class="install-list">
        {#each card.installSnippets as snippet, index}
          <details open={index === 0}>
            <summary>
              <strong>{snippet.host}</strong>
              <span>{snippet.language}</span>
            </summary>
            <CatalogCopyField
              value={snippet.value}
              language={snippet.language}
              label={`Copy ${snippet.host} install snippet`}
            />
          </details>
        {/each}
      </div>
    {:else}
      <div class="public-agent-action">
        <p>
          This link leaves CREATE SOMETHING and opens the published agent. Its access model is
          <strong>{formatLabel(card.accessModel)}</strong>.
        </p>
        <a href={card.url} target="_blank" rel="noreferrer">Open {card.name}</a>
      </div>
    {/if}
  </div>
</section>

<section class="catalog-detail-chapter" aria-labelledby="record-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>03 / Verify</p>
      <h2 id="record-title">Verification record</h2>
      <span>Open the technical record when you need to audit the public claim.</span>
    </header>

    <div class="record-summary">
      <span>Evaluation {card.evalStatus}</span>
      <span>Last checked {card.lastVerifiedDate}</span>
      <span>{card.toolCount} enabled tools</span>
    </div>

    <div class="record-list">
      <details>
        <summary>Checks and monitoring</summary>
        <dl>
          <div>
            <dt>Endpoint</dt>
            <dd><a href={card.url}>{card.url}</a></dd>
          </div>
          <div>
            <dt>Evaluation suite</dt>
            <dd><code>{card.evalSuite}</code></dd>
          </div>
          <div>
            <dt>Evaluation status</dt>
            <dd>{card.evalStatus}</dd>
          </div>
          <div>
            <dt>Required checks</dt>
            <dd>{card.requiredChecks.map(formatLabel).join(', ')}</dd>
          </div>
          <div>
            <dt>Transport</dt>
            <dd>{card.transport}</dd>
          </div>
          <div>
            <dt>Authentication</dt>
            <dd>{card.authModel}</dd>
          </div>
          {#if card.observability.langfuse}
            <div>
              <dt>Evaluation monitoring</dt>
              <dd>
                Langfuse: {card.observability.langfuse.project ?? 'declared'}
                {#if card.observability.langfuse.environment}
                  / {card.observability.langfuse.environment}
                {/if}
              </dd>
            </div>
          {/if}
          {#if card.runtimeObservability}
            <div>
              <dt>Runtime monitoring</dt>
              <dd>
                {card.runtimeObservability.provider}:
                {formatLabel(card.runtimeObservability.status)}.
                {card.runtimeObservability.notes}
              </dd>
            </div>
          {/if}
        </dl>
      </details>

      <details>
        <summary>Evidence and source files</summary>
        <dl>
          <div>
            <dt>Evidence reference</dt>
            <dd><code>{card.evidenceRef}</code></dd>
          </div>
          <div>
            <dt>Policy pack</dt>
            <dd><code>{card.policyPack}</code></dd>
          </div>
        </dl>
        <h3>Redacted samples</h3>
        <ul>
          {#each card.samples as sample}
            <li><code>{sample.path}</code> — {sample.title}</li>
          {/each}
        </ul>
        <h3>Source boundaries</h3>
        <ul>
          {#each card.sourceRefs as sourceRef}
            <li><code>{sourceRef}</code></li>
          {/each}
        </ul>
      </details>

      <details>
        <summary>Listings and escalation</summary>
        {#if externalListings.length > 0}
          <ul>
            {#each externalListings as [listing, href]}
              <li><a {href}>{formatLabel(listing)}</a></li>
            {/each}
          </ul>
        {:else}
          <p>No external mirror has been published for this card yet.</p>
        {/if}
        <p>Escalation: <a href={`mailto:${card.escalation}`}>{card.escalation}</a></p>
      </details>
    </div>

    <a class="collection-handoff" href={collectionHref}>Compare the full {collectionName}</a>
  </div>
</section>

<style>
  .catalog-detail-chapter {
    padding: clamp(3rem, 6vw, 5rem) 1.5rem;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .catalog-detail-chapter__inner {
    display: grid;
    width: min(64rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  .chapter-heading {
    display: grid;
    max-width: 44rem;
    gap: var(--space-performance-xs);
  }

  .chapter-heading p,
  .chapter-heading h2,
  .chapter-heading span {
    margin: 0;
  }

  .chapter-heading p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .chapter-heading h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
  }

  .chapter-heading span {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .fit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .fit-grid article,
  .public-agent-action {
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-bg-surface);
  }

  h3,
  p,
  ul {
    margin-top: 0;
  }

  .fit-grid p,
  .fit-grid li,
  .public-agent-action p,
  .record-list,
  .record-list p,
  .record-list li {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .install-list,
  .record-list {
    display: grid;
    gap: var(--space-performance-sm);
  }

  details {
    overflow: hidden;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-surface);
  }

  summary {
    display: flex;
    min-height: 3.5rem;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-sm);
    padding: 0.9rem 1rem;
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  summary span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-regular);
    text-transform: uppercase;
  }

  .install-list :global(.catalog-copy-field),
  .record-list dl,
  .record-list details > p,
  .record-list details > ul,
  .record-list details > h3 {
    margin: 0 var(--space-performance-md) var(--space-performance-md);
  }

  .inline-limits {
    margin-top: var(--space-performance-md);
    background: var(--color-performance-bg-subtle);
  }

  .inline-limits ul {
    margin: 0 var(--space-performance-md) var(--space-performance-md);
  }

  .public-agent-action {
    display: grid;
    max-width: 42rem;
    gap: var(--space-performance-sm);
  }

  .public-agent-action p {
    margin: 0;
  }

  .public-agent-action a,
  .collection-handoff {
    width: fit-content;
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  .record-summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
  }

  .record-summary span {
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-subtle);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  dl div {
    min-width: 0;
  }

  dt {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  dd {
    margin: 0.3rem 0 0;
    overflow-wrap: anywhere;
  }

  code {
    font-size: var(--text-performance-caption);
    overflow-wrap: anywhere;
  }

  @media (max-width: 700px) {
    .catalog-detail-chapter {
      padding: 3rem 1.25rem;
    }

    .fit-grid,
    dl {
      grid-template-columns: 1fr;
    }

    summary {
      align-items: flex-start;
    }
  }
</style>
