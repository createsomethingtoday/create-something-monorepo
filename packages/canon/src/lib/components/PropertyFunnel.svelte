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
    padding-block: 4.5rem;
    background: var(--color-performance-panel, #ffffff);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
  }

  .property-funnel__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: end;
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .property-funnel__copy {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
  }

  .property-funnel__eyebrow,
  .property-funnel__status span,
  .property-funnel__step-index,
  .property-funnel__step-label {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .property-funnel__copy h2 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: 3.1rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .property-funnel__copy p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1.08rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .property-funnel__status {
    display: grid;
    gap: 0.55rem;
    min-width: 12rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .property-funnel__status strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.25;
  }

  .property-funnel__steps {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .property-funnel__steps li {
    min-width: 0;
  }

  .property-funnel__step {
    display: grid;
    align-content: start;
    gap: 0.62rem;
    min-height: 12.5rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: inherit;
    text-decoration: none;
    opacity: 1;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .property-funnel__step:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .property-funnel__step:focus-visible,
  .property-funnel__button:focus-visible {
    outline: 2px solid var(--color-performance-signal, #315cff);
    outline-offset: 3px;
  }

  .property-funnel__step--active .property-funnel__step {
    border-color: var(--color-performance-signal, #315cff);
    background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 22%, white);
  }

  .property-funnel__step-label {
    color: var(--color-performance-muted, #5e6268);
  }

  .property-funnel__step strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1.18rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.18;
    text-wrap: balance;
  }

  .property-funnel__step-summary {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.94rem;
    line-height: 1.48;
    overflow-wrap: anywhere;
    text-wrap: pretty;
  }

  .property-funnel__actions {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .property-funnel__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.74rem 1rem;
    border: 1px solid transparent;
    border-radius: var(--radius-performance-sm, 4px);
    font-size: 0.94rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .property-funnel__button--primary {
    border-color: var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .property-funnel__button--primary:hover {
    background: #1a2030;
    border-color: #1a2030;
    opacity: 1;
  }

  .property-funnel__button--secondary {
    border-color: var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .property-funnel__button--secondary:hover {
    border-color: var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    opacity: 1;
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
    .property-funnel {
      padding-block: 2.75rem;
    }

    .property-funnel__inner {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .property-funnel__copy h2 {
      font-size: 2.35rem;
      line-height: 1.04;
    }

    .property-funnel__copy p {
      font-size: 1rem;
      line-height: 1.56;
    }

    .property-funnel__steps {
      grid-template-columns: 1fr;
    }

    .property-funnel__step {
      min-height: auto;
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
