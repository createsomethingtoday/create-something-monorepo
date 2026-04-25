<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { SavvyCalButton } from '@create-something/canon/domains/agency';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';

  const contactSignals = [
    {
      label: 'Live map',
      detail: '20 minutes to identify the first safe wedge and who owns approvals.'
    },
    {
      label: 'Async brief',
      detail: 'Send the stack and bottleneck when the systems are already documented.'
    },
    {
      label: 'Direct answer',
      detail: 'If the work belongs elsewhere, I will say that directly and point you there.'
    }
  ];

  const bookingOutcomes = [
    'Map the first safe wedge',
    'Identify approval and escalation ownership',
    'Decide whether Workflow Infrastructure, Policy OS, or a referral is the right next step'
  ];

  const asyncBriefPoints = [
    'Current stack and system handoffs',
    'What breaks when the workflow slips',
    'Any constraints around access, approvals, or compliance'
  ];

  let submitting = $state(false);
  let submitMessage = $state('');
  let submitSuccess = $state(false);

  async function handleSubmit(event: Event) {
    event.preventDefault();
    submitting = true;
    submitMessage = '';

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          message: formData.get('message')
        })
      });

      const result = (await response.json()) as { success?: boolean; message?: string };

      if (response.ok && result.success) {
        submitSuccess = true;
        submitMessage = "Sent. We'll be in touch.";
        form.reset();
      } else {
        submitSuccess = false;
        submitMessage = result.message || 'Something went wrong. Try again.';
      }
    } catch (error) {
      submitSuccess = false;
      submitMessage = 'Something went wrong. Try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<SEO
  title="Start With the Right Workflow | CREATE SOMETHING .agency"
  description="Book a workflow mapping session or send the workflow details. We’ll identify the safest starting wedge, the right reliability layer, and whether enterprise extension is justified."
  keywords="workflow mapping, production automation, reliability controls, enterprise workflows, custom mcp, automation risk"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
  <div class="hero-grid-container">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="hero-animated-grid"
    />
  </div>
  <div class="hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">Contact</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Bring the workflow your team keeps babysitting.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-detail">
        Book a workflow mapping session or send the stack details. We’ll scope the smallest safe
        wedge to ship first, then extend only where the risk actually justifies it.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-paths" role="list" aria-label="Contact paths">
        {#each contactSignals as signal}
          <article class="hero-path" role="listitem">
            <span class="hero-path-label">{signal.label}</span>
            <p>{signal.detail}</p>
          </article>
        {/each}
      </div>
    </BlurFade>
  </div>
</section>

<!-- Contact Options -->
<section class="contact-section">
  <div class="section-container contact-shell">
    <div class="contact-lead">
      <BlurFade delay={0.05}>
        <p class="contact-kicker">Choose the faster path</p>
      </BlurFade>
      <BlurFade delay={0.1}>
        <h2>
          Talk live if the operating shape is still fuzzy. Send a brief if the stack is already
          documented.
        </h2>
      </BlurFade>
      <BlurFade delay={0.15}>
        <p>
          Either path ends with a scoped wedge, the right control layer, or a direct referral when
          this should live somewhere else.
        </p>
      </BlurFade>
    </div>

    <div class="contact-container">
      <BlurFade delay={0.2}>
        <div class="contact-option contact-option--booking" id="book-session">
          <div class="contact-option-header">
            <span class="option-tag">Live mapping</span>
            <h2>Book a workflow mapping session</h2>
          </div>
          <p>
            20 minutes to map the handoffs, failure points, and approval owner around the workflow
            creating the most drag right now.
          </p>
          <ul class="option-list">
            {#each bookingOutcomes as point}
              <li>{point}</li>
            {/each}
          </ul>
          <div class="cal-button">
            <SavvyCalButton variant="primary" size="lg">Book Mapping Session</SavvyCalButton>
            <Button href="#workflow-brief" variant="ghost" size="lg">Prefer async</Button>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <div class="contact-option contact-option--brief" id="workflow-brief">
          <div class="contact-option-header">
            <span class="option-tag">Async brief</span>
            <h2>Send a workflow brief</h2>
          </div>
          <p>
            Use this when the stack, bottleneck, and operating constraints are already documented.
          </p>
          <ul class="option-list option-list--compact">
            {#each asyncBriefPoints as point}
              <li>{point}</li>
            {/each}
          </ul>

          <form class="contact-form" onsubmit={handleSubmit}>
            <div class="form-field">
              <label for="name" class="form-label">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                class="form-input"
                autocomplete="name"
              />
            </div>

            <div class="form-field">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                class="form-input"
                autocomplete="email"
              />
            </div>

            <div class="form-field">
              <label for="message" class="form-label">Which workflow needs attention first?</label>
              <p class="form-helper">
                Tell us your stack, constraints, and bottleneck. We’ll map it to a scoped wedge,
                reliability controls, enterprise extension, or referral.
              </p>
              <textarea
                id="message"
                name="message"
                required
                rows="4"
                class="form-input form-textarea"
                placeholder="e.g., HubSpot + Notion + Slack. Leads move cleanly until handoff, then the team rebuilds context by hand. We need the first safe wedge before adding more automation."
              ></textarea>
            </div>

            <button type="submit" disabled={submitting} class="form-submit">
              {submitting ? 'Sending...' : 'Send workflow brief'}
            </button>

            <p class="form-meta">If this belongs elsewhere, I’ll say so directly.</p>

            {#if submitMessage}
              <p
                class="form-message"
                class:success={submitSuccess}
                class:error={!submitSuccess}
                role="alert"
              >
                {submitMessage}
              </p>
            {/if}
          </form>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<!-- Direct Email -->
<section class="email-section">
  <div class="section-container">
    <BlurFade delay={0.3}>
      <div class="email-panel">
        <p class="email-kicker">Need a direct line?</p>
        <p class="email-text">
          For procurement, security context, or a concise workflow brief, email
          <a href="mailto:micah@createsomething.agency" class="email-link"
            >micah@createsomething.agency</a
          >.
        </p>
      </div>
    </BlurFade>
  </div>
</section>

<style>
  /* Section containers */
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  /* Hero with grid background */
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .hero-content {
    position: relative;
    max-width: var(--content-width-xl);
    margin: 0 auto;
    display: grid;
    gap: 1.15rem;
    text-align: center;
  }

  .hero-eyebrow {
    font-size: var(--text-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .hero-title {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    max-width: 44rem;
    margin: 0 auto;
  }

  .hero-paths {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: clamp(1rem, 3vw, 1.6rem);
    text-align: left;
  }

  .hero-path {
    display: grid;
    gap: 0.55rem;
    padding: 1rem 1.05rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 86%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 82%, transparent);
    box-shadow: 0 18px 34px rgba(0, 0, 0, 0.12);
  }

  .hero-path-label,
  .contact-kicker,
  .option-tag,
  .email-kicker {
    font-size: var(--text-caption);
    font-family: var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    margin: 0;
  }

  .hero-path p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.6;
  }

  /* Contact Section */
  .contact-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .contact-shell {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .contact-lead {
    display: grid;
    gap: 0.85rem;
    max-width: 44rem;
  }

  .contact-lead h2 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3.1rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .contact-lead p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .contact-container {
    display: grid;
    grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
    gap: var(--space-8, 3rem);
    align-items: start;
  }

  .contact-option {
    display: grid;
    gap: 1rem;
    padding: clamp(1.15rem, 2.5vw, 1.75rem);
    border-radius: 1rem;
    border: 1px solid var(--color-shell-border-default);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 84%, transparent);
    box-shadow: 0 20px 42px rgba(0, 0, 0, 0.14);
  }

  .contact-option--booking {
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 80%, transparent);
  }

  .contact-option--brief {
    background: color-mix(in srgb, var(--color-shell-surface-primary) 88%, transparent);
  }

  .contact-option-header {
    display: grid;
    gap: 0.55rem;
  }

  .contact-option h2 {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .contact-option > p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin: 0;
  }

  .option-list {
    display: grid;
    gap: 0.72rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .option-list li {
    position: relative;
    padding-left: 1rem;
    color: var(--color-fg-secondary);
    line-height: 1.58;
  }

  .option-list li::before {
    content: '+';
    position: absolute;
    left: 0;
    color: var(--color-fg-primary);
  }

  .option-list--compact {
    margin-bottom: 0.25rem;
  }

  .cal-button {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  /* Contact Form */
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 1rem);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
  }

  .form-helper {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    margin: 0;
    line-height: 1.55;
  }

  .form-input {
    padding: 0.75rem 1rem;
    background: var(--color-bg-surface);
    border-radius: var(--radius-md, 8px);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .form-input::placeholder {
    color: var(--color-fg-muted);
  }

  .form-input:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-color: var(--color-fg-primary);
  }

  .form-textarea {
    resize: none;
    min-height: 100px;
  }

  .form-submit {
    align-self: flex-start;
    padding: 0.85rem 1.5rem;
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    border-radius: 999px;
    border: none;
    cursor: pointer;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
    transition:
      opacity var(--duration-micro, 200ms) var(--ease-standard),
      transform var(--duration-micro, 200ms) var(--ease-standard),
      box-shadow var(--duration-micro, 200ms) var(--ease-standard);
  }

  .form-submit:hover:not(:disabled) {
    opacity: 0.94;
    transform: translateY(-1px);
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.22);
  }

  .form-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .form-meta {
    margin: 0;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    line-height: 1.58;
  }

  .form-message {
    padding: 0.75rem;
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-sm);
    text-align: center;
  }

  .form-message.success {
    background: var(--color-success-muted);
    color: var(--color-success);
    border: 1px solid var(--color-success-border);
  }

  .form-message.error {
    background: var(--color-error-muted);
    color: var(--color-error);
    border: 1px solid var(--color-error-border);
  }

  /* Email Section */
  .email-section {
    padding: 0 0 var(--space-8, 3rem);
  }

  .email-panel {
    max-width: 42rem;
    margin: 0 auto;
    padding: 1rem 1.15rem;
    border-radius: 1rem;
    border: 1px solid var(--color-shell-border-default);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 80%, transparent);
    display: grid;
    gap: 0.55rem;
    text-align: center;
  }

  .email-text {
    margin: 0;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    line-height: 1.6;
  }

  .email-link {
    color: var(--color-fg-primary);
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .email-link:hover {
    opacity: 0.7;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-h1);
    }

    .hero-paths,
    .contact-container {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .cal-button,
    .cal-button :global(.booking-cta),
    .cal-button :global(.btn-ghost) {
      width: 100%;
    }

    .cal-button :global(.booking-cta),
    .cal-button :global(.btn-ghost) {
      justify-content: center;
    }

    .form-submit {
      width: 100%;
    }
  }
</style>
