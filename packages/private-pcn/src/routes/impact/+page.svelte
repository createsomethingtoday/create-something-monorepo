<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Impact | Private</title><meta name="robots" content="noindex" /></svelte:head>
<main id="main" class="builder-workspace">
  <p class="eyebrow">PRIVATE / IMPACT</p>
  <h1>Separate attention<br /><em>from outcomes.</em></h1>
  <p class="lede">{data.report.note}</p>
  <div class="builder-split">
    <section class="builder-panel">
      <h2>Server-confirmed records</h2>
      <h3>Creator applications</h3>
      {#each data.report.outcomes.applications as row}<p>{row.status}: {row.count}</p>{:else}<p>
          No applications yet.
        </p>{/each}
      <p>Free months started: {data.report.outcomes.trials?.count || 0}</p>
      <h3>Asset orders</h3>
      {#each data.report.outcomes.orders as row}<p>{row.status}: {row.count}</p>{:else}<p>
          No orders yet.
        </p>{/each}
    </section>
    <section>
      <h2>Engagement · last 30 days</h2>
      <p>
        Anonymous aggregate counts. No visitor IDs, credentials, invitation tokens, query strings or
        client content. Retained for 90 days. Privacy signals are respected.
      </p>
      <div class="impact-table">
        <table>
          <thead><tr><th>Date</th><th>Surface</th><th>Event</th><th>Count</th></tr></thead><tbody
            >{#each data.report.engagement as row}<tr
                ><td>{row.day}</td><td>{row.surface}</td><td>{row.event}</td><td>{row.count}</td
                ></tr
              >{:else}<tr><td colspan="4">No engagement recorded yet.</td></tr>{/each}</tbody
          >
        </table>
      </div>
    </section>
  </div>
</main>
