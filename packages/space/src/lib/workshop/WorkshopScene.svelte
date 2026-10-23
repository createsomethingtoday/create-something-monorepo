<script lang="ts">
  import { scenes, type SceneKey } from './scenes';
  let {
    scene,
    eager = false,
    caption = true,
    sizes = '(max-width: 760px) calc(100vw - 32px), (max-width: 1200px) 55vw, 720px'
  }: { scene: SceneKey; eager?: boolean; caption?: boolean; sizes?: string } = $props();
  const item = $derived(scenes[scene]);
  const base = $derived(`/images/workshop/stories/${item.stem}`);
</script>

<figure class="workshop-scene">
  <img
    src={`${base}.webp`}
    srcset={`${base}-640.webp 640w, ${base}-960.webp 960w, ${base}.webp ${item.width}w`}
    {sizes}
    alt={item.alt}
    width={item.width}
    height={item.height}
    loading={eager ? 'eager' : 'lazy'}
    fetchpriority={eager ? 'high' : 'auto'}
  />
  {#if caption}<figcaption><span>Concept illustration</span> · {item.caption}</figcaption>{/if}
</figure>

<style>
  .workshop-scene {
    margin: 0;
    min-width: 0;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 2px;
  }
  figcaption {
    margin-top: 0.75rem;
    font: 0.7rem/1.6 var(--font-performance-mono);
    color: var(--color-performance-fg-secondary, #bfc2ca);
  }
  figcaption span {
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
