<script lang="ts">
  import { Button, MeridianAccordion } from '@create-something/canon';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const questions = [
    {
      question: 'What does the membership cover?',
      answer:
        'Reusable agent engineering skills, walkthroughs and learning resources, Slack guidance, weekly check-ins and scheduled attended remote help through RustDesk. We agree on one active workflow and the support boundaries during onboarding. It is not unlimited development or round-the-clock incident response.'
    },
    {
      question: 'Is this the same as managed Control?',
      answer:
        'No. Membership is guidance and support while you develop your workflows. Managed Control is a separate agreement for monitoring and supporting an agreed live system after launch. Production incident response is not included in membership.'
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
        'Custom implementation, new integrations and production launches receive a separate scope and price before work starts. Your coding-agent accounts, AI usage, hosting and third-party subscriptions are separate. The membership does not include a token wallet or unlimited agent execution.'
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
        Learn the methods. Apply them to your work. Get help when you get stuck. Keep the knowledge
        in your business as your workflows improve.
      </p>
      <ul>
        <li>Agent skills, walkthroughs and practical learning resources</li>
        <li>Slack support around one active workflow</li>
        <li>Weekly check-ins and scheduled remote assistance</li>
      </ul>
    </div>
    <div class="commitment">
      <p class="eyebrow">One membership</p>
      <p class="price">{PUBLIC_PRICING.membership.label}</p>
      <p>{PUBLIC_PRICING.membership.terms}. Custom builds and runtime costs are separate.</p>
      <Button href={agencyCoreMessaging.membershipInquiryHref}
        >{agencyCoreMessaging.membershipInquiryLabel}</Button
      >
      <p class="availability">
        Confirm fit, support scope and onboarding availability before payment.
      </p>
    </div>
  </div>
  <MeridianAccordion
    eyebrow="Membership boundaries"
    title="Know what is included."
    description="A shared support process, with clear ownership and limits."
    items={questions}
    openFirst={true}
  />
</section>

<style>
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
  @media (max-width: 640px) {
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
