<script lang="ts">
  type Artifact = {
    name: string;
    summary: string;
    tag?: string;
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
      summary: 'Success metrics, manual fallback, and ownership boundaries.',
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
    eyebrow = 'Operating Artifacts',
    title = 'What makes Policy OS durable',
    description = 'Every engagement ships explicit artifacts so access, behavior, and recovery stay legible after the kickoff call.',
    items = DEFAULT_ITEMS
  }: Props = $props();
</script>

<div class="artifact-shell">
  <div class="artifact-copy">
    <span class="artifact-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>

  <div class="artifact-grid" role="list">
    {#each items as item}
      <article class="artifact-card" role="listitem">
        <span class="artifact-tag">{item.tag ?? 'Artifact'}</span>
        <h3>{item.name}</h3>
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
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.6));
  }

  .artifact-copy h2 {
    margin: 0;
    color: var(--color-fg-primary, #fff);
    font-size: clamp(1.55rem, 2.6vw, 2.4rem);
    line-height: 1.06;
  }

  .artifact-copy p {
    margin: 0;
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.7;
  }

  .artifact-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .artifact-card {
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
    margin-bottom: 0.7rem;
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
    margin: 0 0 0.55rem;
    color: var(--color-fg-primary, #fff);
    font-size: 1rem;
    line-height: 1.25;
    word-break: break-word;
  }

  .artifact-card p {
    margin: 0;
    color: var(--color-fg-secondary, rgba(255, 255, 255, 0.72));
    line-height: 1.6;
    font-size: 0.92rem;
  }

  @media (max-width: 1100px) {
    .artifact-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 740px) {
    .artifact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
