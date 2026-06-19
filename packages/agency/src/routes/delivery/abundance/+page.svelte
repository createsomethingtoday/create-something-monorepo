<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import { abundanceJobAgentPrompts } from '$lib/delivery/abundance';
  import DeliveryOutcomeStrip, {
    type DeliveryOutcomeItem
  } from '$lib/components/DeliveryOutcomeStrip.svelte';

  export let data: PageData;

  const context = data.context;
  const engagement = context.engagement;
  const publicArtifacts = context.artifacts.filter(
    (artifact) => artifact.visibility !== 'private' && artifact.visibility !== 'internal'
  );
  const privateEvidence = context.evidence.filter((item) => item.visibility !== 'public');
  const liveConciergeHref =
    publicArtifacts.find((artifact) => artifact.title.includes('Concierge'))?.href ??
    'https://abundance-concierge-chat.pages.dev/';
  const statusItems = [
    { label: 'Client', value: engagement?.client ?? 'The NP Group / NPG' },
    { label: 'Surface', value: 'Nurse intake + delivery record' },
    { label: 'Boundary', value: 'Recruiter-gated before protected steps' },
    { label: 'Private data', value: 'Kept outside the public page' }
  ];
  const intakePathItems = [
    {
      step: '01',
      title: 'Nurse starts in chat',
      detail: 'The public app begins with plain-language intake instead of a long form.'
    },
    {
      step: '02',
      title: 'Concierge organizes the profile',
      detail:
        'Specialty, shift, location, license, and next steps stay visible as the thread develops.'
    },
    {
      step: '03',
      title: 'Protected work waits for review',
      detail:
        'Uploads, bookings, and funnel movement stay behind email verification and recruiter approval.'
    }
  ];
  const outcomeItems: DeliveryOutcomeItem[] = [
    {
      label: 'Before',
      title: 'Nurse intake, job search, staff data, and review lived in separate places.',
      detail:
        'The workflow needed one client-safe path from candidate conversation to recruiter judgment.',
      tone: 'neutral'
    },
    {
      label: 'Now',
      title: 'The polished Concierge app is the nurse-facing front door.',
      detail:
        'The delivery page now explains how intake, public job discovery, review, and evidence fit together.',
      tone: 'success'
    },
    {
      label: 'Risk reduced',
      title: 'Candidate movement stays recruiter-gated.',
      detail:
        'Public job discovery is read-only here. Uploads, bookings, and write-capable actions require explicit verification or owner approval.',
      tone: 'info'
    },
    {
      label: 'Next decision',
      title: 'Account, webhook, mapping, and roster choices remain visible.',
      detail:
        'The open decisions are explicit, attributable, and separated from private token-bearing evidence.',
      tone: 'warning'
    }
  ];

  type DeliveryAgentMessage = {
    role: 'agent' | 'client';
    body: string;
    grounding?: string[];
    followUpQuestions?: string[];
  };

  type DeliveryAgentResponse = {
    answer: string;
    grounding?: string[];
    followUps?: string[];
    restricted?: boolean;
    error?: string;
  };

  type JobAgentMessage = {
    role: 'agent' | 'client';
    body: string;
    tools?: string[];
  };

  type JobAgentResponse = {
    answer: string;
    conversationId?: string;
    tools?: string[];
    error?: string;
  };

  let jobAgentMessages: JobAgentMessage[] = [
    {
      role: 'agent',
      body: 'Ask for public nursing and healthcare roles. This panel can read public jobs; funnel writes stay outside the delivery page.'
    }
  ];

  let jobAgentQuestion = '';
  let jobAgentConversationId = '';
  let isAskingJobAgent = false;
  let jobAgentError = '';

  let deliveryMessages: DeliveryAgentMessage[] = context.agent.initialMessages.map((message) => ({
    role: 'agent' as const,
    body: message.body,
    grounding: message.grounding
  }));

  let deliveryQuestion = '';
  let isAskingDeliveryAgent = false;
  let deliveryAgentError = '';

  async function askJobAgent(prompt?: string) {
    const message = (prompt ?? jobAgentQuestion).trim();

    if (!message || isAskingJobAgent) {
      return;
    }

    jobAgentError = '';
    jobAgentMessages = [...jobAgentMessages, { role: 'client', body: message }];
    jobAgentQuestion = '';
    isAskingJobAgent = true;

    try {
      const response = await fetch('/api/delivery/abundance/job-agent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ message, conversationId: jobAgentConversationId })
      });

      const payload = (await response.json()) as JobAgentResponse;

      if (!response.ok) {
        throw new Error(
          payload?.error ?? 'The Abundance Jobs Agent could not answer that question.'
        );
      }

      jobAgentConversationId = payload.conversationId ?? jobAgentConversationId;
      jobAgentMessages = [
        ...jobAgentMessages,
        {
          role: 'agent',
          body: payload.answer,
          tools: payload.tools ?? []
        }
      ];
    } catch (error) {
      jobAgentError =
        error instanceof Error
          ? error.message
          : 'The Abundance Jobs Agent could not answer that question.';
    } finally {
      isAskingJobAgent = false;
    }
  }

  async function askDeliveryAgent(prompt?: string) {
    const message = (prompt ?? deliveryQuestion).trim();

    if (!message || isAskingDeliveryAgent) {
      return;
    }

    deliveryAgentError = '';
    const history = deliveryMessages.slice(-8).map(({ role, body }) => ({ role, body }));
    deliveryMessages = [...deliveryMessages, { role: 'client', body: message }];
    deliveryQuestion = '';
    isAskingDeliveryAgent = true;

    try {
      const response = await fetch('/api/canon/agent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ message, history, contextId: context.contextId })
      });

      const payload = (await response.json()) as DeliveryAgentResponse;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'The delivery agent could not answer that question.');
      }

      deliveryMessages = [
        ...deliveryMessages,
        {
          role: 'agent',
          body: payload.answer,
          grounding: payload.grounding,
          followUpQuestions: payload.followUps
        }
      ];
    } catch (error) {
      deliveryAgentError =
        error instanceof Error
          ? error.message
          : 'The delivery agent could not answer that question.';
    } finally {
      isAskingDeliveryAgent = false;
    }
  }
</script>

<SEO
  title="Abundance Delivery | The NP Group"
  description="Client delivery page for The NP Group's Abundance nurse staffing workflow: intake, public job discovery, recruiter-gated agent work, walkthroughs, and private source materials."
  keywords="Abundance, The NP Group, nurse staffing, workflow delivery, recruiter agent workflow, CREATE SOMETHING"
  canonical="https://createsomething.agency/delivery/abundance"
  ogImage="/og-image.svg"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Abundance delivery record</span>
      <h1>The nurse intake experience is now the front door.</h1>
      <p>
        A client-safe view of the Abundance pilot: nurses start in Concierge, public role discovery
        stays read-only, protected steps wait for verification, and recruiter judgment remains the
        gate before candidates or clients are moved.
      </p>
      <div class="delivery-actions" aria-label="Primary Abundance delivery actions">
        <a
          class="delivery-action delivery-action--primary"
          href={liveConciergeHref}
          target="_blank"
          rel="noreferrer"
        >
          Open live intake
        </a>
        <a class="delivery-action" href="#job-agent">Review job agent</a>
      </div>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <div class="delivery-status__heading">
        <span class="status-dot"></span>
        <strong>Pilot review</strong>
      </div>
      {#each statusItems as item}
        <p><strong>{item.label}</strong><span>{item.value}</span></p>
      {/each}
    </aside>
  </div>

  <div class="shell-inner-pad">
    <div class="intake-path" aria-label="Abundance nurse intake path">
      {#each intakePathItems as item}
        <article>
          <span>{item.step}</span>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<DeliveryOutcomeStrip
  eyebrow="Business outcome"
  title="The pilot reads as an operating path."
  description="A buyer can see what changed, what is safer, and which decisions still gate the next phase without reading private evidence."
  items={outcomeItems}
/>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Review packet</span>
      <h2>Client-safe links and proof.</h2>
      <p>
        Start with the live nurse intake surface, then use the walkthroughs and delivery package to
        review the operating boundary. Token-bearing URLs, employee rows, and private notes stay out
        of this page.
      </p>
    </div>

    <div class="artifact-grid">
      {#each publicArtifacts as artifact}
        <a
          class="artifact-link product-surface"
          href={artifact.href}
          target="_blank"
          rel="noreferrer"
        >
          <span>{artifact.type}</span>
          <strong>{artifact.title}</strong>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section" id="job-agent">
  <div class="shell-inner-pad">
    <div class="job-agent product-surface">
      <div class="job-agent__intro">
        <span class="product-kicker">Public role discovery</span>
        <h2>Search jobs without opening the funnel.</h2>
        <p>
          This panel calls the production-smoked Abundance Hub agent from the server. It can answer
          against public nursing roles while credentials and funnel writes stay out of the browser.
        </p>
      </div>

      <div class="job-agent__guardrails" aria-label="Job agent guardrails">
        <span>Read-only job discovery</span>
        <span>Server-side job search path</span>
        <span>No exposed keys</span>
      </div>

      <div class="suggested-prompts" aria-label="Suggested job agent prompts">
        {#each abundanceJobAgentPrompts as prompt}
          <button type="button" on:click={() => askJobAgent(prompt)} disabled={isAskingJobAgent}>
            {prompt}
          </button>
        {/each}
      </div>

      <div class="job-chat-log" aria-live="polite">
        {#each jobAgentMessages as message}
          <article class:message-client={message.role === 'client'} class="chat-message">
            <span>{message.role === 'client' ? 'Client prompt' : 'Abundance Jobs Agent'}</span>
            {#each message.body.split('\n\n') as paragraph}
              <p>{paragraph}</p>
            {/each}

            {#if message.tools?.length}
              <div class="agent-meta">
                <strong>Tools used</strong>
                <span>{message.tools.join(', ')}</span>
              </div>
            {/if}
          </article>
        {/each}
      </div>

      <form class="delivery-agent__form" on:submit|preventDefault={() => askJobAgent()}>
        <label for="job-agent-question">Search public jobs</label>
        <div>
          <textarea
            id="job-agent-question"
            bind:value={jobAgentQuestion}
            rows="3"
            maxlength="700"
            placeholder="Try: Search for ICU travel nurse roles in Texas."
          ></textarea>
          <button type="submit" disabled={isAskingJobAgent || !jobAgentQuestion.trim()}>
            {isAskingJobAgent ? 'Searching' : 'Search'}
          </button>
        </div>
      </form>

      {#if jobAgentError}
        <p class="delivery-agent__error">{jobAgentError}</p>
      {/if}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="delivery-agent product-surface">
      <div class="delivery-agent__intro">
        <span class="product-kicker">Delivery notes</span>
        <h2>Ask what is safe, blocked, or ready.</h2>
        <p>
          This bounded agent answers from the sanitized delivery context. Use it to explain the
          work, name the open decisions, and turn client replies into structured next steps.
        </p>
      </div>

      <div class="suggested-prompts" aria-label="Suggested delivery questions">
        {#each context.agent.suggestedPrompts as suggestion}
          <button
            type="button"
            on:click={() => askDeliveryAgent(suggestion.prompt)}
            disabled={isAskingDeliveryAgent}
          >
            {suggestion.prompt}
          </button>
        {/each}
      </div>

      <div class="chat-log" aria-live="polite">
        {#each deliveryMessages as message}
          <article class:message-client={message.role === 'client'} class="chat-message">
            <span>{message.role === 'client' ? 'Client question' : 'Delivery agent'}</span>
            {#each message.body.split('\n\n') as paragraph}
              <p>{paragraph}</p>
            {/each}

            {#if message.grounding?.length}
              <div class="agent-meta">
                <strong>Grounded in</strong>
                <span>{message.grounding.join(', ')}</span>
              </div>
            {/if}

            {#if message.followUpQuestions?.length}
              <div class="follow-up-list">
                <strong>Useful follow-ups</strong>
                {#each message.followUpQuestions as question}
                  <button
                    type="button"
                    on:click={() => askDeliveryAgent(question)}
                    disabled={isAskingDeliveryAgent}
                  >
                    {question}
                  </button>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>

      <form class="delivery-agent__form" on:submit|preventDefault={() => askDeliveryAgent()}>
        <label for="delivery-question">Ask a delivery question</label>
        <div>
          <textarea
            id="delivery-question"
            bind:value={deliveryQuestion}
            rows="3"
            maxlength="900"
            placeholder="Try: What is safe to send to our team?"
          ></textarea>
          <button type="submit" disabled={isAskingDeliveryAgent || !deliveryQuestion.trim()}>
            {isAskingDeliveryAgent ? 'Answering' : 'Ask'}
          </button>
        </div>
      </form>

      {#if deliveryAgentError}
        <p class="delivery-agent__error">{deliveryAgentError}</p>
      {/if}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Database / Automation / Judgment</span>
      <h2>The operating layers stay separate.</h2>
    </div>

    <div class="layer-grid">
      {#each context.layers as layer}
        <article class="product-surface layer-card">
          <span class="layer-tier">{layer.tier}</span>
          <h3>{layer.title}</h3>
          <p class="layer-status">{layer.status}</p>
          <p>{layer.description}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad evidence-layout">
    <div class="product-surface product-surface--soft evidence-panel">
      <span class="product-kicker">Private Source Materials</span>
      <h2>Private evidence stays private.</h2>
      <div class="evidence-list">
        {#each privateEvidence as item}
          <p>{item.detail}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>Decisions still need owners.</h2>
      <div class="evidence-list">
        {#each context.decisions as decision}
          <p>{decision.title}</p>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .delivery-hero {
    display: grid;
    gap: clamp(22px, 4vw, 40px);
    padding: clamp(44px, 7vw, 88px) 0 clamp(32px, 5vw, 56px);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .delivery-hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
    gap: clamp(24px, 5vw, 56px);
    align-items: center;
  }

  .delivery-copy {
    max-width: 860px;
  }

  .delivery-copy h1 {
    margin: 16px 0 18px;
    max-width: 780px;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(42px, 6vw, 76px);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .delivery-copy p,
  .section-lead p,
  .layer-card p,
  .evidence-list p {
    color: var(--color-clear-grey, #636363);
  }

  .delivery-copy p {
    max-width: 740px;
    font-size: clamp(17px, 1.55vw, 21px);
    line-height: 1.5;
    text-wrap: pretty;
  }

  .delivery-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 28px;
  }

  .delivery-action {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    padding: 0 18px;
    font-size: 0.98rem;
    line-height: 1;
    text-decoration: none;
  }

  .delivery-action--primary {
    border-color: var(--color-clear-onyx, #0a0e19);
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
  }

  .delivery-action:hover {
    border-color: var(--color-clear-ocean, #0048ff);
    opacity: 1;
  }

  .delivery-hero :global(.product-surface),
  .delivery-section :global(.product-surface) {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
    color: var(--color-clear-onyx, #0a0e19);
  }

  .delivery-hero :global(.product-surface)::after,
  .delivery-section :global(.product-surface)::after {
    display: none;
  }

  .delivery-hero :global(.product-kicker),
  .delivery-section :global(.product-kicker) {
    color: var(--color-clear-grey, #636363);
  }

  .delivery-hero :global(.product-kicker)::before,
  .delivery-section :global(.product-kicker)::before {
    background: var(--color-clear-ocean, #0048ff);
    box-shadow: none;
  }

  .delivery-status {
    display: grid;
    gap: 16px;
    padding: 22px;
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .delivery-status__heading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 4px;
  }

  .delivery-status p {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 0;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    padding-bottom: 12px;
  }

  .delivery-status p:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .delivery-status strong,
  .delivery-status span {
    font-size: 0.9rem;
    line-height: 1.35;
  }

  .delivery-status span {
    color: var(--color-clear-grey, #636363);
    text-align: right;
  }

  .status-dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: var(--color-clear-ocean, #0048ff);
  }

  .intake-path {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .intake-path article {
    display: grid;
    gap: 10px;
    min-height: 170px;
    align-content: start;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    padding: 18px;
  }

  .intake-path span {
    width: max-content;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 999px;
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-grey, #636363);
    padding: 5px 10px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1;
  }

  .intake-path strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.12rem;
    font-weight: var(--font-medium);
    line-height: 1.15;
  }

  .intake-path p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    line-height: 1.45;
  }

  .delivery-section {
    padding: clamp(36px, 6vw, 76px) 0;
    color: var(--color-clear-onyx, #0a0e19);
  }

  .section-lead {
    max-width: 760px;
    margin-bottom: 28px;
  }

  .section-lead h2 {
    margin: 10px 0 12px;
    max-width: 720px;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 64px);
    line-height: 1;
    letter-spacing: 0;
  }

  .artifact-grid,
  .layer-grid {
    display: grid;
    gap: 16px;
  }

  .artifact-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .layer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .artifact-link:nth-child(-n + 3) {
    grid-column: span 2;
  }

  .artifact-link:nth-child(n + 4) {
    grid-column: span 3;
  }

  .artifact-link {
    display: grid;
    min-height: 160px;
    align-content: space-between;
    padding: 20px;
    text-decoration: none;
  }

  .artifact-link span,
  .layer-tier,
  .layer-status {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1.15;
  }

  .artifact-link strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.2rem;
    line-height: 1.15;
  }

  .delivery-agent {
    display: grid;
    gap: 20px;
    padding: clamp(20px, 4vw, 34px);
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .job-agent {
    display: grid;
    gap: 20px;
    padding: clamp(20px, 4vw, 34px);
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .delivery-agent__intro,
  .job-agent__intro {
    max-width: 820px;
  }

  .delivery-agent__intro h2,
  .job-agent__intro h2 {
    margin: 10px 0 12px;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(30px, 5vw, 58px);
    line-height: 1;
    letter-spacing: 0;
  }

  .delivery-agent__intro p,
  .job-agent__intro p {
    color: var(--color-clear-grey, #636363);
    font-size: 1.05rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .job-agent__guardrails {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .job-agent__guardrails span {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 999px;
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-grey, #636363);
    padding: 7px 12px;
    font-size: 0.84rem;
    line-height: 1;
  }

  .suggested-prompts,
  .follow-up-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .suggested-prompts button,
  .follow-up-list button,
  .delivery-agent__form button {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 999px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    min-height: 34px;
    padding: 7px 12px;
    font: inherit;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
  }

  .suggested-prompts button:hover,
  .follow-up-list button:hover,
  .delivery-agent__form button:hover {
    border-color: var(--color-clear-ocean, #0048ff);
    background: color-mix(in srgb, var(--color-clear-pill-active, #cad7fa) 42%, white);
  }

  .suggested-prompts button:disabled,
  .follow-up-list button:disabled,
  .delivery-agent__form button:disabled {
    cursor: not-allowed;
    opacity: 0.54;
  }

  .chat-log,
  .job-chat-log {
    display: grid;
    gap: 12px;
    max-height: 620px;
    overflow: auto;
    padding-right: 6px;
  }

  .chat-message {
    display: grid;
    gap: 9px;
    max-width: min(82%, 760px);
    padding: 16px 18px;
    background: var(--color-clear-panel, #ffffff);
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
  }

  .chat-message.message-client {
    justify-self: end;
    background: var(--color-clear-frosted-mint, #d9fff7);
    border-color: color-mix(in srgb, var(--color-clear-link-green, #397554) 30%, white);
  }

  .chat-message > span,
  .agent-meta strong,
  .follow-up-list strong,
  .delivery-agent__form label {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0;
    line-height: 1.15;
  }

  .chat-message p {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    line-height: 1.55;
    white-space: pre-line;
  }

  .agent-meta {
    display: grid;
    gap: 4px;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    padding-top: 10px;
  }

  .agent-meta span {
    color: var(--color-clear-grey, #636363);
  }

  .follow-up-list {
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    padding-top: 10px;
  }

  .follow-up-list strong {
    flex-basis: 100%;
  }

  .delivery-agent__form {
    display: grid;
    gap: 10px;
  }

  .delivery-agent__form div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: stretch;
  }

  .delivery-agent__form textarea {
    min-height: 92px;
    resize: vertical;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    padding: 13px 14px;
    font: inherit;
    line-height: 1.45;
  }

  .delivery-agent__form textarea:focus {
    outline: 2px solid var(--color-clear-ocean, #0048ff);
    outline-offset: 2px;
  }

  .delivery-agent__form button {
    min-height: 44px;
    min-width: 116px;
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
  }

  .delivery-agent__error {
    margin: 0;
    color: #fca5a5;
  }

  .layer-card {
    padding: 24px;
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .layer-card h3,
  .evidence-panel h2 {
    margin: 14px 0 10px;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: clamp(24px, 3vw, 36px);
    line-height: 1.05;
    letter-spacing: 0;
  }

  .evidence-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .evidence-panel {
    padding: 24px;
  }

  .evidence-panel--accent {
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .evidence-list {
    display: grid;
    gap: 12px;
  }

  .evidence-list p {
    margin: 0;
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    padding-top: 12px;
  }

  @media (max-width: 980px) {
    .delivery-hero__inner,
    .intake-path,
    .artifact-grid,
    .layer-grid,
    .evidence-layout,
    .delivery-agent__form div {
      grid-template-columns: 1fr;
    }

    .artifact-link {
      grid-column: auto;
    }

    .delivery-hero {
      min-height: auto;
    }

    .chat-message {
      max-width: 100%;
    }
  }
</style>
