<script lang="ts">
  import { webflowUsageSnapshot as snapshot } from '$lib/data/webflowUsage';

  let { study = 'all' }: { study?: 'all' | 'review-mcp' | 'asset-dashboard' } = $props();
  const number = new Intl.NumberFormat('en-US');
</script>

<section id="recorded-usage" class="usage-evidence" aria-labelledby="usage-title" data-webflow-usage={study}>
  <p class="eyebrow">Dated usage snapshot</p>
  <h2 id="usage-title">Recorded activity in the tools.</h2>
  <p class="usage-period">{snapshot.period} <span>· Checked {snapshot.checkedOn}</span></p>
  <p class="usage-intro">A separate read of Cloudflare records adds usage evidence to the recordings and implementation studies.</p>

  {#if study === 'all' || study === 'review-mcp'}
    <figure class="usage-group">
      <figcaption>Review tools <span>Recorded tool calls</span></figcaption>
      <dl class="usage-calls">
        {#each snapshot.review as tool}
          <div class="usage-call">
            <dt>{tool.label}</dt>
            <dd>{number.format(tool.calls)}</dd>
            <div class="usage-track" aria-hidden="true"><span style:width={`${tool.calls / snapshot.review[0].calls * 100}%`}></span></div>
          </div>
        {/each}
      </dl>
      <p class="usage-caption">Calls to tools that retrieve review context, run checks, and support review actions. Each call is counted separately.</p>
    </figure>
  {/if}

  {#if study === 'all' || study === 'asset-dashboard'}
    <div class="usage-group">
      <h3>Asset Dashboard <span>Legacy application</span></h3>
      <dl class="usage-dashboard">
        {#each snapshot.dashboard as event}
          <div><dt>{event.label}</dt><dd>{number.format(event.count)}</dd></div>
        {/each}
      </dl>
      <p class="usage-caption">Recorded events from the earlier Asset Dashboard. These numbers do not describe the Cloud port or native Creator Hub.</p>
    </div>
  {/if}

  <p class="usage-limit">Tests, operator activity, repeat visits, and retries are not separated in these counts. They do not establish unique users, completed reviews, or hours saved.</p>
  <details class="usage-method">
    <summary>How these numbers were counted</summary>
    <div>
      <p>This is a fixed snapshot, not a live counter. The window begins on 4 October at 00:00 UTC and ends before 3 November at 00:00 UTC.</p>
      {#if study === 'all' || study === 'review-mcp'}
        <p>Review counts come from tool-invocation records in Cloudflare D1. Template Review recorded {snapshot.review[0].failures} tool failures; App Review recorded none. Tool results do not establish review quality or final approval. Recording is best effort.</p>
      {/if}
      {#if study === 'all' || study === 'asset-dashboard'}
        <p>Dashboard counts come from its stored analytics events in Cloudflare D1. An asset-update completion event is a recorded event label, not an independent check of the saved business record. Events can be missed or repeated.</p>
      {/if}
      <p>These activity records are separate from the historical footage and offline replays shown in this study. They do not establish revenue or a measured improvement over an earlier process.</p>
    </div>
  </details>
</section>

<style>
  .usage-evidence { margin-block: var(--space-performance-xl); border-block: 1px solid var(--color-performance-border-default); padding-block: var(--space-performance-lg); scroll-margin-top: 100px; }
  .usage-evidence h2 { max-width: 22ch; }
  .usage-period { font: 12px/1.7 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .usage-period span { display: inline-block; }
  .usage-intro, .usage-limit, .usage-method p { max-width: 76ch; font-size: 15px; line-height: 1.8; color: var(--color-performance-fg-secondary); }
  .usage-group { margin: var(--space-performance-lg) 0; }
  .usage-group figcaption, .usage-group h3 { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-performance-sm); font-size: 19px; font-weight: 400; margin: 0 0 var(--space-performance-md); }
  .usage-group figcaption span, .usage-group h3 span { font: 11px/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .usage-calls { max-width: 800px; margin: 0; }
  .usage-call { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px var(--space-performance-sm); margin-block: 20px; }
  .usage-call dt { font: 14px/1.6 var(--font-performance-interface); text-transform: none; }
  .usage-call dd { margin: 0; font: 24px/1 var(--font-performance-interface); font-variant-numeric: tabular-nums; }
  .usage-track { grid-column: 1 / -1; height: 8px; background: var(--color-performance-border-default); }
  .usage-track span { display: block; height: 100%; background: var(--color-performance-signal); }
  .usage-dashboard { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 800px; gap: var(--space-performance-lg); margin: 0; }
  .usage-dashboard dt { font: 12px/1.7 var(--font-performance-mono); text-transform: none; }
  .usage-dashboard dd { font-size: clamp(36px, 5vw, 56px); line-height: 1.2; letter-spacing: -.04em; font-variant-numeric: tabular-nums; margin: 12px 0; }
  .usage-caption { max-width: 76ch; font-size: 13px; line-height: 1.7; color: var(--color-performance-fg-secondary); }
  .usage-limit { margin-top: var(--space-performance-lg); }
  .usage-method { margin-top: var(--space-performance-md); max-width: 85ch; }
  .usage-method summary { cursor: pointer; min-height: 44px; padding-block: 10px; font-size: 14px; line-height: 1.7; }
  .usage-method summary:focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 5px; }
  .usage-method div { padding-bottom: var(--space-performance-sm); }
  @media (max-width: 480px) { .usage-dashboard { grid-template-columns: 1fr; gap: var(--space-performance-sm); } }
</style>
