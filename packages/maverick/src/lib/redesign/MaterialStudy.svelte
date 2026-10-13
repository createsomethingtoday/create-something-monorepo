<script lang="ts">
  import { materialMotion } from './motion';
  import Media from './Media.svelte';
  let { id, film = false }: { id: string; film?: boolean } = $props();
  // Original abstract contour study. It represents no molecule, measurement or test result.
  const contours = Array.from({ length: 26 }, (_, i) => {
    const radius = 68 + i * 5.2;
    return (
      Array.from({ length: 73 }, (_, j) => {
        const angle = (j / 72) * Math.PI * 2;
        const wave = 1 + 0.13 * Math.sin(angle * 3 + i * 0.08);
        return `${j === 0 ? 'M' : 'L'}${(300 + Math.cos(angle) * radius * wave).toFixed(2)},${(290 + Math.sin(angle) * radius * 0.84 * wave).toFixed(2)}`;
      }).join(' ') + 'Z'
    );
  });
</script>

<div class="material-study" use:materialMotion data-active="false" data-material-study>
  <div class="material-light" aria-hidden="true"></div>
  <div class="material-object" aria-hidden="true">
    {#if film}<div class="film-aperture"><Media kind="home" opacity={0.7} /></div>{/if}
    <svg viewBox="0 0 600 600" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="1" y2="1"
          ><stop stop-color="#ffffff" /><stop offset=".38" stop-color="#dce5df" /><stop
            offset=".65"
            stop-color="#9cb4a7"
          /><stop offset="1" stop-color="#f6f8ee" /></linearGradient
        >
        <linearGradient id={`${id}-line`} x1="0" y1="1" x2="1" y2="0"
          ><stop stop-color="#17302b" stop-opacity=".7" /><stop
            offset=".5"
            stop-color="#ffffff"
          /><stop offset="1" stop-color="#718e81" /></linearGradient
        >
      </defs>
      <g class="contour-body">
        <path d={contours[25]} fill={`url(#${id}-surface)`} opacity={film ? 0.6 : 1} />
        {#each contours as contour}<path
            d={contour}
            fill="none"
            stroke={`url(#${id}-line)`}
            stroke-width="1.4"
          />{/each}
      </g>
      <g class="material-orbit" fill="none" stroke="#718e81" stroke-width=".6" opacity=".45"
        ><ellipse cx="300" cy="290" rx="255" ry="195" /><ellipse
          cx="300"
          cy="290"
          rx="270"
          ry="212"
        /></g
      >
    </svg>
  </div>
  <div class="material-caption">
    <span>Form / Matter / Motion</span><span>Illustrative material study</span>
  </div>
</div>

<style>
  .material-study {
    position: relative;
    width: 100%;
    min-height: 380px;
    aspect-ratio: 1.08;
    isolation: isolate;
    overflow: hidden;
    background: #eaf0e9;
    border-radius: 48% 48% 4px 4px;
    perspective: 1000px;
  }
  .material-object {
    position: absolute;
    inset: 0;
    transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
    transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .contour-body {
    transform-origin: 300px 290px;
    animation: material-turn 18s ease-in-out infinite alternate;
    animation-play-state: paused;
  }
  .material-orbit {
    transform-origin: 300px 290px;
    animation: material-orbit 24s ease-in-out infinite alternate;
    animation-play-state: paused;
  }
  .material-light {
    position: absolute;
    width: 80%;
    height: 80%;
    top: -20%;
    left: -20%;
    border-radius: 50%;
    background: radial-gradient(ellipse, #ffffffd9, transparent 68%);
    animation: light-travel 16s ease-in-out infinite alternate;
    animation-play-state: paused;
  }
  :global([data-active='true']) .contour-body,
  :global([data-active='true']) .material-orbit,
  :global([data-active='true']) .material-light {
    animation-play-state: running;
  }
  .film-aperture {
    position: absolute;
    inset: 21%;
    overflow: hidden;
    border-radius: 50%;
    transform: rotate(-18deg);
  }
  .material-caption {
    position: absolute;
    bottom: 24px;
    left: 24px;
    right: 24px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    color: #38534a;
    font-size: 10px;
    line-height: 1.5;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  @keyframes material-turn {
    from {
      transform: translateY(-8px) rotate(-18deg) scale(0.94, 1.02);
    }
    to {
      transform: translateY(10px) rotate(12deg) scale(1.02, 0.94);
    }
  }
  @keyframes material-orbit {
    from {
      transform: rotate(-25deg) scale(0.93);
    }
    to {
      transform: rotate(25deg) scale(1.03);
    }
  }
  @keyframes light-travel {
    to {
      transform: translate(50%, 40%);
    }
  }
  @media (max-width: 600px) {
    .material-study {
      min-height: 280px;
    }
    .material-caption {
      left: 18px;
      right: 18px;
      bottom: 18px;
      font-size: 9px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .contour-body,
    .material-orbit,
    .material-light {
      animation: none;
    }
    .material-object {
      transition: none;
      transform: none;
    }
  }
</style>
