<script lang="ts">
  import '$lib/styles/newsletter-editorial.css';
  import '$lib/styles/newsletter-readers.css';
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

<main class="check-in newsletter-editorial newsletter-check-in" data-performance-mode="operator">
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
        src="/images/field-note-1280.webp"
        srcset="/images/field-note-640.webp 640w, /images/field-note-1280.webp 1280w"
        sizes="(max-width: 768px) calc(100vw - 40px), 40vw"
        alt="Canon places a folded paper note into an envelope."
        width="1280"
        height="721"
      />
      <figcaption>A note worth sending. / Conceptual illustration</figcaption>
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
