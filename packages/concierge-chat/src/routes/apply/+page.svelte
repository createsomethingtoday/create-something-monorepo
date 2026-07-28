<script lang="ts">
  import { createConciergeThreadClient } from '$chat/client-actions';
  import { absoluteUrl } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const pageTitle = 'Start a Nurse Application | Abundance Staffing';
  const pageDescription =
    'Start or continue a guided Abundance nurse staffing application with role, shift, location, timing, and verification handled in one thread.';
  const pagePath = '/apply';
  const pageImage = absoluteUrl('/abundance/hero-home-2026.webp');

  let creatingThread = false;
  let actionError = '';

  async function startNewThread() {
    creatingThread = true;
    actionError = '';

    try {
      await createConciergeThreadClient();
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Unable to start a new intake thread.';
    } finally {
      creatingThread = false;
    }
  }

  $: latestThread = data.latestThreadId
    ? (data.threadSummaries.find((thread) => thread.id === data.latestThreadId) ??
      data.threadSummaries[0] ??
      null)
    : (data.threadSummaries[0] ?? null);
  $: savedThreadCount = data.threadSummaries.length;
  $: trustTone = data.intakeAccess.granted ? 'good' : 'ready';
  $: trustLabel = data.intakeAccess.granted
    ? 'Verified in this browser'
    : 'No verification required to begin';
  $: trustDetail = data.intakeAccess.granted
    ? 'If a document or recruiter review step appears, this browser can continue without another code.'
    : 'Start with the role you want. Concierge asks for a one-time email code only before documents or recruiter review.';

  const applicationSteps = [
    {
      label: 'Describe',
      title: 'The work you want',
      body: 'Specialty, shift, location, timing, pay range, and anything that would make a role a poor fit.'
    },
    {
      label: 'Confirm',
      title: 'Your working profile',
      body: 'Review what Concierge captured before it becomes recruiter or matching context.'
    },
    {
      label: 'Protect',
      title: 'Sensitive next steps',
      body: 'Email verification appears only for uploads, consent, or recruiter review.'
    }
  ];
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
</svelte:head>

<div class="apply-page">
  <section class="apply-hero">
    <div class="apply-glow" aria-hidden="true"></div>
    <div class="apply-shell apply-hero-grid">
      <div class="apply-copy">
        <span class="apply-kicker">Guided nurse application</span>
        <h1>Start with the contract <em>you actually want.</em></h1>
        <p>
          No long intake form. Tell Concierge what fits in plain language, check the profile it
          builds, and bring in a recruiter when the next step is real.
        </p>

        <div class="apply-actions">
          {#if latestThread}
            <a class="apply-primary" href={`/chat/${latestThread.id}`}>
              <span>Continue application</span>
              <span aria-hidden="true">↗</span>
            </a>
          {/if}
          <button
            class:apply-secondary={latestThread}
            class:apply-primary={!latestThread}
            type="button"
            on:click={startNewThread}
            disabled={creatingThread}
          >
            <span
              >{creatingThread
                ? 'Starting…'
                : latestThread
                  ? 'Start another'
                  : 'Start application'}</span
            >
            {#if !creatingThread}<span aria-hidden="true">↗</span>{/if}
          </button>
        </div>

        {#if actionError}
          <p class="apply-error" role="alert">{actionError}</p>
        {/if}

        <div class="apply-proof" aria-label="Application safeguards">
          <span>No account required</span>
          <span>Private by default</span>
          <span>Recruiter-reviewed</span>
        </div>
      </div>

      <aside class="application-preview" aria-label="Example application preview">
        <div class="preview-topline">
          <span>Application preview</span>
          <span>01 · Ready to begin</span>
        </div>
        <div class="preview-heading">
          <span class="concierge-mark">A</span>
          <div>
            <span>Abundance Concierge</span>
            <strong>Your first turn becomes a working brief.</strong>
          </div>
        </div>
        <div class="role-brief">
          <div class="role-brief-heading">
            <span>Role brief</span>
            <strong>ICU travel nurse</strong>
          </div>
          <div class="brief-tags" aria-label="Example role preferences">
            <span>Austin</span>
            <span>Nights</span>
            <span>13 weeks</span>
            <span>Compact license</span>
          </div>
        </div>
        <div class="preview-response">
          <span aria-hidden="true">A</span>
          <p>I have the role. Next, let’s confirm your start window and pay range.</p>
        </div>
        <div class={`trust-state ${trustTone}`}>
          <span class="trust-dot" aria-hidden="true"></span>
          <div>
            <strong>{trustLabel}</strong>
            <p>{trustDetail}</p>
          </div>
        </div>
      </aside>
    </div>
  </section>

  <section class="application-section">
    <div class="apply-shell">
      <div class="application-heading">
        <span class="apply-kicker">One thread, one next step</span>
        <h2>Useful first.<br /><em>Structured as you go.</em></h2>
      </div>

      <div class="application-grid">
        <article class="application-state-card">
          {#if latestThread}
            <div class="state-card-head">
              <span>Saved application</span>
              <span class:handoff={latestThread.status === 'handoff_ready'} class="state-pill">
                {latestThread.status.replace('_', ' ')}
              </span>
            </div>
            <h3>{latestThread.title}</h3>
            <p>
              {latestThread.subtitle}. Open the same conversation and Concierge will guide the next
              step.
            </p>
            <div class="completion-row">
              <span>{latestThread.profileCompletion}% ready</span>
              <span>{latestThread.pendingAction}</span>
            </div>
            <div
              class="completion-meter"
              aria-label={`Application ${latestThread.profileCompletion}% ready`}
            >
              <span style={`width: ${latestThread.profileCompletion}%`}></span>
            </div>
            {#if latestThread.badges.length > 0}
              <div class="application-badges">
                {#each latestThread.badges as badge}<span>{badge}</span>{/each}
              </div>
            {/if}
          {:else}
            <div class="state-card-head">
              <span>Before you begin</span>
              <span class="state-pill">2 minutes</span>
            </div>
            <h3>A guided start, without the intake wall.</h3>
            <p>
              Have a specialty, preferred shift, location, and rough start window in mind. That is
              enough for the first useful turn.
            </p>
            <div class="sample-profile">
              <span>ICU</span><span>Nights</span><span>Austin</span><span>13 weeks</span>
            </div>
          {/if}
        </article>

        <div class="application-steps">
          {#each applicationSteps as step, index}
            <article>
              <span class="step-index">0{index + 1}</span>
              <div>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          {/each}
        </div>
      </div>

      {#if latestThread && savedThreadCount > 1}
        <p class="saved-helper">
          This browser has {savedThreadCount} saved application threads. Start another only for a different
          role.
        </p>
      {/if}
    </div>
  </section>
</div>

<style>
  :global(body) {
    background: #faf5ef;
  }

  .apply-page {
    --apply-ink: #171512;
    --apply-deep: #020202;
    --apply-tan: #af7c54;
    --apply-tan-soft: #d7b79e;
    --apply-status: #1d6f8a;
    --apply-paper: #faf5ef;
    --apply-paper-bright: #fffaf4;
    color: var(--apply-ink);
    background: var(--apply-paper);
    overflow: clip;
  }

  .apply-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
  }

  .apply-hero {
    position: relative;
    padding: clamp(76px, 8vw, 118px) 0 clamp(82px, 8vw, 122px);
    isolation: isolate;
  }

  .apply-glow {
    position: absolute;
    top: -260px;
    right: -160px;
    z-index: -1;
    width: 700px;
    height: 700px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(215, 183, 158, 0.24), transparent 68%);
  }

  .apply-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(410px, 0.76fr);
    gap: clamp(56px, 7vw, 112px);
    align-items: center;
  }

  .apply-kicker,
  .step-index,
  .application-steps article > div > span {
    color: var(--apply-status);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .apply-copy h1 {
    max-width: 760px;
    margin: 24px 0 0;
    font-size: clamp(3.65rem, 6.2vw, 6.4rem);
    font-weight: 530;
    letter-spacing: -0.065em;
    line-height: 0.93;
    text-wrap: balance;
  }

  .apply-copy h1 em,
  .application-heading h2 em {
    color: var(--apply-tan);
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    letter-spacing: -0.045em;
  }

  .apply-copy > p {
    max-width: 640px;
    margin: 28px 0 0;
    color: rgba(23, 21, 18, 0.64);
    font-size: clamp(1rem, 1.25vw, 1.18rem);
    line-height: 1.65;
  }

  .apply-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 30px;
  }

  .apply-primary,
  .apply-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 26px;
    min-height: 60px;
    padding: 9px 10px 9px 22px;
    border-radius: 999px;
    font: inherit;
    font-weight: 520;
    text-decoration: none;
    cursor: pointer;
  }

  .apply-primary {
    min-width: 230px;
    border: 1px solid var(--apply-ink);
    background: var(--apply-ink);
    color: white;
  }

  .apply-primary > span:last-child,
  .apply-secondary > span:last-child {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: white;
    color: var(--apply-ink);
  }

  .apply-secondary {
    border: 1px solid rgba(23, 21, 18, 0.18);
    background: rgba(255, 250, 244, 0.62);
    color: var(--apply-ink);
  }

  .apply-primary:disabled,
  .apply-secondary:disabled {
    opacity: 0.58;
    cursor: wait;
  }

  .apply-error {
    max-width: 600px;
    margin: 18px 0 0;
    color: #a44335;
  }

  .apply-proof {
    display: flex;
    gap: 8px 18px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .apply-proof span {
    color: rgba(23, 21, 18, 0.62);
    font-size: 0.82rem;
  }

  .apply-proof span::before {
    content: '✓';
    margin-right: 8px;
    color: var(--apply-status);
    font-weight: 700;
  }

  .application-preview {
    padding: clamp(26px, 3vw, 40px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 26px;
    background:
      radial-gradient(circle at 88% 12%, rgba(175, 124, 84, 0.16), transparent 32%),
      var(--apply-deep);
    color: white;
    box-shadow: 0 38px 90px rgba(2, 2, 2, 0.18);
  }

  .preview-topline {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 22px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .preview-heading {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 24px;
  }

  .concierge-mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--apply-tan-soft);
    color: var(--apply-deep);
    font-weight: 700;
  }

  .preview-heading > div {
    display: grid;
    gap: 5px;
  }

  .preview-heading > div > span {
    color: var(--apply-tan-soft);
    font-size: 0.7rem;
  }

  .preview-heading strong {
    font-size: 0.92rem;
  }

  .role-brief {
    display: grid;
    gap: 22px;
    margin-top: 28px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.055);
  }

  .role-brief-heading {
    display: grid;
    gap: 6px;
  }

  .role-brief-heading span {
    color: var(--apply-tan-soft);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .role-brief-heading strong {
    font-size: clamp(1.45rem, 2.2vw, 2.15rem);
    font-weight: 520;
    letter-spacing: -0.04em;
  }

  .brief-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .brief-tags span {
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.68rem;
  }

  .preview-response {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 12px;
    align-items: start;
    margin-top: 14px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(175, 124, 84, 0.14);
  }

  .preview-response > span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--apply-tan-soft);
    color: var(--apply-deep);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .preview-response p {
    margin: 2px 0 0;
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .trust-state {
    display: flex;
    gap: 13px;
    align-items: flex-start;
    padding-top: 22px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .trust-dot {
    flex: 0 0 auto;
    width: 10px;
    height: 10px;
    margin-top: 5px;
    border-radius: 999px;
    background: var(--apply-status);
    box-shadow: 0 0 0 5px rgba(29, 111, 138, 0.14);
  }

  .trust-state.good .trust-dot {
    background: var(--apply-status);
    box-shadow: 0 0 0 5px rgba(29, 111, 138, 0.14);
  }

  .trust-state > div {
    display: grid;
    gap: 6px;
  }

  .trust-state strong {
    font-size: 0.84rem;
  }

  .trust-state p {
    margin: 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .application-section {
    padding: clamp(88px, 9vw, 132px) 0;
    background: var(--apply-paper-bright);
  }

  .application-heading {
    display: grid;
    grid-template-columns: minmax(180px, 0.35fr) 1fr;
    gap: 40px;
    align-items: start;
  }

  .application-heading h2 {
    margin: 0;
    font-size: clamp(3rem, 5vw, 5.6rem);
    font-weight: 520;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .application-grid {
    display: grid;
    grid-template-columns: minmax(360px, 0.74fr) minmax(0, 1fr);
    gap: clamp(48px, 8vw, 120px);
    margin-top: 62px;
  }

  .application-state-card {
    align-self: start;
    position: sticky;
    top: 128px;
    padding: 34px;
    border-radius: 30px;
    background: var(--apply-deep);
    color: white;
    box-shadow: 0 30px 80px rgba(2, 2, 2, 0.16);
  }

  .state-card-head,
  .completion-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
  }

  .state-card-head > span:first-child {
    color: var(--apply-tan-soft);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .state-pill {
    padding: 8px 10px;
    border: 1px solid rgba(29, 111, 138, 0.34);
    border-radius: 999px;
    background: rgba(29, 111, 138, 0.16);
    color: #8fc9d9;
    font-size: 0.68rem;
    text-transform: capitalize;
  }

  .state-pill.handoff {
    border-color: rgba(175, 124, 84, 0.32);
    background: rgba(175, 124, 84, 0.14);
    color: var(--apply-tan-soft);
  }

  .application-state-card h3 {
    margin: 54px 0 0;
    font-size: clamp(2.2rem, 3vw, 3.5rem);
    font-weight: 500;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .application-state-card > p {
    margin: 22px 0 0;
    color: rgba(255, 255, 255, 0.56);
    line-height: 1.62;
  }

  .completion-row {
    margin-top: 34px;
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.72rem;
  }

  .completion-meter {
    height: 5px;
    margin-top: 12px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
  }

  .completion-meter span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--apply-status);
  }

  .application-badges,
  .sample-profile {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 26px;
  }

  .application-badges span,
  .sample-profile span {
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.68rem;
  }

  .application-steps {
    border-top: 1px solid rgba(23, 21, 18, 0.18);
  }

  .application-steps article {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 24px;
    min-height: 210px;
    padding: 32px 0;
    border-bottom: 1px solid rgba(23, 21, 18, 0.18);
  }

  .step-index {
    padding-top: 5px;
  }

  .application-steps article > div {
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .application-steps h3 {
    margin: 2px 0 0;
    font-size: clamp(1.7rem, 2.4vw, 2.7rem);
    font-weight: 520;
    letter-spacing: -0.04em;
  }

  .application-steps p {
    max-width: 620px;
    margin: 0;
    color: rgba(23, 21, 18, 0.6);
    line-height: 1.6;
  }

  .saved-helper {
    max-width: 760px;
    margin: 32px 0 0 auto;
    color: rgba(23, 21, 18, 0.58);
    font-size: 0.84rem;
  }

  @media (max-width: 900px) {
    .apply-shell {
      width: min(calc(100% - 36px), 760px);
    }

    .apply-hero-grid,
    .application-heading,
    .application-grid {
      grid-template-columns: 1fr;
    }

    .apply-copy h1 {
      font-size: clamp(3.7rem, 11vw, 6.4rem);
    }

    .application-preview {
      width: min(100%, 620px);
    }

    .application-grid {
      gap: 70px;
    }

    .application-state-card {
      position: static;
    }
  }

  @media (max-width: 620px) {
    .apply-shell {
      width: min(calc(100% - 28px), 540px);
    }

    .apply-hero {
      padding: 58px 0 78px;
    }

    .apply-copy h1 {
      font-size: clamp(3.2rem, 15.6vw, 4.6rem);
    }

    .apply-copy > p {
      font-size: 1rem;
    }

    .apply-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .apply-primary,
    .apply-secondary {
      width: 100%;
    }

    .apply-proof {
      display: grid;
    }

    .application-preview {
      padding: 24px;
    }

    .application-section {
      padding: 76px 0;
    }

    .application-heading h2 {
      font-size: clamp(3rem, 14vw, 4.3rem);
    }

    .application-grid {
      gap: 46px;
      margin-top: 46px;
    }

    .application-state-card {
      padding: 26px;
    }

    .application-steps article {
      grid-template-columns: 40px 1fr;
      gap: 14px;
      min-height: auto;
      padding: 26px 0;
    }
  }
</style>
