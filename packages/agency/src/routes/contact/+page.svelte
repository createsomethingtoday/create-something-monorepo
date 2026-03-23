<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { SavvyCalButton } from '@create-something/canon/domains/agency';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';

  type DesiredNextStep =
    | 'qualified_mcp_hub_pilot'
    | 'workflow_mapping_session'
    | 'policy_os'
    | 'enterprise_extension'
    | 'not_sure';

  type RiskLevel = 'low' | 'medium' | 'high';

  const desiredNextStepOptions: Array<{
    value: DesiredNextStep;
    label: string;
    description: string;
  }> = [
    {
      value: 'qualified_mcp_hub_pilot',
      label: 'See if this workflow qualifies for a pilot',
      description: 'Best for one narrow workflow with manageable risk and clear ownership.'
    },
    {
      value: 'workflow_mapping_session',
      label: 'Book a mapping session',
      description: 'Best for ambiguous workflows, multiple stakeholders, or unclear trust boundaries.'
    },
    {
      value: 'policy_os',
      label: 'Talk about Policy OS',
      description: 'Best for live automation that now needs approvals, blocked states, and ongoing oversight.'
    },
    {
      value: 'enterprise_extension',
      label: 'Discuss enterprise extension',
      description: 'Best for cross-system, regulated, or multi-team workflows.'
    },
    {
      value: 'not_sure',
      label: 'Not sure yet',
      description: 'Need help choosing the right next step.'
    }
  ];

  const riskLevelOptions: Array<{ value: RiskLevel; label: string }> = [
    { value: 'low', label: 'Low: internal workflow, reversible actions' },
    { value: 'medium', label: 'Medium: customer impact, approvals, or revenue exposure' },
    { value: 'high', label: 'High: compliance, auditability, or multi-team coordination' }
  ];

  const timelineOptions = [
    { value: '', label: 'No timeline yet' },
    { value: 'this_month', label: 'This month' },
    { value: 'this_quarter', label: 'This quarter' },
    { value: 'next_quarter', label: 'Next quarter' }
  ];

  let submitting = $state(false);
  let submitMessage = $state('');
  let submitSuccess = $state(false);

  function getRecommendedNextStep(
    desiredNextStep: FormDataEntryValue | null,
    riskLevel: FormDataEntryValue | null
  ): DesiredNextStep {
    const desired = String(desiredNextStep || 'not_sure') as DesiredNextStep;
    if (desired !== 'not_sure') return desired;

    const risk = String(riskLevel || 'medium') as RiskLevel;
    if (risk === 'low') return 'qualified_mcp_hub_pilot';
    if (risk === 'medium') return 'workflow_mapping_session';
    return 'policy_os';
  }

  function buildWorkflowSummary(formData: FormData, recommendedNextStep: DesiredNextStep): string {
    const lines = [
      `Primary workflow: ${String(formData.get('primary_workflow') || '').trim()}`,
      `Current stack: ${String(formData.get('current_stack') || '').trim()}`,
      `Risk level: ${String(formData.get('risk_level') || '').trim()}`,
      `Requested next step: ${String(formData.get('desired_next_step') || '').trim()}`,
      `Recommended next step: ${recommendedNextStep}`,
      `Timeline: ${String(formData.get('timeline') || 'No timeline yet').trim()}`
    ];

    const message = String(formData.get('message') || '').trim();
    if (message) {
      lines.push('', 'Additional context:', message);
    }

    return lines.join('\n');
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    submitting = true;
    submitMessage = '';

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const recommendedNextStep = getRecommendedNextStep(
      formData.get('desired_next_step'),
      formData.get('risk_level')
    );

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          company: formData.get('company'),
          role: formData.get('role'),
          primary_workflow: formData.get('primary_workflow'),
          current_stack: formData.get('current_stack'),
          workflow_lane: formData.get('desired_next_step'),
          risk_level: formData.get('risk_level'),
          desired_next_step: formData.get('desired_next_step'),
          recommended_next_step: recommendedNextStep,
          timeline: formData.get('timeline'),
          service: formData.get('desired_next_step'),
          message: buildWorkflowSummary(formData, recommendedNextStep)
        })
      });

      const result = (await response.json()) as { success?: boolean; message?: string };

      if (response.ok && result.success) {
        submitSuccess = true;
        submitMessage = "Sent. I'll review the workflow and follow up with the right next step.";
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
  description="Book a workflow mapping session or send your workflow details to see whether it qualifies for a constrained MCP Hub pilot, Policy OS, or enterprise extension."
  keywords="workflow mapping, ops revops automation, policy os, mcp hub pilot, workflow qualification, automation risk"
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
        Book a workflow mapping session or send the workflow details. Qualified workflows may start
        with a constrained MCP Hub pilot. Higher-risk work should begin with clearer trust
        boundaries and a stronger operating plan.
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
          Best for ambiguous workflows, multiple stakeholders, or any workflow where the approval
          boundary is still unclear.
        </p>
        <div class="cal-button">
          <SavvyCalButton variant="primary" size="lg" />
        </div>
      </div>
    </BlurFade>

    <!-- Send a Message -->
    <BlurFade delay={0.2}>
      <div class="contact-option">
        <h2>See if your workflow qualifies for a pilot</h2>
        <p>
          Send the workflow details first if you want to know whether this should start as a
          constrained MCP Hub pilot, a mapping session, or a Policy OS engagement.
        </p>

        <form class="contact-form" onsubmit={handleSubmit}>
          <div class="form-grid">
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
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="company" class="form-label">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                required
                class="form-input"
                autocomplete="organization"
              />
            </div>

            <div class="form-field">
              <label for="role" class="form-label">Role</label>
              <input type="text" id="role" name="role" class="form-input" />
            </div>
          </div>

          <div class="form-field">
            <label for="primary_workflow" class="form-label">Which workflow needs attention first?</label>
            <p class="form-helper">
              Name the handoff, exception path, or manual rebuild your team still has to protect by hand.
            </p>
            <textarea
              id="primary_workflow"
              name="primary_workflow"
              required
              rows="3"
              class="form-input form-textarea"
              placeholder="Example: Qualified leads leave HubSpot, then the team rebuilds context in Notion and Slack before onboarding."
            ></textarea>
          </div>

          <div class="form-field">
            <label for="current_stack" class="form-label">Current stack</label>
            <textarea
              id="current_stack"
              name="current_stack"
              required
              rows="2"
              class="form-input form-textarea"
              placeholder="Example: HubSpot, Notion, Slack, Google Sheets"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="risk_level" class="form-label">Risk level</label>
              <select id="risk_level" name="risk_level" required class="form-input">
                <option value="">Select risk level</option>
                {#each riskLevelOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="timeline" class="form-label">Timeline</label>
              <select id="timeline" name="timeline" class="form-input">
                {#each timelineOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="form-field">
            <label for="desired_next_step" class="form-label">What would you like help with?</label>
            <select id="desired_next_step" name="desired_next_step" required class="form-input">
              <option value="">Choose a next step</option>
              {#each desiredNextStepOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <p class="form-helper">
              This helps route you into a mapping session, pilot review, Policy OS, or enterprise discussion.
            </p>
          </div>

          <div class="form-field">
            <label for="message" class="form-label">Anything else?</label>
            <textarea
              id="message"
              name="message"
              rows="4"
              class="form-input form-textarea"
              placeholder="Add any approval rules, internal constraints, customer impact, or context I should know before I respond."
            ></textarea>
          </div>

          <button type="submit" disabled={submitting} class="form-submit">
            {submitting ? 'Sending...' : 'Send workflow details'}
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

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
