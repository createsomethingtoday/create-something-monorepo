<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchAdminJson } from '$lib/admin/client';
  interface Report {
    observed_at: string;
    audience: { total: number; active: number; unsubscribed: number };
    deliveries: { campaign: string; status: string; registered: number; delivered: number | null; states: Record<string, number> }[];
    engagement: { campaign: string; traffic_class: string; landing_sessions: number; resource_click_sessions: number; copy_sessions: number }[];
    archive: { action: string; traffic_class: string; events: number; sessions: number }[];
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
<section class="report">
  <header><div><p>Newsletter / Last 30 days</p><h1>What readers did next</h1></div><button onclick={refresh} disabled={loading}>Refresh</button></header>
  {#if loading}<p role="status">Reading delivery and engagement evidence…</p>
  {:else if error}<p role="alert">{error}</p>
  {:else if report}
    <p>Read at {new Date(report.observed_at).toLocaleString()}. Provider delivery means the receiving mail server accepted the message.</p>
    <h2>Delivery</h2>
    <div class="table-wrap"><table><thead><tr><th>Edition</th><th>Registered audience messages</th><th>Delivered</th><th>Evidence</th></tr></thead><tbody>
      {#each report.deliveries as row}<tr><td>{row.campaign}</td><td>{row.registered}</td><td>{row.delivered ?? 'Unavailable'}</td><td>{row.status === 'not-registered' ? 'No audience send registered' : row.status}</td></tr>{/each}
    </tbody></table></div>
    <h2>Archive activity</h2>
    <p>Existing website evidence. These visits are not attributed to email recipients; external traffic can include unmarked operator visits.</p>
    <div class="table-wrap"><table><thead><tr><th>Action</th><th>Traffic</th><th>Events</th><th>Sessions</th></tr></thead><tbody>
      {#each report.archive as row}<tr><td>{row.action}</td><td>{row.traffic_class}</td><td>{row.events}</td><td>{row.sessions}</td></tr>{/each}
    </tbody></table></div>
    <h2>Newsletter visits and resource use</h2>
    <p>A tagged email link starts a measured visit. Resource clicks and copies refer to activity within the following 30 minutes.</p>
    {#if report.engagement.length === 0}<p>No tagged newsletter visits recorded in this window. Collection begins with the first measured link; this does not establish historical engagement.</p>
    {:else}<div class="table-wrap"><table><thead><tr><th>Edition</th><th>Traffic</th><th>Visit sessions</th><th>Resource click sessions</th><th>Copy sessions</th></tr></thead><tbody>
      {#each report.engagement as row}<tr><td>{row.campaign}</td><td>{row.traffic_class}</td><td>{row.landing_sessions}</td><td>{row.resource_click_sessions}</td><td>{row.copy_sessions}</td></tr>{/each}
    </tbody></table></div>{/if}
    <h2>List health and measurement limits</h2>
    <p>{report.audience.total} records · {report.audience.active} active · {report.audience.unsubscribed} unsubscribed. Active status alone does not establish send eligibility.</p>
    <p>Opens: unavailable. Email click rate: unavailable. Replies: not instrumented.</p>
    <p>{report.limitations}</p>
  {/if}
</section>
<style>
  .report { max-width: 80rem; margin: 0 auto; padding: var(--space-performance-lg); }
  header { display: flex; justify-content: space-between; gap: var(--space-performance-md); align-items: center; }
  h1 { font-size: var(--text-performance-heading-xl); }
  h2 { margin-top: var(--space-performance-xl); font-size: var(--text-performance-heading-md); }
  p { margin-block: var(--space-performance-md); max-width: 70ch; line-height: 1.6; }
  button { background: var(--color-performance-bg-surface); color: var(--color-performance-fg-primary); border: 1px solid var(--color-performance-border-default); padding: var(--space-performance-sm); cursor: pointer; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th, td { padding: var(--space-performance-sm); border-bottom: 1px solid var(--color-performance-border-default); vertical-align: top; }
</style>
