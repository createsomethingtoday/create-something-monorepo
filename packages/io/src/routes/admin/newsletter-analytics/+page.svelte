<script lang="ts">
  import '$lib/styles/newsletter-editorial.css';
  import { onMount } from 'svelte';
  import { fetchAdminJson } from '$lib/admin/client';
  interface Report {
    observed_at: string;
    audience: { total: number; active: number; unsubscribed: number };
    deliveries: { campaign: string; status: string; registered: number; delivered: number | null; states: Record<string, number> }[];
    engagement: { campaign: string; traffic_class: string; landing_sessions: number; resource_click_sessions: number; copy_sessions: number }[];
    archive: { action: string; traffic_class: string; events: number; sessions: number }[];
    attribution?: { edition: string; channel: string; campaign: string; traffic_class: string; landing_sessions: number; requested: number; confirmed: number }[];
    limitations: string;
  }
  let report = $state<Report | null>(null);
  let error = $state('');
  let loading = $state(true);
  async function refresh() {
    loading = true;
    error = '';
    const result = await fetchAdminJson<Report>('/api/admin/newsletter-analytics');
    if (result.ok) report = result.data;
    else { error = result.error.message; report = null; }
    loading = false;
  }
  onMount(refresh);
</script>

<svelte:head><title>Newsletter analytics | CREATE SOMETHING</title><meta name="robots" content="noindex" /></svelte:head>
<section class="report newsletter-editorial">
  <header><div><p class="period">Last 30 days</p><h1>Newsletter analytics</h1></div><button onclick={refresh} disabled={loading}>Refresh</button></header>
  {#if loading}<p role="status">Reading delivery and engagement evidence…</p>
  {:else if error}<p role="alert">{error}</p>
  {:else if report}
    <p>Read at {new Date(report.observed_at).toLocaleString()}. Provider delivery means the receiving mail server accepted the message.</p>
    <p><a href="/admin/newsletter">Open the editorial desk →</a></p>
    <dl class="audience" aria-label="Current list health">
      <div><dt>Subscriber records</dt><dd>{report.audience.total}</dd></div>
      <div><dt>Active</dt><dd>{report.audience.active}</dd></div>
      <div><dt>Unsubscribed</dt><dd>{report.audience.unsubscribed}</dd></div>
    </dl>
    <p>Active status alone does not establish send eligibility.</p>
    <h2>Edition and channel attribution</h2>
    <p>Configured campaign paths from consent-enabled visits through signup and direct confirmation. Counts describe observed activity, not causal lift or unique email recipients. Operator and automated traffic remain separate.</p>
    {#if !report.attribution}<p>Attribution unavailable. Do not substitute zero for missing evidence.</p>
    {:else if report.attribution.length === 0}<p>No attributed activity recorded in this window. Untagged historical activity cannot be recovered.</p>
    {:else}<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users can scroll wide tables.) -->
    <div class="table-wrap" role="region" aria-label="Edition and channel attribution table" tabindex="0"><table><thead><tr><th>Edition</th><th>Channel</th><th>Campaign</th><th>Traffic</th><th>Visit sessions</th><th>Signup requests</th><th>Confirmed signups</th></tr></thead><tbody>
      {#each report.attribution as row}<tr><td>{row.edition}</td><td>{row.channel}</td><td>{row.campaign}</td><td>{row.traffic_class}</td><td>{row.landing_sessions}</td><td>{row.requested}</td><td>{row.confirmed}</td></tr>{/each}
    </tbody></table></div>{/if}
    <h2>Delivery</h2>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users can scroll wide tables.) -->
    <div class="table-wrap" role="region" aria-label="Delivery table" tabindex="0"><table><thead><tr><th>Edition</th><th>Registered audience messages</th><th>Delivered</th><th>Evidence</th></tr></thead><tbody>
      {#each report.deliveries as row}<tr><td>{row.campaign}</td><td>{row.registered}</td><td>{row.delivered ?? 'Unavailable'}</td><td>{row.status === 'not-registered' ? 'No audience send registered' : row.status}</td></tr>{/each}
    </tbody></table></div>
    <h2>Archive activity</h2>
    <p>Existing website evidence. These visits are not attributed to email recipients; external traffic can include unmarked operator visits.</p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users can scroll wide tables.) -->
    <div class="table-wrap" role="region" aria-label="Archive activity table" tabindex="0"><table><thead><tr><th>Action</th><th>Traffic</th><th>Events</th><th>Sessions</th></tr></thead><tbody>
      {#each report.archive as row}<tr><td>{row.action}</td><td>{row.traffic_class}</td><td>{row.events}</td><td>{row.sessions}</td></tr>{/each}
    </tbody></table></div>
    <h2>Newsletter visits and resource use</h2>
    <p>A tagged email link starts a measured visit. Resource clicks and copies refer to activity within the following 30 minutes.</p>
    {#if report.engagement.length === 0}<p>No tagged newsletter visits recorded in this window. Collection begins with the first measured link; this does not establish historical engagement.</p>
    {:else}<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users can scroll wide tables.) -->
    <div class="table-wrap" role="region" aria-label="Newsletter visits and resource use table" tabindex="0"><table><thead><tr><th>Edition</th><th>Traffic</th><th>Visit sessions</th><th>Resource click sessions</th><th>Copy sessions</th></tr></thead><tbody>
      {#each report.engagement as row}<tr><td>{row.campaign}</td><td>{row.traffic_class}</td><td>{row.landing_sessions}</td><td>{row.resource_click_sessions}</td><td>{row.copy_sessions}</td></tr>{/each}
    </tbody></table></div>{/if}
    <h2>Measurement limits</h2>
    <p>Opens: unavailable. Email click rate: unavailable. Replies: not instrumented.</p>
    <p>{report.limitations}</p>
  {/if}
</section>
<style>
  .report { margin: 0 auto; max-width: 72rem; padding: clamp(1rem, 4vw, 3.5rem); }
  header { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid var(--newsletter-line); padding-bottom: 1.5rem; }
  h1, h2 { font-family: "Newsletter Serif", Georgia, serif; font-weight: 400; letter-spacing: -.045em; text-wrap: balance; color: var(--newsletter-ink); }
  h1 { margin: 0; font-size: clamp(2.75rem, 6vw, 5rem); line-height: 1; }
  h2 { margin: 3rem 0 1rem; font-size: clamp(1.8rem, 3.3vw, 2.75rem); line-height: 1.08; }
  p { margin-block: .9rem; max-width: 72ch; color: var(--newsletter-muted); line-height: 1.55; }
  .period { margin: 0 0 .6rem; font-size: .93rem; }
  button { border: 0; border-radius: .42rem; background: var(--newsletter-ink); color: white; min-height: 44px; padding: .65rem 1.25rem; font: inherit; cursor: pointer; }
  button:disabled { opacity: .65; cursor: wait; }
  a { color: var(--newsletter-ink); text-decoration: underline; text-underline-offset: .2em; }
  .audience { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr)); margin: 1.8rem 0 .5rem; gap: .75rem 2rem; }
  .audience div { padding: .8rem 0; border-block: 1px solid var(--newsletter-line); }
  dt, th { font-size: .875rem; color: var(--newsletter-muted); }
  dd { font: 400 3rem/1.1 "Newsletter Serif", Georgia, serif; margin: .3rem 0 0; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-variant-numeric: tabular-nums; }
  th, td { padding: .75rem .85rem; border-bottom: 1px solid var(--newsletter-line); vertical-align: top; }
  th { background: #efede8; font-weight: 600; line-height: 1.3; }
  [role="alert"] { color: #8b2327; }
</style>
