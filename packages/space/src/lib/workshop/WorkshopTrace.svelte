<script lang="ts">
  let paused = $state(false);
</script>

<div class="workshop-trace" class:paused>
  <svg viewBox="0 0 900 90" aria-hidden="true"
    ><path class="rail" d="M0 65H220L290 25H560L630 65H900" /><path
      class="signal"
      d="M0 65H220L290 25H560L630 65H900"
    /><path class="station" d="m235 42 28-16 28 16-28 16zm300 0 28-16 28 16-28 16z" /></svg
  >
  <div>
    <p>
      Find a tool <span aria-hidden="true">→</span> Inspect the source
      <span aria-hidden="true">→</span> Make it useful
    </p>
    <button type="button" onclick={() => (paused = !paused)}
      >{paused ? 'Play motion' : 'Pause motion'}</button
    >
  </div>
</div>

<style>
  .workshop-trace {
    padding-block: 1.5rem;
    border-block: 1px solid var(--color-performance-line);
  }
  svg {
    width: 100%;
    height: 6rem;
    display: block;
    fill: none;
  }
  .rail {
    stroke: var(--color-performance-line-strong);
  }
  .signal {
    stroke: var(--color-performance-fg-secondary);
    stroke-dasharray: 2 24;
    animation: flow 8s linear infinite;
  }
  .station {
    fill: var(--color-performance-panel);
    stroke: var(--color-performance-fg-secondary);
  }
  .paused .signal {
    animation-play-state: paused;
  }
  div > div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }
  p,
  button {
    font: 0.7rem/1.7 var(--font-performance-mono);
  }
  p {
    color: var(--color-performance-fg-secondary);
  }
  p span {
    padding-inline: 0.75rem;
  }
  button {
    border: 1px solid var(--color-performance-line-strong);
    color: inherit;
    background: transparent;
    padding: 0.65rem;
    min-height: 44px;
    cursor: pointer;
  }
  @keyframes flow {
    to {
      stroke-dashoffset: -104;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .signal {
      animation: none;
    }
    button {
      display: none;
    }
  }
  @media (max-width: 640px) {
    div > div {
      align-items: start;
    }
    p {
      max-width: 15rem;
    }
    p span {
      padding-inline: 0.2rem;
    }
  }
</style>
