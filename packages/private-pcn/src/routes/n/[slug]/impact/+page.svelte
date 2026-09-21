<script lang="ts">
  let { data } = $props();
</script>

<svelte:head
  ><title>Network impact | Private</title><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="builder-workspace">
  <a href="/dashboard">Your networks</a>
  <p class="eyebrow">PRIVATE / NETWORK IMPACT</p>
  <h1>What people accessed.<br /><em>What remains to prove.</em></h1>
  <p class="lede">{data.report.note}</p>
  <div class="builder-grid">
    <section class="builder-panel">
      <h2>Membership</h2>
      <p>{data.report.members?.count || 0} active members</p>
      <p>{data.report.playback?.count || 0} playback grants in the last 30 days</p>
    </section>
    <section class="builder-panel">
      <h2>Asset orders</h2>
      {#each data.report.orders as row}<p>{row.status}: {row.count}</p>{:else}<p>
          No orders yet.
        </p>{/each}
    </section>
    <section class="builder-panel">
      <h2>Package delivery · 30 days</h2>
      {#each data.report.delivery as row}<p>
          {row.day}: {row.count} authorized deliveries
        </p>{:else}<p>No delivery grants recorded yet.</p>{/each}
    </section>
  </div>
  <p>
    Use an evaluation and an attributed field result to establish impact. These engagement counts
    alone do not establish customer outcomes.
  </p>
</main>
