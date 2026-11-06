<script lang="ts">
  import { onMount, tick } from 'svelte';

  type Intent = 'system-support' | 'membership' | 'governance-checklist' | 'workflow-teardown' | 'workflow-mapping';
  type Lane = 'not_sure' | 'workflow_infrastructure' | 'reliability_and_control' | 'enterprise_extension' | 'system_development_referral';
  type Plan = 'focused' | 'team';
  let {
    selectedIntent = $bindable<Intent>('workflow-teardown'),
    selectedLane = $bindable<Lane>('not_sure'),
    selectedPlan = $bindable<Plan>('focused'),
    options,
    content,
    submitLabel,
    submitting = false,
    submitMessage = '',
    submitSuccess = false,
    retryLocked = false,
    onsubmit
  }: {
    selectedIntent?: Intent;
    selectedLane?: Lane;
    selectedPlan?: Plan;
    options: Array<{ value: Intent; label: string; description: string }>;
    content: { messageLabel: string; messageHelper: string; messagePlaceholder: string };
    submitLabel: string;
    submitting?: boolean;
    submitMessage?: string;
    submitSuccess?: boolean;
    retryLocked?: boolean;
    onsubmit: (event: Event) => void;
  } = $props();

  const steps = ['Your next step', 'The work', 'About you', 'Review'];
  const titles = ['Where would you like to begin?', 'Tell us about the work.', 'Where should we reply?', 'Does this look right?'];
  const guides = [
    'Start with the kind of help you need. You can change this later.',
    'A few sentences are enough. Start with what should work better.',
    'We’ll use these details to reply about your inquiry.',
    'Check your brief before you send it. Scope and access are agreed before work begins.'
  ];
  const lanes: Array<{ value: Lane; label: string }> = [
    { value: 'not_sure', label: 'Help me work it out' },
    { value: 'workflow_infrastructure', label: 'Plan or build a workflow' },
    { value: 'reliability_and_control', label: 'Fix something that is failing' },
    { value: 'enterprise_extension', label: 'Discuss a larger project' },
    { value: 'system_development_referral', label: 'Refer a development project' }
  ];
  const scenes = [
    { src: 'canon-build-v1.webp', alt: 'Concept illustration: Canon and two agents assemble a graphite mechanism on a workbench.', caption: 'Begin with one useful change.' },
    { src: 'canon-test-v1.webp', alt: 'Concept illustration: Canon and two agents inspect a mechanism with measuring tools.', caption: 'Give the work a little context.' },
    { src: 'canon-build-v1.webp', alt: 'Concept illustration: Canon and two agents work together at a workshop bench.', caption: 'Put a person beside the work.' },
    { src: 'canon-validate-v1.webp', alt: 'Concept illustration: Canon and two agents compare a mechanism with an illustrated guide.', caption: 'Check the brief together.' }
  ];
  let step = $state(0);
  let enhanced = $state(false);
  let form = $state<HTMLFormElement>();
  let name = $state('');
  let email = $state('');
  let company = $state('');
  let message = $state('');
  let runtime: typeof import('gsap').gsap | undefined;
  let motion: gsap.Context | undefined;
  let motionDeadline: ReturnType<typeof setTimeout> | undefined;
  let reduced: MediaQueryList | undefined;
  let disposed = false;
  let transitionId = 0;
  const selectedPath = $derived(options.find(option => option.value === selectedIntent));
  const selectedLaneLabel = $derived(lanes.find(lane => lane.value === selectedLane)?.label);

  function settle() {
    clearTimeout(motionDeadline);
    motion?.revert();
    motion = undefined;
  }

  onMount(() => {
    enhanced = true;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => { if (reduced?.matches) settle(); };
    reduced.addEventListener('change', preference);
    void import('gsap').then(module => { if (!disposed) runtime = module.gsap; }).catch(() => { /* The authored step remains visible. */ });
    return () => {
      disposed = true;
      transitionId++;
      reduced?.removeEventListener('change', preference);
      settle();
    };
  });

  async function go(next: number) {
    if (submitting || retryLocked || submitSuccess) return;
    const id = ++transitionId;
    const direction = next >= step ? 1 : -1;
    settle();
    step = next;
    await tick();
    if (disposed || id !== transitionId) return;
    const panel = form?.querySelector<HTMLElement>(`[data-step="${next}"]`);
    const heading = panel?.querySelector<HTMLElement>('h2');
    heading?.focus({ preventScroll: true });
    // Target the heading's scroll margin so tall steps clear the fixed navigation.
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (!panel || !runtime || reduced?.matches) return;
    const durationToken = getComputedStyle(panel).getPropertyValue('--duration-performance-standard').trim();
    const parsed = parseFloat(durationToken) / (durationToken.endsWith('ms') ? 1000 : 1);
    const duration = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, .3) : .24;
    motion = runtime.context(() => {
      runtime!.fromTo(panel, { y: 10 * direction, opacity: .35 }, {
        y: 0, opacity: 1, duration, ease: 'power2.out', onComplete: settle
      });
    }, panel);
    motionDeadline = setTimeout(settle, duration * 1000 + 100);
  }

  function valid(index: number) {
    const fields = form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[data-step="${index}"] input[required], [data-step="${index}"] textarea[required]`) ?? [];
    for (const field of fields) {
      field.setCustomValidity(field.value.trim() ? '' : 'Please fill in this field.');
      if (!field.reportValidity()) return false;
    }
    return true;
  }

  function next() {
    if (valid(step)) void go(Math.min(step + 1, 3));
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting || submitSuccess) return;
    if (step < 3) { next(); return; }
    // All fields remain mounted, so the parent receives the complete FormData.
    onsubmit(event);
  }
</script>

<div class="onboarding" class:complete={submitSuccess}>
  <aside class="guide" aria-label="Your inquiry journey">
    <div class="guide-top"><span class="operator">A brief, together</span><span class="operator">{submitSuccess ? 'Received' : `${String(step + 1).padStart(2, '0')} / 04`}</span></div>
    <figure>
      <img class="scene" src={`/images/agency-sales/${scenes[submitSuccess ? 3 : step].src}`} alt={scenes[submitSuccess ? 3 : step].alt} width="1536" height="1024" fetchpriority="high" />
      <figcaption><span>Concept illustration</span><span>{scenes[submitSuccess ? 3 : step].caption}</span></figcaption>
    </figure>
    <div class="canon-note"><img src="/images/agency-sales/canon-guide-cutout-v1.webp" alt="" width="160" height="200" /><div><p class="operator">Canon / your guide</p><p>{submitSuccess ? 'Your brief is ready for our team to review.' : guides[step]}</p></div></div>
    <ol class="journey" aria-label="Inquiry progress">
      {#each steps as label, index}
        <li class:current={step === index && !submitSuccess} class:done={step > index || submitSuccess} aria-current={step === index && !submitSuccess ? 'step' : undefined}><span aria-hidden="true">{step > index || submitSuccess ? '✓' : String(index + 1).padStart(2, '0')}</span>{label}</li>
      {/each}
    </ol>
    <p class="guide-foot">One inquiry. A clear next step.<br />No payment or access is requested here.</p>
  </aside>

  <div class="workspace">
    {#if submitSuccess}
      <div class="receipt" role="status" aria-live="polite">
        <p class="operator">Inquiry received</p>
        <h2>Thank you for the brief.</h2>
        <p>{submitMessage}</p>
        <p class="muted">We’ll review the details and reply about the next step. A session is confirmed separately.</p>
        <a class="primary" href="/">Back to the work <span aria-hidden="true">↗</span></a>
      </div>
    {:else}
      <form id="inquiry-form" bind:this={form} onsubmit={submit} novalidate aria-label="Contact inquiry" aria-busy={submitting}>
        <p class="mobile-progress operator">Step {step + 1} of 4 · {steps[step]}</p>
        <fieldset data-step="0" hidden={enhanced && step !== 0}>
          <legend class="sr-only">Choose your next step</legend>
          <h2 tabindex="-1">{titles[0]}</h2>
          <p class="intro">Choose what feels closest. We can work out the details together.</p>
          <div class="intent-options">
            {#each options as option}
              <label class="choice" class:selected={selectedIntent === option.value}>
                <input type="radio" name="intent" value={option.value} bind:group={selectedIntent} />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            {/each}
          </div>
        </fieldset>

        <fieldset data-step="1" hidden={enhanced && step !== 1}>
          <legend class="sr-only">Describe the work</legend>
          <h2 tabindex="-1">{titles[1]}</h2>
          <p class="intro">{selectedPath?.label}. A short description is enough to start.</p>
          <div class="field"><label for="contact-message">{content.messageLabel}</label><textarea id="contact-message" name="message" bind:value={message} required rows="5" maxlength="5000" placeholder={content.messagePlaceholder} aria-describedby="contact-message-help" oninput={event => event.currentTarget.setCustomValidity('')}></textarea><p id="contact-message-help" class="helper">{content.messageHelper}</p></div>
          <div class="field"><p class="field-label" id="lane-label">What kind of help fits?</p><div class="lane-options" role="radiogroup" aria-labelledby="lane-label">{#each lanes as lane}<label class="lane" class:selected={selectedLane === lane.value}><input type="radio" name="lane" value={lane.value} bind:group={selectedLane} /><span>{lane.label}</span></label>{/each}</div></div>
          {#if selectedIntent === 'membership'}
            <div class="field"><p class="field-label" id="plan-label">Choose a starting plan</p><div class="plans" role="radiogroup" aria-labelledby="plan-label"><label class="choice" class:selected={selectedPlan === 'focused'}><input type="radio" name="membership-plan" value="focused" bind:group={selectedPlan} /><span><strong>Focused · $900/month</strong><small>One workstream. One milestone.</small></span></label><label class="choice" class:selected={selectedPlan === 'team'}><input type="radio" name="membership-plan" value="team" bind:group={selectedPlan} /><span><strong>Team · $2,500/month</strong><small>Up to two workstreams. Two milestones.</small></span></label></div><p class="helper">Both plans include two 30-minute check-ins each month. Focused has two 60-minute remote sessions available; Team has four.</p><p class="helper">Scope and times are agreed before payment. Project costs and AI usage costs are separate. This inquiry gives no permission to spend.</p></div>
          {/if}
        </fieldset>

        <fieldset data-step="2" hidden={enhanced && step !== 2}>
          <legend class="sr-only">Your contact details</legend>
          <h2 tabindex="-1">{titles[2]}</h2>
          <p class="intro">A name and email are all we need. Your company is optional.</p>
          <div class="field"><label for="contact-name">Your name</label><input id="contact-name" name="name" bind:value={name} required autocomplete="name" maxlength="100" oninput={event => event.currentTarget.setCustomValidity('')} /></div>
          <div class="field"><label for="contact-email">Email</label><input id="contact-email" name="email" type="email" bind:value={email} required autocomplete="email" maxlength="254" oninput={event => event.currentTarget.setCustomValidity('')} /><p class="helper">Where you would like us to reply.</p></div>
          <div class="field"><label for="contact-company">Company <span class="optional">(optional)</span></label><input id="contact-company" name="company" bind:value={company} autocomplete="organization" maxlength="100" /></div>
        </fieldset>

        <fieldset data-step="3" hidden={!enhanced || step !== 3}>
          <legend class="sr-only">Review your inquiry</legend>
          <h2 tabindex="-1">{titles[3]}</h2>
          <p class="intro">{retryLocked ? 'We have not confirmed receipt. Keep this brief unchanged while retrying the same inquiry.' : 'Nothing has been sent yet. You can edit any part of your brief.'}</p>
          <dl class="review">
            <div><dt>Your next step <button type="button" onclick={() => go(0)} disabled={submitting || retryLocked}>Edit<span class="sr-only"> inquiry type</span></button></dt><dd>{selectedPath?.label}</dd>{#if selectedIntent === 'membership'}<dd>{selectedPlan === 'team' ? 'Team · $2,500/month' : 'Focused · $900/month'}</dd>{/if}</div>
            <div><dt>The work <button type="button" onclick={() => go(1)} disabled={submitting || retryLocked}>Edit<span class="sr-only"> workflow</span></button></dt><dd class="brief-message">{message}</dd><dd class="muted">{selectedLaneLabel}</dd></div>
            <div><dt>Reply to <button type="button" onclick={() => go(2)} disabled={submitting || retryLocked}>Edit<span class="sr-only"> contact details</span></button></dt><dd>{name}{company ? ` · ${company}` : ''}</dd><dd>{email}</dd></div>
          </dl>
          <p class="helper">We review your inquiry before agreeing on scope, price or access. This form does not book emergency support.</p>
        </fieldset>

        {#if submitMessage}<p class="form-message" role="alert">{submitMessage}</p>{/if}
        {#if retryLocked}<p class="helper" role="note">Your brief is held unchanged so you can retry the same inquiry safely.</p>{/if}
        {#if enhanced}
          <div class="actions"><button type="button" class="back" onclick={() => go(step - 1)} disabled={step === 0 || submitting || retryLocked}>← Back</button><button type="submit" class="primary" disabled={submitting}>{submitting ? 'Sending…' : step === 3 ? (retryLocked ? 'Retry this inquiry' : submitLabel) : step === 2 ? 'Review your brief' : 'Continue'}<span aria-hidden="true">{step === 3 ? '↗' : '→'}</span></button></div>
          <p class="privacy-note">Your details are used to handle this inquiry. <a href="/privacy">Privacy policy</a></p>
        {/if}
        <noscript><p class="helper">To send these details without JavaScript, email <a href="mailto:support@createsomething.io">support@createsomething.io</a>.</p></noscript>
      </form>
    {/if}
  </div>
</div>

<style>
  .onboarding { display:grid; grid-template-columns:minmax(0, .9fr) minmax(0, 1.1fr); border:1px solid var(--color-performance-line); background:var(--color-performance-panel); border-radius:var(--radius-performance-md); overflow:clip; }
  .guide { min-width:0; padding:clamp(1rem, 2.5vw, 2.25rem); background:var(--color-performance-paper); border-right:1px solid var(--color-performance-line); }
  .guide-top { display:flex; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
  .operator { margin:0; font:var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform:uppercase; letter-spacing:.02em; color:var(--color-performance-muted); }
  figure { margin:0; }
  .scene { display:block; width:100%; height:auto; aspect-ratio:3/2; object-fit:cover; border:1px solid var(--color-performance-line); border-radius:var(--radius-performance-sm); }
  figcaption { display:grid; gap:.25rem; padding-top:.7rem; font-size:.75rem; color:var(--color-performance-muted); }
  figcaption span:first-child { font-family:var(--font-performance-mono); font-size:.65rem; text-transform:uppercase; }
  .canon-note { display:flex; align-items:center; gap:1rem; margin:1.5rem 0; }
  .canon-note img { width:4.25rem; height:5.5rem; object-fit:contain; flex:none; }
  .canon-note p:last-child { margin:.3rem 0 0; font-size:.9rem; line-height:1.55; max-width:32ch; }
  .journey { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem .5rem; list-style:none; padding:1.25rem 0; margin:0; border-block:1px solid var(--color-performance-line); }
  .journey li { display:flex; align-items:center; gap:.65rem; color:var(--color-performance-muted); font-size:.8rem; }
  .journey li > span { display:grid; place-items:center; width:1.65rem; height:1.65rem; border:1px solid var(--color-performance-line-strong); border-radius:50%; font: .65rem var(--font-performance-mono); flex:none; }
  .journey li.current { color:var(--color-performance-ink); font-weight:600; }
  .journey li.current > span,.journey li.done > span { background:var(--color-performance-ink); color:var(--color-performance-panel); border-color:var(--color-performance-ink); }
  .guide-foot { color:var(--color-performance-muted); font-size:.8rem; line-height:1.6; margin:1rem 0 0; }
  .workspace { min-width:0; padding:clamp(1.2rem, 3vw, 3rem); }
  form { scroll-margin-top:7rem; }
  fieldset { padding:0; margin:0; min-width:0; border:0; }
  fieldset[hidden] { display:none; }
  h2 { font:var(--font-performance-medium) clamp(1.4rem, 2.3vw, 2rem)/1.15 var(--font-performance-interface); letter-spacing:var(--tracking-performance-tight); margin:0; scroll-margin-top:7rem; }
  h2:focus { outline:none; }
  .intro { color:var(--color-performance-muted); margin:.75rem 0 1.5rem; font-size:.9rem; line-height:1.6; }
  .intent-options { display:grid; gap:.6rem; }
  .choice { display:flex; align-items:flex-start; gap:.8rem; min-width:0; padding:1rem; border:1px solid var(--color-performance-line); border-radius:var(--radius-performance-sm); cursor:pointer; background:var(--color-performance-paper); }
  .choice > span { display:grid; gap:.3rem; min-width:0; }
  .choice strong { font-size:.9rem; line-height:1.35; font-weight:var(--font-performance-semibold); }
  .choice small { color:var(--color-performance-muted); font-size:.78rem; line-height:1.55; }
  .choice input { margin-top:.2rem; flex:none; }
  .choice.selected,.lane.selected { border-color:var(--color-performance-ink); background:var(--color-performance-panel); }
  .choice:hover,.lane:hover { border-color:var(--color-performance-line-strong); }
  .choice:focus-within,.lane:focus-within { outline:2px solid var(--color-performance-focus); outline-offset:3px; }
  input[type=radio] { width:1rem; height:1rem; accent-color:var(--color-performance-ink); }
  .field { display:grid; gap:.55rem; margin-bottom:1.4rem; }
  .field > label,.field-label { margin:0; font-size:.85rem; line-height:1.4; font-weight:var(--font-performance-medium); }
  .field > input,.field > textarea { width:100%; min-width:0; box-sizing:border-box; border:1px solid var(--color-performance-line-strong); border-radius:var(--radius-performance-sm); padding:.85rem; font:inherit; font-size:1rem; line-height:1.5; background:var(--color-performance-paper); color:var(--color-performance-ink); }
  textarea { resize:vertical; min-height:9rem; }
  input::placeholder,textarea::placeholder { color:var(--color-performance-muted); }
  .helper { color:var(--color-performance-muted); font-size:.78rem; line-height:1.6; margin:0; }
  .lane-options { display:flex; flex-wrap:wrap; gap:.5rem; }
  .lane { display:flex; align-items:center; gap:.5rem; border:1px solid var(--color-performance-line); padding:.65rem .75rem; border-radius:var(--radius-performance-sm); min-height:44px; box-sizing:border-box; font-size:.75rem; cursor:pointer; }
  .lane input { margin:0; }
  .plans { display:grid; gap:.6rem; }
  .optional,.muted { color:var(--color-performance-muted); font-weight:400; }
  .actions { display:flex; justify-content:space-between; gap:1rem; padding-top:1.25rem; margin-top:1.5rem; border-top:1px solid var(--color-performance-line); }
  button,a { -webkit-tap-highlight-color:transparent; }
  button { font:inherit; cursor:pointer; }
  .primary { min-height:48px; padding:.8rem 1rem; display:inline-flex; align-items:center; justify-content:center; gap:1.5rem; background:var(--color-performance-ink); border:1px solid var(--color-performance-ink); color:var(--color-performance-panel); border-radius:var(--radius-performance-sm); font-size:.85rem; font-weight:var(--font-performance-semibold); text-decoration:none; }
  .back { color:var(--color-performance-ink); background:transparent; border:0; min-height:48px; padding:.5rem 0; font-size:.85rem; }
  button:disabled { opacity:.45; cursor:default; }
  .back:disabled { visibility:hidden; }
  button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible { outline:2px solid var(--color-performance-focus); outline-offset:3px; }
  .privacy-note { margin:1rem 0 0; color:var(--color-performance-muted); font-size:.72rem; line-height:1.6; }
  a { color:inherit; text-underline-offset:.2em; }
  .review { margin:0 0 1.5rem; }
  .review > div { padding:1rem 0; border-top:1px solid var(--color-performance-line); }
  dt { display:flex; justify-content:space-between; gap:1rem; align-items:center; color:var(--color-performance-muted); font-size:.75rem; }
  dt button { min-height:44px; background:transparent; border:0; color:var(--color-performance-ink); text-decoration:underline; text-underline-offset:.2em; font-size:.75rem; }
  dd { margin:.25rem 0 0; font-size:.9rem; line-height:1.6; overflow-wrap:anywhere; }
  .brief-message { white-space:pre-wrap; }
  .form-message { padding:1rem; border:1px solid var(--color-performance-error-border); color:var(--color-performance-error); background:var(--color-performance-error-muted); font-size:.85rem; line-height:1.6; margin:1.5rem 0 .75rem; }
  .receipt { padding-block:2rem; }
  .receipt h2 { margin-top:1rem; }
  .receipt > p:not(.operator) { font-size:.95rem; line-height:1.65; }
  .receipt .primary { margin-top:1rem; }
  .mobile-progress { display:none; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  @media (max-width:767px) {
    .onboarding { grid-template-columns:1fr; }
    .guide { display:grid; grid-template-columns:1fr 1fr; gap:1rem; padding:1rem; border-right:0; border-bottom:1px solid var(--color-performance-line); }
    .guide-top { grid-column:1/-1; margin:0; }
    .guide figure { grid-column:1; grid-row:2; align-self:center; }
    .canon-note { grid-column:2; grid-row:2; margin:0; display:block; }
    .canon-note img { width:2.75rem; height:3.5rem; float:right; margin:0 0 .25rem .5rem; }
    .canon-note p:last-child { font-size:.78rem; }
    .canon-note .operator { font-size:.6rem; }
    figcaption span:last-child,.journey,.guide-foot { display:none; }
    figcaption { font-size:.6rem; }
    .workspace { padding:1.25rem 1rem; }
    .mobile-progress { display:block; margin-bottom:1rem; font-size:.65rem; }
    .choice { padding:.85rem; }
    .actions { gap:.6rem; }
    .primary { gap:.8rem; font-size:.8rem; }
    .lane-options { display:grid; grid-template-columns:1fr; }
  }
  @media (prefers-reduced-motion:reduce) { .onboarding * { scroll-behavior:auto; } }
</style>
