<script lang="ts">
  import {
    buildFacilityCoverageBrief,
    type FacilityCoverageRequest
  } from '$lib/site/public-intake-context';
  import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from '$lib/site/seo';
  import '$lib/site/public-page.css';

  const pagePath = '/facility-request';
  const pageTitle = 'Prepare a Facility Coverage Brief | Abundance Staffing';
  const pageDescription =
    'Prepare a clear facility coverage brief with unit, shift, timing, location, and urgency before recruiter review.';
  const structuredData = jsonLdScript([
    serviceJsonLd({
      name: 'Facility coverage brief preparation',
      description: pageDescription,
      path: pagePath,
      audience: 'Healthcare facilities and staffing coordinators'
    }),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'For facilities', path: '/facilities' },
      { name: 'Coverage brief', path: pagePath }
    ])
  ]);

  let request: FacilityCoverageRequest = {
    facilityName: '',
    specialtyOrUnit: '',
    shift: '',
    coverageWindow: '',
    location: '',
    urgency: ''
  };
  let preparedBrief = '';
  let copied = false;

  function prepareBrief() {
    preparedBrief = buildFacilityCoverageBrief(request);
    copied = false;
  }

  async function copyBrief() {
    if (!preparedBrief || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(preparedBrief);
    copied = true;
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <link rel="canonical" href={absoluteUrl(pagePath)} />
  {@html structuredData}
</svelte:head>

<div class="public-page facility-request-page">
  <section class="public-hero">
    <div class="public-shell facility-request-grid">
      <div class="facility-request-copy">
        <span class="public-kicker">Facility coverage</span>
        <h1 class="public-title">Prepare the need.<br /><em>Keep the handoff clear.</em></h1>
        <p class="public-lede">
          Put the unit, shift, timing, location, and urgency in one short brief before a recruiter
          reviews it. This page does not send outreach or change staffing decisions.
        </p>
        <div class="public-trust-inline" aria-label="Coverage brief boundaries">
          <span>Operational details only</span>
          <span>Prepared, not sent</span>
          <span>Recruiter review stays human</span>
        </div>
      </div>

      <form class="facility-request-form" on:submit|preventDefault={prepareBrief}>
        <div class="facility-request-form-head">
          <span>Coverage brief</span>
          <small>01 · Prepare</small>
        </div>
        <label>
          <span>Facility</span>
          <input bind:value={request.facilityName} required autocomplete="organization" />
        </label>
        <label>
          <span>Unit or specialty</span>
          <input bind:value={request.specialtyOrUnit} required />
        </label>
        <div class="facility-request-fields">
          <label>
            <span>Shift</span>
            <input bind:value={request.shift} required />
          </label>
          <label>
            <span>Coverage window</span>
            <input bind:value={request.coverageWindow} required />
          </label>
        </div>
        <label>
          <span>Location</span>
          <input bind:value={request.location} required autocomplete="address-level2" />
        </label>
        <label>
          <span>Urgency</span>
          <input bind:value={request.urgency} required />
        </label>
        <button type="submit">Prepare coverage brief <span aria-hidden="true">↗</span></button>
      </form>
    </div>
  </section>

  <section class="public-section bright">
    <div class="public-shell brief-output-shell">
      <div class="public-section-head">
        <div>
          <span class="public-section-kicker">Ready for review</span>
          <h2 class="public-section-title">One request.<br /><em>Nothing implied.</em></h2>
        </div>
        <p class="public-section-copy">
          The brief makes the request legible. It does not contact a recruiter, submit a candidate,
          or place coverage on your behalf.
        </p>
      </div>

      {#if preparedBrief}
        <article class="facility-brief" aria-live="polite">
          <div>
            <span>Prepared coverage brief</span>
            <strong>Ready to share through your approved Abundance channel.</strong>
          </div>
          <pre>{preparedBrief}</pre>
          <button type="button" on:click={copyBrief}
            >{copied ? 'Copied brief' : 'Copy brief'}</button
          >
        </article>
      {:else}
        <div class="facility-brief facility-brief-empty">
          <span>Complete the fields above to create a structured, unsent coverage brief.</span>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  .facility-request-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(400px, 0.76fr);
    gap: clamp(54px, 8vw, 128px);
    align-items: start;
  }

  .facility-request-copy {
    padding-top: clamp(12px, 4vw, 84px);
  }

  .facility-request-form,
  .facility-brief {
    display: grid;
    gap: 18px;
    padding: clamp(24px, 4vw, 42px);
    border: 1px solid var(--public-line);
    border-radius: 28px;
    background: var(--public-paper-bright);
    box-shadow: 0 26px 72px rgba(2, 2, 2, 0.1);
  }

  .facility-request-form-head,
  .facility-request-form label,
  .facility-brief > div {
    display: grid;
    gap: 8px;
  }

  .facility-request-form-head,
  .facility-brief > div {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--public-line);
  }

  .facility-request-form-head > span,
  .facility-request-form-head small,
  .facility-request-form label > span,
  .facility-brief > div > span {
    color: var(--public-teal);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .facility-request-form-head {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .facility-request-form label > span {
    color: var(--public-muted);
  }

  .facility-request-form input {
    width: 100%;
    min-height: 48px;
    box-sizing: border-box;
    border: 0;
    border-bottom: 1px solid var(--public-line);
    border-radius: 0;
    background: transparent;
    color: var(--public-ink);
    font: inherit;
  }

  .facility-request-form input:focus-visible {
    outline-offset: 5px;
  }

  .facility-request-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .facility-request-form button,
  .facility-brief button {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    min-height: 56px;
    border: 1px solid var(--public-deep);
    border-radius: 999px;
    padding: 8px 10px 8px 22px;
    background: var(--public-deep);
    color: white;
    font: inherit;
    font-weight: 620;
    cursor: pointer;
  }

  .facility-request-form button span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: white;
    color: var(--public-deep);
  }

  .brief-output-shell {
    display: grid;
    gap: 64px;
  }

  .facility-brief {
    max-width: 900px;
    background: var(--public-deep);
    color: white;
  }

  .facility-brief > div > span {
    color: var(--public-aqua);
  }

  .facility-brief > div > strong {
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    letter-spacing: -0.035em;
  }

  .facility-brief pre {
    margin: 0;
    white-space: pre-wrap;
    color: rgba(255, 255, 255, 0.7);
    font: 0.9rem/1.65 var(--font-mono, ui-monospace, monospace);
  }

  .facility-brief button {
    width: fit-content;
    border-color: rgba(255, 255, 255, 0.22);
    background: transparent;
  }

  .facility-brief-empty {
    color: rgba(255, 255, 255, 0.66);
  }

  @media (max-width: 860px) {
    .facility-request-grid {
      grid-template-columns: 1fr;
    }

    .facility-request-copy {
      padding-top: 0;
    }
  }

  @media (max-width: 560px) {
    .facility-request-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
