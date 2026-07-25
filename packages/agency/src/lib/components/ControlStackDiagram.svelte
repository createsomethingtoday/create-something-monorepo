<script lang="ts">
  type StackItem = {
    label: string;
    detail: string;
    tone?: 'identity' | 'entitlement' | 'control' | 'execution' | 'audit';
  };

  type Props = {
    eyebrow?: string;
    title?: string;
    description?: string;
    items?: StackItem[];
  };

  const DEFAULT_ITEMS: StackItem[] = [
    {
      label: 'Identity',
      detail: 'The request is bound to a known user or tenant.',
      tone: 'identity'
    },
    {
      label: 'Entitlement',
      detail: 'Commercial, legal, and access state are checked live.',
      tone: 'entitlement'
    },
    {
      label: 'Control',
      detail: 'Rules decide whether work runs, pauses for review, or stops.',
      tone: 'control'
    },
    {
      label: 'Execution',
      detail: 'Only approved workflow actions reach the connected system.',
      tone: 'execution'
    },
    {
      label: 'Audit',
      detail: 'Every outcome leaves a reason trail for support and review.',
      tone: 'audit'
    }
  ];

  let {
    eyebrow = 'Enforcement Chain',
    title = 'How the control layer becomes runtime behavior',
    description = 'This is the sequence that makes controlled delegation different from a prompt plus a token.',
    items = DEFAULT_ITEMS
  }: Props = $props();
</script>

<div class="stack-shell">
  <div class="stack-copy">
    <span class="stack-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>

  <div class="stack-grid" role="list">
    {#each items as item, index}
      <article class={`stack-card ${item.tone ?? ''}`} role="listitem">
        <span class="stack-index">0{index + 1}</span>
        <h3>{item.label}</h3>
        <p>{item.detail}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .stack-shell {
    display: grid;
    gap: 1.5rem;
  }

  .stack-copy {
    display: grid;
    gap: 0.65rem;
    max-width: 46rem;
  }

  .stack-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.6));
  }

  .stack-copy h2 {
    margin: 0;
    color: var(--color-performance-fg-primary, #fff);
    font-size: clamp(1.7rem, 2.8vw, 2.6rem);
    line-height: 1.05;
    letter-spacing: var(--tracking-performance-tight, -0.02em);
  }

  .stack-copy p {
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.76));
    line-height: 1.7;
  }

  .stack-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .stack-card {
    position: relative;
    padding: 1.2rem;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
      rgba(4, 8, 15, 0.72);
    min-height: 10.5rem;
  }

  .stack-card::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -0.75rem;
    width: 1.5rem;
    height: 1px;
    background: rgba(255, 255, 255, 0.14);
  }

  .stack-card:last-child::after {
    display: none;
  }

  .stack-card h3 {
    margin: 0.5rem 0 0.65rem;
    color: var(--color-performance-fg-primary, #fff);
    font-size: 1.05rem;
  }

  .stack-card p {
    margin: 0;
    color: var(--color-performance-fg-secondary, rgba(255, 255, 255, 0.74));
    line-height: 1.6;
    font-size: 0.94rem;
  }

  .stack-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.78);
    background: rgba(255, 255, 255, 0.06);
  }

  .identity {
    box-shadow: inset 0 1px 0 rgba(125, 211, 252, 0.14);
  }

  .entitlement {
    box-shadow: inset 0 1px 0 rgba(147, 197, 253, 0.14);
  }

  .control {
    box-shadow: inset 0 1px 0 rgba(45, 212, 191, 0.24);
  }

  .execution {
    box-shadow: inset 0 1px 0 rgba(196, 181, 253, 0.18);
  }

  .audit {
    box-shadow: inset 0 1px 0 rgba(251, 191, 36, 0.18);
  }

  @media (max-width: 900px) {
    .stack-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .stack-card::after {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .stack-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
