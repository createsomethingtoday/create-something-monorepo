<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { SavvyCalButton } from '@create-something/canon/domains/agency';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
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
      const analytics = getAnalytics();
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          message: formData.get('message'),
          source: 'contact',
          intent: 'workflow-mapping',
          lane: 'not_sure',
          session_id: analytics?.getSessionId(),
          source_property: analytics?.getSourceProperty() ?? undefined,
          landing_url: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined
        })
      });

      const result = (await response.json()) as { success?: boolean; message?: string };

      if (response.ok && result.success) {
        submitSuccess = true;
        submitMessage = "Sent. We'll be in touch.";
        analytics?.conversion('contact_submitted', {
          source: 'contact',
          intent: 'workflow-mapping',
          lane: 'not_sure',
          surface: 'contact_form'
        });
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
  </div>
</section>

<!-- Contact Options -->
<section class="contact-section">
  <div class="contact-container">
    <!-- Book a Workflow Mapping Session -->
    <BlurFade delay={0.1}>
      <div class="contact-option">
        <h2>Book a Workflow Mapping Session</h2>
        <p>
          20 minutes to map the handoffs, failure points, and constraints around the workflow that
          is creating the most drag right now.
        </p>
        <div class="cal-button">
          <SavvyCalButton variant="primary" size="lg" />
        </div>
      </div>
    </BlurFade>

    <!-- Send a Message -->
    <BlurFade delay={0.2}>
      <div class="contact-option">
        <h2>Send a message</h2>
        <p>Not ready for a call? Send the stack, the bottleneck, and what breaks when the workflow slips.</p>

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
            <label for="message" class="form-label"
              >Which workflow needs attention first?</label
            >
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
            {submitting ? 'Sending...' : 'Send'}
          </button>

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
</section>

<!-- Direct Email -->
<section class="email-section">
  <div class="section-container">
    <BlurFade delay={0.3}>
      <p class="email-text">
        Or email directly: <a href="mailto:micah@createsomething.agency" class="email-link"
          >micah@createsomething.agency</a
        >
      </p>
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
    text-align: center;
    max-width: var(--content-width-xl);
    margin: 0 auto;
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
  }

  /* Contact Section */
  .contact-section {
    padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
  }

  .contact-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8, 3rem);
  }

  .contact-option {
    padding: var(--space-6, 2rem);
    border-radius: var(--radius-lg, 12px);
  }

  .contact-option h2 {
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .contact-option > p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .cal-button {
    display: flex;
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
    margin-top: var(--space-1, 0.25rem);
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
    padding: 0.75rem 1.5rem;
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    border-radius: var(--radius-lg, 12px);
    border: none;
    cursor: pointer;
    transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
  }

  .form-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .form-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    padding: var(--space-8, 3rem) 0;
    text-align: center;
  }

  .email-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
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

    .contact-container {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }
  }
</style>
