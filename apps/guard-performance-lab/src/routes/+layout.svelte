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
        <p class="mono">First-party identity / exact scope</p>
        <h2>Continue to your workspace.</h2>
        <p>CREATE SOMETHING verifies the account. Guard Lab then opens either the operator workspace or one assigned player profile.</p>
      </div>
      <a class="button" href={data.guardAccess.signInUrl}>Sign in</a>
    </aside>
  </main>
{/if}
