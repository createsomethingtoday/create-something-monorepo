<script lang="ts">
  import { imageEntry } from './motion';
  let selected = $state(0);
  const scenes = [
    { name: 'Oil & Gas', image: 'oilHero' },
    { name: 'Mining & Metals', image: 'miningHero' }
  ];
</script>

<div class="industry-sequence" aria-label="Industry imagery">
  <div class="sequence-controls" aria-label="Choose industry image">
    {#each scenes as scene, index}
      <button type="button" aria-pressed={selected === index} onclick={() => (selected = index)}>
        <span aria-hidden="true">0{index + 1}</span>{scene.name}<span aria-hidden="true">↗</span>
      </button>
    {/each}
  </div>
  <figure>
    {#key selected}
      <img
        use:imageEntry
        src={`/redesign/reference-${scenes[selected].image}.jpg`}
        alt={`${scenes[selected].name} industry landscape`}
        width="1280"
        height="720"
        loading="lazy"
      />
    {/key}
    <figcaption aria-live="polite">{scenes[selected].name}</figcaption>
  </figure>
</div>

<style>
  .industry-sequence {
    margin: 32px 0 48px;
  }
  .sequence-controls {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
  }
  .sequence-controls button {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 14px 0;
    background: transparent;
    color: #4e685e;
    border-bottom: 1px solid #17302b33;
    text-align: left;
    font-size: 18px;
  }
  .sequence-controls button[aria-pressed='true'] {
    color: #17302b;
    border-bottom: 2px solid #17302b;
  }
  button span:first-child {
    font-size: 11px;
    letter-spacing: 1px;
  }
  button span:last-child {
    margin-left: auto;
  }
  figure {
    margin: 0;
    position: relative;
    overflow: hidden;
    background: #dce5df;
    border-radius: 4px 100px 4px 4px;
  }
  img {
    display: block;
    width: 100%;
    height: clamp(260px, 38vw, 480px);
    object-fit: cover;
  }
  figcaption {
    padding: 16px 24px;
    font-size: 13px;
    letter-spacing: 1px;
  }
  @media (max-width: 600px) {
    .sequence-controls {
      gap: 16px;
    }
    .sequence-controls button {
      font-size: 16px;
      gap: 8px;
    }
    figure {
      border-top-right-radius: 64px;
    }
  }
</style>
