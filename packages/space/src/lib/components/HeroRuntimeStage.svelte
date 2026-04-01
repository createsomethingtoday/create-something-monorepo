<script lang="ts">
  import { onMount } from 'svelte';
  import { CubeMark } from '@create-something/canon/brand';

  const supportSignals = [
    {
      label: 'Workers runtime',
      value: 'The surface stays edge-native instead of pretending with screenshots.'
    },
    {
      label: 'Inspection loop',
      value: 'Motion, timing, and state remain visible enough to learn from.'
    },
    {
      label: 'Pattern transfer',
      value: 'The ideas that survive here move into research, policy, or governed delivery.'
    }
  ];

  const orbitLabels = [
    { label: 'Execute live', className: 'hero-stage__marker--north' },
    { label: 'Inspect state', className: 'hero-stage__marker--east' },
    { label: 'Promote patterns', className: 'hero-stage__marker--south' }
  ];

  let CubeMark3DComponent = $state<any>(null);

  onMount(async () => {
    const module = await import('@create-something/canon/brand/3d');
    CubeMark3DComponent = module.CubeMark3D;
  });
</script>

<article class="product-surface product-surface--soft hero-stage">
  <div class="hero-stage__glow hero-stage__glow--one" aria-hidden="true"></div>
  <div class="hero-stage__glow hero-stage__glow--two" aria-hidden="true"></div>

  <div class="hero-stage__visual" aria-hidden="true">
    <div class="hero-stage__orbit hero-stage__orbit--outer"></div>
    <div class="hero-stage__orbit hero-stage__orbit--inner"></div>

    {#each orbitLabels as marker}
      <span class={`hero-stage__marker ${marker.className}`}>{marker.label}</span>
    {/each}

    <div class="hero-stage__cube">
      {#if CubeMark3DComponent}
        <CubeMark3DComponent
          size={240}
          autoRotate
          rotationSpeed={0.22}
          showShadows={false}
          materialVariant="glass"
        />
      {:else}
        <div class="hero-stage__fallback-mark">
          <CubeMark size={176} animate animationType="assemble" />
        </div>
      {/if}
    </div>
  </div>

  <div class="hero-stage__copy">
    <span class="product-kicker">ThreeJS-supported hero</span>
    <p class="hero-stage__lede">
      The hero can carry motion and depth without forcing the whole runtime mockup into the first
      section. Use the animation to support the thesis, then give the workbench its own lane.
    </p>

    <div class="hero-stage__signals">
      {#each supportSignals as signal}
        <div class="hero-stage__signal">
          <span class="hero-stage__signal-label">{signal.label}</span>
          <span class="hero-stage__signal-value">{signal.value}</span>
        </div>
      {/each}
    </div>
  </div>
</article>

<style>
  .hero-stage {
    position: relative;
    display: grid;
    gap: 1.4rem;
    min-height: clamp(30rem, 48vw, 38rem);
    padding: clamp(1.4rem, 3vw, 2rem);
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 20% 20%, rgba(59, 99, 255, 0.16), transparent 32%),
      radial-gradient(circle at 80% 24%, rgba(103, 180, 255, 0.14), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
  }

  .hero-stage__glow {
    position: absolute;
    inset: auto;
    border-radius: 999px;
    filter: blur(48px);
    opacity: 0.7;
    pointer-events: none;
  }

  .hero-stage__glow--one {
    top: 6%;
    right: 8%;
    width: 10rem;
    height: 10rem;
    background: rgba(59, 99, 255, 0.18);
  }

  .hero-stage__glow--two {
    bottom: 8%;
    left: 10%;
    width: 11rem;
    height: 11rem;
    background: rgba(91, 230, 255, 0.14);
  }

  .hero-stage__visual,
  .hero-stage__copy,
  .hero-stage__signals,
  .hero-stage__signal {
    display: grid;
  }

  .hero-stage__visual {
    position: relative;
    place-items: center;
    min-height: 23rem;
    padding: 1.5rem;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background:
      radial-gradient(circle at center, rgba(255, 255, 255, 0.075), transparent 48%),
      linear-gradient(180deg, rgba(18, 22, 37, 0.9), rgba(9, 11, 19, 0.92));
  }

  .hero-stage__orbit,
  .hero-stage__marker {
    position: absolute;
  }

  .hero-stage__orbit {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    animation: hero-stage-spin 16s linear infinite;
  }

  .hero-stage__orbit--outer {
    inset: 10%;
  }

  .hero-stage__orbit--inner {
    inset: 22%;
    animation-direction: reverse;
    animation-duration: 11s;
    border-color: rgba(255, 255, 255, 0.05);
  }

  .hero-stage__marker {
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(7, 9, 15, 0.84);
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    backdrop-filter: blur(18px);
  }

  .hero-stage__marker--north {
    top: 12%;
    left: 14%;
  }

  .hero-stage__marker--east {
    top: 26%;
    right: 6%;
  }

  .hero-stage__marker--south {
    right: 14%;
    bottom: 12%;
  }

  .hero-stage__cube {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: min(100%, 18rem);
    aspect-ratio: 1;
  }

  .hero-stage__copy {
    position: relative;
    z-index: 1;
    gap: 1rem;
  }

  .hero-stage__fallback-mark {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }

  .hero-stage__lede {
    margin: 0;
    max-width: 36rem;
    color: var(--color-fg-secondary);
    font-size: 0.98rem;
    line-height: 1.75;
  }

  .hero-stage__signals {
    gap: 0.75rem;
  }

  .hero-stage__signal {
    gap: 0.3rem;
    padding: 0.8rem 0.9rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.025);
  }

  .hero-stage__signal-label {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-stage__signal-value {
    color: var(--color-fg-secondary);
    font-size: 0.92rem;
    line-height: 1.6;
  }

  @keyframes hero-stage-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-stage__orbit {
      animation: none;
    }
  }

  @media (max-width: 720px) {
    .hero-stage {
      min-height: auto;
    }

    .hero-stage__visual {
      min-height: 18rem;
    }

    .hero-stage__marker {
      font-size: 0.62rem;
      letter-spacing: 0.08em;
    }

    .hero-stage__marker--north {
      top: 10%;
      left: 7%;
    }

    .hero-stage__marker--east {
      top: 18%;
      right: 4%;
    }

    .hero-stage__marker--south {
      right: 8%;
      bottom: 10%;
    }
  }
</style>
