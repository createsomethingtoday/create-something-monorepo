<script lang="ts">
  import { Button, MeridianAccordion } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  let { compact = false }: { compact?: boolean } = $props();

  const questions = [
    {
      question: 'What does the membership cover?',
      answer:
        'Focused covers one workstream, two 30-minute check-ins, two 60-minute remote work sessions and one agreed milestone each billing month. Team covers up to two workstreams, two check-ins, four remote sessions and two milestones. Both plans include one feedback and revision round per milestone, learning resources and Slack support. We agree on the work, response times and acceptance checks before payment. Neither plan includes unlimited development or production incident response.'
    },
    {
      question: 'Is this the same as managed Control?',
      answer:
        'No. Focused membership is $900/month for agreed improvements, learning and operator support. Managed Control starts at $900/month for agreed live operations. Managed Control is a separate agreement for monitoring and supporting an agreed live system after launch. Production incident response is not included in membership.'
    },
    {
      question: 'Who provides the support?',
      answer:
        'CREATE SOMETHING operators use shared skills, runbooks and project records, with agents assisting routine work. Micah currently delivers the service. The membership is with CREATE SOMETHING; the assigned operator may change as the practice grows.'
    },
    {
      question: 'Is the member portal available now?',
      answer:
        'The dedicated portal is in development. Resource access, Slack setup and session times are confirmed during onboarding. We confirm availability before accepting payment.'
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
        'Cancel before your next renewal by emailing micah@createsomething.agency to stop future membership charges. Support continues through your paid period while we hand over your code and documentation, document open work, and plan the transition. If you need more help afterward, we’ll agree on the scope and price before extending support. Separately scoped projects follow their agreed terms.'
    }
  ];
</script>

<section id="membership" class="membership" aria-labelledby="membership-title">
  <div class="offer">
    <div class="offer-intro">
      <p class="eyebrow">AI-native technical support membership</p>
      <h2 id="membership-title">Choose the support your work needs.</h2>
      <p>
        Bring a workflow, software problem or existing product. We diagnose the problem, agree on the change,
        engineer and test it, then help your team use the result. We retain project context across agreed work.
      </p>
    </div>
    <div class="plans">
      <article class="plan" aria-labelledby="focused-plan-title">
        <p class="eyebrow">One workstream</p>
        <h3 id="focused-plan-title">Focused</h3>
        <p class="price">{PUBLIC_PRICING.membership.focused.label}</p>
        <p>For one agreed workstream at a time, with diagnosis, engineering, learning and operator support.</p>
        <ul>
          <li>{PUBLIC_PRICING.membership.focused.checkInsPerMonth} × {PUBLIC_PRICING.membership.focused.checkInMinutes}-minute check-ins each billing month</li>
          <li>{PUBLIC_PRICING.membership.focused.remoteSessionsPerMonth} × {PUBLIC_PRICING.membership.focused.remoteSessionMinutes}-minute attended remote work sessions</li>
          <li>{PUBLIC_PRICING.membership.focused.milestonesPerMonth} agreed milestone with {PUBLIC_PRICING.membership.focused.revisionRoundsPerMilestone} feedback and revision round</li>
          <li>Skills, learning resources and Slack support</li>
        </ul>
        <Button href={agencyCoreMessaging.membershipInquiryHref}>Discuss Focused</Button>
      </article>
      <article class="plan" aria-labelledby="team-plan-title">
        <p class="eyebrow">Up to two workstreams</p>
        <h3 id="team-plan-title">Team</h3>
        <p class="price">{PUBLIC_PRICING.membership.team.label}</p>
        <p>For up to two agreed workstreams and more time working with your team.</p>
        <ul>
          <li>{PUBLIC_PRICING.membership.team.checkInsPerMonth} × {PUBLIC_PRICING.membership.team.checkInMinutes}-minute check-ins each billing month</li>
          <li>{PUBLIC_PRICING.membership.team.remoteSessionsPerMonth} × {PUBLIC_PRICING.membership.team.remoteSessionMinutes}-minute attended remote work sessions</li>
          <li>{PUBLIC_PRICING.membership.team.milestonesPerMonth} agreed milestones across up to two workstreams, each with {PUBLIC_PRICING.membership.team.revisionRoundsPerMilestone} feedback and revision round</li>
          <li>Skills, learning resources and Slack support</li>
        </ul>
        <Button href={agencyCoreMessaging.teamMembershipInquiryHref}>Discuss Team</Button>
      </article>
    </div>
    <p class="availability">A milestone is one agreed workflow map or one scoped improvement to an existing workflow. It includes an acceptance check, verification and a handoff you keep. We agree on scope, session times, response times and any usage budget before payment. {PUBLIC_PRICING.membership.terms}. Larger Builds, managed Control and production incident response need separate agreements.</p>
    {#if compact}
      <p class="next-steps"><a href={agencyCoreMessaging.workflowMappingSessionHref}>Book a mapping session →</a></p>
    {/if}
  </div>
  {#if compact}
    <p class="ownership-summary">You keep the agreed code, tests and instructions under your agreement, with reusable tools licensed for continued use. <a href="/services">See how delivery works →</a> <a href="/stack">What you keep →</a></p>
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
  .membership :global(.meridian-accordion) {
    padding-inline: max(1.25rem, calc((100% - 80rem) / 2));
  }
  .offer { padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2)); }
  .offer-intro { max-width: 65ch; }
  .plans { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-performance-md); margin-block: var(--space-performance-xl); }
  .plan { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--color-performance-line-strong); padding: var(--space-performance-lg); }
  .plan h3 { margin: var(--space-performance-sm) 0 0; }
  .plan ul { flex: 1; }
  .plan :global(a) { align-self: flex-start; }
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
  .price {
    font-family: var(--font-performance-editorial);
    font-size: clamp(2rem, 3.5vw, 3.5rem);
    margin-block: var(--space-performance-sm);
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
    .plans { grid-template-columns: 1fr; }
  }
</style>
