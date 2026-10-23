<script lang="ts">
  let { scene, caption, eager = true, sizes = '(min-width: 1200px) 1120px, 94vw' }: { scene: string; caption: string; eager?: boolean; sizes?: string } = $props();
</script>
<figure class="research-scene">
  <img src={`/images/research/${scene}-1440.webp`} srcset={`/images/research/${scene}-640.webp 640w, /images/research/${scene}-960.webp 960w, /images/research/${scene}-1440.webp 1440w`} {sizes} width="1440" height={scene === 'ground-compare-before-claim' ? 1152 : 960} alt={caption} loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} />
  <figcaption>Concept illustration · {caption}</figcaption>
</figure>
<style>
  .research-scene { margin: clamp(1.5rem, 4vw, 3rem) 0 0; width: 100%; }
  img { display: block; width: 100%; height: auto; border: 1px solid var(--color-performance-line); }
  figcaption { padding-block: .75rem; font: .75rem/1.6 var(--font-performance-mono); color: var(--color-performance-muted); }
</style>
