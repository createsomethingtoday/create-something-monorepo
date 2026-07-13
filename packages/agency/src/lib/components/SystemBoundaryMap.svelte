<script lang="ts">
  import BrandLogo from '$lib/components/BrandLogo.svelte';

  const vendorMarks = ['OpenAI', 'Dify', 'Cloudflare Workers'];

  const boundaryNotes = [
    {
      label: 'Client keeps',
      detail: 'Accounts, source data, approval authority, and business context.'
    },
    {
      label: 'CREATE SOMETHING owns',
      detail: 'Substrate records, workflow contracts, action boundaries, runbooks, evidence, and handoff notes.'
    },
    {
      label: 'Vendors provide',
      detail: 'Replaceable agent environment, app surface, and runtime.'
    }
  ];
</script>

<div class="boundary-map product-surface product-surface--soft" aria-labelledby="boundary-map-title">
  <div class="boundary-map__copy">
    <span class="boundary-map__eyebrow">System boundary</span>
    <h3 id="boundary-map-title">The vendor stack stays outside the product promise.</h3>
    <p>
      Your team sees which services help the workflow, but the durable value is the control layer:
      contracts, action boundaries, evidence, and the operating handoff.
    </p>
  </div>

  <div class="boundary-map__diagram" aria-label="Client accounts feed the CREATE SOMETHING control layer, which routes to replaceable vendor services and operator surfaces.">
    <div class="boundary-node boundary-node--client">
      <span>Client accounts</span>
      <strong>Business data + approval authority</strong>
      <small>Source systems, customer context, constraints</small>
    </div>

    <div class="boundary-connector" aria-hidden="true"></div>

    <div class="boundary-node boundary-node--core">
      <span>CREATE SOMETHING Substrate</span>
      <strong>Owned data + operator layer</strong>
      <small>Records, actions, approvals, receipts, MCP</small>
    </div>

    <div class="boundary-connector" aria-hidden="true"></div>

    <div class="boundary-node boundary-node--vendors">
      <span>Replaceable services</span>
      <div class="vendor-mark-grid" aria-hidden="true">
        {#each vendorMarks as mark}
          <BrandLogo name={mark} size={18} className="vendor-mark" />
        {/each}
      </div>
      <small>Agent environment, app surface, runtime</small>
    </div>
  </div>

  <div class="boundary-map__notes" role="list">
    {#each boundaryNotes as note}
      <article role="listitem">
        <span>{note.label}</span>
        <p>{note.detail}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .boundary-map {
    display: grid;
    gap: clamp(1.1rem, 2.6vw, 1.7rem);
    padding: clamp(1.15rem, 2.8vw, 1.7rem);
    overflow: hidden;
    background:
      radial-gradient(circle at 72% 24%, rgba(59, 109, 255, 0.14), transparent 28%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      rgba(4, 5, 8, 0.88);
  }

  .boundary-map__copy {
    display: grid;
    gap: 0.7rem;
    max-width: 50rem;
  }

  .boundary-map__eyebrow,
  .boundary-node span,
  .boundary-map__notes span {
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .boundary-map__copy h3 {
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: clamp(1.75rem, 3vw, 2.8rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .boundary-map__copy p,
  .boundary-map__notes p {
    margin: 0;
    color: var(--color-performance-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .boundary-map__diagram {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.18fr) auto minmax(0, 1fr);
    gap: 0.8rem;
    align-items: stretch;
    min-width: 0;
  }

  .boundary-node {
    display: grid;
    align-content: center;
    gap: 0.55rem;
    min-height: 11rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.018)),
      rgba(0, 0, 0, 0.32);
  }

  .boundary-node--core {
    border-color: color-mix(in srgb, var(--color-performance-brand-primary-border, #315cff) 72%, transparent);
    background:
      linear-gradient(135deg, rgba(49, 92, 255, 0.16), rgba(45, 212, 191, 0.055)),
      rgba(0, 0, 0, 0.4);
  }

  .boundary-node strong {
    color: var(--color-performance-fg-primary);
    font-size: 1.08rem;
    line-height: 1.2;
    text-wrap: balance;
  }

  .boundary-node small {
    color: var(--color-performance-fg-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .boundary-connector {
    align-self: center;
    width: clamp(1.4rem, 3vw, 2rem);
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.36), transparent);
  }

  .vendor-mark-grid {
    display: grid;
    grid-template-columns: repeat(3, 1.9rem);
    gap: 0.45rem;
    align-items: center;
  }

  .vendor-mark-grid :global(.vendor-mark) {
    color: var(--color-performance-brand-ink);
  }

  .boundary-map__notes {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .boundary-map__notes article {
    display: grid;
    gap: 0.4rem;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 920px) {
    .boundary-map__diagram {
      grid-template-columns: 1fr;
    }

    .boundary-connector {
      justify-self: center;
      width: 1px;
      height: 1.5rem;
      background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.36), transparent);
    }

    .boundary-map__notes {
      grid-template-columns: 1fr;
    }
  }
</style>
