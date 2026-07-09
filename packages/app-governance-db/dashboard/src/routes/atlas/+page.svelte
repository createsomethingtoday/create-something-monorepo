<script lang="ts">
  import { StatusBadge } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { shortTimestamp, truncateMiddle } from '$lib/format';
  import { atlasStatusBadge, stateLabel } from '$lib/status';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const totals = $derived({
    canvases: data.canvases.length,
    nodes: data.canvases.reduce((sum, canvas) => sum + canvas.node_count, 0),
    edges: data.canvases.reduce((sum, canvas) => sum + canvas.edge_count, 0),
    receipts: data.canvases.reduce((sum, canvas) => sum + canvas.receipt_count, 0)
  });
</script>

<h1 class="page-title">Atlas</h1>
<p class="page-note mt-2">
  Canonical workflow maps, nodes, edges, runs, and receipts managed by the database layer.
</p>

<div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
  <div class="metric-cell">
    <span class="metric-value">{totals.canvases}</span>
    <span class="metric-label">canvases</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.nodes}</span>
    <span class="metric-label">nodes</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.edges}</span>
    <span class="metric-label">edges</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.receipts}</span>
    <span class="metric-label">receipts</span>
  </div>
</div>

<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
  <Panel title="Workflow maps" count={data.canvases.length}>
    {#if data.canvases.length === 0}
      <p class="empty-note">No Atlas canvases recorded yet.</p>
    {:else}
      <ul>
        {#each data.canvases as canvas (canvas.canvas_id)}
          {@const badge = atlasStatusBadge(canvas.status)}
          <li class="canvas-row">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <StatusBadge label={stateLabel(canvas.status)} tone={badge.tone} variant="dot" />
              <a class="canvas-title" href={`/atlas/${encodeURIComponent(canvas.canvas_id)}`}>{canvas.title}</a>
              {#if canvas.client}
                <span class="row-muted">{canvas.client}</span>
              {/if}
              <span class="mono-caption ml-auto" title={canvas.updated_at}>
                {shortTimestamp(canvas.updated_at)}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {#if canvas.workflow}
                <span class="row-muted">{canvas.workflow}</span>
              {/if}
              <span class="mono-caption">{canvas.node_count} nodes</span>
              <span class="mono-caption">{canvas.edge_count} edges</span>
              <span class="mono-caption">{canvas.open_runs} open runs</span>
              <span class="mono-caption">{canvas.receipt_count} receipts</span>
            </div>
            <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span class="mono-caption" title={canvas.canvas_id}>
                {truncateMiddle(canvas.canvas_id, 42)}
              </span>
              {#if canvas.source_kind || canvas.source_id}
                <span class="mono-caption">
                  {canvas.source_kind ?? 'source'}:{truncateMiddle(canvas.source_id, 32)}
                </span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <div class="flex min-w-0 flex-col gap-6">
    <Panel title="Node state" count={data.statusCounts.length}>
      {#if data.statusCounts.length === 0}
        <p class="empty-note">No node state recorded.</p>
      {:else}
        <ul>
          {#each data.statusCounts as row (row.key)}
            {@const badge = atlasStatusBadge(row.key)}
            <li class="count-row flex items-baseline justify-between gap-4">
              <StatusBadge label={stateLabel(row.key)} tone={badge.tone} variant="dot" />
              <span class="mono-value">{row.n}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Recent receipts" count={data.receipts.length}>
      {#if data.receipts.length === 0}
        <p class="empty-note">No workflow receipts recorded yet.</p>
      {:else}
        <ul>
          {#each data.receipts as receipt (receipt.id)}
            <li class="receipt-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={receipt.created_at}>
                  {shortTimestamp(receipt.created_at)}
                </span>
                <span class="mono-caption">{receipt.receipt_type}</span>
                <span class="mono-caption">{receipt.created_by}</span>
              </div>
              <p class="receipt-summary mt-1">{receipt.summary}</p>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={receipt.canvas_id}>
                  {truncateMiddle(receipt.canvas_id, 30)}
                </span>
                {#if receipt.node_id}
                  <span class="mono-caption" title={receipt.node_id}>
                    {truncateMiddle(receipt.node_id, 30)}
                  </span>
                {/if}
                {#if receipt.artifact_url}
                  <a class="out-link" href={receipt.artifact_url} target="_blank" rel="noreferrer">
                    Artifact
                  </a>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </div>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .page-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .metric-cell {
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
  }

  .metric-value {
    display: block;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    line-height: 1;
  }

  .metric-label {
    display: block;
    margin-top: var(--space-xs);
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .canvas-row,
  .receipt-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .canvas-row:last-child,
  .receipt-row:last-child {
    border-bottom: none;
  }

  .canvas-title {
    color: var(--color-fg-primary);
  }

  .row-muted,
  .receipt-summary {
    color: var(--color-fg-tertiary);
  }

  .count-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
  }

  .count-row:last-child {
    border-bottom: none;
  }

  .mono-caption,
  .mono-value {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mono-value {
    color: var(--color-fg-primary);
  }

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .out-link {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    text-decoration: underline;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .out-link:hover {
    color: var(--color-fg-primary);
  }
</style>
