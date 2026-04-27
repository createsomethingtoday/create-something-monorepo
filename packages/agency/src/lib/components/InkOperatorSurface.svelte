<script lang="ts">
  const callouts = [
    {
      label: 'E-ink surface',
      detail: 'Calm status, approval, and blocked-state briefs.',
      modifier: 'screen'
    },
    {
      label: 'Physical controls',
      detail: 'Acknowledge, scroll, silence, or return to the full review surface.',
      modifier: 'controls'
    },
    {
      label: 'Magnet back',
      detail: 'The operator surface can live on a cabinet, desk rail, or review station.',
      modifier: 'magnet'
    }
  ];

  const surfaceCards = [
    {
      title: 'Approval state',
      body: 'Risky work waits for the right human with the artifact and reason visible.',
      image: '/images/ink/ink-blueprint-controls.png',
      imageWebp: '/images/ink/ink-blueprint-controls.webp',
      alt: 'Blueprint render of the Ink physical controls showing an approval state.'
    },
    {
      title: 'Magnetic surface',
      body: 'The device can leave the laptop and become a quiet status point in the room.',
      image: '/images/ink/ink-blueprint-magnet.png',
      imageWebp: '/images/ink/ink-blueprint-magnet.webp',
      alt: 'Blueprint render of Ink mounted magnetically to a vertical metal surface.'
    }
  ];
</script>

<div class="ink-surface product-surface product-surface--soft">
  <div class="ink-surface__copy">
    <span class="product-kicker">Ink operator surface</span>
    <h2>The operator should not have to watch the dashboard.</h2>
    <p>
      Ink makes Policy OS tangible: a physical e-ink surface for all-clear, approval-needed,
      blocked, and recovery states. The first release can start on Core Ink-class hardware while
      CREATE SOMETHING owns the operating layer, labels, and escalation behavior.
    </p>

    <div class="ink-state-grid" aria-label="Ink display states">
      <div>
        <span>All clear</span>
        <strong>You can step away</strong>
      </div>
      <div>
        <span>Approval</span>
        <strong>Judgment needed</strong>
      </div>
      <div>
        <span>Blocked</span>
        <strong>Reason recorded</strong>
      </div>
    </div>
  </div>

  <div class="ink-surface__visual" aria-label="Ink blueprint feature map">
    <picture>
      <source srcset="/images/ink/ink-blueprint-front.webp" type="image/webp" />
      <img
        src="/images/ink/ink-blueprint-front.png"
        alt="Black and white blueprint render of the Ink operator surface showing a calm operator state."
        loading="eager"
        decoding="async"
      />
    </picture>

    {#each callouts as callout}
      <div class={`ink-callout ink-callout--${callout.modifier}`}>
        <span class="ink-callout__label">{callout.label}</span>
        <span class="ink-callout__detail">{callout.detail}</span>
      </div>
    {/each}
  </div>

  <div class="ink-surface__cards">
    {#each surfaceCards as card}
      <article class="ink-detail-card">
        <picture>
          <source srcset={card.imageWebp} type="image/webp" />
          <img src={card.image} alt={card.alt} loading="lazy" decoding="async" />
        </picture>
        <div>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
        </div>
      </article>
    {/each}
  </div>
</div>

<style>
  .ink-surface {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(18rem, 1.14fr);
    gap: clamp(1rem, 2vw, 1.35rem);
    overflow: hidden;
    padding: clamp(1.1rem, 2.4vw, 1.6rem);
    background:
      radial-gradient(circle at 76% 22%, rgba(255, 255, 255, 0.08), transparent 28%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      rgba(5, 5, 7, 0.86);
  }

  .ink-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
    opacity: 0.42;
  }

  .ink-surface__copy,
  .ink-surface__visual,
  .ink-surface__cards {
    position: relative;
    z-index: 1;
  }

  .ink-surface__copy {
    display: grid;
    align-content: center;
    gap: 1rem;
    max-width: 34rem;
  }

  .ink-surface__copy h2 {
    margin: 0;
    font-size: clamp(2.25rem, 4.4vw, 4.65rem);
    line-height: 0.98;
    letter-spacing: -0.055em;
    text-wrap: balance;
  }

  .ink-surface__copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .ink-state-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 0.25rem;
  }

  .ink-state-grid div {
    display: grid;
    gap: 0.28rem;
    min-height: 5.75rem;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.035);
  }

  .ink-state-grid span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .ink-state-grid strong {
    align-self: end;
    color: var(--color-fg-primary);
    font-size: 0.9rem;
    line-height: 1.25;
  }

  .ink-surface__visual {
    min-height: clamp(31rem, 52vw, 46rem);
    border-radius: 26px;
    overflow: hidden;
    background: #050506;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      0 22px 60px rgba(0, 0, 0, 0.44);
  }

  .ink-surface__visual picture,
  .ink-surface__visual img {
    width: 100%;
    height: 100%;
  }

  .ink-surface__visual img {
    object-fit: cover;
    opacity: 0.92;
  }

  .ink-callout {
    position: absolute;
    display: grid;
    gap: 0.22rem;
    width: min(15rem, 36%);
    padding: 0.7rem 0.78rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    background: rgba(3, 3, 4, 0.68);
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.36);
    backdrop-filter: blur(12px);
  }

  .ink-callout::before {
    content: '';
    position: absolute;
    height: 1px;
    background: rgba(255, 255, 255, 0.42);
    transform-origin: left center;
  }

  .ink-callout--screen {
    top: 16%;
    left: 6%;
  }

  .ink-callout--screen::before {
    top: 50%;
    left: 100%;
    width: 5.8rem;
    transform: rotate(15deg);
  }

  .ink-callout--controls {
    right: 6%;
    top: 33%;
  }

  .ink-callout--controls::before {
    top: 54%;
    right: 100%;
    width: 4.8rem;
    transform: rotate(160deg);
  }

  .ink-callout--magnet {
    right: 7%;
    bottom: 13%;
  }

  .ink-callout--magnet::before {
    top: 40%;
    right: 100%;
    width: 5.2rem;
    transform: rotate(194deg);
  }

  .ink-callout__label {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .ink-callout__detail {
    color: var(--color-fg-muted);
    font-size: 0.73rem;
    line-height: 1.45;
  }

  .ink-surface__cards {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .ink-detail-card {
    display: grid;
    grid-template-columns: minmax(8rem, 0.76fr) minmax(0, 1fr);
    align-items: center;
    gap: 0.9rem;
    min-height: 11rem;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.03);
  }

  .ink-detail-card picture,
  .ink-detail-card img {
    width: 100%;
  }

  .ink-detail-card picture {
    display: block;
  }

  .ink-detail-card img {
    aspect-ratio: 16 / 10;
    border-radius: 16px;
    object-fit: cover;
    background: #050506;
  }

  .ink-detail-card h3 {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.15;
  }

  .ink-detail-card p {
    margin: 0.45rem 0 0;
    color: var(--color-fg-secondary);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  @media (max-width: 1100px) {
    .ink-surface {
      grid-template-columns: 1fr;
    }

    .ink-surface__copy {
      max-width: 46rem;
    }

    .ink-surface__visual {
      min-height: clamp(30rem, 84vw, 44rem);
    }
  }

  @media (max-width: 760px) {
    .ink-state-grid,
    .ink-surface__cards,
    .ink-detail-card {
      grid-template-columns: 1fr;
    }

    .ink-surface__visual {
      min-height: 31rem;
    }

    .ink-callout {
      width: min(12.5rem, 48%);
      padding: 0.58rem 0.62rem;
    }

    .ink-callout::before {
      display: none;
    }

    .ink-callout--screen {
      top: 3.5%;
      left: 4%;
    }

    .ink-callout--controls {
      top: auto;
      right: 4%;
      bottom: 35%;
    }

    .ink-callout--magnet {
      right: 4%;
      bottom: 4%;
    }
  }
</style>
