<script lang="ts">
  import Layout from '../../src/routes/+layout.svelte';
  import Start from '../../src/routes/start/+page.svelte';
  import Library from '../../src/routes/library/+page.svelte';
  import Admin from '../../src/routes/admin/+page.svelte';
  import Dashboard from '../../src/routes/dashboard/+page.svelte';
  import Login from '../../src/routes/login/+page.svelte';
  import Lesson from '../../src/routes/lessons/[id]/+page.svelte';
  import Paths from '../../src/lib/components/LearningPaths.svelte';
  let { data }: { data: any } = $props();
  const path = location.pathname;
</script>

<div class="fixture-banner">
  SYNTHETIC LOCAL FIXTURE · {data.identity?.role || 'anonymous'} · no real accounts, media or publishing
</div>
<Layout {data}>
  {#if data.denied}<main id="main" class="workspace">
      <h1>Access denied</h1>
      <p>{data.denied}</p>
      <a href="/library">Back to library</a>
    </main>
  {:else if path === '/admin'}<Admin {data} />
  {:else if path === '/library'}<Library {data} />
  {:else if path === '/dashboard'}<Dashboard {data} />
  {:else if path === '/login'}<Login />
  {:else if path.startsWith('/lessons/')}<Lesson {data} />
  {:else if path.startsWith('/paths')}<Paths {data} />
  {:else}<Start {data} />{/if}
</Layout>

<style>
  .fixture-banner {
    padding: 8px 24px;
    border-bottom: 1px solid var(--line);
    color: var(--state-warning);
    font-size: 12px;
  }
</style>
