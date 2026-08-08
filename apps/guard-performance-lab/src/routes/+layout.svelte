<script lang="ts">
  import '../app.css';
  let { children, data } = $props();
</script>

{#if data.guardAccess.scope || data.publicAuthRoute}
  {@render children()}
{:else}
  <main class="access-shell access-gate property-performance">
    <section class="access-copy" aria-labelledby="access-title">
      <p class="eyebrow">Private player development</p>
      <h1 id="access-title">Guard Performance Lab.</h1>
      <p class="access-description">{data.guardAccess.detail}</p>
    </section>
    <aside class="access-action" aria-label="Private access">
      <div>
        <p class="mono">One password / one player</p>
        <h2>Continue to the player project.</h2>
        <p>The shared family password opens only the assigned player workspace. No email address or account lookup is required.</p>
      </div>
      <a class="button" href={data.guardAccess.signInUrl}>Enter password</a>
    </aside>
  </main>
{/if}
