<script lang="ts">
  import {
    heroVisual,
    staffingCareCards,
    staffingFaqs,
    staffingProcess,
    staffingServiceHighlights,
    staffingStats
  } from '$lib/site/abundance';
  import {
    absoluteUrl,
    breadcrumbJsonLd,
    faqJsonLd,
    jsonLdScript,
    organizationJsonLd,
    serviceJsonLd,
    websiteJsonLd
  } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const pageTitle = 'Abundance Staffing | Guided Nurse Applications';
  const pageDescription =
    'Abundance Staffing helps nurses start applications, facilities request coverage, and recruiters review staffing handoffs with public jobs and protected verification.';
  const pagePath = '/';
  const pageImage = absoluteUrl(heroVisual.src);
  const structuredData = jsonLdScript([
    organizationJsonLd(),
    websiteJsonLd(),
    serviceJsonLd({
      name: 'Nurse staffing and recruiter-reviewed hiring support',
      description: pageDescription,
      path: pagePath,
      audience: 'Nurses, facilities, and staffing recruiters'
    }),
    breadcrumbJsonLd([{ name: 'Home', path: pagePath }]),
    faqJsonLd(staffingFaqs)
  ]);

  const processOwners = ['Nurse or facility', 'Abundance Concierge', 'Recruiter'];

  $: verificationLabel = data.intakeAccess.granted ? 'Browser verified' : 'No account required';
  $: verificationDetail = data.intakeAccess.granted
    ? 'Protected steps are ready when you are.'
    : 'Verification waits until a protected step needs it.';
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <link rel="canonical" href={absoluteUrl(pagePath)} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Abundance Staffing" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={absoluteUrl(pagePath)} />
  <meta property="og:image" content={pageImage} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
  <meta name="twitter:image" content={pageImage} />
  {@html structuredData}
</svelte:head>

<div class="abundance-home">
  <section class="home-hero">
    <div class="hero-glow hero-glow-one" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-two" aria-hidden="true"></div>

    <div class="home-shell hero-grid">
      <div class="hero-copy">
        <div class="hero-kicker">
          <span class="status-signal" aria-hidden="true"></span>
          Guided nurse applications
        </div>
        <h1 aria-label="A clearer path from interested to recruiter-ready.">
          <span>A clearer path</span>
          <span>from <em>interested</em></span>
          <span>to recruiter-ready.</span>
        </h1>
        <p class="hero-intro">
          Tell Concierge what kind of work fits. It organizes the details, keeps the next step
          visible, and brings in a recruiter before any staffing decision is made.
        </p>

        <div class="hero-actions">
          <a class="action-primary" href="/apply">
            <span>Start an application</span>
            <span class="action-arrow" aria-hidden="true">↗</span>
          </a>
          <a class="action-secondary" href="/jobs">Explore open roles</a>
        </div>

        <div class="hero-trust" aria-label="Application trust boundaries">
          <span>{verificationLabel}</span>
          <span>Private by default</span>
          <span>Recruiter-reviewed</span>
        </div>
      </div>

      <div class="hero-product" aria-label="Guided Abundance application preview">
        <div class="hero-product-meta" aria-hidden="true">
          <span>Application 01</span>
          <span>Recruiter handoff</span>
        </div>
        <div class="hero-photo">
          <img src={heroVisual.src} alt={heroVisual.alt} />
          <div class="photo-label">
            <span>Abundance Concierge</span>
            <strong>One conversation, kept in context.</strong>
          </div>
        </div>

        <div class="concierge-card">
          <div class="concierge-card-head">
            <div>
              <span class="mini-label">Application preview</span>
              <strong>ICU travel nurse</strong>
            </div>
            <span class="progress-orbit" aria-label="Profile 72 percent ready">
              <strong>72%</strong>
              <small>ready</small>
            </span>
          </div>

          <div class="conversation-preview">
            <div class="candidate-message">
              <span>Role brief</span>
              <strong>Austin · nights · 13 weeks · compact license</strong>
            </div>
            <div class="concierge-response">
              <span class="response-mark" aria-hidden="true">A</span>
              <p><strong>Next:</strong> confirm your start window and pay range.</p>
            </div>
          </div>

          <div class="handoff-state">
            <span class="handoff-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Recruiter review stays human</strong>
              <span>{verificationDetail}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="home-shell hero-stat-grid">
      {#each staffingStats as stat, index}
        <article>
          <span class="stat-number">0{index + 1}</span>
          <div>
            <strong>{stat.label} · {stat.value}</strong>
            <p>{stat.detail}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="path-section">
    <div class="home-shell">
      <div class="section-heading path-heading">
        <div>
          <span class="section-kicker">Choose your path</span>
          <h2>One front door.<br />Three clear lanes.</h2>
        </div>
        <p>
          The system adapts to the person entering it. Nurses describe fit, facilities describe
          need, and recruiters see a prepared handoff instead of a loose thread.
        </p>
      </div>

      <div class="path-grid">
        {#each staffingCareCards as card, index}
          <a class:path-featured={index === 0} class="path-card" href={card.href}>
            <img src={card.image} alt="" loading="lazy" />
            <span class="path-shade" aria-hidden="true"></span>
            <span class="path-index">0{index + 1}</span>
            <span class="path-content">
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </span>
            <span class="path-arrow" aria-hidden="true">↗</span>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section class="handoff-section">
    <div class="handoff-grid home-shell">
      <div class="handoff-heading">
        <span class="section-kicker section-kicker-light">The staffing handoff</span>
        <h2>Fast where it’s clear.<br /><em>Human where it matters.</em></h2>
        <p>
          Concierge prepares the work. It does not make the staffing call. Every consequential step
          keeps its owner and boundary visible.
        </p>
        <a href="/agents">Meet the Abundance agents <span aria-hidden="true">↗</span></a>
      </div>

      <div class="handoff-steps">
        {#each staffingProcess as step, index}
          <article>
            <div class="step-rail" aria-hidden="true">
              <span>0{index + 1}</span>
              <i></i>
            </div>
            <div class="step-copy">
              <span>{processOwners[index]}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="system-section">
    <div class="home-shell system-grid">
      <div class="system-intro">
        <span class="section-kicker">Built around the shift</span>
        <h2>Support that moves with the work.</h2>
        <p>
          Start with the immediate staffing need. Add identity, documents, and workflow controls
          only when the next real step calls for them.
        </p>
        <div class="system-proof">
          <span>No service keys in browser</span>
          <span>Secure verification</span>
          <span>Public jobs stay read-only</span>
        </div>
      </div>

      <div class="service-list">
        {#each staffingServiceHighlights as item, index}
          <a href={item.href}>
            <span class="service-index">0{index + 1}</span>
            <span class="service-copy">
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
            <span class="service-arrow" aria-hidden="true">↗</span>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section class="faq-section">
    <div class="home-shell faq-grid">
      <div class="faq-heading">
        <span class="section-kicker">Good questions</span>
        <h2>Clear before you start.</h2>
        <p>Short answers about access, decisions, and what happens next.</p>
      </div>

      <div class="faq-list">
        {#each staffingFaqs as faq, index}
          <details>
            <summary>
              <span class="faq-number">0{index + 1}</span>
              <strong>{faq.question}</strong>
              <span class="faq-plus" aria-hidden="true">+</span>
            </summary>
            <p>{faq.answer}</p>
          </details>
        {/each}
      </div>
    </div>
  </section>

  <section class="closing-section">
    <div class="closing-orbit closing-orbit-one" aria-hidden="true"></div>
    <div class="closing-orbit closing-orbit-two" aria-hidden="true"></div>
    <div class="home-shell closing-content">
      <span class="section-kicker section-kicker-light">Ready when you are</span>
      <h2>Start with the work you want.<br /><em>Keep the decision human.</em></h2>
      <p>
        No account wall. No long intake form. Begin in plain language and verify only when the
        application reaches a protected step.
      </p>
      <div class="closing-actions">
        <a class="action-primary action-primary-light" href="/apply">
          <span>Start an application</span>
          <span class="action-arrow" aria-hidden="true">↗</span>
        </a>
        <a class="closing-link" href="/facilities">Request facility coverage</a>
      </div>
    </div>
  </section>
</div>

<style>
  :global(body) {
    background: #faf5ef;
  }

  .abundance-home {
    --home-ink: #171512;
    --home-ink-deep: #020202;
    --home-paper: #faf5ef;
    --home-paper-bright: #fffaf4;
    --home-blue: #af7c54;
    --home-blue-bright: #d7b79e;
    --home-copper: #1d6f8a;
    color: var(--home-ink);
    background: var(--home-paper);
    overflow: clip;
  }

  .home-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
  }

  .home-hero {
    position: relative;
    padding: clamp(86px, 10vw, 154px) 0 0;
    background:
      linear-gradient(180deg, rgba(255, 250, 244, 0.92), rgba(250, 245, 239, 0.98)),
      var(--home-paper);
    isolation: isolate;
  }

  .hero-glow {
    position: absolute;
    z-index: -1;
    border-radius: 999px;
    filter: blur(1px);
    opacity: 0.8;
    pointer-events: none;
  }

  .hero-glow-one {
    top: -240px;
    right: -120px;
    width: 650px;
    height: 650px;
    background: radial-gradient(circle, rgba(175, 124, 84, 0.2), transparent 68%);
  }

  .hero-glow-two {
    bottom: 40px;
    left: -220px;
    width: 560px;
    height: 560px;
    background: radial-gradient(circle, rgba(29, 111, 138, 0.1), transparent 68%);
  }

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(470px, 0.78fr);
    gap: clamp(56px, 7vw, 118px);
    align-items: center;
  }

  .hero-copy {
    position: relative;
    z-index: 2;
    max-width: 830px;
  }

  .hero-kicker,
  .section-kicker,
  .mini-label,
  .stat-number,
  .path-index,
  .service-index,
  .faq-number {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 30px;
    color: var(--home-copper);
  }

  .status-signal {
    position: relative;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: var(--home-copper);
    box-shadow: 0 0 0 5px rgba(29, 111, 138, 0.1);
  }

  .status-signal::after {
    content: '';
    position: absolute;
    inset: -5px;
    border: 1px solid rgba(29, 111, 138, 0.32);
    border-radius: inherit;
    animation: signal-pulse 2.8s ease-out infinite;
  }

  .hero-copy h1 {
    max-width: 850px;
    margin: 0;
    font-size: clamp(3.7rem, 6.1vw, 6.75rem);
    font-weight: 540;
    letter-spacing: -0.065em;
    line-height: 0.92;
    text-wrap: balance;
  }

  .hero-copy h1 > span {
    display: block;
  }

  .hero-copy h1 > span:nth-child(2) {
    padding-left: clamp(0px, 3vw, 46px);
  }

  .hero-copy h1 em,
  .handoff-heading h2 em,
  .closing-content h2 em {
    color: var(--home-blue);
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    letter-spacing: -0.045em;
  }

  .hero-intro {
    max-width: 650px;
    margin: 34px 0 0;
    color: rgba(23, 21, 18, 0.68);
    font-size: clamp(1.08rem, 1.3vw, 1.28rem);
    line-height: 1.58;
  }

  .hero-actions,
  .closing-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 38px;
  }

  .action-primary,
  .action-secondary,
  .closing-link {
    text-decoration: none;
  }

  .action-primary {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 34px;
    min-height: 62px;
    min-width: 250px;
    padding: 10px 11px 10px 24px;
    border: 1px solid var(--home-ink);
    border-radius: 999px;
    background: var(--home-ink);
    color: white;
    font-weight: 520;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }

  .action-primary:hover {
    transform: translateY(-2px);
    background: var(--home-ink-deep);
    box-shadow: 0 18px 42px rgba(2, 2, 2, 0.18);
  }

  .action-arrow {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: white;
    color: var(--home-ink);
    font-size: 1.1rem;
  }

  .action-secondary,
  .closing-link {
    padding: 14px 4px;
    border-bottom: 1px solid rgba(23, 21, 18, 0.34);
    color: var(--home-ink);
    font-weight: 520;
  }

  .hero-trust {
    display: flex;
    gap: 8px 18px;
    flex-wrap: wrap;
    margin-top: 40px;
  }

  .hero-trust span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(23, 21, 18, 0.62);
    font-size: 0.84rem;
  }

  .hero-trust span::before {
    content: '✓';
    color: var(--home-blue);
    font-weight: 700;
  }

  .hero-product {
    position: relative;
    min-height: 650px;
    padding-top: 42px;
  }

  .hero-product::before {
    content: '';
    position: absolute;
    inset: 72px -22px 72px 36px;
    border-radius: 30px;
    background: var(--home-blue);
    opacity: 0.9;
    transform: rotate(2.2deg);
  }

  .hero-product-meta {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    color: rgba(23, 21, 18, 0.5);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-photo {
    position: absolute;
    inset: 42px 0 82px 0;
    overflow: hidden;
    border: 1px solid rgba(23, 21, 18, 0.14);
    border-radius: 30px;
    box-shadow: 0 36px 90px rgba(23, 21, 18, 0.14);
  }

  .hero-photo::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 52%, rgba(2, 2, 2, 0.5));
  }

  .hero-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 58% center;
    transform: scale(1.02);
  }

  .photo-label {
    position: absolute;
    top: 24px;
    left: 24px;
    z-index: 1;
    display: grid;
    gap: 4px;
    max-width: 290px;
    padding: 15px 17px;
    border: 1px solid rgba(23, 21, 18, 0.12);
    border-radius: 14px;
    background: rgba(255, 250, 244, 0.9);
    backdrop-filter: blur(16px);
  }

  .photo-label span {
    color: rgba(23, 21, 18, 0.56);
    font-size: 0.72rem;
  }

  .photo-label strong {
    font-size: 0.92rem;
  }

  .concierge-card {
    position: absolute;
    right: -18px;
    bottom: 0;
    left: 64px;
    z-index: 2;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    background: rgba(2, 2, 2, 0.96);
    color: white;
    box-shadow: 0 30px 80px rgba(2, 2, 2, 0.28);
  }

  .concierge-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .concierge-card-head > div:first-child {
    display: grid;
    gap: 8px;
  }

  .mini-label {
    color: rgba(255, 255, 255, 0.46);
  }

  .concierge-card-head strong {
    font-size: 1.2rem;
  }

  .progress-orbit {
    display: grid;
    gap: 1px;
    justify-items: end;
    min-width: 66px;
    padding: 8px 10px;
    border: 1px solid rgba(215, 183, 158, 0.42);
    border-radius: 12px;
    color: var(--home-blue-bright);
    font-family: var(--font-mono, ui-monospace, monospace);
  }

  .progress-orbit strong {
    font-size: 0.84rem;
  }

  .progress-orbit small {
    color: rgba(255, 255, 255, 0.46);
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .conversation-preview {
    display: grid;
    gap: 12px;
    margin-top: 24px;
  }

  .candidate-message,
  .concierge-response {
    margin: 0;
    border-radius: 16px;
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .candidate-message {
    display: grid;
    gap: 5px;
    width: 100%;
    padding: 13px 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.86);
  }

  .candidate-message span {
    color: var(--home-blue-bright);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .candidate-message strong {
    font-size: 0.82rem;
    font-weight: 520;
  }

  .concierge-response {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    max-width: 100%;
    padding: 14px;
    background: rgba(175, 124, 84, 0.16);
    color: rgba(255, 255, 255, 0.92);
  }

  .concierge-response p {
    margin: 0;
    line-height: 1.45;
  }

  .response-mark,
  .handoff-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: var(--home-blue-bright);
    color: var(--home-ink-deep);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .handoff-state {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .handoff-state > div {
    display: grid;
    gap: 3px;
  }

  .handoff-state strong {
    font-size: 0.82rem;
  }

  .handoff-state span:last-child {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.75rem;
  }

  .hero-stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-top: clamp(78px, 9vw, 136px);
    border-top: 1px solid rgba(23, 21, 18, 0.14);
    border-bottom: 1px solid rgba(23, 21, 18, 0.14);
  }

  .hero-stat-grid article {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px;
    min-height: 152px;
    padding: 28px;
    border-right: 1px solid rgba(23, 21, 18, 0.14);
  }

  .hero-stat-grid article:last-child {
    border-right: 0;
  }

  .stat-number {
    color: var(--home-blue);
  }

  .hero-stat-grid article > div {
    display: grid;
    align-content: start;
    gap: 8px;
  }

  .hero-stat-grid strong {
    font-size: 1rem;
  }

  .hero-stat-grid p {
    max-width: 280px;
    margin: 0;
    color: rgba(23, 21, 18, 0.6);
    font-size: 0.86rem;
    line-height: 1.5;
  }

  .path-section,
  .system-section,
  .faq-section {
    padding: clamp(96px, 11vw, 170px) 0;
  }

  .path-section {
    background: var(--home-paper-bright);
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr);
    gap: 48px;
    align-items: end;
  }

  .section-kicker {
    display: block;
    margin-bottom: 24px;
    color: var(--home-blue);
  }

  .section-heading h2,
  .system-intro h2,
  .faq-heading h2 {
    margin: 0;
    font-size: clamp(3rem, 5.7vw, 6.2rem);
    font-weight: 520;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .section-heading > p,
  .system-intro > p,
  .faq-heading > p {
    margin: 0;
    color: rgba(23, 21, 18, 0.62);
    font-size: 1rem;
    line-height: 1.64;
  }

  .path-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: 510px;
    gap: 18px;
    margin-top: 66px;
  }

  .path-card {
    position: relative;
    grid-column: span 4;
    overflow: hidden;
    border-radius: 28px;
    color: white;
    text-decoration: none;
    isolation: isolate;
  }

  .path-card.path-featured {
    grid-column: span 6;
  }

  .path-card.path-featured + .path-card {
    grid-column: span 3;
  }

  .path-card.path-featured + .path-card + .path-card {
    grid-column: span 3;
  }

  .path-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  .path-card:hover img {
    transform: scale(1.045);
  }

  .path-shade {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(180deg, rgba(2, 2, 2, 0.08) 20%, rgba(2, 2, 2, 0.88) 100%),
      linear-gradient(90deg, rgba(2, 2, 2, 0.26), transparent 72%);
  }

  .path-index,
  .path-content,
  .path-arrow {
    position: absolute;
    z-index: 2;
  }

  .path-index {
    top: 24px;
    left: 24px;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 999px;
    background: rgba(2, 2, 2, 0.16);
    backdrop-filter: blur(12px);
  }

  .path-content {
    right: 24px;
    bottom: 26px;
    left: 24px;
    display: grid;
    gap: 10px;
  }

  .path-content strong {
    max-width: 380px;
    font-size: clamp(1.45rem, 2.2vw, 2.3rem);
    font-weight: 520;
    letter-spacing: -0.035em;
    line-height: 1;
  }

  .path-content > span {
    max-width: 350px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .path-arrow {
    top: 24px;
    right: 24px;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: white;
    color: var(--home-ink);
    transition: transform 180ms ease;
  }

  .path-card:hover .path-arrow {
    transform: rotate(10deg) scale(1.04);
  }

  .handoff-section {
    padding: clamp(100px, 12vw, 190px) 0;
    background:
      radial-gradient(circle at 88% 18%, rgba(215, 183, 158, 0.13), transparent 28%),
      var(--home-ink-deep);
    color: white;
  }

  .handoff-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.84fr) minmax(460px, 0.76fr);
    gap: clamp(64px, 9vw, 150px);
  }

  .section-kicker-light {
    color: var(--home-blue-bright);
  }

  .handoff-heading h2,
  .closing-content h2 {
    margin: 0;
    font-size: clamp(3.2rem, 5.6vw, 6.4rem);
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .handoff-heading h2 em,
  .closing-content h2 em {
    color: var(--home-blue-bright);
  }

  .handoff-heading p {
    max-width: 580px;
    margin: 34px 0 0;
    color: rgba(255, 255, 255, 0.58);
    line-height: 1.65;
  }

  .handoff-heading > a {
    display: inline-flex;
    gap: 12px;
    margin-top: 34px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(215, 183, 158, 0.45);
    color: white;
    text-decoration: none;
  }

  .handoff-steps {
    display: grid;
  }

  .handoff-steps article {
    display: grid;
    grid-template-columns: 64px 1fr;
    min-height: 220px;
  }

  .step-rail {
    display: grid;
    grid-template-rows: 52px 1fr;
    justify-items: center;
  }

  .step-rail > span {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 1px solid rgba(215, 183, 158, 0.42);
    border-radius: 999px;
    color: var(--home-blue-bright);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
  }

  .step-rail i {
    width: 1px;
    height: 100%;
    background: linear-gradient(rgba(215, 183, 158, 0.4), rgba(215, 183, 158, 0.06));
  }

  .handoff-steps article:last-child .step-rail i {
    display: none;
  }

  .step-copy {
    padding: 2px 0 48px 26px;
  }

  .step-copy > span {
    color: var(--home-blue-bright);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .step-copy h3 {
    margin: 15px 0 0;
    font-size: clamp(1.8rem, 2.7vw, 3rem);
    font-weight: 500;
    letter-spacing: -0.045em;
  }

  .step-copy p {
    max-width: 460px;
    margin: 14px 0 0;
    color: rgba(255, 255, 255, 0.52);
    line-height: 1.6;
  }

  .system-section {
    background: var(--home-paper);
  }

  .system-grid,
  .faq-grid {
    display: grid;
    grid-template-columns: minmax(300px, 0.66fr) minmax(0, 1fr);
    gap: clamp(60px, 9vw, 150px);
  }

  .system-intro {
    align-self: start;
    position: sticky;
    top: 132px;
  }

  .system-intro h2,
  .faq-heading h2 {
    font-size: clamp(2.9rem, 4.4vw, 5rem);
  }

  .system-intro > p,
  .faq-heading > p {
    max-width: 480px;
    margin-top: 28px;
  }

  .system-proof {
    display: grid;
    gap: 0;
    margin-top: 34px;
    border-top: 1px solid rgba(23, 21, 18, 0.16);
  }

  .system-proof span {
    padding: 15px 0;
    border-bottom: 1px solid rgba(23, 21, 18, 0.16);
    color: rgba(23, 21, 18, 0.68);
    font-size: 0.86rem;
  }

  .system-proof span::before {
    content: '✓';
    margin-right: 10px;
    color: var(--home-blue);
  }

  .service-list {
    border-top: 1px solid rgba(23, 21, 18, 0.18);
  }

  .service-list > a {
    display: grid;
    grid-template-columns: 52px 1fr auto;
    gap: 22px;
    align-items: start;
    min-height: 172px;
    padding: 28px 4px;
    border-bottom: 1px solid rgba(23, 21, 18, 0.18);
    color: var(--home-ink);
    text-decoration: none;
    transition:
      padding 180ms ease,
      background 180ms ease;
  }

  .service-list > a:hover {
    padding-inline: 16px;
    background: rgba(255, 255, 255, 0.48);
  }

  .service-index {
    padding-top: 5px;
    color: var(--home-blue);
  }

  .service-copy {
    display: grid;
    gap: 14px;
  }

  .service-copy strong {
    font-size: clamp(1.5rem, 2vw, 2.25rem);
    font-weight: 520;
    letter-spacing: -0.035em;
  }

  .service-copy > span {
    max-width: 580px;
    color: rgba(23, 21, 18, 0.6);
    line-height: 1.55;
  }

  .service-arrow {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(23, 21, 18, 0.2);
    border-radius: 999px;
  }

  .faq-section {
    background: var(--home-paper-bright);
  }

  .faq-heading {
    align-self: start;
  }

  .faq-list {
    border-top: 1px solid rgba(23, 21, 18, 0.18);
  }

  .faq-list details {
    border-bottom: 1px solid rgba(23, 21, 18, 0.18);
  }

  .faq-list summary {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    gap: 20px;
    align-items: center;
    min-height: 96px;
    cursor: pointer;
    list-style: none;
  }

  .faq-list summary::-webkit-details-marker {
    display: none;
  }

  .faq-number {
    color: var(--home-blue);
  }

  .faq-list summary strong {
    font-size: clamp(1.05rem, 1.4vw, 1.3rem);
    font-weight: 520;
  }

  .faq-plus {
    font-size: 1.65rem;
    font-weight: 300;
    transition: transform 180ms ease;
  }

  .faq-list details[open] .faq-plus {
    transform: rotate(45deg);
  }

  .faq-list details > p {
    max-width: 640px;
    margin: 0 0 28px 68px;
    color: rgba(23, 21, 18, 0.62);
    line-height: 1.65;
  }

  .closing-section {
    position: relative;
    min-height: 760px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 0%, rgba(215, 183, 158, 0.16), transparent 42%),
      var(--home-ink-deep);
    color: white;
    isolation: isolate;
  }

  .closing-content {
    position: relative;
    z-index: 2;
    max-width: 1120px;
    padding-block: 110px;
    text-align: center;
  }

  .closing-content h2 {
    font-size: clamp(3.5rem, 6.5vw, 7.2rem);
  }

  .closing-content > p {
    max-width: 650px;
    margin: 34px auto 0;
    color: rgba(255, 255, 255, 0.58);
    font-size: 1.04rem;
    line-height: 1.62;
  }

  .closing-actions {
    justify-content: center;
  }

  .action-primary-light {
    border-color: white;
    background: white;
    color: var(--home-ink-deep);
  }

  .action-primary-light:hover {
    background: #faf5ef;
  }

  .action-primary-light .action-arrow {
    background: var(--home-ink-deep);
    color: white;
  }

  .closing-link {
    border-color: rgba(255, 255, 255, 0.32);
    color: white;
  }

  .closing-orbit {
    position: absolute;
    z-index: 1;
    border: 1px solid rgba(215, 183, 158, 0.15);
    border-radius: 999px;
    pointer-events: none;
  }

  .closing-orbit-one {
    width: min(74vw, 1040px);
    aspect-ratio: 1;
  }

  .closing-orbit-two {
    width: min(48vw, 680px);
    aspect-ratio: 1;
  }

  @keyframes signal-pulse {
    0% {
      transform: scale(0.72);
      opacity: 0.8;
    }
    70%,
    100% {
      transform: scale(1.9);
      opacity: 0;
    }
  }

  @media (max-width: 1120px) {
    .hero-grid {
      grid-template-columns: minmax(0, 1fr) minmax(390px, 0.76fr);
      gap: 44px;
    }

    .hero-copy h1 {
      font-size: clamp(3.5rem, 6.2vw, 5.6rem);
    }

    .hero-product {
      min-height: 610px;
    }

    .path-grid {
      grid-auto-rows: 460px;
    }

    .path-card.path-featured {
      grid-column: span 6;
    }

    .path-card.path-featured + .path-card,
    .path-card.path-featured + .path-card + .path-card {
      grid-column: span 3;
    }
  }

  @media (max-width: 900px) {
    .home-shell {
      width: min(calc(100% - 36px), 760px);
    }

    .home-hero {
      padding-top: 78px;
    }

    .hero-grid,
    .handoff-grid,
    .system-grid,
    .faq-grid,
    .section-heading {
      grid-template-columns: 1fr;
    }

    .hero-copy h1 {
      max-width: 720px;
      font-size: clamp(3.7rem, 11vw, 6.5rem);
    }

    .hero-product {
      width: min(100%, 640px);
      min-height: 650px;
      margin: 24px auto 0;
    }

    .hero-stat-grid {
      grid-template-columns: 1fr;
      margin-top: 90px;
    }

    .hero-stat-grid article {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid rgba(23, 21, 18, 0.14);
    }

    .hero-stat-grid article:last-child {
      border-bottom: 0;
    }

    .section-heading > p {
      max-width: 560px;
    }

    .path-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: 430px;
    }

    .path-card.path-featured,
    .path-card.path-featured + .path-card,
    .path-card.path-featured + .path-card + .path-card {
      grid-column: span 1;
    }

    .path-card.path-featured {
      grid-column: 1 / -1;
    }

    .handoff-grid {
      gap: 84px;
    }

    .system-intro {
      position: static;
    }

    .closing-section {
      min-height: 680px;
    }

    .closing-orbit-one {
      width: 120vw;
    }

    .closing-orbit-two {
      width: 76vw;
    }
  }

  @media (max-width: 620px) {
    .home-shell {
      width: min(calc(100% - 28px), 540px);
    }

    .home-hero {
      padding-top: 58px;
    }

    .hero-kicker {
      margin-bottom: 24px;
    }

    .hero-copy h1 {
      font-size: clamp(3.25rem, 16.2vw, 4.8rem);
      line-height: 0.94;
    }

    .hero-copy h1 > span:nth-child(2) {
      padding-left: 0;
    }

    .hero-intro {
      margin-top: 26px;
      font-size: 1rem;
    }

    .hero-actions,
    .closing-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .action-primary {
      width: 100%;
    }

    .action-secondary,
    .closing-link {
      align-self: flex-start;
    }

    .hero-trust {
      display: grid;
    }

    .hero-product {
      min-height: 580px;
    }

    .hero-product::before {
      inset: 66px -5px 106px 20px;
      border-radius: 24px;
    }

    .hero-photo {
      inset: 42px 0 112px 0;
      border-radius: 24px;
    }

    .photo-label {
      top: 16px;
      right: 16px;
      left: 16px;
      max-width: none;
    }

    .concierge-card {
      right: 0;
      left: 10px;
      padding: 20px;
    }

    .candidate-message {
      max-width: 96%;
    }

    .hero-stat-grid article {
      padding-inline: 4px;
    }

    .path-section,
    .system-section,
    .faq-section {
      padding: 92px 0;
    }

    .section-heading h2,
    .system-intro h2,
    .faq-heading h2,
    .handoff-heading h2,
    .closing-content h2 {
      font-size: clamp(2.9rem, 14vw, 4.4rem);
    }

    .path-grid {
      grid-template-columns: 1fr;
      grid-auto-rows: 410px;
      margin-top: 46px;
    }

    .path-card.path-featured,
    .path-card.path-featured + .path-card,
    .path-card.path-featured + .path-card + .path-card {
      grid-column: auto;
    }

    .handoff-section {
      padding: 96px 0;
    }

    .handoff-steps article {
      grid-template-columns: 50px 1fr;
      min-height: 205px;
    }

    .step-copy {
      padding-left: 18px;
    }

    .service-list > a {
      grid-template-columns: 42px 1fr;
    }

    .service-arrow {
      display: none;
    }

    .faq-list summary {
      grid-template-columns: 34px 1fr auto;
      gap: 10px;
    }

    .faq-list details > p {
      margin-left: 44px;
    }

    .closing-section {
      min-height: 700px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-signal::after {
      animation: none;
    }

    .path-card img,
    .path-arrow,
    .action-primary,
    .service-list > a,
    .faq-plus {
      transition: none;
    }
  }
</style>
