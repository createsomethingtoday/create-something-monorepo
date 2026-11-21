<script lang="ts">
  import { loadTurnstile } from './turnstile.js';
  let { siteKey, onToken, resetVersion = 0, theme = 'auto' }: {
    siteKey: string;
    onToken: (token: string) => void;
    resetVersion?: number;
    theme?: 'auto' | 'light' | 'dark';
  } = $props();
  let container: HTMLDivElement;
  let problem = $state('');
  let retry = $state(0);
  $effect(() => {
    const key = siteKey;
    void resetVersion;
    void retry;
    if (!key || !container) return;
    let disposed = false;
    let widget: string | undefined;
    let api: Awaited<ReturnType<typeof loadTurnstile>>;
    onToken('');
    problem = '';
    loadTurnstile().then((loaded) => {
      if (disposed) return;
      api = loaded;
      widget = api.render(container, {
        sitekey: key, theme, size: 'flexible',
        callback: (token: string) => { if (!disposed) { problem = ''; onToken(token); } },
        'expired-callback': () => { if (!disposed) { onToken(''); problem = 'Verification expired. Please verify again.'; } },
        'error-callback': () => { if (!disposed) { onToken(''); problem = 'Verification failed. Please retry.'; } },
        'timeout-callback': () => { if (!disposed) { onToken(''); problem = 'Verification timed out. Please retry.'; } }
      });
    }).catch(() => { if (!disposed) { onToken(''); problem = 'Verification could not load. Please retry.'; } });
    return () => {
      disposed = true;
      onToken('');
      if (widget !== undefined) api.remove(widget);
    };
  });
</script>
<div class="newsletter-verification">
  <div bind:this={container}></div>
  {#if problem}<p role="alert">{problem} <button type="button" onclick={() => retry += 1}>Retry verification</button></p>{/if}
</div>
<style>
  .newsletter-verification { margin-block: 1rem; min-width: 0; }
  p { font-size: .875rem; line-height: 1.5; }
  button { font: inherit; color: inherit; background: transparent; border: 0; text-decoration: underline; cursor: pointer; padding: .5rem; }
</style>
