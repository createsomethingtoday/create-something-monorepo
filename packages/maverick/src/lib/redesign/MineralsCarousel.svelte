<script lang="ts">
  let index = $state(0);
  const minerals = [
    { name: 'Gold', image: 'gold' },
    { name: 'Platinum', image: 'platinum' },
    { name: 'Iridium', image: 'iridium' },
    { name: 'Rare earth elements', image: 'rare-earth-elements' },
    { name: 'Vanadium', image: 'vanadium' }
  ];
  function move(delta: number) {
    index = (index + delta + minerals.length) % minerals.length;
  }
</script>

<section
  class="design-section light-content mineral-section"
  aria-roledescription="carousel"
  aria-label="Mineral gallery"
>
  <div class="mineral-layout">
    <div>
      <p class="eyebrow">Mining &amp; Metals</p>
      <h2>Mineral gallery</h2>
      <p>Explore the materials behind the mining and metals industry.</p>
      <p class="caption">
        Illustrative mineral imagery from the existing asset library. Suitability requires
        laboratory evaluation.
      </p>
      <div class="mineral-choices" aria-label="Choose a mineral">
        {#each minerals as mineral, choice}
          <button type="button" aria-pressed={index === choice} onclick={() => (index = choice)}
            >{mineral.name}</button
          >
        {/each}
      </div>
      <div class="controls">
        <button type="button" onclick={() => move(-1)} aria-label="Previous mineral">←</button><span
          aria-live="polite"
          aria-atomic="true">{index + 1} / {minerals.length} · {minerals[index].name}</span
        ><button type="button" onclick={() => move(1)} aria-label="Next mineral">→</button>
      </div>
    </div>
    <figure>
      <img
        src={`/images/metals/${minerals[index].image}.png`}
        alt={minerals[index].name}
        width="600"
        height="600"
        loading="lazy"
      />
      <figcaption>{minerals[index].name}</figcaption>
    </figure>
  </div>
</section>

<style>
  .mineral-section {
    padding: 96px 48px;
    border-top: 1px solid #18222b26;
  }
  .mineral-layout {
    max-width: 1200px;
    margin: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: center;
  }
  .eyebrow {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 3px;
  }
  h2 {
    font:
      500 clamp(36px, 4vw, 56px)/1.1 'Barlow Condensed',
      sans-serif;
    text-transform: uppercase;
    margin: 20px 0;
  }
  p {
    font-size: 18px;
    line-height: 1.6;
    max-width: 450px;
  }
  .caption {
    font-size: 14px;
    color: #52616b;
  }
  figure {
    margin: 0;
    background: #f4f5f5;
    padding: 24px;
    text-align: center;
  }
  img {
    display: block;
    width: 100%;
    height: 360px;
    object-fit: contain;
  }
  figcaption {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 16px 0;
  }
  .mineral-choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 24px;
  }
  .mineral-choices button {
    background: transparent;
    color: #52616b;
    border: 1px solid #c4ccd0;
    padding: 10px 14px;
    font-size: 14px;
    text-align: left;
  }
  .mineral-choices button[aria-pressed='true'] {
    background: #18222b;
    color: white;
    border-color: #18222b;
  }
  .controls {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-top: 32px;
  }
  .controls span {
    flex: 1;
    font-size: 14px;
  }
  button {
    min-width: 48px;
    min-height: 48px;
    background: #18222b;
    color: white;
    font-size: 24px;
  }
  @media (max-width: 600px) {
    .mineral-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 32px;
    }
    img {
      height: 240px;
    }
  }
</style>
