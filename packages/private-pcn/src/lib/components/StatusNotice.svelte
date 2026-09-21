<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    message,
    tone = 'info',
    busy = false
  }: {
    message: string;
    tone?: 'info' | 'success' | 'warning' | 'error';
    busy?: boolean;
  } = $props();
</script>

<div
  class="state-notice"
  data-tone={tone}
  role={tone === 'error' ? 'alert' : 'status'}
  aria-atomic="true"
>
  <span class:state-working={busy}><Icon name={busy ? 'loading' : tone} /></span>
  <span>{message}</span>
</div>
