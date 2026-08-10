<script lang="ts">
  type PropertyMode = 'ltd' | 'io' | 'space' | 'agency' | 'learn';

  interface MeridianOfferMedia {
    src: string;
    alt: string;
  }

  interface Props {
    eyebrow: string;
    title: string;
    description?: string;
    actionLabel: string;
    actionHref: string;
    mode?: PropertyMode;
    headingId?: string;
    /** Optional property-owned campaign image for the footer handoff visual. */
    media?: MeridianOfferMedia;
  }

  const artifacts: Record<PropertyMode, { code: string; name: string; record: string }> = {
    agency: { code: 'PB / 01', name: 'Shared playbook', record: 'OWNER + ROUTE + GATE' },
    io: { code: 'FR / 01', name: 'Evidence handoff', record: 'SOURCE + METHOD + QUESTION' },
    ltd: { code: 'PL / 01', name: 'Policy handoff', record: 'PRINCIPLE + APPROVAL + PROOF' },
    space: { code: 'RT / 01', name: 'Runtime rehearsal', record: 'ROUTE + OUTPUT + FAILURE' },
    learn: { code: 'LN / 01', name: 'Practice record', record: 'LESSON + PRACTICE + PROOF' }
  };

  let {
    eyebrow,
    title,
    description,
    actionLabel,
    actionHref,
    mode = 'agency',
    headingId = 'meridian-offer-panel-title',
    media
  }: Props = $props();

  let artifact = $derived(artifacts[mode]);
</script>

<section class="meridian-offer-panel" aria-labelledby={headingId} data-mode={mode}>
  <div class="meridian-offer-panel__inner">
    <div class:has-media={media} class="meridian-offer-panel__visual">
      {#if media}
        <img
          class="meridian-offer-panel__media"
          src={media.src}
          alt={media.alt}
          loading="lazy"
          decoding="async"
        />
      {:else}
        <div
          class="meridian-offer-panel__artifact"
          role="img"
          aria-label={`${artifact.name}: signal moves through a named decision gate and finishes with attached proof.`}
        >
          <div class="meridian-offer-panel__artifact-header">
            <span>{artifact.code}</span>
            <span>{artifact.name}</span>
          </div>
          <svg viewBox="0 0 480 360" aria-hidden="true">
            <path class="court" d="M18 66H462V342H18zM240 66v276M18 204h128v98H18M462 204H334v98h128M240 161a43 43 0 1 0 0 86 43 43 0 0 0 0-86ZM146 116a116 116 0 0 1 0 176M334 116a116 116 0 0 0 0 176" />
            <path class="route route--one" d="M101 124C151 122 165 171 210 191" />
            <path class="route route--two" d="M257 207c50 3 68 69 120 69" />
            <circle class="owner" cx="92" cy="124" r="18" />
            <circle class="decision" cx="235" cy="202" r="23" />
            <rect class="gate" x="294" y="224" width="28" height="44" />
            <path class="arrow" d="m205 179 15 14-20 2ZM372 263l22 13-22 13Z" />
            <rect class="receipt" x="351" y="291" width="91" height="37" />
            <path class="receipt-lines" d="M362 303h58M362 314h42" />
            <text x="65" y="160">SIGNAL</text>
            <text x="208" y="242">DECISION</text>
            <text x="370" y="348">PROOF</text>
          </svg>
          <div class="meridian-offer-panel__artifact-record">
            <span>SIGNAL → DECISION → PROOF</span>
            <span>{artifact.record}</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="meridian-offer-panel__content">
      <div class="meridian-offer-panel__copy">
        <p class="meridian-offer-panel__eyebrow"><span aria-hidden="true"></span>{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
        {#if description}<p class="meridian-offer-panel__description">{description}</p>{/if}
      </div>
      <a class="meridian-offer-panel__action" href={actionHref}>
        <span>{actionLabel}</span>
        <span class="meridian-offer-panel__action-icon" aria-hidden="true">↗</span>
      </a>
    </div>
  </div>
</section>

<style>
  .meridian-offer-panel {
    padding: clamp(3.5rem, 7vw, 6.5rem) 1rem;
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  .meridian-offer-panel__inner {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    width: min(var(--content-width-performance-editorial, 90rem), 100%);
    min-height: clamp(28rem, 35vw, 33rem);
    margin-inline: auto;
    overflow: hidden;
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-editorial-dark, #181312);
  }

  .meridian-offer-panel__visual {
    position: relative;
    grid-column: span 4;
    display: grid;
    min-width: 0;
    padding: clamp(1.1rem, 2.2vw, 2rem);
    overflow: hidden;
    place-items: center;
    background:
      radial-gradient(circle at 19% 12%, rgb(243 235 228 / 34%), transparent 28%),
      linear-gradient(145deg, #a96718 0%, var(--color-performance-editorial-brand, #fcaa2d) 48%, #8a4f13 100%);
  }

  .meridian-offer-panel__visual.has-media {
    padding: 0;
    background: var(--color-performance-editorial-dark, #181312);
  }

  .meridian-offer-panel__visual.has-media::before,
  .meridian-offer-panel__visual.has-media::after {
    display: none;
  }

  .meridian-offer-panel__media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 52%;
  }

  .meridian-offer-panel__visual::before,
  .meridian-offer-panel__visual::after {
    position: absolute;
    width: 70%;
    height: 150%;
    background: rgb(24 19 18 / 12%);
    content: '';
    transform: rotate(24deg);
  }

  .meridian-offer-panel__visual::before {
    top: -78%;
    left: -35%;
  }

  .meridian-offer-panel__visual::after {
    right: -44%;
    bottom: -88%;
  }

  .meridian-offer-panel__artifact {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(100%, 26rem);
    aspect-ratio: 0.83;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    border: 1px solid rgb(243 235 228 / 40%);
    border-radius: calc(var(--radius-performance-editorial, 0.375rem) * 0.65);
    background: var(--color-performance-editorial-dark, #181312);
    box-shadow: 0 1.25rem 3rem rgb(24 19 18 / 28%);
  }

  .meridian-offer-panel__artifact-header,
  .meridian-offer-panel__artifact-record {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.72rem 0.8rem;
    color: rgb(243 235 228 / 68%);
    font-family: var(--font-performance-mono);
    font-size: clamp(0.52rem, 0.75vw, 0.65rem);
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.055em;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .meridian-offer-panel__artifact-header {
    border-bottom: 1px solid rgb(243 235 228 / 18%);
  }

  .meridian-offer-panel__artifact-header span:last-child,
  .meridian-offer-panel__artifact-record span:last-child {
    text-align: right;
  }

  .meridian-offer-panel__artifact-record {
    border-top: 1px solid rgb(243 235 228 / 18%);
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  svg :global(.court) {
    fill: none;
    stroke: rgb(243 235 228 / 17%);
    stroke-width: 1;
  }

  svg :global(.route) {
    fill: none;
    stroke-width: 4;
    stroke-dasharray: 9 7;
  }

  svg :global(.route--one) {
    stroke: #dce7f4;
  }

  svg :global(.route--two) {
    stroke: #b98813;
  }

  svg :global(.owner),
  svg :global(.decision) {
    fill: #dce7f4;
    stroke: var(--color-performance-editorial-light, #f3ebe4);
    stroke-width: 5;
  }

  svg :global(.decision) {
    fill: var(--color-performance-editorial-brand, #fcaa2d);
    stroke: #b98813;
  }

  svg :global(.gate) {
    fill: rgb(252 170 45 / 14%);
    stroke: #b98813;
    stroke-width: 3;
  }

  svg :global(.arrow) {
    fill: #dce7f4;
  }

  svg :global(.receipt) {
    fill: rgb(0 143 94 / 10%);
    stroke: #008f5e;
    stroke-width: 2;
  }

  svg :global(.receipt-lines) {
    fill: none;
    stroke: #008f5e;
    stroke-width: 2;
  }

  svg :global(text) {
    fill: rgb(243 235 228 / 66%);
    font-family: var(--font-performance-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
  }

  .meridian-offer-panel__content {
    grid-column: span 8;
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    gap: clamp(3rem, 6vw, 6rem);
    padding: clamp(2.25rem, 5vw, 5rem);
  }

  .meridian-offer-panel__copy {
    display: grid;
    gap: 1.35rem;
    max-width: 52rem;
  }

  .meridian-offer-panel__eyebrow {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0;
    color: var(--color-performance-editorial-light, #f3ebe4);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }

  .meridian-offer-panel__eyebrow span {
    width: 0.42rem;
    aspect-ratio: 1;
    background: var(--color-performance-editorial-brand, #fcaa2d);
  }

  h2 {
    max-width: 12ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(3rem, 5.5vw, 5.6rem);
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: var(--leading-performance-editorial, 1.1);
    text-wrap: balance;
  }

  .meridian-offer-panel__description {
    max-width: 47rem;
    margin: 0;
    color: color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 68%, transparent);
    font-size: clamp(1rem, 1.35vw, 1.18rem);
    line-height: 1.55;
  }

  .meridian-offer-panel__action {
    display: inline-grid;
    width: fit-content;
    min-height: 3.25rem;
    grid-template-columns: auto 3.25rem;
    align-items: stretch;
    overflow: hidden;
    border: 1px solid var(--color-performance-editorial-brand, #fcaa2d);
    border-radius: calc(var(--radius-performance-editorial, 0.375rem) * 0.75);
    background: var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
    font-family: var(--font-performance-sans);
    font-size: 0.92rem;
    font-weight: var(--font-performance-semibold);
    text-decoration: none;
  }

  .meridian-offer-panel__action > span:first-child {
    display: flex;
    align-items: center;
    padding: 0.78rem 1rem;
  }

  .meridian-offer-panel__action-icon {
    display: grid;
    border-left: 1px solid rgb(24 19 18 / 24%);
    background: var(--color-performance-editorial-light, #f3ebe4);
    font-size: 1.25rem;
    place-items: center;
  }

  .meridian-offer-panel__action:hover {
    background: color-mix(in srgb, var(--color-performance-editorial-brand, #fcaa2d) 88%, white);
  }

  .meridian-offer-panel__action:focus-visible {
    outline: 3px solid var(--color-performance-signal-soft, #a7b8ff);
    outline-offset: 3px;
  }

  @media (max-width: 760px) {
    .meridian-offer-panel {
      padding: 3rem 0.75rem;
    }

    .meridian-offer-panel__inner {
      display: flex;
      min-height: auto;
      flex-direction: column;
    }

    .meridian-offer-panel__visual {
      min-height: 21rem;
      padding: 1.25rem;
    }

    .meridian-offer-panel__artifact {
      width: min(100%, 18rem);
      aspect-ratio: 0.9;
    }

    .meridian-offer-panel__content {
      gap: 2.5rem;
      padding: 1.5rem;
    }

    h2 {
      max-width: 10ch;
      font-size: clamp(2.75rem, 13vw, 4.35rem);
    }

    .meridian-offer-panel__action {
      width: 100%;
      grid-template-columns: minmax(0, 1fr) 3.25rem;
    }
  }
</style>
