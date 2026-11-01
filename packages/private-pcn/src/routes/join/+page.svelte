<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import SerifPhrase from '$lib/components/SerifPhrase.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { emptyIntake, intakePaths } from '$lib/intake';
  import type { PageProps } from './$types';
  let { form }: PageProps = $props();
  let values = $state(untrack(() => ({ ...emptyIntake, ...form?.values })));
  let enhanced = $state(false),
    step = $state(0),
    busy = $state(false),
    transportError = $state('');
  let formElement = $state<HTMLFormElement>();
  const selected = $derived(intakePaths.find((path) => path.value === values.intent));
  const steps = ['Your direction', 'Your practice', 'Your introduction'];
  const visibleError = $derived(transportError || form?.error || '');
  onMount(() => {
    enhanced = true;
  });
  function validateStep() {
    const fields = formElement?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `fieldset[data-step="${step}"] input, fieldset[data-step="${step}"] textarea`
    );
    if (!fields) return false;
    for (const field of fields) if (!field.reportValidity()) return false;
    return true;
  }
  async function go(next: number) {
    if (next > step && !validateStep()) return;
    step = next;
    await tick();
    formElement?.querySelector<HTMLElement>(`fieldset[data-step="${step}"] legend`)?.focus();
  }
</script>

<svelte:head>
  <title>Say hello | CREATE SOMETHING Private</title>
  <meta
    name="description"
    content="Request an invitation to PRIVATE. Tell us what you want to learn, build, or share."
  />
</svelte:head>

<main id="main" class="intake-page">
  <div class="intake-heading">
    <div>
      <p class="eyebrow">PRIVATE / A GOOD PLACE TO START</p>
      <h1>Bring your<br /><SerifPhrase text="curiosity." /></h1>
      <p class="lede">
        Something you want to learn. Something you can teach.<br class="desktop-break" /> Tell us what
        brings you here.
      </p>
    </div>
    <p class="entry-note">
      Invitation-based.<br />Human-reviewed.<br /><span>No account needed to say hello.</span>
    </p>
  </div>

  {#if form?.success}
    <section class="received" aria-labelledby="received-title">
      <img src="/media/human-ink/exchange.webp" width="1280" height="1280" alt="" />
      <div>
        <p class="eyebrow">INTRODUCTION RECEIVED</p>
        <h2 id="received-title" tabindex="-1">
          You’ve made<br /><SerifPhrase text="the first move." />
        </h2>
        <p>
          Your introduction is with the PRIVATE team. If you have already sent one for this path,
          we’ve kept the original.
        </p>
        <p>
          We’ll review it and contact you at the email you provided if there’s a next step. This is
          a request for an invitation; it does not create an account or grant access.
        </p>
        <a class="button" href="/library">Explore public previews <Icon name="arrow-right" /></a>
      </div>
    </section>
  {:else}
    <div class="intake-layout">
      <aside class="field-note" aria-label="Your direction">
        <div class="art-frame">
          <img
            src={`/media/human-ink/${selected?.image || 'practice'}.webp`}
            width="1280"
            height="1280"
            alt=""
          />
        </div>
        <p class="eyebrow">A NOTE FROM PRIVATE</p>
        <h2>
          {selected?.value === 'create'
            ? 'Pass something useful along.'
            : selected?.value === 'both'
              ? 'Stay curious. Share generously.'
              : 'Every practice starts somewhere.'}
        </h2>
        <p>
          {selected?.value === 'create'
            ? 'A working technique, a lesson learned, a better question. Start with the thing you know through doing.'
            : selected?.value === 'both'
              ? 'Bring the questions you are exploring and the things you have figured out. There is room for both.'
              : 'You don’t need a polished portfolio to be curious. Tell us what you want to try, and where you could use a little help.'}
        </p>
        <span class="note-index">LEARN / MAKE / SHARE</span>
      </aside>
      <div class="intake-form">
        {#if enhanced}<ol class="step-track" aria-label="Introduction progress">
            {#each steps as label, index}<li
                aria-current={index === step ? 'step' : undefined}
                class:complete={index < step}
              >
                <span>{index < step ? '✓' : `0${index + 1}`}</span>{label}
              </li>{/each}
          </ol>{/if}
        <form
          method="POST"
          bind:this={formElement}
          novalidate={enhanced}
          use:enhance={({ cancel }) => {
            if (busy) {
              cancel();
              return;
            }
            if (step < 2) {
              cancel();
              void go(step + 1);
              return;
            }
            if (!validateStep()) {
              cancel();
              return;
            }
            busy = true;
            transportError = '';
            return async ({ result, update }) => {
              busy = false;
              if (result.type === 'error') {
                transportError =
                  'We could not confirm your introduction was saved. Your answers are still here; please try again.';
              } else {
                await update({ reset: false });
              }
              await tick();
              document
                .getElementById(
                  result.type === 'success' && result.data?.success
                    ? 'received-title'
                    : 'intake-error'
                )
                ?.focus();
            };
          }}
        >
          <div class="trap" aria-hidden="true">
            <label>Leave this empty<input name="website" tabindex="-1" autocomplete="off" /></label>
          </div>
          <fieldset data-step="0" hidden={enhanced && step !== 0}>
            <legend tabindex="-1">What brings you here?</legend>
            <p class="field-hint">Pick a starting point. You don’t have to stay in one lane.</p>
            <div class="path-options">
              {#each intakePaths as path}<label
                  class="path-option"
                  class:selected={values.intent === path.value}
                >
                  <input
                    type="radio"
                    name="intent"
                    value={path.value}
                    bind:group={values.intent}
                    required
                  />
                  <span><strong>{path.title}</strong><span>{path.description}</span></span>
                  <span class="path-mark" aria-hidden="true"
                    >{values.intent === path.value ? '↗' : '+'}</span
                  >
                </label>{/each}
            </div>
          </fieldset>
          <fieldset data-step="1" hidden={enhanced && step !== 1}>
            <legend tabindex="-1"
              >{values.intent === 'create'
                ? 'What could you teach?'
                : values.intent === 'both'
                  ? 'What are you working on?'
                  : 'What would you love to figure out?'}</legend
            >
            <p class="field-hint">
              {values.intent === 'create'
                ? 'Tell us about a technique you have used and how you would help someone else learn it.'
                : values.intent === 'both'
                  ? 'Share something you want to learn and something you could pass along.'
                  : 'A project, a skill, or a stubborn question. A few sentences is plenty.'}
            </p>
            <label for="practice"
              >Your practice<textarea
                id="practice"
                name="practice"
                bind:value={values.practice}
                required
                minlength="20"
                maxlength="2000"
                rows="5"
                aria-describedby="practice-help"
                placeholder="I’m exploring…"
              ></textarea></label
            >
            <p id="practice-help" class="field-hint">
              20–2,000 characters. Keep client details, passwords, and private information out.
            </p>
            <label for="work-url"
              >A window into your work <span class="optional">(optional)</span><input
                id="work-url"
                name="work_url"
                type="url"
                bind:value={values.work_url}
                maxlength="2000"
                placeholder="https://"
                aria-describedby="work-help"
              /></label
            >
            <p id="work-help" class="field-hint">
              A project, profile, or short recording you have permission to share. An HTTPS link is
              all we need.
            </p>
            {#if values.intent !== 'learn'}<p class="review-note">
                Creators: this is an introduction. Before publishing, you’ll submit your credentials
                and a teaching video for a separate review.
              </p>{/if}
          </fieldset>
          <fieldset data-step="2" hidden={enhanced && step !== 2}>
            <legend tabindex="-1">Put a name to the curiosity.</legend>
            <p class="field-hint">
              We’ll use these details to review and reply to your introduction.
            </p>
            <div class="contact-fields">
              <label for="display-name"
                >Your name<input
                  id="display-name"
                  name="display_name"
                  bind:value={values.display_name}
                  required
                  maxlength="80"
                  autocomplete="name"
                /></label
              >
              <label for="email"
                >Email<input
                  id="email"
                  name="email"
                  type="email"
                  bind:value={values.email}
                  required
                  maxlength="254"
                  autocomplete="email"
                /></label
              >
            </div>
            <label for="referral"
              >Did someone point you here? <span class="optional">(optional)</span><input
                id="referral"
                name="referral"
                bind:value={values.referral}
                maxlength="160"
                placeholder="A person, a network, or a happy accident"
              /></label
            >
            {#if enhanced}<div class="introduction-preview">
                <p class="eyebrow">YOUR INTRODUCTION / {selected?.title || 'CHOOSE A PATH'}</p>
                <p class="preview-practice">
                  {values.practice || 'Add a few words about your practice.'}
                </p>
                {#if values.work_url}<p class="preview-link">{values.work_url}</p>{/if}
                <button type="button" class="text-button" onclick={() => go(1)}
                  >Edit your practice</button
                >
              </div>{/if}
            <label class="consent"
              ><input
                type="checkbox"
                name="consent"
                value="yes"
                checked={values.consent === 'yes'}
                onchange={(event) => {
                  values.consent = event.currentTarget.checked ? 'yes' : '';
                }}
                required
              /><span
                >I’m 18 or older, and I’m happy for CREATE SOMETHING to review and contact me about
                this request. I’ve read the <a
                  href="/privacy#invitation-requests"
                  target="_blank"
                  rel="noopener noreferrer">Privacy Policy (opens in a new tab)</a
                >.</span
              ></label
            >
            <p class="field-hint">
              No newsletter signup. No charge. An introduction does not guarantee an invitation.
            </p>
          </fieldset>
          {#if visibleError}<p id="intake-error" class="error" role="alert" tabindex="-1">
              {visibleError}
            </p>{/if}
          <div class="form-actions">
            {#if enhanced && step > 0}<button
                type="button"
                class="button secondary"
                disabled={busy}
                onclick={() => go(step - 1)}>Back</button
              >{/if}
            {#if enhanced && step < 2}<button
                type="button"
                class="button"
                onclick={() => go(step + 1)}>Continue <Icon name="arrow-right" /></button
              >
            {:else}<button class="button" disabled={busy}
                >{busy ? 'Sending your introduction…' : 'Send your introduction'}
                <Icon name="arrow-right" /></button
              >{/if}
          </div>
        </form>
        <p class="already-invited">
          Already invited? <a href="/signup">Use your invitation</a>. Already a member?
          <a href="/login">Sign in</a>.
        </p>
      </div>
    </div>
  {/if}
</main>

<style>
  .intake-page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 40px 32px 80px;
  }
  .intake-heading {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 32px;
    padding-bottom: 28px;
  }
  h1 {
    font-size: clamp(48px, 5.5vw, 68px);
    line-height: 0.98;
    letter-spacing: -0.045em;
    margin: 20px 0 24px;
    font-weight: 500;
  }
  .lede {
    max-width: 650px;
    font-size: 18px;
    line-height: 1.65;
    color: var(--muted);
  }
  .entry-note {
    flex-shrink: 0;
    font: 12px/1.8 monospace;
    color: var(--paper);
    padding-bottom: 8px;
  }
  .entry-note span {
    color: var(--muted);
  }
  .intake-layout {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    border-top: 1px solid var(--line);
  }
  .field-note {
    padding: 28px 54px 32px 0;
  }
  .art-frame {
    height: 260px;
    display: grid;
    place-items: center;
  }
  .art-frame img {
    width: 260px;
    height: 260px;
    object-fit: contain;
  }
  .field-note h2 {
    font-size: 28px;
    line-height: 1.15;
    font-weight: 500;
    letter-spacing: -0.025em;
  }
  .field-note p:not(.eyebrow) {
    color: var(--muted);
    line-height: 1.7;
    font-size: 15px;
  }
  .note-index {
    display: block;
    margin-top: 32px;
    font: 10px monospace;
    letter-spacing: 2px;
    color: var(--muted);
  }
  .intake-form {
    border-left: 1px solid var(--line);
    padding: 36px 0 0 48px;
    min-width: 0;
  }
  .step-track {
    display: flex;
    list-style: none;
    gap: 24px;
    padding: 0 0 32px;
    margin: 0;
  }
  .step-track li {
    flex: 1;
    color: var(--muted);
    font-size: 11px;
    border-top: 2px solid var(--line);
    padding-top: 12px;
  }
  .step-track li[aria-current],
  .step-track li.complete {
    border-color: var(--paper);
    color: var(--paper);
  }
  .step-track span {
    display: block;
    font: 12px monospace;
    margin-bottom: 8px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0 0 24px;
    min-width: 0;
  }
  fieldset[hidden] {
    display: none;
  }
  legend {
    font-size: clamp(23px, 3vw, 30px);
    letter-spacing: -0.025em;
    font-weight: 500;
    padding: 0;
  }
  legend:focus {
    outline: none;
  }
  label {
    display: grid;
    gap: 8px;
    margin: 22px 0 0;
    font-size: 14px;
  }
  input,
  textarea {
    width: 100%;
    min-height: 48px;
    padding: 13px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--paper);
  }
  textarea {
    resize: vertical;
    line-height: 1.65;
  }
  .path-options {
    display: grid;
    gap: 12px;
    margin-top: 24px;
  }
  .path-option {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 16px;
    align-items: center;
    border: 1px solid var(--line);
    padding: 20px;
    cursor: pointer;
    margin: 0;
    transition: border-color 160ms ease;
  }
  .path-option:hover,
  .path-option.selected {
    border-color: var(--paper);
  }
  input[type='radio'],
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    min-height: 18px;
    accent-color: var(--paper);
    margin: 0;
  }
  .path-option strong {
    font-weight: 500;
    font-size: 18px;
    display: block;
    margin-bottom: 7px;
  }
  .path-option span span {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .path-mark {
    font-size: 24px;
  }
  .field-hint,
  .optional {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.7;
  }
  .optional {
    display: inline;
  }
  .review-note {
    border-left: 2px solid var(--signal);
    padding-left: 16px;
    font-size: 13px;
    line-height: 1.7;
    color: var(--muted);
  }
  .contact-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .introduction-preview {
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding: 16px 0;
    margin-top: 28px;
  }
  .preview-practice {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  .preview-link {
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .text-button {
    padding: 10px 0;
    min-height: 44px;
    border: 0;
    color: var(--paper);
    background: none;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .consent {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 12px;
    line-height: 1.65;
    font-size: 12px;
    align-items: start;
  }
  .consent input {
    margin-top: 4px;
  }
  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: end;
    margin-top: 28px;
  }
  .form-actions .button {
    min-height: 48px;
  }
  .already-invited {
    font-size: 12px;
    line-height: 1.8;
    color: var(--muted);
    margin-top: 28px;
  }
  .trap {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .received {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    align-items: center;
    gap: 48px;
    border-top: 1px solid var(--line);
    padding-top: 48px;
  }
  .received img {
    width: 100%;
    height: auto;
    max-width: 360px;
  }
  .received h2 {
    font-size: clamp(36px, 5vw, 60px);
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: -0.035em;
  }
  .received p:not(.eyebrow) {
    color: var(--muted);
    line-height: 1.7;
  }
  .received .button {
    margin-top: 20px;
  }
  @media (prefers-reduced-motion: reduce) {
    .path-option {
      transition: none;
    }
  }
  @media (max-width: 760px) {
    .intake-page {
      padding: 24px 24px 64px;
    }
    .intake-heading {
      display: block;
      padding-bottom: 16px;
    }
    h1 {
      margin: 12px 0;
      font-size: 44px;
    }
    .lede {
      margin: 16px 0;
      font-size: 16px;
      line-height: 1.5;
    }
    .entry-note {
      margin: 16px 0 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.6;
    }
    .desktop-break {
      display: none;
    }
    .intake-layout {
      grid-template-columns: 1fr;
    }
    .field-note {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: 0 16px;
      padding: 18px 0;
      align-items: center;
      border-bottom: 1px solid var(--line);
    }
    .field-note .art-frame {
      grid-row: 1 / 3;
      height: 96px;
    }
    .field-note .art-frame img {
      width: 96px;
      height: 96px;
    }
    .field-note h2 {
      font-size: 20px;
      margin: 0;
    }
    .field-note .eyebrow {
      font-size: 9px;
      margin: 0;
    }
    .field-note p:not(.eyebrow),
    .note-index {
      display: none;
    }
    .intake-form {
      border-left: 0;
      padding: 20px 0 0;
    }
    .step-track {
      gap: 12px;
    }
    .contact-fields {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .form-actions {
      flex-wrap: wrap;
    }
    .form-actions .button {
      flex: 1;
      justify-content: center;
    }
    .received {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .received img {
      max-width: 180px;
      justify-self: center;
    }
  }
</style>
