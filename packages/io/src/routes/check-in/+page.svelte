<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const currentResponse = $derived(form?.response ?? data.response);
</script>

<SEO
  title="Subscriber Check-in"
  description="Tell CREATE SOMETHING why you joined and what would be useful next."
  propertyName="io"
  noindex={true}
/>

<main class="check-in" data-performance-mode="operator">
  <section class="check-in__opening" aria-labelledby="check-in-title">
    <div class="check-in__copy">
      <p class="eyebrow">CREATE SOMETHING / SUBSCRIBER CHECK-IN</p>
      <h1 id="check-in-title">Is this still useful to you?</h1>
      <p class="lede">
        You joined the list before our current Playbook direction took shape. Four short answers
        will help us decide what deserves another email.
      </p>
      <dl class="receipt-strip" aria-label="Check-in boundaries">
        <div>
          <dt>Time</dt>
          <dd>About 2 minutes</dd>
        </div>
        <div>
          <dt>Required</dt>
          <dd>Two choices</dd>
        </div>
        <div>
          <dt>Tracking</dt>
          <dd>No open pixel</dd>
        </div>
      </dl>
    </div>

    <figure class="check-in__media">
      <img
        src="https://createsomething.agency/images/performance-lab/playbook-home-agent-macro.webp"
        alt="Macro-real Playbook court with an ivory AI-agent marker inside a control ring and an amber workflow route."
        width="1536"
        height="1024"
      />
      <figcaption>One shared Playbook: the route, the decision gate, and the proof.</figcaption>
    </figure>
  </section>

  <section class="check-in__workspace" aria-label="Subscriber response">
    {#if data.state === 'ready' || data.state === 'preview'}
      {#if data.state === 'preview'}
        <p class="form-status" role="status">
          Seed preview. The controls are visible but cannot save subscriber data.
        </p>
      {/if}
      {#if form?.message}
        <p
          class:success={form.success}
          class:error={!form.success}
          class="form-status"
          role="status"
        >
          {form.message}
        </p>
      {:else if data.respondedAt}
        <p class="form-status success" role="status">
          Your earlier response is loaded. You can update it below.
        </p>
      {/if}

      <form method="POST">
        <fieldset>
          <legend>Why did you originally subscribe?</legend>
          <p class="field-note">Optional. A sentence is enough.</p>
          <textarea
            name="originalReason"
            maxlength="500"
            rows="3"
            disabled={data.state === 'preview'}>{currentResponse?.originalReason ?? ''}</textarea
          >
        </fieldset>

        <fieldset>
          <legend>Are you still interested in hearing from us?</legend>
          <div class="choice-grid">
            {#each [['yes', 'Yes'], ['not_sure', 'Not sure yet'], ['no', 'No']] as choice}
              <label>
                <input
                  type="radio"
                  name="stillInterested"
                  value={choice[0]}
                  checked={currentResponse?.stillInterested === choice[0]}
                  required
                  disabled={data.state === 'preview'}
                />
                <span>{choice[1]}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>How much of our recent work have you seen?</legend>
          <div class="choice-grid">
            {#each [['none', 'None of it'], ['some', 'A few updates'], ['most', 'Most of it']] as choice}
              <label>
                <input
                  type="radio"
                  name="updatesSeen"
                  value={choice[0]}
                  checked={currentResponse?.updatesSeen === choice[0]}
                  required
                  disabled={data.state === 'preview'}
                />
                <span>{choice[1]}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset>
          <legend>What would you like to see from this direction?</legend>
          <p class="field-note">Optional. Name the work, proof, or question you care about.</p>
          <textarea name="wantedNext" maxlength="1000" rows="5" disabled={data.state === 'preview'}
            >{currentResponse?.wantedNext ?? ''}</textarea
          >
        </fieldset>

        <div class="form-actions">
          <button type="submit" disabled={data.state === 'preview'}
            >{data.state === 'preview' ? 'Preview only' : 'Save my response'}</button
          >
          {#if data.unsubscribeUrl}
            <a href={data.unsubscribeUrl}>Unsubscribe instead</a>
          {/if}
        </div>
      </form>
    {:else if data.state === 'unsubscribed'}
      <div class="state-panel">
        <p class="eyebrow">STATE / UNSUBSCRIBED</p>
        <h2>You are already off the list.</h2>
        <p>No response is needed, and this address is excluded from future sends.</p>
      </div>
    {:else if data.state === 'expired' || data.state === 'revoked'}
      <div class="state-panel">
        <p class="eyebrow">STATE / CLOSED</p>
        <h2>This check-in has closed.</h2>
        <p>The link is no longer accepting responses.</p>
        {#if data.unsubscribeUrl}<a href={data.unsubscribeUrl}>Unsubscribe</a>{/if}
      </div>
    {:else if data.state === 'unavailable'}
      <div class="state-panel">
        <p class="eyebrow">STATE / WAIT</p>
        <h2>The response service is unavailable.</h2>
        <p>Nothing has been changed. Reload this page and try again.</p>
      </div>
    {:else}
      <div class="state-panel">
        <p class="eyebrow">STATE / INVALID</p>
        <h2>This check-in link is not valid.</h2>
        <p>No subscriber record was shown or changed.</p>
      </div>
    {/if}
  </section>

  <section class="check-in__handoff" aria-label="Privacy and next step">
    <p>
      We use these answers only to decide what to publish and whether this list should continue.
      Delivery and response are the measure; no open pixel is required. Answers are kept for up to
      12 months.
    </p>
    <a href="/privacy">Read the privacy policy</a>
  </section>
</main>

<style>
  .check-in {
    min-height: 100vh;
    padding: clamp(6.5rem, 11vw, 9rem) clamp(1rem, 4vw, 4rem) 4rem;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .check-in__opening,
  .check-in__workspace,
  .check-in__handoff {
    width: min(76rem, 100%);
    margin-inline: auto;
  }

  .check-in__opening {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(20rem, 1.1fr);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: #fff;
  }

  .check-in__copy {
    display: grid;
    align-content: center;
    gap: 1.25rem;
    padding: clamp(2rem, 5vw, 4.5rem);
  }

  .eyebrow,
  dt {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }
  h1 {
    max-width: 10ch;
    font-size: clamp(2.8rem, 6vw, 5.8rem);
    line-height: 0.96;
    letter-spacing: -0.04em;
  }
  h2 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1;
  }
  .lede {
    max-width: 42rem;
    color: #45484d;
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .receipt-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 1rem 0 0;
    border-block: 1px solid #d7d7d2;
  }
  .receipt-strip div {
    padding: 0.9rem 0.5rem 0.9rem 0;
  }
  .receipt-strip dd {
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
  }

  .check-in__media {
    margin: 0;
    background: #090909;
    color: #fff;
  }
  .check-in__media img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 30rem;
    object-fit: cover;
  }
  .check-in__media figcaption {
    padding: 0.8rem 1rem;
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
  }

  .check-in__workspace {
    margin-top: 1.5rem;
    padding: clamp(1.25rem, 4vw, 3rem);
    border: 1px solid #d7d7d2;
    background: #fff;
  }
  form {
    display: grid;
    gap: 2rem;
  }
  fieldset {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0 0 2rem;
    border: 0;
    border-bottom: 1px solid #d7d7d2;
  }
  legend {
    padding: 0;
    font-size: 1.35rem;
    font-weight: 600;
  }
  .field-note {
    color: #5e6268;
    font-size: 0.92rem;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 1rem;
    border: 1px solid #9c9c96;
    border-radius: 0;
    background: #fff;
    color: #090909;
    font: inherit;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus,
  input:focus-visible,
  button:focus-visible,
  a:focus-visible {
    outline: 3px solid #0057b8;
    outline-offset: 3px;
  }

  .choice-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.65rem;
  }
  .choice-grid label {
    display: flex;
    min-height: 3.5rem;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem;
    border: 1px solid #9c9c96;
    cursor: pointer;
  }
  .choice-grid label:has(input:checked) {
    border-color: #0057b8;
    background: #dce8f5;
  }
  .choice-grid input {
    width: 1rem;
    height: 1rem;
    accent-color: #0057b8;
  }

  .form-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 1.5rem;
  }
  button {
    min-height: 3rem;
    padding: 0.8rem 1.1rem;
    border: 1px solid #090909;
    border-radius: 0;
    background: #090909;
    color: #fff;
    font: 600 0.86rem var(--font-performance-mono);
    cursor: pointer;
  }
  a {
    color: inherit;
    text-underline-offset: 0.22em;
  }
  .form-status {
    margin: 0 0 1.5rem;
    padding: 0.9rem 1rem;
    border-left: 4px solid;
  }
  .form-status.success {
    border-color: #168447;
    background: #e3f4e9;
  }
  .form-status.error {
    border-color: #b42318;
    background: #fde8e7;
  }
  .state-panel {
    display: grid;
    gap: 1rem;
    max-width: 44rem;
  }

  .check-in__handoff {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.5rem 0;
    color: #5e6268;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .check-in__handoff p {
    max-width: 48rem;
  }

  @media (max-width: 48rem) {
    .check-in {
      padding-inline: 0.75rem;
    }
    .check-in__opening {
      grid-template-columns: 1fr;
    }
    .check-in__copy {
      padding: 1.5rem;
    }
    .check-in__media img {
      min-height: 18rem;
    }
    .receipt-strip,
    .choice-grid {
      grid-template-columns: 1fr;
    }
    .check-in__handoff {
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition: none !important;
    }
  }
</style>
