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

  const originSignals = [
    {
      label: 'Power',
      title: 'Control before speed',
      detail: 'A Porsche 930 Turbo is useful only when the driver can trust the system around it.'
    },
    {
      label: 'Pressure',
      title: 'Protocols before improvisation',
      detail: 'Emergency medicine made the cost of unclear handoffs easy to understand.'
    },
    {
      label: 'Continuity',
      title: 'Care leaves a record',
      detail: 'Veterinary work made logging, ownership, and recovery paths feel concrete.'
    }
  ];

  const dossierRows = [
    {
      label: 'Current role',
      value: 'Senior Systems Architect',
      detail: 'Marketplace Team at Webflow'
    },
    {
      label: 'Primary work',
      value: 'Workflow trust layers',
      detail: 'Scoped actions, approvals, evidence, and escalation surfaces'
    },
    {
      label: 'Location',
      value: 'Texas',
      detail: 'Working with businesses across the US'
    }
  ];

  const workingContracts = [
    {
      label: 'Approach',
      title: 'Start with the cleanup loop',
      detail:
        'Most teams need one workflow that stops creating manual recovery work before they need a larger AI initiative.'
    },
    {
      label: 'Method',
      title: 'Subtract before automating',
      detail:
        'The Subtractive Triad removes duplication, excess, and disconnection so automation has fewer failure paths.'
    },
    {
      label: 'Client contract',
      title: 'Bring the workflow and owner',
      detail:
        'Clients bring the operating constraints and approval owner. I bring diagnosis, controls, runbooks, evidence, and working software.'
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
  layout="split"
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

  {#snippet aside()}
    <aside class="signal-rail" aria-label="Operating references">
      <span class="rail-label">Reference points</span>
      {#each originSignals as signal}
        <article class="signal-card">
          <span>{signal.label}</span>
          <strong>{signal.title}</strong>
          <p>{signal.detail}</p>
        </article>
      {/each}
    </aside>
  {/snippet}
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

<ClearPageSection variant="white" layout="split" eyebrow="Background" title="What I do now">
  <div class="about-prose">
    <p>
      Micah Johnson. I am a Senior Systems Architect on the Marketplace Team at Webflow, where I
      build internal tooling, onboarding systems, and platform infrastructure serving millions of
      users. The problems are familiar: brittle handoffs, unclear ownership, and systems that look
      automated until the exceptions show up.
    </p>
    <p>
      I have shipped integrations across Salesforce, HubSpot, Notion, Slack, Procore, and internal
      systems. That work informs where native tooling is enough, where MCP is the right integration path, and
      where approvals, policies, operator briefs, and recovery paths are the difference between a
      launch and a system people actually trust.
    </p>
  </div>

  {#snippet aside()}
    <aside class="operator-dossier" aria-label="Operator dossier">
      <div class="operator-dossier__header">
        <span>Operator</span>
        <strong>Micah Johnson</strong>
      </div>

      <div class="dossier-rows">
        {#each dossierRows as row}
          <div class="dossier-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <p>{row.detail}</p>
          </div>
        {/each}
      </div>

      <div class="dossier-actions" aria-label="Contact links">
        <a
          href="https://www.linkedin.com/in/micahryanjohnson/"
          target="_blank"
          rel="noopener noreferrer">LinkedIn</a
        >
        <a href="mailto:micah@createsomething.agency">Email</a>
      </div>
    </aside>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Working contract"
  title="The work stays narrow enough to trust."
  description="The goal is not more automation. The goal is one operating path that lets the operator stop watching the dashboard until judgment is actually required."
>
  {#snippet after()}
    <div class="contract-grid">
      {#each workingContracts as contract}
        <article class="contract-card">
          <span>{contract.label}</span>
          <strong>{contract.title}</strong>
          <p>{contract.detail}</p>
        </article>
      {/each}
    </div>
  {/snippet}
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

  .signal-rail,
  .operator-dossier,
  .contract-card {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .signal-rail {
    display: grid;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .rail-label,
  .signal-card span,
  .operator-dossier__header span,
  .dossier-row span,
  .contract-card span {
    color: var(--color-clear-grey-quiet, #818181);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .signal-card {
    display: grid;
    gap: 0.36rem;
    padding: 1rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .signal-card strong,
  .dossier-row strong,
  .contract-card strong {
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.25;
  }

  .signal-card p,
  .dossier-row p,
  .contract-card p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.5;
  }

  .operator-dossier {
    overflow: hidden;
  }

  .operator-dossier__header {
    display: grid;
    gap: 0.35rem;
    padding: 1.15rem;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3.5rem
        3.5rem,
      var(--color-clear-panel, #ffffff);
  }

  .operator-dossier__header strong {
    font-size: 1.34rem;
    font-weight: var(--font-medium);
    line-height: 1.1;
  }

  .dossier-rows {
    display: grid;
  }

  .dossier-row {
    display: grid;
    gap: 0.32rem;
    padding: 1rem 1.15rem;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .dossier-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dossier-actions a {
    display: inline-flex;
    min-height: 3rem;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--color-clear-border, #e1e1e1);
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.94rem;
    font-weight: var(--font-medium);
    text-decoration: none;
  }

  .dossier-actions a:last-child {
    border-right: 0;
  }

  .dossier-actions a:hover {
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
    opacity: 1;
  }

  .contract-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .contract-card {
    display: grid;
    gap: 0.55rem;
    min-height: 13rem;
    padding: 1.15rem;
  }

  @media (max-width: 760px) {
    .signal-rail {
      gap: 0.55rem;
      padding: 0.55rem;
    }

    .signal-card,
    .dossier-row,
    .contract-card {
      padding: 0.88rem;
    }

    .contract-grid {
      grid-template-columns: 1fr;
    }

    .contract-card {
      min-height: 0;
    }
  }
</style>
