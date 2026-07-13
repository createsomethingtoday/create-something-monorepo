<script lang="ts">
  type Artifact = {
    name: string;
    summary: string;
    tag?: string;
    displayName?: string;
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    items?: Artifact[];
  };

  const DEFAULT_ITEMS: Artifact[] = [
    {
      name: 'mcp_contract.yaml',
      summary: 'Tools, resources, auth scope, and transport boundaries.',
      tag: 'Connectivity'
    },
    {
      name: 'agent_contract.yaml',
      summary: 'Allowed actions, approvals, escalation triggers, and operating limits.',
      tag: 'Behavior'
    },
    {
      name: 'outcome_contract.md',
      summary: 'Success metrics, fallback triggers, and ownership boundaries.',
      tag: 'Outcome'
    },
    {
      name: 'runbook.md',
      summary: 'Recovery steps, operator lanes, and rollback expectations.',
      tag: 'Operations'
    },
    {
      name: 'golden-task checks',
      summary: 'Regression evidence that keeps releases tied to real workflow behavior.',
      tag: 'Proof'
    }
  ];

  let {
    eyebrow = 'Maps and Receipts',
    title = 'What makes the control layer durable',
    description = 'Every project ships concrete files so access, behavior, and recovery stay legible after the kickoff call.',
    items = DEFAULT_ITEMS
  }: Props = $props();

  function splitArtifactLabel(label: string): string[] {
    return label.split(/(?<=[._\-\s])/).filter(Boolean);
  }

  function escapeHtml(label: string): string {
    return label
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatArtifactLabel(label: string): string {
    return splitArtifactLabel(label).map(escapeHtml).join('<wbr>');
  }
</script>

<div class="artifact-shell">
  <div class="artifact-copy">
    <span class="artifact-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>

  <div
    class="artifact-grid"
    class:artifact-grid--six={items.length === 6}
    class:artifact-grid--seven={items.length === 7}
    role="list"
  >
    {#each items as item}
      {@const label = item.displayName ?? item.name}
      <article class="artifact-card" role="listitem">
        <span class="artifact-tag">{item.tag ?? 'Proof'}</span>
        <h3 aria-label={label}>{@html formatArtifactLabel(label)}</h3>
        <p>{item.summary}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .artifact-shell {
    display: grid;
    gap: 1.4rem;
  }

  .artifact-copy {
    display: grid;
    gap: 0.65rem;
    max-width: 46rem;
  }

  .artifact-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.6));
  }

  .artifact-copy h2 {
    margin: 0;
    color: var(--color-performance-fg-primary, #fff);
    font-size: clamp(1.55rem, 2.6vw, 2.4rem);
    line-height: 1.06;
  }

  .artifact-copy p {
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.7;
  }

  .artifact-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .artifact-card:nth-child(1),
  .artifact-card:nth-child(2) {
    grid-column: span 3;
  }

  .artifact-card:nth-child(n + 3) {
    grid-column: span 2;
  }

  .artifact-grid--seven .artifact-card:nth-child(1) {
    grid-column: 1 / -1;
    grid-template-rows: auto auto auto;
  }

  .artifact-grid--seven .artifact-card:nth-child(n + 2) {
    grid-column: span 2;
  }

  .artifact-card {
    display: grid;
    gap: 0.65rem;
    grid-template-rows: auto minmax(2.5rem, auto) 1fr;
    padding: 1.1rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top left, rgba(96, 165, 250, 0.08), transparent 50%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
      rgba(4, 8, 15, 0.74);
  }

  .artifact-tag {
    display: inline-flex;
    width: fit-content;
    padding: 0.22rem 0.52rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.74);
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .artifact-card h3 {
    margin: 0;
    color: var(--color-performance-fg-primary, #fff);
    font-size: clamp(0.95rem, 0.2vw + 0.9rem, 1rem);
    line-height: 1.25;
    word-break: normal;
    overflow-wrap: normal;
    hyphens: none;
    text-wrap: balance;
  }

  .artifact-card p {
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.72));
    line-height: 1.6;
    font-size: 0.92rem;
  }

  @media (max-width: 1100px) {
    .artifact-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .artifact-card:nth-child(1),
    .artifact-card:nth-child(2),
    .artifact-card:nth-child(n + 3) {
      grid-column: auto;
    }

    .artifact-grid--seven .artifact-card:nth-child(1) {
      grid-column: 1 / -1;
    }
  }

  .artifact-grid--six {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .artifact-grid--six .artifact-card:nth-child(1),
  .artifact-grid--six .artifact-card:nth-child(2),
  .artifact-grid--six .artifact-card:nth-child(n + 3) {
    grid-column: auto;
  }

  @media (max-width: 740px) {
    .artifact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
