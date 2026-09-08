<script lang="ts">
  import ProjectReviewEntry from '$lib/components/ProjectReviewEntry.svelte';
  import { Button, MeridianAccordion, PerformanceCampaignOpening, PerformanceConversionHandoff, SEO } from '@create-something/canon';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHomeHeroMedia } from '$lib/data/playbookHeroMedia';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const services = [
    {
      name: 'Map',
      description:
        'A plan showing how work moves between people and tools, and where AI could help.',
      type: 'First workflow map',
      price: PUBLIC_PRICING.map.publicStarterLabel,
      priceDescription: PUBLIC_PRICING.map.workspaceLabel
    },
    {
      name: 'Agent Foundation',
      description:
        'An AI agent that does one agreed job, with code, instructions, tests, and a handover.',
      type: 'Fixed-scope Build',
      price: 'Custom',
      priceDescription: 'Quoted after fit; production promoted separately'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing monitoring, incident response, and regular reviews for AI systems already in use.',
      type: 'Operating Plan',
      price: PUBLIC_PRICING.managedControl.label,
      priceDescription: 'Managed Control after launch'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Custom work for teams with higher volumes, stricter requirements, or several connected systems.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const faqItems = [
    {
      question: 'What does CREATE SOMETHING build?',
      answer:
        'We build AI agents that help with a specific business task. An agent is software that uses AI and connected tools to carry out a job. We agree on what it may do and when it must ask a person.'
    },
    {
      question: 'How do you check the work?',
      answer:
        'We test an agreed example and a failure case. Your team can review the result, see what happened, and check that the agent stops when it should.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'Bring one task and an example of a good result. If the job is unclear, we map the steps and responsibilities before building.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'You keep the code, instructions, tests, project history, and a guide to setup and recovery. We help you make one agreed change before handover. Launching and running the agent in your business is a separate project.'
    }
  ];

  const steps = [
    { name: 'Map', title: 'Agree on the task.', detail: 'We look at how the work happens today, the tools involved, and the person responsible. Together, we decide what AI may do and what needs approval.', href: '/map' },
    { name: 'Build', title: 'Build and test.', detail: 'We get one agreed job working in a test environment. You keep the code, instructions, and checks, and learn how to make the next change.', href: '/agent-foundation' },
    { name: 'Control', title: 'Decide whether to launch.', detail: 'Review the test results with us. Launch is a separate project, quoted before you commit. After launch, Control adds monitoring, incident response, and regular reviews.', href: '/control' }
  ];
</script>

<SEO
  title="AI Help for Your Business | CREATE SOMETHING .agency"
  description="We build AI agents for one useful business task at a time. You keep the code, instructions, and tests. Going live is a separate project."
  keywords="AI workflow systems, business task automation, client-owned AI agent, agent foundation"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING .agency"
    propertyRole="AI for everyday business work"
    expression="editorial"
    title="Put AI to work on one useful task."
    lede="Bring a task your team repeats, an idea, or a project you started. We build an AI agent to do one agreed job. You keep the code and learn how to change it. Going live is scoped separately."
    media={playbookHomeHeroMedia}
    proof={[
      { label: 'First project', value: 'One tested task' },
      { label: 'You keep', value: 'Code and instructions' },
      { label: 'Going live', value: 'Separate launch project' }
    ]}
    density="compact"
    mediaMobilePlacement="background"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentFoundationHref}>{agencyCoreMessaging.reviewAgentFoundationLabel}</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary">See a verified result</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <ProjectReviewEntry />

  <section class="home-section foundation-example" aria-labelledby="foundation-example-title">
    <span>An example of the first project</span>
    <h2 id="foundation-example-title">Turn meeting notes into a draft action list.</h2>
    <p>An agent is software that uses AI and connected tools to carry out a task. Here, it reads meeting notes and drafts the next steps. Missing details stay marked for your team to confirm.</p>
    <div class="example-comparison" aria-label="Illustrative meeting notes and draft action list">
      <div class="example-notes">
        <h3>Meeting notes</h3>
        <blockquote>
          <p>Sam will send the revised proposal by Friday.</p>
          <p>We also need someone to check the budget. No owner or deadline was agreed.</p>
        </blockquote>
      </div>
      <div class="example-draft">
        <h3>Draft action list</h3>
        <ol>
          <li>
            <strong>Send the revised proposal</strong>
            <dl><div><dt>Owner</dt><dd>Sam</dd></div><div><dt>Due</dt><dd>Friday</dd></div></dl>
          </li>
          <li>
            <strong>Check the budget</strong>
            <dl><div><dt>Owner</dt><dd class="needs-confirmation">Needs confirmation</dd></div><div><dt>Due</dt><dd class="needs-confirmation">Needs confirmation</dd></div></dl>
          </li>
        </ol>
      </div>
    </div>
    <div class="example-handover">
      <p><strong>You review</strong> Approve before saving to another tool.</p>
      <p><strong>You keep</strong> Code, tests, and instructions.</p>
    </div>
    <p class="note">Illustrative example, not a measured client result.</p>
  </section>

  <section class="home-section process-section" id="agency-operating-story" aria-labelledby="home-steps-title">
    <span>How it works</span>
    <h2 id="home-steps-title">Plan it. Test it. Then decide what goes live.</h2>
    <div class="home-steps">
      {#each steps as step}
        <article>
          <span>{step.name}</span>
          <h3>{step.title}</h3>
          <p>{step.detail}</p>
          <a href={step.href}>Learn about {step.name} →</a>
        </article>
      {/each}
    </div>
    <a href="/services">See how delivery works →</a>
  </section>

  <AgencyPerformanceReadback />

  <aside class="home-section ownership-callout" aria-labelledby="home-ownership-title">
    <span>How we build</span>
    <h2 id="home-ownership-title">Built with OpenAI and Cloudflare. Designed to remain yours.</h2>
    <p>Your team owns the system. We use OpenAI Codex, an AI coding tool, to build and help you change the project. Cloudflare can provide hosting and storage.</p>
    <p>You keep the code, workflow plan, rules, tests, history, and recovery instructions. If you change AI models or tools, that knowledge stays with you. A new setup still needs testing.</p>
    <a href="/stack">See what you keep →</a>
    <a href="https://createsomething.ltd/canon/concepts/conviction-without-dependence">Why we build this way</a>
  </aside>

  <MeridianAccordion
    eyebrow="Common questions"
    title="What to expect."
    description="Start with one task. Agree on the result before the build."
    items={faqItems}
    openFirst={true}
  />

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Your first project"
    title="Start with the task you want help with."
    description="Bring an idea or an existing project, an example of the work, and what a good result looks like. We’ll discuss whether we can help and what the first project would include. Going live is quoted separately."
    handoff={{ owner: 'Your project lead', authority: 'Agree on the task and limits', proof: 'One example of the work', state: 'ready' }}
    density="concise"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentFoundationBookingHref}>{agencyCoreMessaging.bookAgentFoundationLabel}</Button>
      <Button href={agencyCoreMessaging.agentFoundationHref} variant="secondary">See what the first project includes</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .home-pilot { background: var(--color-performance-paper, #f3f3f0); color: var(--color-performance-ink, #090909); }
  .home-section { padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2)); border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .home-section > span, article > span, dt { font-size: 0.8rem; font-weight: 650; }
  h2 { max-width: 25ch; margin: 0.8rem 0 1.5rem; font-family: var(--font-performance-editorial); font-size: clamp(2rem, 4vw, 3.6rem); font-weight: 400; line-height: 1.1; }
  h3 { font-size: 1.35rem; line-height: 1.25; margin: 0.7rem 0; }
  p { max-width: 65ch; line-height: 1.65; margin: 0 0 1.25rem; }
  .note { margin-top: 1.5rem; font-size: 0.9rem; }
  .home-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; margin: 2rem 0 0; }
  article { min-width: 0; border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); padding-top: 1rem; }
  .home-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  a { display: inline-flex; align-items: center; min-height: 2.75rem; margin-right: 1.5rem; color: inherit; text-underline-offset: 0.2em; }
  .foundation-example, .process-section { padding-top: clamp(2rem, 3vw, 3rem); padding-bottom: clamp(2rem, 3vw, 3rem); }
  .foundation-example h2, .process-section h2 { max-width: 32ch; font-size: clamp(1.9rem, 3vw, 2.6rem); margin-bottom: 1rem; }
  .example-comparison { display: grid; grid-template-columns: 1fr 1fr; margin-top: 1.5rem; border: 1px solid var(--color-performance-line-strong, #a9aaa5); }
  .example-notes, .example-draft { min-width: 0; padding: clamp(1.25rem, 2vw, 2rem); }
  .example-draft { border-left: 1px solid var(--color-performance-line-strong, #a9aaa5); }
  .example-comparison h3 { margin: 0 0 1rem; font-size: 1.1rem; }
  blockquote { margin: 0; }
  blockquote p:last-child { margin-bottom: 0; }
  .example-draft ol { padding-left: 1.25rem; margin: 0; }
  .example-draft li + li { border-top: 1px solid var(--color-performance-line, #d7d7d2); margin-top: 1rem; padding-top: 1rem; }
  .example-draft strong { line-height: 1.5; }
  .example-draft dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.6rem 0 0; }
  .example-draft dt { color: var(--color-performance-muted, #5e6268); }
  .example-draft dd { margin: 0.25rem 0 0; line-height: 1.5; }
  .needs-confirmation { font-weight: 600; text-decoration: underline dotted; text-underline-offset: 0.25em; }
  .example-handover { display: flex; flex-wrap: wrap; gap: 0.75rem 2rem; margin-top: 1.25rem; }
  .example-handover p { margin: 0; }
  .example-handover strong { display: block; }
  .foundation-example .note { margin: 1rem 0 0; color: var(--color-performance-muted, #5e6268); }
  .process-section .home-steps { margin-top: 1.25rem; }
  @media (max-width: 640px) { .example-comparison { grid-template-columns: 1fr; } .example-draft { border-left: 0; border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); } }
  @media (max-width: 640px) { .home-steps { grid-template-columns: 1fr; } }
</style>
