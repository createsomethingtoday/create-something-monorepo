<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { page } from '$app/state';
</script>

<main id="main" class="form-page">
  <p class="eyebrow">PRIVATE / {page.status}</p>
  <h1>{page.status === 403 ? 'Access required.' : 'Not available.'}</h1>
  <p>{page.error?.message || 'This page could not be loaded.'}</p>
  <a class="button" href="/login">Sign in <Icon name="arrow-right" /></a><a href="/library"
    >Return to the library <Icon name="arrow-right" /></a
  >
</main>
