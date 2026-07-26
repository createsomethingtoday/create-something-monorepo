<script lang="ts">
  import { Button } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<section class="map-preview" id="map-warmup" aria-labelledby="services-map-preview-title">
  <div class="map-preview__copy">
    <p class="map-preview__eyebrow">Map before booking</p>
    <h2 id="services-map-preview-title">See the operating path before deciding to build.</h2>
    <p>
      Start with one real handoff. Map shows who owns it, where AI can prepare work, which action
      needs approval, and what record proves the outcome. The public canvas is read-only and does
      not touch production systems.
    </p>
    <div class="map-preview__actions">
      <Button href={agencyCoreMessaging.selfMapHref}>Open the public Map</Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    </div>
  </div>

  <div class="map-preview__diagram" aria-label="A compact workflow map example">
    <div class="map-preview__rail" aria-hidden="true"><span></span></div>
    <article>
      <span>01 · Trigger</span>
      <strong>Request arrives</strong>
      <p>Person, system, or agent</p>
    </article>
    <article>
      <span>02 · Boundary</span>
      <strong>Prepare, then wait</strong>
      <p>Agent work · named approval</p>
    </article>
    <article>
      <span>03 · Proof</span>
      <strong>Resolve with evidence</strong>
      <p>Outcome · owner · next step</p>
    </article>
  </div>
</section>

<style>
  .map-preview {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(30rem, 1.1fr);
    gap: clamp(3rem, 8vw, 8rem);
    width: min(var(--content-width-performance, 85rem), calc(100% - clamp(2.5rem, 10vw, 12rem)));
    margin: 0 auto;
    padding-block: clamp(4rem, 8vw, 7rem);
    color: var(--color-performance-ink, #090909);
  }

  .map-preview__copy {
    align-self: center;
  }

  .map-preview__eyebrow,
  article > span {
    margin: 0;
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 13ch;
    margin: 0.7rem 0 1.25rem;
    font-size: clamp(2.4rem, 4.3vw, 4.6rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.05em;
    line-height: 0.96;
  }

  .map-preview__copy > p:not(.map-preview__eyebrow) {
    max-width: 39rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1rem;
    line-height: 1.6;
  }

  .map-preview__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .map-preview__diagram {
    position: relative;
    display: grid;
    align-content: center;
    min-height: 29rem;
    border: 1px solid #282828;
    background:
      linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px),
      var(--color-performance-ink, #090909);
    background-size: 4rem 4rem;
    color: var(--color-performance-panel, #ffffff);
  }

  .map-preview__rail {
    position: absolute;
    top: 50%;
    right: 8%;
    left: 8%;
    height: 2px;
    overflow: hidden;
    background: color-mix(in srgb, var(--color-performance-signal, #0f62fe) 30%, transparent);
  }

  .map-preview__rail span {
    display: block;
    width: 42%;
    height: 100%;
    background: var(--color-performance-signal, #0f62fe);
    box-shadow: 0 0 1rem
      color-mix(in srgb, var(--color-performance-signal, #0f62fe) 60%, transparent);
    animation: map-current calc(var(--duration-performance-slow, 700ms) * 6) linear infinite;
  }

  .map-preview__diagram article {
    position: relative;
    display: grid;
    grid-template-columns: minmax(7rem, 0.45fr) 1fr 1fr;
    align-items: center;
    gap: 1rem;
    margin-inline: 8%;
    padding: 1.1rem 1.25rem;
    border: 1px solid #343434;
    background: color-mix(in srgb, var(--color-performance-ink, #090909) 92%, transparent);
  }

  .map-preview__diagram article + article {
    border-top: 0;
  }

  .map-preview__diagram article::before {
    content: '';
    position: absolute;
    left: -0.36rem;
    width: 0.58rem;
    height: 0.58rem;
    border: 2px solid var(--color-performance-ink, #090909);
    border-radius: 50%;
    background: var(--color-performance-signal, #0f62fe);
  }

  article strong {
    font-size: 0.95rem;
  }

  article p {
    margin: 0;
    color: #a7a7a2;
    font-size: 0.82rem;
  }

  @keyframes map-current {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(340%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .map-preview__rail span {
      animation: none;
    }
  }

  @media (max-width: 60rem) {
    .map-preview {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 48rem) {
    .map-preview {
      width: calc(100% - 2.5rem);
      gap: 2.5rem;
      padding-block: 3.5rem;
    }

    .map-preview__diagram {
      min-height: 25rem;
    }

    .map-preview__diagram article {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .map-preview__rail {
      top: 8%;
      right: auto;
      bottom: 8%;
      left: 8%;
      width: 2px;
      height: auto;
    }

    .map-preview__rail span {
      width: 100%;
      height: 42%;
      animation-name: map-current-vertical;
    }

    @keyframes map-current-vertical {
      from {
        transform: translateY(-100%);
      }
      to {
        transform: translateY(340%);
      }
    }
  }
</style>
