<script lang="ts">
  type FunnelProperty = 'ltd' | 'io' | 'space' | 'agency';

  type FunnelStep = {
    id: FunnelProperty;
    label: string;
    role: string;
    href: string;
    summary: string;
  };

  type FunnelAction = {
    label: string;
    href: string;
    cta: string;
    type: 'cta' | 'nav' | 'action';
  };

  interface Props {
    current: FunnelProperty;
    eyebrow?: string;
    heading?: string;
    description?: string;
  }

  let {
    current,
    eyebrow = 'Property progression',
    heading = 'Follow the work from principle to delivery.',
    description = 'Each CREATE SOMETHING property has one job in the path: clarify the judgment, publish the evidence, validate the runtime, then scope the workflow.'
  }: Props = $props();

  const steps: FunnelStep[] = [
    {
      id: 'ltd',
      label: '.ltd',
      role: 'Canon',
      href: 'https://createsomething.ltd',
      summary: 'Clarify the principles, standards, and judgment that should guide the work.'
    },
    {
      id: 'io',
      label: '.io',
      role: 'Research',
      href: 'https://createsomething.io',
      summary: 'Read the evidence, patterns, and operating notes that make the claim defensible.'
    },
    {
      id: 'space',
      label: '.space',
      role: 'Workbench',
      href: 'https://createsomething.space',
      summary: 'Try the routes, tools, and runtime behavior before the pattern becomes delivery.'
    },
    {
      id: 'agency',
      label: '.agency',
      role: 'Build',
      href: 'https://createsomething.agency',
      summary: 'Turn the fit into a scoped workflow with controls, owners, and handoff notes.'
    }
  ];

  const primaryActions: Record<FunnelProperty, FunnelAction> = {
    ltd: {
      label: 'Map a policy-backed workflow',
      href: 'https://createsomething.agency/book?source=ltd&intent=policy-to-workflow&lane=policy_os',
      cta: 'property-funnel-book-ltd',
      type: 'cta'
    },
    io: {
      label: 'Turn research into a build',
      href: 'https://createsomething.agency/book?source=io&intent=research-to-implementation&lane=workflow_infrastructure',
      cta: 'property-funnel-book-io',
      type: 'cta'
    },
    space: {
      label: 'Bring a validated workflow',
      href: 'https://createsomething.agency/book?source=space&intent=runtime-validation&lane=workflow_infrastructure',
      cta: 'property-funnel-book-space',
      type: 'cta'
    },
    agency: {
      label: 'Book a mapping session',
      href: '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure',
      cta: 'property-funnel-book-agency',
      type: 'cta'
    }
  };

  const secondaryActions: Record<FunnelProperty, FunnelAction> = {
    ltd: {
      label: 'Read the research',
      href: 'https://createsomething.io',
      cta: 'property-funnel-next-io',
      type: 'nav'
    },
    io: {
      label: 'Try the workbench',
      href: 'https://createsomething.space',
      cta: 'property-funnel-next-space',
      type: 'nav'
    },
    space: {
      label: 'Read the pattern',
      href: 'https://createsomething.io',
      cta: 'property-funnel-next-io',
      type: 'nav'
    },
    agency: {
      label: 'Review the operating model',
      href: '/services',
      cta: 'property-funnel-services-agency',
      type: 'action'
    }
  };

  const currentStep = $derived(steps.find((step) => step.id === current) ?? steps[0]);
  const primaryAction = $derived(primaryActions[current]);
  const secondaryAction = $derived(secondaryActions[current]);
</script>

<section class="property-funnel" aria-labelledby="property-funnel-heading">
  <div class="shell-inner-pad property-funnel__inner">
    <div class="property-funnel__copy">
      <span class="property-funnel__eyebrow">{eyebrow}</span>
      <h2 id="property-funnel-heading">{heading}</h2>
      <p>{description}</p>
    </div>

    <div class="property-funnel__status" aria-label="Current property">
      <span>You are here</span>
      <strong>{currentStep.label} {currentStep.role}</strong>
    </div>

    <ol class="property-funnel__steps">
      {#each steps as step, index}
        <li class:property-funnel__step--active={step.id === current}>
          <a
            href={step.href}
            class="property-funnel__step"
            aria-current={step.id === current ? 'step' : undefined}
            data-cta={`property-funnel-step-${step.id}`}
            data-cta-type="nav"
          >
            <span class="property-funnel__step-index">{String(index + 1).padStart(2, '0')}</span>
            <span class="property-funnel__step-label">{step.label}</span>
            <strong>{step.role}</strong>
            <span class="property-funnel__step-summary">{step.summary}</span>
          </a>
        </li>
      {/each}
    </ol>

    <div class="property-funnel__actions" aria-label="Recommended next actions">
      <a
        href={primaryAction.href}
        class="property-funnel__button property-funnel__button--primary"
        data-cta={primaryAction.cta}
        data-cta-type={primaryAction.type}
      >
        {primaryAction.label}
      </a>
      <a
        href={secondaryAction.href}
        class="property-funnel__button property-funnel__button--secondary"
        data-cta={secondaryAction.cta}
        data-cta-type={secondaryAction.type}
      >
        {secondaryAction.label}
      </a>
    </div>
  </div>
</section>

<style>
  .property-funnel {
    padding-block: var(--space-xl);
  }

  .property-funnel__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-xl);
    align-items: end;
  }

  .property-funnel__copy {
    display: grid;
    gap: var(--space-sm);
    max-width: 48rem;
  }

  .property-funnel__eyebrow,
  .property-funnel__status span,
  .property-funnel__step-index,
  .property-funnel__step-label {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .property-funnel__copy h2 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: var(--text-h2);
    letter-spacing: 0;
    line-height: 1.05;
    text-wrap: balance;
  }

  .property-funnel__copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    line-height: var(--leading-relaxed);
    text-wrap: pretty;
  }

  .property-funnel__status {
    display: grid;
    gap: var(--space-xs);
    min-width: 12rem;
    padding: var(--space-md);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.035);
  }

  .property-funnel__status strong {
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .property-funnel__steps {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-sm);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .property-funnel__steps li {
    min-width: 0;
  }

  .property-funnel__step {
    display: grid;
    gap: var(--space-sm);
    min-height: 14rem;
    padding: var(--space-lg);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.012)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 88%, transparent);
    color: inherit;
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .property-funnel__step:hover {
    transform: translateY(-2px);
    border-color: var(--color-shell-border-strong);
    background: rgba(255, 255, 255, 0.055);
  }

  .property-funnel__step:focus-visible,
  .property-funnel__button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  .property-funnel__step--active .property-funnel__step {
    border-color: var(--color-brand-primary-border);
    box-shadow: inset 0 0 0 1px rgba(49, 92, 255, 0.14);
  }

  .property-funnel__step-label {
    color: var(--color-fg-secondary);
  }

  .property-funnel__step strong {
    color: var(--color-fg-primary);
    font-size: var(--text-body-lg);
    line-height: 1.15;
  }

  .property-funnel__step-summary {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .property-funnel__actions {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    align-items: center;
  }

  .property-funnel__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.8rem 1.25rem;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .property-funnel__button:hover {
    transform: translateY(-1px);
    opacity: 1;
  }

  .property-funnel__button--primary {
    border-color: rgba(255, 255, 255, 0.28);
    background: linear-gradient(180deg, #ffffff, #eceef7);
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
    color: #090909;
  }

  .property-funnel__button--secondary {
    border-color: var(--color-shell-border-default);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 88%, transparent);
    color: var(--color-fg-primary);
  }

  @media (max-width: 1100px) {
    .property-funnel__inner {
      grid-template-columns: 1fr;
    }

    .property-funnel__status {
      width: fit-content;
    }

    .property-funnel__steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .property-funnel__steps {
      grid-template-columns: 1fr;
    }

    .property-funnel__step {
      min-height: 11.5rem;
    }

    .property-funnel__actions {
      align-items: stretch;
      flex-direction: column;
    }

    .property-funnel__button {
      width: 100%;
    }
  }
</style>
