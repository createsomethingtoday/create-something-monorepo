<script lang="ts">
  import {
    heroVisual,
    staffingCareCards,
    staffingFaqs,
    staffingProcess,
    staffingRoles,
    staffingServiceHighlights
  } from '$lib/site/abundance';
  import type { PageData } from './$types';

  export let data: PageData;

  const processOwners = ['Nurse or facility', 'Abundance agents', 'Recruiter'];
  const serviceChips = [
    'Travel and per diem roles',
    'Facility coverage requests',
    'Recruiter-led review',
    'Credential readiness'
  ];

  $: verificationLabel = data.intakeAccess.granted
    ? 'Verified browser'
    : 'No account needed';
  $: verificationDetail = data.intakeAccess.granted
    ? 'Protected steps can continue here.'
    : 'Start now. Verify only when documents or recruiter review need it.';
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.prod.website-files.com/6975f7e617285604fcb645f7/css/healen.webflow.shared.7df6645cf.css"
  />
  <title>Abundance Staffing | Guided Nurse Applications</title>
  <meta
    name="description"
    content="Abundance is a nurse staffing website with guided nurse intake, facility coverage requests, public job discovery, and recruiter-gated agent support."
  />
</svelte:head>

<section class="hero-03 container-full abundance-hero">
  <div class="container-fluid for-hero01">
    <div class="hero-content-03">
      <h1 class="hero-content-title display">Nurse staffing with a clearer handoff.</h1>
      <div class="hero-content-right">
        <p class="hero-content-info-text p1-regular">
          Nurses start in plain language. Facilities request coverage clearly. Recruiters keep the
          final staffing decision.
        </p>
        <div class="hero-content-btns-03">
          <a href="/apply" class="button-01 w-inline-block">
            <div class="button-outside-01">
              <div class="button-inside">
                <div class="button-text-01">Start application</div>
                <div class="button-text-01">Start application</div>
              </div>
            </div>
          </a>
          <a href="/facilities" class="button-03 w-inline-block">
            <div class="button-outside-wrap">
              <div class="btn-text-outside-03">
                <div class="btn-text-inside-03">
                  <div class="button-text-03">Request staffing</div>
                  <div class="button-text-03">Request staffing</div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>

    <div class="hero-thumb abundance-hero-thumb">
      <img src={heroVisual.src} alt={heroVisual.alt} class="hero-thumb-img" />
      <div class="abundance-hero-note">
        <span>{verificationLabel}</span>
        <strong>{verificationDetail}</strong>
      </div>
    </div>
  </div>
</section>

<section class="support-02 container-full abundance-care">
  <div class="container-fluid">
    <div class="support-head-02">
      <h2 class="support-title-02 heading-01">Care built around the staffing handoff</h2>
      <p class="support-text-02 p1-regular">
        One public site for nurses, facilities, and recruiter review.
      </p>
    </div>

    <div class="support-list-wrap abundance-care-list">
      {#each staffingCareCards as card}
        <a class="support-thumb-item abundance-care-card" href={card.href}>
          <img src={card.image} alt="" class="support-thumb-img" loading="lazy" />
          <span class="abundance-card-shade"></span>
          <span class="support-thumb-text heading-03">{card.title}</span>
          <span class="abundance-care-text">{card.body}</span>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="feature-doctors container-full abundance-roles">
  <div class="feature-doctor-content">
    <div class="feature-dr-head">
      <h2 class="heading-01">Staffing roles, clearly separated</h2>
      <p class="feature-dr-text p1-regular">
        The site explains who starts, who prepares, and who approves.
      </p>
    </div>

    <div class="feature-dr-list-wrap">
      <div class="feature-dr-list">
        {#each staffingRoles as role}
          <article class="doctor-item abundance-role-card">
            <div class="doctor-thumb-wrap">
              <img src={role.image} alt="" class="doctor-thumb-img" loading="lazy" />
            </div>
            <div class="doctor-destination">
              <h3 class="heading-05">{role.name}</h3>
              <div class="doctor-type-wrap">
                <span class="abundance-dot"></span>
                <span class="p2-regular">{role.lane}</span>
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="works-02 container-full abundance-process">
  <div class="container-fluid for-works">
    <div class="works-content">
      <div class="abundance-process-head">
        <span>Staffing workflow</span>
        <h2 class="works-title-02 heading-01">How the handoff works</h2>
        <p class="p1-regular">
          Three steps. One owner at each step. No loose intake thread.
        </p>
      </div>
      <div class="works-items abundance-process-grid">
        {#each staffingProcess as step, index}
          <article class="works-item abundance-work-card">
            <div class="abundance-work-top">
              <div class="works-item-thumb-wrap abundance-step-number">
                <span>{index + 1}</span>
              </div>
              <span class="abundance-step-owner">{processOwners[index]}</span>
            </div>
            <div class="works-item-info">
              <h3 class="works-item-info-title heading-05">{step.title}</h3>
              <p class="works-itm-info-text p2-regular">{step.body}</p>
            </div>
            <span class="abundance-work-rule"></span>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="feature-blog-04 container-full abundance-proof">
  <div class="container-fluid">
    <div class="feature-blog-content-04">
      <div class="abundance-section-head">
        <h2 class="heading-01">Staffing support for both sides of the shift.</h2>
        <p class="p1-regular">
          Abundance helps nurses find better-fit work and facilities request coverage clearly.
        </p>
      </div>
      <div class="abundance-proof-grid">
        {#each staffingServiceHighlights as item}
          <article class="abundance-proof-card">
            <h3 class="heading-05">{item.title}</h3>
            <p class="p2-regular">{item.body}</p>
            <a href={item.href} class="abundance-text-link">Explore service</a>
          </article>
        {/each}
      </div>
      <div class="abundance-rule-strip" aria-label="Service areas">
        {#each serviceChips as item}
          <span>{item}</span>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="faqs-02 container-full w-variant-1100b3f9-b079-9267-4964-4e585b3a1c23 abundance-faq">
  <div class="container-fluid">
    <div class="faqs-content">
      <h2 class="support-title heading-01">Frequently asked questions</h2>
      <div class="faqs-list-wrapper">
        <div class="faqs-list _02">
          {#each staffingFaqs as faq}
            <details class="faq-body abundance-faq-item">
              <summary class="faqs-button">
                <span class="faq-question-text heading-05">{faq.question}</span>
                <span class="abundance-plus">+</span>
              </summary>
              <div class="faq-anwer-thumb-wrap p1-regular">{faq.answer}</div>
            </details>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="cta container-full abundance-cta">
  <div class="container-fluid">
    <div class="cta-content">
      <span class="abundance-cta-kicker">Ready when the staffing need is real</span>
      <h2 class="cta-title heading-01">Start with the staffing need. Keep the review human.</h2>
      <p class="abundance-cta-copy p1-regular">
        Nurses can begin without an account. Protected steps wait for verification and recruiter
        review.
      </p>
      <div class="cta-button-wrap">
        <a href="/apply" class="abundance-cta-primary">Start application</a>
        <a href="/facilities" class="abundance-cta-secondary">Request staffing</a>
      </div>
      <div class="abundance-cta-proof" aria-label="Staffing guardrails">
        <span>No service keys in browser</span>
        <span>Recruiter approval</span>
        <span>Secure verification</span>
      </div>
    </div>
  </div>
  <img
    src={heroVisual.src}
    alt=""
    class="cta-bg"
    loading="lazy"
  />
</section>

<footer class="footer-wrapper abundance-footer">
  <section class="footer container-full">
    <div class="container-fluid">
      <div class="footer-content">
        <div class="footer-wrap">
          <div class="footer-left">
            <div class="footer-left-head">
              <div class="abundance-footer-brand">
                <span>A</span>
                <strong>Abundance Staffing</strong>
              </div>
              <h2 class="footer-left-title heading-03">Abundance Staffing</h2>
              <p class="footer-left-text p2-regular">
                Guided nurse applications, facility requests, public jobs, and recruiter review.
              </p>
              <div class="footer-left-btns">
                <a href="/apply" class="abundance-footer-action">Start application</a>
              </div>
            </div>
          </div>
          <div class="footer-right-wrap">
            <div class="footer-right">
              <div class="footer-body">
                <div class="title-small">Paths</div>
                <div class="footer-body-links">
                  <div class="footer-link-wrap"><a href="/nurses" class="footer-link">Nurses</a></div>
                  <div class="footer-link-wrap"><a href="/jobs" class="footer-link">Jobs</a></div>
                  <div class="footer-link-wrap"><a href="/facilities" class="footer-link">Facilities</a></div>
                  <div class="footer-link-wrap"><a href="/agents" class="footer-link">Agents</a></div>
                </div>
              </div>
              <div class="footer-body">
                <div class="title-small">Start</div>
                <div class="footer-body-links">
                  <div class="footer-link-wrap"><a href="/apply" class="footer-link">Apply now</a></div>
                  <div class="footer-link-wrap"><a href="/facilities" class="footer-link">Request coverage</a></div>
                  <div class="footer-link-wrap"><a href="/agents" class="footer-link">Agent support</a></div>
                </div>
              </div>
              <div class="footer-body abundance-footer-trust">
                <div class="title-small">Trust</div>
                <div class="footer-body-links">
                  <span>Recruiters approve staffing moves.</span>
                  <span>Verification gates protected steps.</span>
                  <span>Public jobs stay read-only.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-copyright-wrap">
            <div class="footer-copyright-text">(c) 2026 Abundance Staffing.</div>
            <div class="abundance-footer-bottom-links">
              <a href="/agents">Agent system</a>
              <a href="/apply">Start</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</footer>

<style>
  .abundance-hero {
    padding-top: 86px;
    padding-bottom: 72px;
  }

  .abundance-hero .hero-content-03 {
    margin-bottom: clamp(44px, 5.5vw, 82px);
    align-items: flex-start;
  }

  .abundance-hero .hero-content-btns-03 {
    padding-top: 4px;
  }

  .abundance-hero .button-01 {
    background: var(--secondary);
    color: var(--white);
    box-shadow: 0 16px 36px rgba(175, 124, 84, 0.22);
  }

  .abundance-hero .button-03 {
    color: var(--black);
  }

  .abundance-hero .button-03 .button-outside-wrap {
    border-color: rgba(175, 124, 84, 0.22);
    background: rgba(255, 255, 255, 0.5);
  }

  .abundance-hero-thumb {
    position: relative;
    border-radius: 16px;
    border: 1px solid rgba(175, 124, 84, 0.16);
    box-shadow: 0 28px 80px rgba(67, 48, 33, 0.1);
  }

  .abundance-hero-thumb::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(250, 245, 239, 0.12), transparent 45%);
    pointer-events: none;
  }

  .abundance-hero-note {
    position: absolute;
    right: 24px;
    bottom: 24px;
    left: 24px;
    z-index: 2;
    display: grid;
    gap: 8px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 14px;
    background: rgba(250, 245, 239, 0.9);
    backdrop-filter: blur(12px);
  }

  .abundance-hero-note span,
  .abundance-rule-strip span {
    color: var(--secondary);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .abundance-hero-note strong {
    color: var(--black);
    font-size: 18px;
    line-height: 1.2;
  }

  .abundance-care-list {
    margin-top: 40px;
  }

  .abundance-care-card {
    text-decoration: none;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .abundance-care-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 24px 64px rgba(67, 48, 33, 0.14);
  }

  .abundance-card-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 25%, rgba(2, 2, 2, 0.62));
  }

  .abundance-care-text {
    z-index: 1;
    max-width: 26rem;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.4;
    position: relative;
  }

  .abundance-roles {
    padding-top: 104px;
    padding-bottom: 112px;
    background:
      linear-gradient(180deg, var(--background) 0%, #fbf7f1 100%);
  }

  .abundance-roles .feature-doctor-content {
    width: min(100% - 60px, 1320px);
    margin: 0 auto;
  }

  .abundance-roles .feature-dr-head {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(280px, 0.45fr);
    gap: clamp(24px, 5vw, 72px);
    align-items: end;
    margin-bottom: 42px;
  }

  .abundance-roles .feature-dr-head h2 {
    max-width: 760px;
    margin: 0;
  }

  .abundance-roles .feature-dr-text {
    max-width: 360px;
    margin: 0;
    color: rgba(2, 2, 2, 0.58);
  }

  .abundance-role-card {
    position: relative;
    width: 100%;
    max-width: none;
    min-width: 0;
    border: 1px solid rgba(175, 124, 84, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.68);
    box-shadow: 0 20px 58px rgba(67, 48, 33, 0.08);
    overflow: hidden;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .abundance-role-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 50px rgba(67, 48, 33, 0.12);
  }

  .abundance-roles .feature-dr-list-wrap {
    position: relative;
    overflow: visible;
  }

  .abundance-roles .feature-dr-list {
    width: 100%;
    max-width: none;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    overflow: visible;
    padding-bottom: 0;
  }

  .abundance-roles .doctor-thumb-wrap {
    height: 280px;
    border-radius: 0;
  }

  .abundance-roles .doctor-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .abundance-roles .doctor-destination {
    display: grid;
    gap: 12px;
    min-height: 132px;
    padding: 22px;
    background: rgba(255, 255, 255, 0.92);
  }

  .abundance-roles .doctor-destination h3 {
    margin: 0;
    color: var(--black);
  }

  .abundance-roles .doctor-type-wrap {
    justify-content: flex-start;
    gap: 10px;
    color: rgba(2, 2, 2, 0.62);
  }

  .abundance-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--secondary);
  }

  .abundance-process {
    position: relative;
    padding-top: 110px;
    padding-bottom: 110px;
    background:
      radial-gradient(circle at 16% 18%, rgba(175, 124, 84, 0.16), transparent 32%),
      linear-gradient(180deg, #fbf7f1 0%, #f4e7dc 100%);
    overflow: hidden;
  }

  .abundance-process-head {
    display: grid;
    gap: 14px;
    max-width: 760px;
    margin: 0 auto 48px;
    text-align: center;
  }

  .abundance-process-head span,
  .abundance-step-owner {
    color: var(--secondary);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .abundance-process-head .works-title-02 {
    margin-bottom: 0;
  }

  .abundance-process-head p {
    max-width: 520px;
    margin: 0 auto;
    color: rgba(2, 2, 2, 0.62);
  }

  .abundance-process-grid {
    position: relative;
  }

  .abundance-process-grid::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 12%;
    right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(175, 124, 84, 0.42), transparent);
  }

  .abundance-work-card {
    position: relative;
    min-height: 292px;
    padding: 24px;
    border: 1px solid rgba(175, 124, 84, 0.22);
    border-radius: 24px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(250, 245, 239, 0.72)),
      var(--sub-bg);
    box-shadow: 0 22px 60px rgba(67, 48, 33, 0.08);
    flex-direction: column;
    color: var(--black);
    overflow: hidden;
    isolation: isolate;
  }

  .abundance-work-card:nth-child(2) {
    transform: translateY(22px);
  }

  .abundance-work-card:nth-child(3) {
    background:
      linear-gradient(145deg, rgba(2, 2, 2, 0.86), rgba(67, 48, 33, 0.82)),
      var(--black);
    color: var(--white);
  }

  .abundance-work-card:nth-child(3) .works-item-info,
  .abundance-work-card:nth-child(3) .works-itm-info-text,
  .abundance-work-card:nth-child(3) .works-item-info-title {
    color: var(--white);
  }

  .abundance-work-card:nth-child(3) .abundance-step-owner {
    color: rgba(255, 255, 255, 0.7);
  }

  .abundance-work-card .works-item-info {
    max-width: none;
    padding: 0;
    color: var(--black);
    gap: 14px;
    justify-content: flex-end;
    min-height: 130px;
  }

  .abundance-work-card .works-item-info-title {
    color: var(--black);
  }

  .abundance-work-card .works-itm-info-text {
    max-width: 260px;
    color: rgba(2, 2, 2, 0.64);
  }

  .abundance-work-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    position: relative;
    z-index: 1;
  }

  .abundance-step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    min-height: 72px;
    padding: 0;
    border-radius: 999px;
    background: var(--secondary);
    color: var(--white);
    font-size: 28px;
    box-shadow: 0 14px 28px rgba(175, 124, 84, 0.24);
  }

  .abundance-step-number span {
    color: inherit;
  }

  .abundance-work-rule {
    position: absolute;
    right: -42px;
    bottom: -42px;
    width: 154px;
    height: 154px;
    border: 1px solid rgba(175, 124, 84, 0.18);
    border-radius: 999px;
    z-index: -1;
  }

  .abundance-proof-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .abundance-proof-card {
    position: relative;
    display: grid;
    gap: 14px;
    min-height: 230px;
    padding: 24px;
    border: 1px solid rgba(175, 124, 84, 0.18);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(250, 245, 239, 0.84)),
      var(--background);
    box-shadow: 0 18px 46px rgba(67, 48, 33, 0.06);
    overflow: hidden;
  }

  .abundance-proof-card::before {
    content: '';
    width: 42px;
    height: 3px;
    border-radius: 999px;
    background: var(--secondary);
  }

  .abundance-proof-card h3 {
    margin: 0;
  }

  .abundance-text-link {
    align-self: end;
    color: var(--secondary);
    text-decoration: none;
  }

  .abundance-rule-strip {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .abundance-rule-strip span {
    padding: 9px 12px;
    border: 1px solid var(--secondary-20);
    border-radius: 999px;
    background: var(--secondary-12);
  }

  .abundance-faq-item {
    border-bottom: 1px solid var(--black-10);
  }

  .abundance-faq-item summary {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    cursor: pointer;
    list-style: none;
  }

  .abundance-faq-item summary::-webkit-details-marker {
    display: none;
  }

  .abundance-plus {
    color: var(--secondary);
    font-size: 30px;
    line-height: 1;
  }

  .abundance-faq-item[open] .abundance-plus {
    transform: rotate(45deg);
  }

  .abundance-cta {
    position: relative;
    min-height: 720px;
    height: min(86vh, 820px);
    margin-top: 0;
    background: var(--black);
    overflow: hidden;
    isolation: isolate;
  }

  .abundance-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(2, 2, 2, 0.86) 0%, rgba(31, 23, 18, 0.72) 38%, rgba(2, 2, 2, 0.1) 74%),
      linear-gradient(180deg, rgba(2, 2, 2, 0.06), rgba(2, 2, 2, 0.5));
  }

  .abundance-cta::after {
    content: '';
    position: absolute;
    inset: 22px;
    z-index: 2;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 28px;
    pointer-events: none;
  }

  .abundance-cta .cta-content {
    position: relative;
    z-index: 3;
    align-items: flex-start;
    max-width: 650px;
    margin-right: auto;
    margin-left: 0;
    padding-left: clamp(0px, 3vw, 44px);
    text-align: left;
    color: var(--white);
  }

  .abundance-cta .cta-title {
    max-width: 680px;
    margin: 0;
    color: var(--white);
    text-wrap: balance;
  }

  .abundance-cta-kicker,
  .abundance-cta-proof span {
    color: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .abundance-cta-copy {
    max-width: 510px;
    margin: 0;
    color: rgba(255, 255, 255, 0.78);
  }

  .abundance-cta .cta-button-wrap {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .abundance-cta-primary,
  .abundance-cta-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 0 24px;
    border-radius: 999px;
    font-size: 16px;
    line-height: 1;
    text-decoration: none;
  }

  .abundance-cta-primary {
    background: var(--secondary);
    color: var(--white);
  }

  .abundance-cta-secondary {
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: var(--white);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
  }

  .abundance-cta-proof {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    max-width: 560px;
    margin-top: 12px;
  }

  .abundance-cta-proof span {
    padding: 9px 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .abundance-cta .cta-bg {
    width: 100%;
    height: 100%;
    opacity: 0.94;
    filter: saturate(0.88) contrast(1.02);
    object-position: 72% 50%;
  }

  .abundance-footer .footer.container-full {
    padding-top: 46px;
    padding-bottom: 46px;
    background:
      radial-gradient(circle at 18% 10%, rgba(175, 124, 84, 0.18), transparent 28%),
      #0b0b0a;
  }

  .abundance-footer .footer-wrap {
    display: grid;
    grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.45fr);
    gap: clamp(32px, 6vw, 86px);
    align-items: stretch;
    max-width: 1320px;
    padding-bottom: 54px;
  }

  .abundance-footer .footer-left {
    max-width: none;
    min-height: 320px;
    padding: 34px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
      rgba(255, 255, 255, 0.04);
  }

  .abundance-footer .footer-left-head {
    display: grid;
    gap: 22px;
  }

  .abundance-footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: var(--white);
  }

  .abundance-footer-brand span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: var(--white);
    color: var(--black);
    font-size: 18px;
  }

  .abundance-footer-brand strong {
    font-size: 17px;
    font-weight: 500;
  }

  .abundance-footer .footer-left-title {
    max-width: 280px;
    margin: 0;
    color: var(--white);
  }

  .abundance-footer .footer-left-text {
    max-width: 290px;
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
  }

  .abundance-footer-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    width: 100%;
    max-width: 280px;
    padding: 0 22px;
    border-radius: 999px;
    background: var(--secondary);
    color: var(--white);
    font-size: 16px;
    line-height: 1;
    text-decoration: none;
  }

  .abundance-footer .footer-right-wrap {
    max-width: none;
    justify-content: stretch;
  }

  .abundance-footer .footer-right {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    max-width: none;
    height: 100%;
  }

  .abundance-footer .footer-body {
    display: grid;
    align-content: start;
    gap: 22px;
    min-height: 260px;
    padding: 30px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.025);
  }

  .abundance-footer .title-small {
    color: rgba(255, 255, 255, 0.92);
    font-size: 18px;
  }

  .abundance-footer .footer-body-links {
    gap: 16px;
    max-width: none;
  }

  .abundance-footer .footer-link,
  .abundance-footer-trust span,
  .abundance-footer-bottom-links a {
    color: rgba(255, 255, 255, 0.62);
    font-size: 15px;
    line-height: 1.35;
    text-decoration: none;
  }

  .abundance-footer .footer-link:hover,
  .abundance-footer-bottom-links a:hover {
    color: var(--white);
  }

  .abundance-footer-trust span {
    display: block;
    padding-left: 14px;
    border-left: 2px solid rgba(175, 124, 84, 0.55);
  }

  .abundance-footer .footer-bottom {
    padding-top: 28px;
    padding-bottom: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .abundance-footer .footer-copyright-wrap {
    gap: 18px;
  }

  .abundance-footer .footer-copyright-text {
    color: rgba(255, 255, 255, 0.58);
    font-size: 14px;
  }

  .abundance-footer-bottom-links {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  @media (max-width: 991px) {
    .hero-content-03,
    .support-head-02 {
      display: grid;
    }

    .abundance-hero {
      padding-top: 64px;
      padding-bottom: 54px;
    }

    .abundance-hero .hero-content-03 {
      margin-bottom: 34px;
    }

    .works-items {
      grid-template-columns: 1fr;
    }

    .abundance-roles .feature-dr-head,
    .abundance-roles .feature-dr-list,
    .abundance-proof-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .abundance-roles .feature-dr-head {
      align-items: start;
    }

    .abundance-roles .doctor-thumb-wrap {
      height: 240px;
    }

    .abundance-proof-card {
      min-height: 210px;
    }

    .abundance-process-grid::before {
      display: none;
    }

    .abundance-work-card:nth-child(2) {
      transform: none;
    }

    .abundance-cta {
      min-height: 680px;
      height: auto;
    }

    .abundance-cta::after {
      inset: 14px;
      border-radius: 22px;
    }

    .abundance-cta::before {
      background:
        linear-gradient(180deg, rgba(2, 2, 2, 0.74), rgba(2, 2, 2, 0.64)),
        linear-gradient(90deg, rgba(2, 2, 2, 0.72), rgba(2, 2, 2, 0.2));
    }

    .abundance-cta .cta-content {
      padding: 120px 0;
    }

    .abundance-footer .footer-wrap,
    .abundance-footer .footer-right {
      grid-template-columns: 1fr;
    }

    .abundance-footer .footer-left,
    .abundance-footer .footer-body {
      min-height: auto;
    }

    .abundance-footer .footer-copyright-wrap {
      align-items: flex-start;
      flex-direction: column;
    }

    .support-list-wrap {
      flex-direction: column;
    }

    .support-thumb-item {
      max-width: none;
    }
  }

  @media (max-width: 680px) {
    .abundance-roles .feature-doctor-content {
      width: min(100% - 30px, 1320px);
    }

    .abundance-roles .feature-dr-head,
    .abundance-roles .feature-dr-list,
    .abundance-proof-grid {
      grid-template-columns: 1fr;
    }

    .abundance-roles .doctor-thumb-wrap {
      height: 250px;
    }

    .abundance-proof-card {
      min-height: 0;
    }
  }
</style>
