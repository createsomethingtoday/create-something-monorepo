<script lang="ts">
  import { createConciergeThreadClient } from '$chat/client-actions';
  import { absoluteUrl } from '$lib/site/seo';
  import type { PageData } from './$types';

  export let data: PageData;

  const pageTitle = 'Start a Nurse Application | Abundance Staffing';
  const pageDescription =
    'Start or continue a guided Abundance nurse staffing application with role, shift, location, timing, and verification handled in one thread.';
  const pagePath = '/apply';
  const pageImage = absoluteUrl('/abundance/hero-handoff.png');

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
    : 'Start now, verify later';
  $: trustDetail = data.intakeAccess.granted
    ? 'If a document or recruiter review step appears, this browser can continue without another code.'
    : 'Begin with the role you want. If documents or recruiter review come later, Concierge will ask for a one-time email code then.';

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

      <aside class="first-message">
        <div class="first-message-head">
          <span class="concierge-mark">A</span>
          <div>
            <span>Abundance Concierge</span>
            <strong>Your first message can be simple.</strong>
          </div>
        </div>
        <blockquote>
          “I’m an ICU nurse in Austin looking for a 13-week travel contract. Nights are best.”
        </blockquote>
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
    background: #f3f2ed;
  }

  .apply-page {
    --apply-ink: #10282b;
    --apply-deep: #071719;
    --apply-blue: #2d7782;
    --apply-aqua: #73c7ca;
    color: var(--apply-ink);
    background: #f3f2ed;
    overflow: clip;
  }

  .apply-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
  }

  .apply-hero {
    position: relative;
    padding: clamp(92px, 11vw, 165px) 0 clamp(94px, 10vw, 150px);
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
    background: radial-gradient(circle, rgba(115, 199, 202, 0.22), transparent 68%);
  }

  .apply-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(400px, 0.68fr);
    gap: clamp(64px, 9vw, 150px);
    align-items: center;
  }

  .apply-kicker,
  .state-card-head > span:first-child,
  .step-index,
  .application-steps article > div > span {
    color: var(--apply-blue);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .apply-copy h1 {
    max-width: 840px;
    margin: 26px 0 0;
    font-size: clamp(3.8rem, 7vw, 7.2rem);
    font-weight: 530;
    letter-spacing: -0.065em;
    line-height: 0.93;
    text-wrap: balance;
  }

  .apply-copy h1 em,
  .application-heading h2 em {
    color: var(--apply-blue);
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    letter-spacing: -0.045em;
  }

  .apply-copy > p {
    max-width: 640px;
    margin: 32px 0 0;
    color: rgba(16, 40, 43, 0.64);
    font-size: clamp(1rem, 1.25vw, 1.18rem);
    line-height: 1.65;
  }

  .apply-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 36px;
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
    border: 1px solid rgba(16, 40, 43, 0.18);
    background: rgba(255, 255, 255, 0.48);
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
    margin-top: 34px;
  }

  .apply-proof span {
    color: rgba(16, 40, 43, 0.58);
    font-size: 0.82rem;
  }

  .apply-proof span::before {
    content: '✓';
    margin-right: 8px;
    color: var(--apply-blue);
    font-weight: 700;
  }

  .first-message {
    padding: clamp(26px, 3vw, 40px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 32px;
    background:
      radial-gradient(circle at 88% 12%, rgba(115, 199, 202, 0.14), transparent 32%),
      var(--apply-deep);
    color: white;
    box-shadow: 0 38px 90px rgba(7, 23, 25, 0.18);
  }

  .first-message-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .concierge-mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--apply-aqua);
    color: var(--apply-deep);
    font-weight: 700;
  }

  .first-message-head > div {
    display: grid;
    gap: 5px;
  }

  .first-message-head > div > span {
    color: var(--apply-aqua);
    font-size: 0.7rem;
  }

  .first-message-head strong {
    font-size: 0.92rem;
  }

  blockquote {
    margin: 48px 0;
    color: rgba(255, 255, 255, 0.94);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 3.1vw, 3.4rem);
    font-style: italic;
    letter-spacing: -0.035em;
    line-height: 1.12;
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
    margin-top: 4px;
    border-radius: 999px;
    background: #d9a465;
    box-shadow: 0 0 0 5px rgba(217, 164, 101, 0.1);
  }

  .trust-state.good .trust-dot {
    background: var(--apply-aqua);
    box-shadow: 0 0 0 5px rgba(115, 199, 202, 0.1);
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
    padding: clamp(100px, 12vw, 180px) 0;
    background: #fbfaf6;
  }

  .application-heading {
    display: grid;
    grid-template-columns: minmax(180px, 0.35fr) 1fr;
    gap: 40px;
    align-items: start;
  }

  .application-heading h2 {
    margin: 0;
    font-size: clamp(3rem, 5.5vw, 6.3rem);
    font-weight: 520;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .application-grid {
    display: grid;
    grid-template-columns: minmax(360px, 0.74fr) minmax(0, 1fr);
    gap: clamp(48px, 8vw, 120px);
    margin-top: 74px;
  }

  .application-state-card {
    align-self: start;
    position: sticky;
    top: 128px;
    padding: 34px;
    border-radius: 30px;
    background: var(--apply-ink);
    color: white;
    box-shadow: 0 30px 80px rgba(7, 23, 25, 0.16);
  }

  .state-card-head,
  .completion-row {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
  }

  .state-card-head > span:first-child {
    color: var(--apply-aqua);
  }

  .state-pill {
    padding: 8px 10px;
    border: 1px solid rgba(115, 199, 202, 0.22);
    border-radius: 999px;
    background: rgba(115, 199, 202, 0.08);
    color: var(--apply-aqua);
    font-size: 0.68rem;
    text-transform: capitalize;
  }

  .state-pill.handoff {
    border-color: rgba(217, 164, 101, 0.24);
    background: rgba(217, 164, 101, 0.09);
    color: #d9a465;
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
    background: var(--apply-aqua);
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
    border-top: 1px solid rgba(16, 40, 43, 0.18);
  }

  .application-steps article {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 24px;
    min-height: 210px;
    padding: 32px 0;
    border-bottom: 1px solid rgba(16, 40, 43, 0.18);
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
    color: rgba(16, 40, 43, 0.6);
    line-height: 1.6;
  }

  .saved-helper {
    max-width: 760px;
    margin: 32px 0 0 auto;
    color: rgba(16, 40, 43, 0.58);
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

    .first-message {
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
      padding: 68px 0 92px;
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

    blockquote {
      margin: 38px 0;
    }

    .application-section {
      padding: 92px 0;
    }

    .application-heading h2 {
      font-size: clamp(3rem, 14vw, 4.3rem);
    }

    .application-grid {
      margin-top: 54px;
    }

    .application-state-card {
      padding: 26px;
    }

    .application-steps article {
      grid-template-columns: 40px 1fr;
      gap: 14px;
    }
  }
</style>
