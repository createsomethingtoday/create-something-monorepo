<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import SystemBoundaryMap from '$lib/components/SystemBoundaryMap.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type StackRole = {
    name: string;
    role: string;
    why: string;
    createSomething: string;
    portable: string;
    logos?: string[];
    href?: string;
    hrefLabel?: string;
  };

  const stackRoles: StackRole[] = [
    {
      name: 'Cloudflare',
      role: 'Runtime and durable data',
      why: 'Workers, D1, Durable Objects, queues, and edge routes keep the system deployable without a heavyweight client-owned platform team.',
      createSomething: 'CREATE SOMETHING owns the Worker code, MCP routes, data model, policy hooks, and deployment runbook.',
      portable: 'Source code, schemas, migration files, wrangler config, runbooks, and rollback notes.',
      href: '/cloudflare',
      hrefLabel: 'Cloudflare lane'
    },
    {
      name: 'Composio',
      role: 'Commodity app connectivity',
      why: 'OAuth, connect links, and standard app actions should stay commodity when the integration is not the strategic differentiator.',
      createSomething: 'CREATE SOMETHING wraps connector access behind a house MCP surface, brokered discovery, allowed tools, and policy.',
      portable: 'Toolkit choices, auth boundaries, allowed action lists, and MCP contract notes.'
    },
    {
      name: 'Dify',
      role: 'Agent and workflow packaging',
      why: 'Dify is useful when a workflow needs a visible agent surface, repeatable server cards, or lightweight operator-facing automation.',
      createSomething: 'CREATE SOMETHING keeps server IDs stable, documents tool dependencies, and tests the agent against real workflow behavior.',
      portable: 'Agent DSL, MCP intake files, server cards, smoke checks, and workflow notes.',
      href: '/dify',
      hrefLabel: 'Dify lane'
    },
    {
      name: 'Notion',
      role: 'Operator workspace',
      why: 'Notion is useful when the workflow needs PM visibility, client-readable evidence, template distribution, or human review around agent work.',
      createSomething: 'CREATE SOMETHING defines the workspace model, source-of-truth boundary, automation path, read/write policy, and template-safe evidence.',
      portable: 'Workspace map, view definitions, template instructions, data-source notes, Worker/MCP boundaries, and evidence model.',
      href: '/notion',
      hrefLabel: 'Notion lane'
    },
    {
      name: 'OpenAI',
      role: 'Reasoning and agent host',
      why: 'OpenAI, Codex, and adjacent model hosts provide reasoning surfaces; the business value comes from the scoped tools and approval layer around them.',
      createSomething: 'CREATE SOMETHING defines tool schemas, prompt boundaries, approval behavior, eval gates, and traceable task context.',
      portable: 'Tool definitions, prompts, eval cases, approval policy, and model-routing notes.'
    },
    {
      name: 'Webflow',
      role: 'Business-facing surfaces',
      why: 'Webflow is the right surface when the workflow needs a site, template, app, form, dashboard, or marketplace-facing operator experience.',
      createSomething: 'CREATE SOMETHING turns Webflow into a controlled interface backed by repo-owned code, MCP tools, forms, and review systems.',
      portable: 'App code, component contracts, form schemas, dashboard specs, template review notes, and handoff docs.'
    },
    {
      name: 'Linear',
      role: 'Work and evidence ledger',
      why: 'Delivery needs a shared record of scoped work, ownership, status, validation, and follow-up.',
      createSomething: 'CREATE SOMETHING records implementation evidence, validation commands, release notes, and unresolved decisions.',
      portable: 'Issue IDs, evidence summaries, runbook links, task traces, and release notes.'
    },
    {
      name: 'Infisical + Auth0',
      logos: ['Infisical', 'Auth0'],
      role: 'Secrets and identity boundary',
      why: 'Secrets and identity should not be hidden inside prompts, code comments, or static client handoff docs.',
      createSomething: 'CREATE SOMETHING separates sign-in, managed bearer tokens, entitlement checks, and runtime policy.',
      portable: 'Secret paths, env contract, access policy, token rotation notes, and revocation process.'
    }
  ];

  const journey = [
    {
      stage: 'Connect',
      label: 'Trust Map',
      detail:
        'Name the business objects, source accounts, first action boundary, and evidence needed before the workflow can be delegated.'
    },
    {
      stage: 'Automate',
      label: 'Workflow Pilot',
      detail:
        'Turn one repeated handoff into callable actions, durable data, controlled agent capacity, and a runbook your team can inspect.'
    },
    {
      stage: 'Control',
      label: 'Trust Layer',
      detail:
        'Classify actions as auto-allowed, approval-needed, or blocked with reason before the workflow touches risk.'
    },
    {
      stage: 'Operate',
      label: 'Operator Surface',
      detail:
        'Put the right state in the right place: Webflow, Dify, Linear, Notion, or a custom app, with evidence attached.'
    }
  ];

  const deliveryArtifacts = [
    {
      displayName: 'Workflow map',
      name: 'workflow-map',
      summary: 'One workflow, source systems, owners, handoffs, and failure points.',
      tag: 'Map'
    },
    {
      displayName: 'Stack boundary',
      name: 'stack-boundary',
      summary: 'What your team owns, what CREATE SOMETHING owns, and what vendors provide.',
      tag: 'Boundary'
    },
    {
      displayName: 'MCP/API contract',
      name: 'mcp-api-contract',
      summary: 'Tools, resources, auth scopes, allowed actions, and transport limits.',
      tag: 'Contract'
    },
    {
      displayName: 'Policy rules',
      name: 'policy-rules',
      summary: 'Auto-allow, approval-needed, and blocked states with reasons.',
      tag: 'Control'
    },
    {
      displayName: 'Runbook',
      name: 'runbook',
      summary: 'Recovery, release evidence, rollback notes, and operator handoff.',
      tag: 'Operate'
    },
    {
      displayName: 'Operator brief',
      name: 'operator-brief',
      summary: 'The visible state for Webflow, Dify, Linear, Notion, or a custom app.',
      tag: 'Surface'
    }
  ];

  const proofPaths = [
    {
      name: 'Outerfields',
      label: 'Entry map',
      problem: 'A team needs the first technical layer without pretending they are now the engineering team.',
      system: 'Replit, login, client docs, and a bounded MCP path make the entry point explainable.',
      receipt: 'First workflow map, account boundary, login path, and handoff notes.'
    },
    {
      name: 'Abundance',
      label: 'Complete system',
      problem: 'A complete operating path needs data, actions, and judgment to move together.',
      system: 'Database, callable actions, MCP/API surface, and explainable matching show the full Database / Automation / Judgment path.',
      receipt: 'Data model, action contracts, matching rules, and review surface.'
    },
    {
      name: 'Webflow systems',
      label: 'Surface and marketplace work',
      problem: 'The workflow needs to become visible through a business-facing surface.',
      system: 'Templates, apps, forms, dashboards, and review tools turn the stack into something operators can use.',
      receipt: 'Component contracts, form schemas, dashboard specs, and template review notes.'
    },
    {
      name: 'Trust Layer',
      label: 'Expansion layer',
      problem: 'Speed starts touching revenue, trust, compliance, or cross-team accountability.',
      system: 'Linear evidence, identity, entitlement, approvals, blocked states, and auditability make the system serious enough to scale.',
      receipt: 'Trust rules, approval matrix, evidence ledger, and escalation runbook.'
    }
  ];

  const mappingOutcomes = [
    'First workflow map',
    'Vendor and ownership boundary',
    'Auto-allow, approval-needed, and blocked states',
    'Agent/tool capacity boundary'
  ];

  const boundaryQuestions = [
    {
      question: 'What does our team own?',
      answer: 'Accounts, data rights, approval authority, business context, and the final operating decision.'
    },
    {
      question: 'What does CREATE SOMETHING own?',
      answer: 'The workflow map, action contracts, trust rules, release evidence, runbooks, and handoff notes.'
    },
    {
      question: 'What can change later?',
      answer: 'Vendor services can change without losing the workflow, control layer, evidence model, or operator surface.'
    }
  ];
</script>

<SEO
  title="Trust Layer & Stack Boundaries | CREATE SOMETHING .agency"
  description="The stack is replaceable. CREATE SOMETHING owns the trust layer: objects, scoped actions, approval paths, evidence, and recovery."
  keywords="workflow trust layer, transparent AI stack, MCP stack, vendor boundaries, Composio, Cloudflare, Dify, Notion, OpenAI, Webflow"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero-page">
  <div class="shell-inner-pad stack-shell hero-layout">
    <div class="hero-copy">
      <BlurFade>
        <span class="product-kicker">Trust Layer & Stack Boundaries</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h1 class="hero-title">The tools are replaceable. The operating boundary is the product.</h1>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p class="hero-detail">
          Proven services help the work run. CREATE SOMETHING owns the part that makes delegation
          safe to inherit: the object model, action boundaries, approval paths, evidence, and recovery
          notes that stay portable when vendors change.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions">
          <Button href={agencyCoreMessaging.workflowMappingSessionHref}>{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/services" variant="secondary">See How I Work</Button>
          <Button href="/partners" variant="secondary">See Partner Stack</Button>
        </div>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <aside class="boundary-brief" aria-label="Stack boundary summary">
        <div>
          <span>Your team keeps</span>
          <strong>Accounts, context, decisions</strong>
        </div>
        <div>
          <span>I deliver</span>
          <strong>Maps, rules, evidence</strong>
        </div>
        <div>
          <span>Vendors provide</span>
          <strong>Replaceable infrastructure</strong>
        </div>
      </aside>
    </BlurFade>
  </div>
</section>

<section class="journey-section">
  <div class="shell-inner-pad stack-shell">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">How the stack becomes a service</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>From tool choices to a controlled handoff.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The story stays simple for a non-technical team: map the boundary, prove one workflow,
          control the risky actions, then operate through the right visible surface.
        </p>
      </BlurFade>
    </div>

    <div class="journey-grid" role="list">
      {#each journey as item, index}
        <BlurFade delay={0.12 + index * 0.05}>
          <article class="journey-card" role="listitem">
            <span class="card-index">0{index + 1}</span>
            <h3>{item.stage}</h3>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="boundary-map-section">
  <div class="shell-inner-pad stack-shell">
    <BlurFade>
      <SystemBoundaryMap />
    </BlurFade>
  </div>
</section>

<section class="artifact-section">
  <div class="shell-inner-pad stack-shell">
    <BlurFade>
      <ArtifactSystemStrip
        eyebrow="What your team keeps"
        title="You keep the receipts, not a mystery stack."
        description="The technical stack can change. These maps, runbooks, and evidence make the system explainable, inheritable, and easier to trust after launch."
        items={deliveryArtifacts}
      />
    </BlurFade>
  </div>
</section>

<section class="stack-section">
  <div class="shell-inner-pad stack-shell">
    <div class="section-lead section-lead--wide">
      <BlurFade>
        <span class="product-kicker">Vendor roles</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Vendor names are receipts, not the product.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Each service earns a clear job. The connected tools are not the moat. CREATE SOMETHING
          owns the operating boundary around the workflow: what gets connected, what runs, what
          pauses, what stops, and what the operator receives.
        </p>
      </BlurFade>
    </div>

    <div class="boundary-question-grid" role="list" aria-label="Stack boundary questions">
      {#each boundaryQuestions as item}
        <article class="boundary-question" role="listitem">
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </article>
      {/each}
    </div>

    <div class="vendor-grid">
      {#each stackRoles as role, index}
        <BlurFade delay={0.12 + index * 0.04}>
          <article class="vendor-card">
            <div class="vendor-card__header">
              <div class="vendor-card__logos" aria-hidden="true">
                {#each role.logos ?? [role.name] as logoName}
                  <BrandLogo name={logoName} size={26} className="vendor-card__icon" />
                {/each}
              </div>
              <div class="vendor-card__title">
                <h3>{role.name}</h3>
                <span>{role.role}</span>
              </div>
            </div>
            <dl>
              <div>
                <dt>Why it is here</dt>
                <dd>{role.why}</dd>
              </div>
              <div>
                <dt>What CREATE SOMETHING adds</dt>
                <dd>{role.createSomething}</dd>
              </div>
              <div>
                <dt>What stays portable</dt>
                <dd>{role.portable}</dd>
              </div>
            </dl>
            {#if role.href}
              <a class="vendor-card__link" href={role.href}>{role.hrefLabel ?? 'Partner lane'}</a>
            {/if}
          </article>
        </BlurFade>
      {/each}
    </div>

    <p class="vendor-note">
      Vendor names and marks identify stack components only. They do not imply sponsorship,
      endorsement, or ownership by CREATE SOMETHING.
    </p>
  </div>
</section>

<section class="proof-section">
  <div class="shell-inner-pad stack-shell">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Proof path</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The examples tell the whole story without tool sprawl.</h2>
      </BlurFade>
    </div>

    <div class="proof-grid">
      {#each proofPaths as proof, index}
        <BlurFade delay={0.12 + index * 0.05}>
          <article class="proof-card">
            <span>{proof.label}</span>
            <h3>{proof.name}</h3>
            <dl>
              <div>
                <dt>Problem</dt>
                <dd>{proof.problem}</dd>
              </div>
              <div>
                <dt>System</dt>
                <dd>{proof.system}</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>{proof.receipt}</dd>
              </div>
            </dl>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad stack-shell">
    <div class="cta-panel">
      <BlurFade>
        <span class="product-kicker">Start with the workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Bring the workflow, the accounts, and the approval owner.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          CREATE SOMETHING will map the stack boundary, define the first safe delegation path,
          identify what can become agent capacity, and show what stays visible to the operator before
          implementation starts.
        </p>
      </BlurFade>
      <BlurFade delay={0.13}>
        <div class="mapping-outcomes" role="list" aria-label="Mapping session outcomes">
          {#each mappingOutcomes as outcome}
            <span role="listitem">{outcome}</span>
          {/each}
        </div>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions hero-actions--center">
          <Button href={agencyCoreMessaging.workflowMappingSessionHref}>{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/products" variant="secondary">See Proof Surfaces</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .stack-shell {
    max-width: min(var(--content-width-xl, 80rem), 100vw);
    box-sizing: border-box;
  }

  .hero-page,
  .journey-section,
  .boundary-map-section,
  .artifact-section,
  .stack-section,
  .proof-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .hero-page {
    padding-top: clamp(4.5rem, 7vw, 6.25rem);
  }

  .hero-layout {
    display: grid;
    gap: clamp(1.4rem, 4vw, 3rem);
    align-items: center;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.72fr);
  }

  .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 48rem;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(3rem, 4vw + 1rem, 5rem);
    line-height: 0.98;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .hero-detail,
  .section-lead p,
  .journey-card p,
  .vendor-card dd,
  .proof-card dd,
  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .hero-actions--center {
    justify-content: center;
  }

  .boundary-brief {
    display: grid;
    gap: 0.85rem;
    padding: clamp(1rem, 2.6vw, 1.4rem);
    border: 1px solid var(--color-shell-border-default);
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
      rgba(0, 0, 0, 0.4);
  }

  .boundary-brief div {
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem;
    border-radius: 0.85rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 82%, transparent);
    background: rgba(255, 255, 255, 0.025);
  }

  .boundary-brief span,
  .card-index,
  .vendor-card dt,
  .proof-card span,
  .proof-card dt {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .boundary-brief strong {
    color: var(--color-fg-primary);
    font-size: 1rem;
    line-height: 1.25;
  }

  .section-lead {
    display: grid;
    gap: 0.85rem;
    max-width: 44rem;
    margin-bottom: 1.5rem;
  }

  .section-lead--wide {
    max-width: 58rem;
  }

  .section-lead--center {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  .section-lead h2,
  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .journey-grid,
  .boundary-question-grid,
  .vendor-grid,
  .proof-grid {
    display: grid;
    gap: 1rem;
  }

  .journey-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .proof-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vendor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .boundary-question-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-bottom: 1rem;
  }

  .journey-card,
  .boundary-question,
  .vendor-card,
  .proof-card {
    display: grid;
    gap: 0.75rem;
    padding: 1.1rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: 1rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
      rgba(0, 0, 0, 0.36);
  }

  .journey-card h3,
  .boundary-question h3,
  .vendor-card h3,
  .proof-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1.12rem;
    line-height: 1.16;
  }

  .journey-card strong {
    color: var(--color-fg-primary);
    font-size: 0.95rem;
    line-height: 1.35;
  }

  .boundary-question p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.64;
    text-wrap: pretty;
  }

  .vendor-card__header {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }

  .vendor-card__logos {
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
    align-items: center;
  }

  .vendor-card__title {
    display: grid;
    gap: 0.25rem;
  }

  .vendor-card__header span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .vendor-card :global(.vendor-card__icon) {
    color: var(--color-brand-ink);
  }

  .vendor-card dl {
    display: grid;
    gap: 0.85rem;
    margin: 0;
  }

  .vendor-card__link {
    width: fit-content;
    margin-top: 0.1rem;
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
  }

  .vendor-card dl div,
  .proof-card dl div {
    display: grid;
    gap: 0.32rem;
  }

  .vendor-note {
    margin: 1rem 0 0;
    max-width: 48rem;
    color: var(--color-fg-muted);
    font-size: 0.82rem;
    line-height: 1.6;
  }

  .proof-card dl {
    display: grid;
    gap: 0.8rem;
    margin: 0;
  }

  .proof-card dd {
    margin: 0;
  }

  .mapping-outcomes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 0.1rem;
  }

  .mapping-outcomes span {
    display: inline-flex;
    align-items: center;
    min-height: 2rem;
    padding: 0.38rem 0.68rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.035);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .cta-panel {
    display: grid;
    gap: 0.95rem;
    padding: clamp(1.3rem, 3vw, 2rem);
    border: 1px solid var(--color-brand-primary-border);
    border-radius: 1.25rem;
    background:
      linear-gradient(135deg, rgba(49, 92, 255, 0.16), rgba(45, 212, 191, 0.08)),
      rgba(0, 0, 0, 0.42);
    text-align: center;
  }

  @media (max-width: 1100px) {
    .hero-layout,
    .vendor-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .boundary-question-grid,
    .journey-grid,
    .proof-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .hero-page {
      padding-top: clamp(2.75rem, 10vw, 3.5rem);
    }

    .hero-title {
      font-size: clamp(2.45rem, 11vw, 3.5rem);
    }

    .journey-grid,
    .boundary-question-grid,
    .proof-grid {
      grid-template-columns: 1fr;
    }

    .journey-card,
    .boundary-question,
    .vendor-card,
    .proof-card,
    .cta-panel {
      padding: 1rem;
    }
  }
</style>
