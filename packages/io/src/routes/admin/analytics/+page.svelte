<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { Sparkline } from '@create-something/tufte';
  import { onMount } from 'svelte';
  import { fetchAdminJson, type AdminRequestError } from '$lib/admin/client';
  import { normalizeAnalyticsDays, type AnalyticsDays } from '$lib/admin/analytics-dashboard';
  import type { WeeklyScorecard } from '$lib/admin/weekly-scorecard';

  let days: AnalyticsDays = 7;
  let loading = true;
  let report: WeeklyScorecard | null = null;
  let requestError: AdminRequestError | null = null;
  let sequence = 0;
  const groups = ['Discovery', 'Usefulness', 'Relationship', 'Verified outcomes'] as const;
  const number = (value: number | null) =>
    value === null ? 'Unavailable' : new Intl.NumberFormat('en-US').format(value);
  const day = (value: string) => value.slice(0, 10);
  async function loadAnalytics() {
    const request = ++sequence;
    loading = true;
    requestError = null;
    const result = await fetchAdminJson<WeeklyScorecard>(`/api/admin/analytics?days=${days}`, {
      cache: 'no-store'
    });
    if (request !== sequence) return;
    if (result.ok) report = result.data;
    else {
      requestError = result.error;
      report = null;
    }
    loading = false;
  }
  function changeRange(event: Event) {
    days = normalizeAnalyticsDays((event.currentTarget as HTMLSelectElement).value);
    void loadAnalytics();
  }
  onMount(() => {
    void loadAnalytics();
  });
</script>

<SEO
  title="Admin — Audience scorecard"
  description="Private weekly audience review"
  propertyName="io"
  noindex={true}
/>

<div class="scorecard" aria-busy={loading}>
  <header>
    <div>
      <p class="eyebrow">Performance Lab / Audience evidence</p>
      <h1>Audience scorecard</h1>
      <p class="intro">
        Discovery → usefulness → relationship → verified outcomes.<br />Each signal keeps its own
        unit and source.
      </p>
    </div>
    <div class="controls">
      <label for="analytics-range">Review window</label>
      <select id="analytics-range" value={days} onchange={changeRange}>
        <option value={7}>7 complete UTC days</option><option value={30}
          >30 complete UTC days</option
        ><option value={90}>90 complete UTC days</option>
      </select>
      <button type="button" onclick={loadAnalytics} disabled={loading}>Refresh sources</button>
    </div>
  </header>

  {#if loading}
    <p class="notice" role="status">Loading the scorecard and checking source coverage…</p>
  {:else if requestError}
    <section class="notice" role="alert">
      <h2>Scorecard unavailable</h2>
      <p>
        {requestError.kind === 'unauthorized'
          ? 'Your admin session has expired. Sign in again to continue.'
          : requestError.kind === 'forbidden'
            ? 'This account does not have analytics access.'
            : 'The service could not be reached. No zero values have been substituted.'}
      </p>
      {#if requestError.kind === 'unauthorized'}<a href="/admin/login?next=%2Fadmin%2Fanalytics"
          >Sign in again</a
        >
      {:else if requestError.kind !== 'forbidden'}<button type="button" onclick={loadAnalytics}
          >Retry scorecard</button
        >{/if}
    </section>
  {:else if report}
    <section class="window-note" aria-label="Report dates">
      <p>
        <strong>Current</strong>
        {day(report.windows.current.start)} → {day(report.windows.current.end)}
        <span>(end excluded)</span><br />
        <strong>Prior</strong>
        {day(report.windows.prior.start)} → {day(report.windows.prior.end)}
        <span>(end excluded)</span>
      </p>
      <div>
        <p>Checked {report.observedAt.replace('T', ' ').slice(0, 19)} UTC</p>
        <a href="/api/admin/analytics?days={days}&format=markdown" download>Download review (.md)</a
        >
      </div>
    </section>
    {#if report.sources.some((s) => s.status === 'unavailable')}
      <p class="notice" role="status">
        <strong>Partial source coverage.</strong> Available signals are shown below. Unavailable means
        the source could not be read or has no safe aggregate contract. Check source details, then refresh.
      </p>
    {/if}
    {#if report.properties.every((p) => p.sessions === 0)}
      <p class="notice">
        No eligible public session activity in the available traffic sources for this window. Check
        source freshness before interpreting an empty period.
      </p>
    {/if}

    {#each groups as group, index}
      <section class="measure-section" aria-labelledby="group-{index}">
        <div class="section-heading">
          <p class="eyebrow">0{index + 1} / Signal</p>
          <h2 id="group-{index}">{group}</h2>
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable comparison tables need keyboard access.) -->
        <div class="table-scroll" tabindex="0" role="region" aria-label="{group} comparisons">
          <table>
            <caption>{group} · current and equal prior UTC periods</caption>
            <thead
              ><tr
                ><th scope="col">Measure</th><th scope="col">Current</th><th scope="col">Prior</th
                ><th scope="col">Unit</th></tr
              ></thead
            >
            <tbody
              >{#each report.metrics.filter((m) => m.group === group) as metric}
                <tr
                  ><th scope="row"><span>{metric.label}</span></th>
                  <td class:unavailable={metric.current === null}>{number(metric.current)}</td>
                  <td class:unavailable={metric.prior === null}>{number(metric.prior)}</td><td
                    class="unit">{metric.unit}</td
                  ></tr
                >
              {/each}</tbody
            >
          </table>
        </div>
        <details class="definitions">
          <summary>{group} definitions and sources</summary>
          <dl>
            {#each report.metrics.filter((m) => m.group === group) as metric}
              <dt>{metric.label} · {metric.source}</dt>
              <dd>{metric.definition}</dd>
            {/each}
          </dl>
        </details>
        {#if group === 'Relationship'}
          <div class="snapshot">
            <h3>Audience eligibility · current snapshot</h3>
            <p>
              {#if report.audience}<strong>{number(report.audience.eligible)}</strong> eligible · {number(
                  report.audience.active
                )} active · {number(report.audience.total)} total records{:else}Unavailable —
                restore the audience read before comparing list size.{/if}
            </p>
            <p>
              Eligible requires confirmed double opt-in, recorded consent evidence, reviewed
              audience classification and no suppression. Active and total are not sendable audience
              counts. No prior snapshot is available.
            </p>
            <p>
              Historical delivery ledger: {number(report.historicalDeliveries)} provider IDs. Excluded
              from period counts; stored history, not fresh provider evidence.
              <a href="/admin/newsletter-analytics">Open newsletter evidence</a>.
            </p>
          </div>
        {/if}
      </section>
    {/each}

    <section class="measure-section" aria-labelledby="coverage-title">
      <div class="section-heading">
        <p class="eyebrow">Coverage / Traffic quality</p>
        <h2 id="coverage-title">Five properties, separate sessions</h2>
        <p>Sessions can appear on more than one property. External does not guarantee human.</p>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable comparison tables need keyboard access.) -->
      <div class="table-scroll" tabindex="0" role="region" aria-label="Property traffic coverage">
        <table>
          <caption
            >Current traffic after session-wide exclusions; missing sources remain unavailable</caption
          >
          <thead
            ><tr
              ><th scope="col">Property</th><th scope="col">Page views</th><th scope="col"
                >Prior views</th
              ><th scope="col">External sessions</th><th scope="col">Unclassified</th><th
                scope="col">Excluded sessions</th
              ></tr
            ></thead
          >
          <tbody
            >{#each report.properties as p}<tr
                ><th scope="row">{p.property === 'lms' ? 'Learn' : `.${p.property}`}</th><td
                  >{number(p.views)}</td
                ><td>{number(p.priorViews)}</td><td>{number(p.external)}</td><td
                  >{number(p.unclassified)}</td
                ><td>{number(p.excluded)}</td></tr
              >{/each}</tbody
          >
        </table>
      </div>
    </section>

    <section class="measure-section" aria-labelledby="daily-title">
      <div class="section-heading">
        <p class="eyebrow">Discovery / Context</p>
        <h2 id="daily-title">Daily public page views</h2>
        <p>
          All five properties; current UTC period. Zero days are included only when both traffic
          sources succeed.
        </p>
      </div>
      {#if report.daily.length}
        <div class="trend">
          <Sparkline
            data={report.daily}
            width={600}
            height={100}
            showFill={false}
            showReferenceLine={true}
          />
        </div>
        <details>
          <summary>Read daily counts</summary>
          <ul>
            {#each report.daily as d}<li>{d.date}: {number(d.count)} page views</li>{/each}
          </ul>
        </details>
      {:else}<p class="notice">
          Combined daily trend unavailable while a traffic source is missing.
        </p>{/if}
      <h3 class="top-heading">Top public pages · available sources</h3>
      {#if report.topPages.length}<ol class="pages">
          {#each report.topPages as p}<li>
              <span>{p.property === 'lms' ? 'Learn' : `.${p.property}`} <code>{p.path}</code></span
              ><strong>{number(p.count)} <small>views</small></strong>
            </li>{/each}
        </ol>
      {:else}<p>No eligible page views in available sources.</p>{/if}
    </section>

    <section class="measure-section" aria-labelledby="acquisition-title">
      <div class="section-heading">
        <p class="eyebrow">Discovery / Source context</p>
        <h2 id="acquisition-title">How public sessions arrive</h2>
        <p>
          First observed page-view referral per property session. Available sources only;
          unattributed does not mean direct traffic. These categories do not prove causal
          acquisition.
        </p>
      </div>
      {#if report.acquisition.length}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable comparison tables need keyboard access.) -->
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Acquisition source comparisons"
        >
          <table>
            <caption>Public landing sessions by source category; no raw referrer URLs</caption>
            <thead
              ><tr
                ><th scope="col">Property / Channel</th><th scope="col">Current</th><th scope="col"
                  >Prior</th
                ></tr
              ></thead
            >
            <tbody
              >{#each report.acquisition as row}<tr>
                  <th scope="row"
                    >{row.property === 'lms' ? 'Learn' : `.${row.property}`} / {row.channel.replaceAll(
                      '_',
                      ' '
                    )}</th
                  >
                  <td>{number(row.current)}</td><td>{number(row.prior)}</td>
                </tr>{/each}</tbody
            >
          </table>
        </div>
      {:else}<p>
          No eligible landing sessions in available sources. Check source status before interpreting
          missing activity.
        </p>{/if}
      <details class="definitions">
        <summary>Country context · public page views</summary>
        <p>
          Countries describe requests, not personas or verified people. Unknown and invalid country
          codes are omitted. Available sources only; no cross-property identity join.
        </p>
        {#if report.countries.length}<ul>
            {#each report.countries as row}<li>
                {row.country}: {number(row.views)} page views
              </li>{/each}
          </ul>
        {:else}<p>No country context available for eligible page views.</p>{/if}
      </details>
    </section>

    <section class="measure-section" aria-labelledby="sources-title">
      <div class="section-heading">
        <p class="eyebrow">Evidence / Recovery</p>
        <h2 id="sources-title">Source status and freshness</h2>
        <p>
          Latest read record is not a health check. A quiet source can be healthy; an old source may
          need investigation.
        </p>
      </div>
      <div class="sources">
        {#each report.sources as source}<article>
            <h3>{source.label}</h3>
            <p class="source-status">
              {source.status === 'ready' ? 'Read succeeded' : 'Unavailable'} · Latest record: {source.latestAt ??
                'none available'}
            </p>
            <p>{source.detail}</p>
          </article>{/each}
      </div>
    </section>
    <section class="measure-section" aria-labelledby="limits-title">
      <p class="eyebrow">Judgment / Boundaries</p>
      <h2 id="limits-title">Read the limits with the numbers</h2>
      <ul class="limits">
        {#each report.limitations as limit}<li>{limit}</li>{/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .scorecard {
    color: var(--color-performance-fg-primary);
    max-width: 80rem;
    margin: 0 auto;
  }
  header,
  .window-note {
    display: flex;
    justify-content: space-between;
    gap: var(--space-performance-lg);
    flex-wrap: wrap;
  }
  header {
    padding-bottom: var(--space-performance-xl);
  }
  h1 {
    font-size: var(--text-performance-h1);
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-weight: 600;
    margin: var(--space-performance-sm) 0;
  }
  h2 {
    font-size: var(--text-performance-h3);
    font-weight: 500;
    line-height: 1.25;
  }
  h3 {
    font-size: var(--text-performance-body);
    font-weight: 500;
  }
  .eyebrow {
    font: var(--text-performance-caption) var(--font-performance-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-performance-fg-tertiary);
  }
  p,
  small,
  li {
    line-height: 1.6;
  }
  .intro,
  .section-heading > p:last-child,
  .snapshot p,
  .sources p,
  .limits,
  .window-note {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
  }
  .controls {
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    gap: var(--space-performance-sm);
    font-size: var(--text-performance-body-sm);
  }
  select,
  button {
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-primary);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    padding: var(--space-performance-sm) var(--space-performance-md);
    min-height: 44px;
  }
  button:disabled {
    color: var(--color-performance-fg-tertiary);
    cursor: wait;
  }
  a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  :is(a, button, select, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--color-performance-fg-primary);
    outline-offset: 4px;
  }
  .notice {
    background: var(--color-performance-bg-surface);
    border-left: 2px solid var(--color-performance-fg-secondary);
    padding: var(--space-performance-md);
    margin: var(--space-performance-lg) 0;
    font-size: var(--text-performance-body-sm);
  }
  .notice button,
  .notice a {
    display: inline-block;
    margin-top: var(--space-performance-md);
  }
  .window-note {
    border-block: 1px solid var(--color-performance-border-default);
    padding: var(--space-performance-md) 0;
    font-variant-numeric: tabular-nums;
  }
  .window-note strong {
    color: var(--color-performance-fg-primary);
  }
  .window-note span {
    color: var(--color-performance-fg-tertiary);
  }
  .measure-section {
    padding: var(--space-performance-lg) 0;
    border-bottom: 1px solid var(--color-performance-border-default);
  }
  .section-heading {
    margin-bottom: var(--space-performance-lg);
    max-width: 48rem;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: var(--text-performance-body-sm);
  }
  caption {
    text-align: left;
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
    padding-bottom: var(--space-performance-sm);
  }
  th,
  td {
    padding: var(--space-performance-sm);
    border-bottom: 1px solid var(--color-performance-border-default);
    vertical-align: top;
  }
  thead th {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  tbody th {
    font-weight: 500;
    min-width: 19rem;
    max-width: 38rem;
  }
  .definitions dt {
    font-weight: 500;
    margin-top: var(--space-performance-md);
  }
  .definitions dd {
    color: var(--color-performance-fg-secondary);
    max-width: 85ch;
  }

  td {
    font-family: var(--font-performance-mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .unavailable,
  .unit {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
  }
  .snapshot {
    padding: var(--space-performance-md) 0;
    max-width: 65ch;
  }
  .snapshot p {
    margin-top: var(--space-performance-sm);
  }
  .snapshot strong {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h3);
  }
  .sources {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-lg);
  }
  .sources article {
    border-top: 1px solid var(--color-performance-border-default);
    padding-top: var(--space-performance-md);
  }
  .sources .source-status {
    font: var(--text-performance-caption) var(--font-performance-mono);
    color: var(--color-performance-fg-tertiary);
    margin: var(--space-performance-sm) 0;
  }
  .trend {
    overflow: hidden;
    margin: var(--space-performance-lg) 0;
  }
  .trend :global(svg) {
    width: 100%;
    height: auto;
    max-height: 160px;
  }
  details {
    font-size: var(--text-performance-body-sm);
  }
  summary {
    cursor: pointer;
    padding: var(--space-performance-sm) 0;
  }
  .top-heading {
    margin-top: var(--space-performance-xl);
  }
  .pages {
    padding: 0;
    list-style: none;
  }
  .pages li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-performance-md);
    padding: var(--space-performance-sm) 0;
    border-bottom: 1px solid var(--color-performance-border-default);
    font-size: var(--text-performance-body-sm);
  }
  code {
    overflow-wrap: anywhere;
    color: var(--color-performance-fg-secondary);
  }
  .pages strong {
    white-space: nowrap;
    font: var(--text-performance-body-sm) var(--font-performance-mono);
  }
  .pages small {
    color: var(--color-performance-fg-tertiary);
  }
  .limits {
    padding-left: var(--space-performance-lg);
    max-width: 85ch;
  }
  .limits li {
    margin-top: var(--space-performance-sm);
  }
  @media (max-width: 640px) {
    .controls {
      width: 100%;
    }
    .sources {
      grid-template-columns: 1fr;
    }
    h1 {
      font-size: var(--text-performance-h2);
    }
    tbody th {
      min-width: 15rem;
    }
  }
</style>
