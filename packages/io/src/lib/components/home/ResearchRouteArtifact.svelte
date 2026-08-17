<figure class="research-route">
  <picture>
    <source
      media="(max-width: 47.99rem)"
      srcset="/images/performance-lab/io-research-route-macro-mobile.webp"
    />
    <img
      src="/images/performance-lab/io-research-route-macro.webp"
      alt="A tactile research route connects an ivory agent marker to stacked paper sources, a smoked-metal methodology gate, and a green proof receipt."
      width="1536"
      height="1024"
      loading="lazy"
      decoding="async"
    />
  </picture>

  <div class="research-route__header">
    <div>
      <span>Research route</span>
      <strong>IO-RR / 01</strong>
    </div>
    <small>material study</small>
  </div>

  <div class="research-route__legend" aria-label="Research route stages">
    <ol>
      <li><span>01</span><strong>Question</strong></li>
      <li><span>02</span><strong>Sources</strong></li>
      <li><span>03</span><strong>Method</strong></li>
      <li><span>04</span><strong>Proof</strong></li>
    </ol>
    <div class="research-route__state">
      <span aria-hidden="true"></span>
      <strong>Promotion gated</strong>
    </div>
  </div>

  <figcaption>
    Campaign study: a claim moves from an operator question through named sources and method to an
    attached proof receipt. The image illustrates the route; the paper and methodology carry the
    evidence.
  </figcaption>
</figure>

<style>
  .research-route {
    position: relative;
    min-height: inherit;
    margin: 0;
    overflow: hidden;
    background: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }

  picture,
  img {
    display: block;
    width: 100%;
    height: 100%;
  }

  picture {
    position: absolute;
    inset: 0;
  }

  img {
    object-fit: cover;
    object-position: 53% 50%;
  }

  .research-route::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(8, 8, 8, 0.44),
      transparent 22%,
      transparent 65%,
      rgba(8, 8, 8, 0.86)
    );
    content: '';
    pointer-events: none;
  }

  .research-route__header,
  .research-route__legend {
    position: absolute;
    z-index: 1;
    right: 1rem;
    left: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border: 1px solid rgba(243, 235, 228, 0.38);
    background: rgba(9, 9, 9, 0.68);
    backdrop-filter: blur(10px);
    font-family: var(--font-performance-mono);
    text-transform: uppercase;
  }

  .research-route__header {
    top: 1rem;
    padding: 0.75rem 0.85rem;
  }

  .research-route__header > div {
    display: grid;
    gap: 0.2rem;
  }

  .research-route__header span,
  .research-route__header small,
  .research-route__legend li span {
    color: rgba(243, 235, 228, 0.62);
    font-size: 0.56rem;
    letter-spacing: 0.1em;
  }

  .research-route__header strong {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
  }

  .research-route__legend {
    bottom: 1rem;
    align-items: stretch;
  }

  ol {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.22rem;
    min-width: 0;
    padding: 0.7rem;
    border-right: 1px solid rgba(243, 235, 228, 0.22);
  }

  .research-route__legend li strong,
  .research-route__state strong {
    overflow: hidden;
    font-size: 0.58rem;
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.04em;
    text-overflow: ellipsis;
  }

  .research-route__state {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.8rem;
    color: var(--color-performance-editorial-brand, #fcaa2d);
  }

  .research-route__state > span {
    width: 0.55rem;
    aspect-ratio: 1;
    border: 1px solid currentColor;
    background: currentColor;
    box-shadow: 0 0 0 3px rgba(9, 9, 9, 0.94), 0 0 0 4px currentColor;
  }

  figcaption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 760px) {
    img {
      object-position: 50% 48%;
    }

    .research-route__header,
    .research-route__legend {
      right: 0.75rem;
      left: 0.75rem;
    }

    .research-route__header {
      top: 0.75rem;
    }

    .research-route__legend {
      bottom: 0.75rem;
      display: grid;
    }

    .research-route__state {
      justify-content: center;
      border-top: 1px solid rgba(243, 235, 228, 0.22);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .research-route__header,
    .research-route__legend {
      backdrop-filter: none;
    }
  }
</style>
