<script lang="ts">
  import { onMount } from 'svelte';
  import { motionEnabled } from './motion';
  let paused = $state(false);
  let ready = $state(false);
  let reduced = $state(true);
  onMount(() => {
    ready = true;
    try {
      paused = sessionStorage.getItem('maverick-motion-paused') === 'true';
    } catch {}
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduced = query.matches;
      motionEnabled.set(!reduced && !paused);
    };
    update();
    query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
      motionEnabled.set(false);
    };
  });
  function toggle() {
    paused = !paused;
    try {
      sessionStorage.setItem('maverick-motion-paused', String(paused));
    } catch {}
    motionEnabled.set(!paused && !reduced);
  }
</script>

{#if ready}
  <button
    class="motion-control"
    type="button"
    onclick={toggle}
    disabled={reduced}
    aria-pressed={paused || reduced}
  >
    <span aria-hidden="true">{$motionEnabled ? 'Ⅱ' : '▷'}</span>
    {reduced ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion'}
  </button>
{/if}

<style>
  .motion-control {
    position: fixed;
    z-index: 45;
    right: 18px;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    padding: 10px 16px;
    border: 1px solid #17302b55;
    border-radius: 30px;
    background: #fafbf8;
    color: #17302b;
    font:
      500 12px 'Barlow',
      sans-serif;
    box-shadow: 0 2px 12px #17302b12;
    cursor: pointer;
  }
  .motion-control:disabled {
    opacity: 0.85;
    cursor: default;
  }
  @media (max-width: 600px) {
    .motion-control {
      right: 12px;
      bottom: 12px;
      padding: 8px 12px;
    }
  }
</style>
