<script lang="ts">
  import { onMount } from 'svelte';
  import { webflowUsageSnapshot as snapshot, webflowUsageMetrics, type UsageStudy } from '$lib/data/webflowUsage';
  import { nativeDisclosure } from '$lib/motion/evidenceDisclosure';
  import { usageEvidenceMotion } from '$lib/motion/usageEvidenceMotion';

  let { study = 'all' }: { study?: UsageStudy } = $props();
  let enhanced = $state(false);
  let selectedId = $state('');
  const number = new Intl.NumberFormat('en-US');
  const groups = [
    { id: 'review-mcp', title: 'Review tools', context: 'Recorded tool calls' },
    { id: 'asset-dashboard', title: 'Asset Dashboard', context: 'Legacy application' }
  ];
  let metrics = $derived(webflowUsageMetrics.filter(metric => study === 'all' || metric.study === study));
  let selected = $derived(metrics.find(metric => metric.id === selectedId) ?? metrics[0]);

  function selectWithKeyboard(event: KeyboardEvent, id: string) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const index = metrics.findIndex(metric => metric.id === id);
    let next: number;
    if (event.key === 'ArrowDown') next = (index + 1) % metrics.length;
    else if (event.key === 'ArrowUp') next = (index + metrics.length - 1) % metrics.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = metrics.length - 1;
    else return;
    event.preventDefault();
    selectedId = metrics[next].id;
    const root = (event.currentTarget as HTMLElement).closest('[data-webflow-usage]');
    root?.querySelector<HTMLButtonElement>(`[data-usage-metric="${selectedId}"]`)?.focus();
  }
  onMount(() => { enhanced = true; });
</script>

<section id="recorded-usage" class="usage-evidence" aria-labelledby="usage-title" data-webflow-usage={study} data-scroll-entrance-skip use:usageEvidenceMotion={selected.id}>
  <header class="usage-heading">
    <div><p class="eyebrow">Recorded use / 30-day snapshot</p><h2 id="usage-title">The work behind<br />the numbers.</h2></div>
    <div class="usage-period"><span>Observation window</span><p>{snapshot.period}</p><span>Checked {snapshot.checkedOn} · Cloudflare D1</span></div>
  </header>
  <p class="usage-intro">A dated view of activity in the tools. Select a measure to inspect what was recorded and what it can establish.</p>
  <div class="usage-layout">
    <div class="usage-ledger" data-usage-ledger>
      <span class="usage-marker" data-usage-marker aria-hidden="true"></span>
      {#each groups.filter(group => study === 'all' || group.id === study) as group}
        <div class="usage-group">
          <h3>{group.title}<span>{group.context}</span></h3>
          <div class="usage-measures" role="group" aria-label={group.title}>
            {#each metrics.filter(metric => metric.study === group.id) as metric}
              <button type="button" class="usage-metric" data-usage-metric={metric.id} aria-pressed={selected.id === metric.id} aria-controls="usage-inspector" disabled={!enhanced} onclick={() => { selectedId = metric.id; }} onkeydown={event => selectWithKeyboard(event, metric.id)}>
                <span class="metric-index" aria-hidden="true">{String(webflowUsageMetrics.findIndex(item => item.id === metric.id) + 1).padStart(2, '0')}</span>
                <span class="metric-label">{metric.label}<small>{metric.unit}</small></span>
                <strong class="metric-value" data-usage-value>{number.format(metric.count)}</strong>
                <span class="metric-arrow" aria-hidden="true">↗</span>
                {#if metric.study === 'review-mcp'}<span class="metric-track" aria-hidden="true"><span style:width={`${metric.count / snapshot.review[0].calls * 100}%`}></span></span>{/if}
              </button>
              {#if selected.id === metric.id}<a class="mobile-inspect" data-usage-jump href="#usage-inspector" aria-label={`Read details for ${metric.label}`}>Read selected details <span aria-hidden="true">↓</span></a>{/if}
            {/each}
          </div>
        </div>
      {/each}
      <p class="usage-instruction">{enhanced ? 'Select a measure · Use ↑ ↓ to move between measures' : 'All definitions are available in the counting method below.'}</p>
    </div>
    <div id="usage-inspector" class="usage-inspector" tabindex="-1" aria-live="polite" aria-atomic="true">
      <div data-usage-inspector-body>
        <p class="inspector-eyebrow">What this records</p>
        <h3>{selected.label}</h3>
        <p class="inspector-definition">{selected.definition}</p>
        <p class="inspector-detail">{selected.detail}</p>
        <div class="inspector-source"><span>Source</span><p>{selected.source}</p></div>
        <p class="inspector-limit">{selected.limit}</p>
        {#if study === 'all'}<a href={`${selected.href}#recorded-usage`}>Read the study <span aria-hidden="true">↗</span></a>{/if}
      </div>
    </div>
  </div>
  <div class="usage-footnote"><span class="usage-status">Fixed snapshot</span><p>Tests, operator activity, repeat visits, and retries are not separated. These counts do not establish unique users, completed reviews, or hours saved.</p></div>
  <details class="usage-method" use:nativeDisclosure>
    <summary><span>Counting method and full definitions</span><span class="method-symbol" aria-hidden="true">+</span></summary>
    <div data-disclosure-body>
      <p>The window begins on 4 October 2026 at 00:00 UTC and ends before 3 November 2026 at 00:00 UTC. This is a fixed snapshot, not a live counter.</p>
      <dl>{#each metrics as metric}<div><dt>{metric.label} · {number.format(metric.count)} {metric.unit}</dt><dd>{metric.definition} {metric.detail} {metric.limit}</dd></div>{/each}</dl>
      <p>Counts come from stored tool-invocation records and legacy Dashboard analytics in Cloudflare D1. Recording is best effort. These records are separate from the historical footage and offline replays. They do not establish revenue or a measured improvement over an earlier process.</p>
    </div>
  </details>
</section>

<style>
  .usage-evidence { margin-block: var(--space-performance-xl); padding-block: var(--space-performance-lg); border-block: 1px solid var(--color-performance-border-default); scroll-margin-top: 100px; }
  .usage-heading { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: var(--space-performance-md); }
  .usage-heading h2 { margin-bottom: 0; }
  .usage-period { padding-bottom: 4px; font: 11px/1.7 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .usage-period p { font: 13px/1.6 var(--font-performance-interface); color: var(--color-performance-fg-primary); margin: 6px 0 10px; }
  .usage-intro { max-width: 65ch; font-size: 15px; line-height: 1.7; color: var(--color-performance-fg-secondary); margin: var(--space-performance-md) 0 var(--space-performance-lg); }
  .usage-layout { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: var(--space-performance-lg); align-items: start; }
  .usage-ledger { position: relative; min-width: 0; }
  .usage-marker { pointer-events: none; position: absolute; top: 0; left: 0; width: 2px; height: var(--usage-marker-height, 0px); transform: translateY(var(--usage-marker-y, 0px)); background: var(--color-performance-signal); opacity: 0; z-index: 1; }
  .usage-evidence:global([data-usage-motion-ready]) .usage-marker { opacity: 1; }
  .usage-group + .usage-group { margin-top: var(--space-performance-md); }
  .usage-group h3 { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 0; padding: 12px 0; font-size: 15px; line-height: 1.5; font-weight: 400; }
  .usage-group h3 span { font: 10px/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .usage-metric { position: relative; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto 14px; gap: 12px; align-items: center; width: 100%; min-height: 96px; padding: 20px 16px; border: 0; border-top: 1px solid var(--color-performance-border-default); border-left: 2px solid transparent; color: var(--color-performance-fg-primary); background: transparent; font-family: var(--font-performance-interface); text-align: left; cursor: pointer; }
  .usage-metric[aria-pressed='true'] { border-left-color: var(--color-performance-signal); background: var(--color-performance-bg-subtle); }
  .usage-evidence:global([data-usage-motion-ready]) .usage-metric[aria-pressed='true'] { border-left-color: transparent; }
  .usage-metric:hover:not(:disabled) { background: var(--color-performance-bg-subtle); }
  .usage-metric:disabled { cursor: default; opacity: 1; }
  .usage-metric:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: -2px; }
  .metric-index { font: 10px/1.5 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .metric-label { font-size: 14px; line-height: 1.5; }
  .metric-label small { display: block; margin-top: 4px; font: 10px/1.5 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .metric-value { font-size: clamp(24px, 3vw, 36px); line-height: 1; font-weight: 400; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
  .metric-arrow { font-size: 14px; color: var(--color-performance-fg-secondary); }
  .usage-metric[aria-pressed='true'] .metric-arrow { color: var(--color-performance-signal); }
  .metric-track { position: absolute; bottom: 0; left: 16px; right: 16px; height: 2px; background: var(--color-performance-border-default); }
  .metric-track > span { display: block; height: 100%; background: var(--color-performance-signal); }
  .usage-instruction { margin: 14px 0 0; font: 10px/1.7 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .mobile-inspect { display: none; }
  .usage-inspector:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 6px; }
  .usage-inspector { min-width: 0; min-height: 430px; border-top: 1px solid var(--color-performance-signal); padding: var(--space-performance-md) 0 var(--space-performance-sm); scroll-margin-top: 100px; }
  .inspector-eyebrow, .inspector-source > span { font: 10px/1.6 var(--font-performance-mono); text-transform: uppercase; color: var(--color-performance-fg-secondary); margin: 0; }
  .usage-inspector h3 { font-size: clamp(23px, 2.5vw, 32px); line-height: 1.2; font-weight: 400; letter-spacing: -.035em; margin: 18px 0; }
  .inspector-definition { font-size: 16px; line-height: 1.7; margin: 0 0 16px; }
  .inspector-detail, .inspector-limit { font-size: 13px; line-height: 1.8; color: var(--color-performance-fg-secondary); }
  .inspector-source { border-top: 1px solid var(--color-performance-border-default); margin-top: 20px; padding-top: 16px; }
  .inspector-source p { font-size: 12px; line-height: 1.7; margin: 6px 0; }
  .usage-inspector a { display: inline-flex; align-items: center; gap: 14px; min-height: 44px; margin-top: 8px; font-size: 13px; }
  .usage-footnote { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: var(--space-performance-md); border-top: 1px solid var(--color-performance-border-default); margin-top: var(--space-performance-md); padding-top: 20px; }
  .usage-status { font: 10px/1.8 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .usage-footnote p { max-width: 80ch; font-size: 12px; line-height: 1.8; color: var(--color-performance-fg-secondary); margin: 0; }
  .usage-method { margin-top: 20px; }
  .usage-method summary { display: flex; align-items: center; justify-content: space-between; gap: 20px; cursor: pointer; min-height: 48px; padding-block: 12px; border-top: 1px solid var(--color-performance-border-default); font-size: 13px; line-height: 1.6; list-style: none; }
  .usage-method summary::-webkit-details-marker { display: none; }
  .usage-method summary:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 4px; }
  .method-symbol { font: 20px/1 var(--font-performance-mono); }
  .usage-method[open] .method-symbol { transform: rotate(45deg); }
  .usage-method [data-disclosure-body] { max-width: 82ch; padding-bottom: 12px; }
  .usage-method p, .usage-method dd { font-size: 13px; line-height: 1.8; color: var(--color-performance-fg-secondary); }
  .usage-method dl > div { padding-block: 12px; }
  .usage-method dt { font: 12px/1.8 var(--font-performance-interface); text-transform: none; color: var(--color-performance-fg-primary); }
  .usage-method dd { margin: 8px 0 0; }
  @media (max-width: 900px) { .usage-heading { grid-template-columns: 1fr; gap: 22px; } .usage-layout { grid-template-columns: 1fr; gap: 24px; } .usage-inspector { min-height: 0; } .mobile-inspect { display: flex; align-items: center; justify-content: flex-end; gap: 12px; min-height: 44px; padding-inline: 16px; font-size: 12px; } }
  @media (max-width: 480px) { .usage-metric { grid-template-columns: 15px minmax(0, 1fr) auto; gap: 10px; padding-inline: 10px; min-height: 88px; } .metric-arrow { display: none; } .metric-label { font-size: 13px; } .metric-value { font-size: 28px; } .metric-track { left: 10px; right: 10px; } .usage-footnote { grid-template-columns: 1fr; gap: 6px; } .usage-group h3 span { font-size: 9px; } }
  @media print { .usage-marker { display: none; } .usage-metric { color: inherit; } .usage-instruction { display: none; } }
</style>
