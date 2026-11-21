<script lang="ts">
  import { onMount } from 'svelte';
  let { src, alt, tone }: { src: string; alt: string; tone: string } = $props();
  let canvas: HTMLCanvasElement;
  let ready = $state(false);
  onMount(() => {
    const image = new Image();
    let disposed = false;
    image.onload = () => {
      if (disposed) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      const size = 160;
      canvas.width = canvas.height = size;
      const crop = Math.min(image.width, image.height);
      context.drawImage(
        image,
        (image.width - crop) / 2,
        (image.height - crop) / 2,
        crop,
        crop,
        0,
        0,
        size,
        size
      );
      const pixels = context.getImageData(0, 0, size, size);
      const rgb = tone.match(/\w\w/g)!.map((part) => parseInt(part, 16));
      const matrix = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = (y * size + x) * 4;
          const luminance =
            (pixels.data[p] * 0.299 + pixels.data[p + 1] * 0.587 + pixels.data[p + 2] * 0.114) /
            255;
          const light = luminance > (matrix[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
          for (let c = 0; c < 3; c++) pixels.data[p + c] = light ? rgb[c] : 10;
        }
      context.putImageData(pixels, 0, 0);
      ready = true;
    };
    image.src = src;
    return () => {
      disposed = true;
      image.onload = null;
    };
  });
</script>

<div class="dither-scene">
  <img {src} {alt} width="1024" height="1024" /><canvas
    bind:this={canvas}
    class:ready
    aria-hidden="true"
  ></canvas>
</div>

<style>
  .dither-scene {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: #0a0a0a;
  }
  img,
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  canvas {
    position: absolute;
    inset: 0;
    opacity: 0;
    image-rendering: pixelated;
  }
  canvas.ready {
    opacity: 1;
  }
</style>
