<script lang="ts">
  import '../app.css';
  let { children, data } = $props();
</script>

{#if data.guardAccess.scope || data.publicAuthRoute}
  {@render children()}
{:else}
  <main class="access-shell property-performance">
    <p class="eyebrow">Private player development</p>
    <h1>Sign in with CREATE SOMETHING to use Guard Performance Lab.</h1>
    <p>{data.guardAccess.detail}</p>
    <a class="button" href={data.guardAccess.signInUrl}>Sign in</a>
  </main>
{/if}
