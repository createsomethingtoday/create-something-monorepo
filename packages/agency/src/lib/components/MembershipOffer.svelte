<script lang="ts">
  import { Button, MeridianAccordion } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  let { compact = false }: { compact?: boolean } = $props();

  const questions = [
    {
      question: 'What does the membership cover?',
      answer:
        'Hands-on delivery within an agreed scope, reusable skills and learning resources, Slack support, weekly check-ins and scheduled remote help. Before work begins, we agree on one active workstream, the deliverable, available capacity, revisions and how we will check the result. Larger projects are divided into agreed milestones or quoted separately. Membership does not include unlimited development or production incident response.'
    },
    {
      question: 'Is this the same as managed Control?',
      answer:
        'No. Membership covers agreed delivery work, learning and operator support. Managed Control is a separate agreement for monitoring and supporting an agreed live system after launch. Production incident response is not included in membership.'
    },
    {
      question: 'Who provides the support?',
      answer:
        'CREATE SOMETHING operators use shared skills, runbooks and project records, with agents assisting routine work. Micah currently delivers the service. The membership is with CREATE SOMETHING; the assigned operator may change as the practice grows.'
    },
    {
      question: 'Is the member portal available now?',
      answer:
        'The dedicated portal is in development. Resource access, Slack setup, weekly check-ins and remote-session arrangements are confirmed during onboarding. We confirm availability before accepting payment.'
    },
    {
      question: 'What costs extra?',
      answer:
        'Work beyond the agreed delivery scope receives a separate quote. Project-specific AI development runs, evaluations and production usage, hosting and third-party services are separate costs. We agree on the budget and who pays before running billable work. Our everyday coding assistance and internal learning remain our operating expense.'
    },
    {
      question: 'Do I need my own AI API account?',
      answer:
        'For substantial AI development, testing or production, we use a client-owned provider project with scoped access and separate development and production budgets. If direct billing is not practical, we agree on separately metered usage before work begins. A simple website or form that does not use AI does not require an API account. Never send API keys through the inquiry form.'
    },
    {
      question: 'How do you control AI spending?',
      answer:
        'We agree on a dollar budget for the work, the models and services it can use, and limits for individual runs. We review usage before the budget is exhausted and pause new billable runs at the agreed limit until you approve more. Funding your application’s runtime does not automatically authorize spending on development agents; we agree on both explicitly.'
    },
    {
      question: 'Will a new AI model change my price?',
      answer:
        'A model release does not change an already paid membership period. We evaluate models as tools for delivery. Any future membership price change is communicated before renewal. Usage billed by your own providers follows their pricing.'
    },
    {
      question: 'How does cancellation work?',
      answer:
        'Cancel before your next renewal to stop future membership charges. Support continues through the paid period. You keep your own code and delivered project documentation. Separately scoped projects follow their agreed terms.'
    }
  ];
</script>

<section id="membership" class="membership" aria-labelledby="membership-title">
  <div class="offer">
    <div>
      <p class="eyebrow">CREATE SOMETHING membership</p>
      <h2 id="membership-title">A practice you can build on.</h2>
      <p>
        Bring a website, app, AI workflow or another piece of work. We agree on a manageable
        deliverable, build with you, and help your team use and maintain the result.
      </p>
      <ul>
        <li>Hands-on delivery for one agreed workstream at a time</li>
        <li>Skills, learning resources and Slack support as you build</li>
        <li>Weekly check-ins and scheduled remote assistance</li>
      </ul>
    </div>
    <div class="commitment">
      <p class="eyebrow">One membership</p>
      <p class="price">{PUBLIC_PRICING.membership.label}</p>
      <p>{PUBLIC_PRICING.membership.terms}. Delivery within an agreed scope. Project usage costs are separate.</p>
      <Button href={agencyCoreMessaging.membershipInquiryHref}
        >{agencyCoreMessaging.membershipInquiryLabel}</Button
      >
      {#if compact}
        <p class="next-steps"><a href={agencyCoreMessaging.workflowMappingSessionHref}>Book a mapping session →</a></p>
      {/if}
      <p class="availability">
        Agree on the deliverable, capacity and any usage budget before payment.
      </p>
    </div>
  </div>
  {#if compact}
    <p class="ownership-summary">You keep the code, tests and instructions. <a href="/services">See how delivery works →</a> <a href="/stack">What you keep →</a></p>
  {/if}
  <div class="cost-boundary" aria-labelledby="cost-boundary-title">
    <p class="eyebrow">Delivery and usage are separate</p>
    <h3 id="cost-boundary-title">Know the cost before the work starts.</h3>
    <dl>
      <div><dt>Included in membership</dt><dd>Agreed delivery work, guidance and support. Our everyday coding tools are our expense.</dd></div>
      <div><dt>Budgeted separately</dt><dd>Project-specific AI development, testing and production usage, hosting and third-party services. You approve the budget first.</dd></div>
      <div><dt>Quoted before we expand</dt><dd>Work beyond the agreed scope. More API credit does not add unlimited delivery capacity.</dd></div>
    </dl>
    <p class="availability">For substantial AI work, we arrange client-owned API access or agreed metered billing before starting. No API account is needed for work that does not use AI.</p>
  </div>
  {#if !compact}
  <MeridianAccordion
    eyebrow="Membership boundaries"
    title="Know what is included."
    description="Clear deliverables, separate usage budgets and no surprise expansion of scope."
    items={questions}
    openFirst={true}
  />
  {/if}
</section>

<style>
  .next-steps { margin-top: var(--space-performance-md); }
  .ownership-summary { max-width: none; padding: 0 max(1.25rem, calc((100% - 80rem) / 2)) var(--space-performance-lg); }
  a { color: inherit; text-underline-offset: .2em; display: inline-flex; align-items: center; min-height: 44px; margin-right: 1rem; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .membership {
    scroll-margin-top: 6rem;
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    border-block: 1px solid var(--color-performance-line);
  }
  .offer {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: var(--space-performance-xl);
    padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2));
  }
  .offer > div {
    min-width: 0;
  }
  .membership .eyebrow {
    color: var(--color-performance-ink-soft);
    font-family: var(--font-performance-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
  }
  h2 {
    font-family: var(--font-performance-editorial);
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 400;
    line-height: 1.1;
    margin-block: var(--space-performance-md);
  }
  p,
  li {
    line-height: 1.65;
    max-width: 60ch;
  }
  ul {
    padding-left: 1.25rem;
  }
  li {
    margin-block: var(--space-performance-sm);
  }
  .commitment {
    border-left: 1px solid var(--color-performance-line-strong);
    padding-left: var(--space-performance-xl);
  }
  .price {
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.5rem, 4vw, 4rem);
    margin-block: var(--space-performance-md);
  }
  .availability {
    font-size: 0.875rem;
    margin-top: var(--space-performance-md);
    color: var(--color-performance-ink-soft);
  }
  .cost-boundary {
    padding: 0 max(1.25rem, calc((100% - 80rem) / 2)) var(--space-performance-xl);
  }
  h3 { font-family: var(--font-performance-editorial); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 400; line-height: 1.2; }
  dl { margin-block: var(--space-performance-lg); border-top: 1px solid var(--color-performance-line-strong); }
  dl > div { display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-performance-lg); padding-block: var(--space-performance-md); border-bottom: 1px solid var(--color-performance-line); }
  dt { font-weight: 600; }
  dd { margin: 0; line-height: 1.65; max-width: 65ch; }
  @media (max-width: 640px) {
    dl > div { grid-template-columns: 1fr; gap: var(--space-performance-sm); }
    .offer {
      grid-template-columns: 1fr;
    }
    .commitment {
      border-left: 0;
      border-top: 1px solid var(--color-performance-line-strong);
      padding-left: 0;
      padding-top: var(--space-performance-lg);
    }
  }
</style>
