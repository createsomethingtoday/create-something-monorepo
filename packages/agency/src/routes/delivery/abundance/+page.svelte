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
  const outcomeItems: DeliveryOutcomeItem[] = [
    {
      label: 'Before',
      title: 'Recruiting work was split across intake, jobs, staff data, and review.',
      detail:
        'The workflow needed a visible path from candidate intake through job discovery and recruiter judgment.',
      tone: 'neutral'
    },
    {
      label: 'Now',
      title: 'Intake, job discovery, recruiter review, and delivery evidence share one record.',
      detail:
        'The delivery page compresses the working surfaces, safe artifacts, and operator boundary into a client-readable status surface.',
      tone: 'success'
    },
    {
      label: 'Risk reduced',
      title: 'Agent work is recruiter-gated before it reaches candidates or clients.',
      detail:
        'Public job discovery is read-only here, funnel writes require confirmation, and write-capable automation stays blocked until owners reauthorize accounts.',
      tone: 'info'
    },
    {
      label: 'Next decision',
      title: 'Authorize the remaining account, webhook, mapping, and roster choices.',
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
      <span class="product-kicker">Delivery record</span>
      <h1>{context.title}.</h1>
      <p>
        {context.summary}
      </p>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <span class="status-dot"></span>
      <p><strong>Client</strong><span>{engagement?.client}</span></p>
      <p><strong>Owner</strong><span>{engagement?.owner}</span></p>
      <p><strong>Phase</strong><span>{engagement?.phase}</span></p>
      <p><strong>Private data</strong><span>Paylocity export received</span></p>
    </aside>
  </div>
</section>

<DeliveryOutcomeStrip
  eyebrow="Business outcome"
  title="The pilot is now legible as an operating path."
  description="A buyer can see what changed, what is safer, and which decisions still gate the next phase without reading private evidence."
  items={outcomeItems}
/>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Review packet</span>
      <h2>What can be shared.</h2>
      <p>
        These links are client-safe. Token-bearing tool URLs, employee rows, and private Notion
        details are intentionally excluded.
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
        <span class="product-kicker">Abundance Jobs Agent</span>
        <h2>Search public roles through the job agent.</h2>
        <p>
          This panel calls the production-smoked Abundance Hub agent from the server. It can list
          and search public nursing jobs while keeping credentials and funnel writes out of the
          page.
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
            placeholder="Example: Search for travel nurse roles in Texas"
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
        <span class="product-kicker">Delivery agent</span>
        <h2>Ask against sanitized evidence.</h2>
        <p>
          This bounded agent answers only from the sanitized delivery context. Use it to explain the
          work, identify decisions, and turn client replies into structured notes.
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
            placeholder="Example: What is safe to send to our team?"
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
      <h2>Organized by operating layer.</h2>
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
      <h2>Held outside the public page.</h2>
      <div class="evidence-list">
        {#each privateEvidence as item}
          <p>{item.detail}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>Decisions still open.</h2>
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
    min-height: 68vh;
    display: flex;
    align-items: center;
    padding: clamp(52px, 7vw, 96px) 0 clamp(36px, 5vw, 64px);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .delivery-hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
    gap: clamp(28px, 5vw, 68px);
    align-items: end;
  }

  .delivery-copy {
    max-width: 860px;
  }

  .delivery-copy h1 {
    margin: 14px 0 20px;
    max-width: 820px;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(44px, 7vw, 82px);
    line-height: 0.96;
    letter-spacing: 0;
  }

  .delivery-copy p,
  .section-lead p,
  .layer-card p,
  .evidence-list p {
    color: var(--color-clear-grey, #636363);
  }

  .delivery-copy p {
    max-width: 760px;
    font-size: clamp(18px, 1.8vw, 22px);
    line-height: 1.45;
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
    gap: 18px;
    padding: 22px;
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
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
    font-size: 0.92rem;
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
    min-height: 170px;
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
    letter-spacing: 0.06em;
  }

  .artifact-link strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.2rem;
    line-height: 1.15;
  }

  .delivery-agent {
    display: grid;
    gap: 22px;
    padding: clamp(20px, 4vw, 34px);
    border-top: 1px solid var(--color-clear-border-strong, #cecece);
  }

  .job-agent {
    display: grid;
    gap: 22px;
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
  }

  .job-agent__guardrails {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .job-agent__guardrails span {
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: 4px;
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-grey, #636363);
    padding: 9px 11px;
    font-size: 0.9rem;
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
    border-radius: 4px;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    padding: 10px 13px;
    font: inherit;
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
    gap: 10px;
    max-width: 82%;
    padding: 16px;
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
    letter-spacing: 0.06em;
  }

  .chat-message p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
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
