<script lang="ts">
  let { scene, caption, priority = true, paired = false }: { scene: string; caption: string; priority?: boolean; paired?: boolean } = $props();
</script>

<figure class="library-scene">
  <img src={`/images/library/${scene}-1536.webp`}
    srcset={`/images/library/${scene}-768.webp 768w, /images/library/${scene}-1536.webp 1536w`}
    sizes={paired ? '(max-width: 1023px) calc(100vw - 48px), 50vw' : '(max-width: 767px) calc(100vw - 32px), (max-width: 1100px) calc(100vw - 48px), 1200px'}
    width="1536" height="1024" alt={caption}
    loading={priority ? 'eager' : 'lazy'} fetchpriority={priority ? 'high' : 'auto'} decoding="async" />
  <figcaption>Concept illustration · {caption}</figcaption>
</figure>

<style>
  .library-scene { margin: clamp(1.75rem, 4vw, 3rem) 0 0; width: 100%; text-align: left; }
  img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: contain; background: var(--color-operator-secondary, #17191c); }
  figcaption { margin-top: .65rem; color: var(--color-operator-muted, #a8abb2); font-family: var(--font-mono, monospace); font-size: .75rem; line-height: 1.6; }
</style>
