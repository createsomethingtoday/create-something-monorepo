<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    SEO,
    type ClearCardItem,
    type ClearCtaItem
  } from '@create-something/canon';
  import WorkHistoryTimeline from '$lib/components/WorkHistoryTimeline.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const operatorStates = [
    { label: 'Clear', value: 'No decisions pending', detail: 'The operator can step away.' },
    { label: 'Review', value: 'Approval needed', detail: 'Judgment is required before action.' },
    { label: 'Stop', value: 'Blocked with reason', detail: 'The system explains why it paused.' }
  ];

  const methodSteps = [
    {
      label: '01',
      title: 'Map the operating path',
      detail:
        'Find the workflow your team still completes or covers by hand and name the handoffs, owners, and failure modes.'
    },
    {
      label: '02',
      title: 'Classify the judgment states',
      detail:
        'Separate safe work from approval-needed work and actions that should be blocked with an inspectable reason.'
    },
    {
      label: '03',
      title: 'Ship the control layer',
      detail:
        'Use MCP, skills, runbooks, release checks, and trust receipts to make the workflow portable and controlled.'
    },
    {
      label: '04',
      title: 'Brief the operator',
      detail:
        'Surface only the state that needs attention so the human returns for judgment, not constant monitoring.'
    }
  ];

  const operatorStateCards: ClearCardItem[] = operatorStates.map((state) => ({
    eyebrow: state.label,
    icon: state.label === 'Clear' ? 'check' : state.label === 'Review' ? 'search' : 'warning',
    title: state.value,
    detail: state.detail
  }));

  const methodCards: ClearCardItem[] = methodSteps.map((step) => ({
    eyebrow: step.label,
    icon:
      step.label === '01'
        ? 'folder'
        : step.label === '02'
          ? 'search'
          : step.label === '03'
            ? 'settings'
            : 'user',
    title: step.title,
    detail: step.detail
  }));

  const ctaItems: ClearCtaItem[] = [
    {
      label: 'Bring',
      icon: 'folder',
      title: 'One workflow',
      detail: 'The manual operating path that should not need constant rescue.'
    },
    {
      label: 'Map',
      icon: 'settings',
      title: 'Control states',
      detail: 'What can run, what needs approval, and what should stop.'
    },
    {
      label: 'Leave',
      icon: 'check',
      title: 'A safer first path',
      detail: 'The operating boundary before a production build starts.'
    }
  ];
</script>

<SEO
  title="Micah Johnson | CREATE SOMETHING .agency"
  description="Micah Johnson builds workflow trust layers for operator-owned outcomes: scoped actions, approval paths, evidence, and escalation surfaces for human judgment."
  keywords="Micah Johnson, workflow trust layer, production automation, systems architecture, automation reliability, controlled workflows"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="About"
  title="I build calm, transparent workflow systems for operator-owned outcomes."
  description="The operator should not carry the chaos of automation. My work turns toolchains into clear workflow states: what agents and tools can do, what needs judgment, and what must stop with a reason."
>
  {#snippet aside()}
    <ClearCardGrid items={operatorStateCards} columns={1} ariaLabel="Operator decision states" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Why this work"
  title="Power needs control. Pressure needs protocols."
>
  <div class="about-prose">
    <p>
      I grew up between two reference points: a Porsche 930 Turbo and emergency medicine. One taught
      me that power needs control. The other taught me that when pressure rises, clear protocols
      matter more than improvisation.
    </p>
    <p>
      Later, as an equine veterinary technician, I learned what continuity of care, logging, and
      operating discipline actually feel like in the real world. That stays with me in systems work
      now.
    </p>
    <p>
      Today that shows up as calm, transparent, reliable workflow systems: fast where the rules are
      clear, visible where judgment is required, and recoverable when something goes wrong.
    </p>
  </div>
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Calm Operator Method"
  title="Protect the operator before you scale the agents."
  description="The method is simple enough to fit on an e-ink surface: map the workflow, classify the judgment states, ship the control layer, and brief the human only when attention changes the outcome."
>
  {#snippet after()}
    <ClearCardGrid items={methodCards} columns={4} ariaLabel="Calm operator method steps" />
  {/snippet}
</ClearPageSection>

<ClearPageSection variant="white" eyebrow="Background" title="What I do now">
  <div class="about-prose">
    <p>
      Micah Johnson. I am a Senior Systems Architect on the Marketplace Team at Webflow, where I
      build internal tooling, onboarding systems, and platform infrastructure serving millions of
      users. The problems are familiar: brittle handoffs, unclear ownership, and systems that look
      automated until the exceptions show up.
    </p>
    <p>
      I have shipped integrations across Salesforce, HubSpot, Notion, Slack, Procore, and internal
      systems. That work informs where native tooling is enough, where MCP is the right wedge, and
      where approvals, policies, operator briefs, and recovery paths are the difference between a
      launch and a system people actually trust.
    </p>
    <p>Based in Texas. Working with businesses across the US.</p>
    <p>
      <a
        href="https://www.linkedin.com/in/micahryanjohnson/"
        target="_blank"
        rel="noopener noreferrer">LinkedIn</a
      >
      · <a href="mailto:micah@createsomething.agency">Email</a>
    </p>
  </div>
</ClearPageSection>

<ClearPageSection variant="soft" eyebrow="Approach" title="How I approach the work">
  <div class="about-prose">
    <p>
      Most teams do not need a giant AI initiative first. They need one workflow that stops creating
      manual cleanup. I start there, then add controls only when the cost of failure justifies the
      extra layer.
    </p>
    <p>
      My operating model is the Subtractive Triad: remove duplication, excess, and disconnection
      before adding automation. Cleaner systems reduce handoff risk. Better constraints make
      automation more reliable.
    </p>
    <p>
      The goal is not more automation. The goal is one operating path that lets the operator stop
      watching the dashboard until judgment is actually required.
    </p>
  </div>
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Client experience"
  title="How clients experience the work"
>
  <div class="about-prose">
    <p>
      Clients do not hire me to become another internal admin. They bring the workflow, the
      operating constraints, and the approval owner. I bring the diagnosis, the control layer, and
      the files your team needs to run and inherit the system.
    </p>
    <p>
      Visibility comes through runbooks, approval states, release evidence, operator briefs, and
      working software, not meeting theater. If what a client needs is a full internal delivery
      team, I route that work to a better-fit partner.
    </p>
  </div>
</ClearPageSection>

<ClearPageSection
  id="timeline"
  variant="soft"
  eyebrow="Timeline"
  title="The through-line is operating trust."
  description="The through-line is not AI. It is learning how to turn messy systems into operating paths people can trust. That pattern shows up in science, creative work, client services, marketplaces, and now automation."
>
  {#snippet after()}
    <WorkHistoryTimeline />
  {/snippet}
</ClearPageSection>

<ClearPageSection variant="white" eyebrow="System" title="The rest of CREATE SOMETHING">
  <div class="about-prose">
    <p>
      CREATE SOMETHING operates as a connected system. Each property has a distinct job, and each
      one sharpens the others:
    </p>
    <ul class="circle-list">
      <li>
        <a href="https://createsomething.ltd" target="_blank" rel="noopener noreferrer"
          ><strong>.ltd</strong></a
        >
        — Philosophy and principles
      </li>
      <li>
        <a href="https://createsomething.io" target="_blank" rel="noopener noreferrer"
          ><strong>.io</strong></a
        >
        — Research and validated patterns
      </li>
      <li>
        <a href="https://createsomething.space" target="_blank" rel="noopener noreferrer"
          ><strong>.space</strong></a
        >
        — Tools and experiments
      </li>
      <li>
        <strong>.agency</strong> — Calm, transparent workflow systems, reliability controls, and
        enterprise extension
        <span class="muted">(you are here)</span>
      </li>
    </ul>
    <p>
      Client work informs the research. Research sharpens the operating model. The operating model
      raises the bar on client work.
    </p>
  </div>
</ClearPageSection>

<ClearPageSection variant="soft" eyebrow="Also building" title="Also building">
  <div class="about-prose">
    <p>
      I am also building <a href="https://workway.co" target="_blank" rel="noopener noreferrer"
        >WORKWAY</a
      >. When clients need fuller system development and onboarding than .agency is meant to carry,
      I provide a direct referral path to trusted partners, including Half Dozen.
    </p>
  </div>
</ClearPageSection>

<ClearCtaBand
  eyebrow="Start with one workflow"
  title={agencyCoreMessaging.workflowCtaHeading}
  description={agencyCoreMessaging.workflowCtaDetail}
  items={ctaItems}
>
  {#snippet actions()}
    <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    <Button href="/services" variant="secondary">{agencyCoreMessaging.engagementModelLabel}</Button>
  {/snippet}
</ClearCtaBand>

<style>
  .about-prose {
    display: grid;
    gap: 1rem;
    max-width: 45rem;
    color: var(--color-clear-onyx, #0a0e19);
  }

  .about-prose p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 1rem;
    line-height: 1.62;
  }

  .circle-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .circle-list li {
    padding: 0.72rem 0;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    color: var(--color-clear-grey, #636363);
    font-size: 1rem;
    line-height: 1.5;
  }

  .circle-list li strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-weight: var(--font-medium);
  }

  .muted {
    color: var(--color-clear-grey-quiet, #818181);
    font-size: 0.9rem;
  }

  .about-prose a {
    color: var(--color-clear-onyx, #0a0e19);
    font-weight: var(--font-medium);
  }
</style>
