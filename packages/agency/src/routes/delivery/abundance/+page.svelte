<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';

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
    { label: 'Live now', value: 'Nurse intake' },
    { label: 'Safe here', value: 'Read-only review' },
    { label: 'Gate', value: 'Recruiter or account-owner approval' }
  ];
  const intakePathItems = [
    {
      step: '01',
      title: 'Open the live path',
      detail: 'Start as a nurse and check the plain-language intake.'
    },
    {
      step: '02',
      title: 'Check the boundary',
      detail: 'Public jobs are read-only. Protected work still waits for review.'
    },
    {
      step: '03',
      title: 'Choose the owner',
      detail: 'Review the six open decisions and hand one to the right person.'
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

  let deliveryMessages: DeliveryAgentMessage[] = context.agent.initialMessages.map((message) => ({
    role: 'agent' as const,
    body: message.body,
    grounding: message.grounding
  }));

  let deliveryQuestion = '';
  let isAskingDeliveryAgent = false;
  let deliveryAgentError = '';

  async function askDeliveryAgent(prompt: string | undefined = undefined) {
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
      deliveryQuestion = message;
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
  ogImage="/og-image.png"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero" data-performance-chapter="task-state">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Abundance delivery record</span>
      <h1>Review the live intake. Choose what moves next.</h1>
      <p>
        Concierge is live for nurse intake. Public job search stays read-only. A recruiter or NPG
        account owner must approve protected steps.
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
        <a class="delivery-action" href="#decision-receipt">Review next decisions</a>
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
    <div class="intake-path" aria-label="Three-step Abundance review path">
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

<section
  class="delivery-section"
  id="delivery-agent"
  data-performance-chapter="workspace"
>
  <div class="shell-inner-pad abundance-workspace">
    <div class="section-lead">
      <span class="product-kicker">Review the pilot</span>
      <h2>Check the delivery in three passes.</h2>
      <p>Open the client-safe proof, ask one focused question, then inspect supporting detail only if you need it.</p>
    </div>

    <div class="abundance-proof product-surface">
      <div>
        <span class="product-kicker">1 · Client-safe proof</span>
        <h3>Open what the client can review.</h3>
        <p>These links contain no credentials, raw employee rows, or private workspace URLs.</p>
      </div>
      <div class="abundance-artifact-list">
        {#each publicArtifacts as artifact}
          <a href={artifact.href} target="_blank" rel="noreferrer">
            <span>{artifact.type}</span>
            <strong>{artifact.title}</strong>
          </a>
        {/each}
      </div>
    </div>

    <div class="delivery-agent product-surface">
      <div class="delivery-agent__intro">
        <span class="product-kicker">2 · Delivery notes</span>
        <h3>Ask one delivery question.</h3>
        <p>The agent answers from the sanitized delivery record and keeps private material out of its response.</p>
      </div>

      <div class="suggested-prompts" aria-label="Suggested delivery questions">
        {#each context.agent.suggestedPrompts as suggestion}
          <button
            type="button"
            on:click={() => askDeliveryAgent(suggestion.prompt)}
            disabled={isAskingDeliveryAgent}
          >
            {suggestion.label}
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

      <p class="delivery-agent__recovery">If an answer fails, your question stays here so you can try again.</p>

      {#if deliveryAgentError}
        <p class="delivery-agent__error" role="alert">{deliveryAgentError}</p>
      {/if}
    </div>

    <div class="abundance-disclosures" aria-label="Supporting delivery detail">
      <details class="delivery-disclosure product-surface">
        <summary>How Database, Automation, and Judgment fit</summary>
        <div class="layer-grid">
          {#each context.layers as layer}
            <article class="layer-card">
              <span class="layer-tier">{layer.tier}</span>
              <h3>{layer.title}</h3>
              <p class="layer-status">{layer.status}</p>
              <p>{layer.description}</p>
            </article>
          {/each}
        </div>
      </details>

      <details class="delivery-disclosure product-surface">
        <summary>Why this page is safe to share</summary>
        <div class="abundance-evidence-list">
          {#each privateEvidence as item}
            <article>
              <div><strong>{item.label}</strong><span>{item.source}</span></div>
              <p>{item.detail}</p>
            </article>
          {/each}
        </div>
      </details>
    </div>
  </div>
</section>

<section
  class="delivery-section"
  id="decision-receipt"
  data-performance-chapter="decision-receipt"
>
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">3 · Decision receipt</span>
      <h2>Choose the next owner action.</h2>
      <p>
        Nothing executes from this page. If you are reviewing for NPG, start with the cards owned by
        NPG account owners. Otherwise, pick one decision, confirm its owner, and keep protected detail
        in the private handoff.
      </p>
    </div>

    <div class="abundance-decision-list">
      {#each context.decisions as decision}
        <article class="product-surface">
          <div class="abundance-decision-meta">
            <span>{decision.owner}</span>
            <span>{decision.state}</span>
            <span>{decision.tier}</span>
          </div>
          <strong>{decision.title}</strong>
        </article>
      {/each}
    </div>

    <div class="abundance-receipt product-surface product-surface--soft">
      <div>
        <span class="product-kicker">Leave a clear receipt</span>
        <h3>Record the decision, owner, and next check.</h3>
      </div>
      <ol>
        <li>Choose one decision and confirm the named owner.</li>
        <li>Use Delivery notes to capture the question and client-safe evidence.</li>
        <li>Move credentials, raw records, and write access into a private review.</li>
      </ol>
      <div class="delivery-actions">
        <a class="delivery-action delivery-action--primary" href="#delivery-agent">Ask the delivery record</a>
        <a class="delivery-action" href={liveConciergeHref} target="_blank" rel="noreferrer">Open live intake</a>
      </div>
    </div>
  </div>
</section>

<style>
  .abundance-workspace {
    display: grid;
    gap: 1.25rem;
  }

  .abundance-proof {
    display: grid;
    grid-template-columns: minmax(15rem, 0.7fr) minmax(0, 1.3fr);
    gap: clamp(1.25rem, 4vw, 3rem);
    padding: clamp(1rem, 3vw, 1.75rem);
  }

  .abundance-proof > div:first-child,
  .abundance-receipt > div:first-child {
    display: grid;
    gap: 0.75rem;
    align-content: start;
  }

  .abundance-proof h3,
  .delivery-agent__intro h3,
  .abundance-receipt h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(1.55rem, 3vw, 2.25rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.05;
    text-wrap: balance;
  }

  .abundance-proof p,
  .delivery-agent__intro p,
  .abundance-receipt li {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  .delivery-agent__recovery {
    margin: -0.25rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .abundance-artifact-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .abundance-artifact-list a {
    display: grid;
    gap: 0.45rem;
    min-width: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: 4px;
    padding: 0.85rem;
    color: var(--color-performance-ink, #090909);
    text-decoration: none;
  }

  .abundance-artifact-list a:hover {
    border-color: var(--color-performance-ink, #090909);
  }

  .abundance-artifact-list span,
  .abundance-decision-meta,
  .abundance-evidence-list span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .abundance-artifact-list strong {
    font-size: 1rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.25;
  }

  .abundance-disclosures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .delivery-disclosure {
    min-width: 0;
    padding: 0;
    overflow: clip;
  }

  .delivery-disclosure summary {
    padding: 1rem;
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-performance-medium);
    cursor: pointer;
  }

  .delivery-disclosure[open] summary {
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .delivery-disclosure .layer-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .delivery-disclosure .layer-card {
    border: 0;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .delivery-disclosure .layer-card:first-child {
    border-top: 0;
  }

  .abundance-evidence-list {
    display: grid;
  }

  .abundance-evidence-list article {
    display: grid;
    gap: 0.55rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    padding: 1rem;
  }

  .abundance-evidence-list article:first-child {
    border-top: 0;
  }

  .abundance-evidence-list div {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }

  .abundance-evidence-list strong {
    color: var(--color-performance-ink, #090909);
    font-size: 0.95rem;
    font-weight: var(--font-performance-medium);
  }

  .abundance-evidence-list p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  .abundance-decision-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .abundance-decision-list article {
    display: grid;
    gap: 0.75rem;
    align-content: start;
    min-width: 0;
    padding: 1rem;
  }

  .abundance-decision-list article > strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1.05rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.35;
  }

  .abundance-decision-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 0.8rem;
  }

  .abundance-decision-meta span:first-child {
    color: var(--color-performance-ink, #090909);
  }

  .abundance-decision-meta span:nth-child(2) {
    text-transform: capitalize;
  }

  .abundance-receipt {
    display: grid;
    grid-template-columns: minmax(15rem, 0.75fr) minmax(0, 1.25fr);
    gap: clamp(1.25rem, 4vw, 3rem);
    margin-top: 1rem;
    padding: clamp(1rem, 3vw, 1.75rem);
  }

  .abundance-receipt ol {
    display: grid;
    gap: 0.7rem;
    margin: 0;
    padding-left: 1.25rem;
  }

  .abundance-receipt .delivery-actions {
    grid-column: 1 / -1;
    margin-top: 0;
  }

  @media (max-width: 760px) {
    .abundance-proof,
    .abundance-disclosures,
    .abundance-decision-list,
    .abundance-receipt {
      grid-template-columns: 1fr;
    }

    .abundance-artifact-list {
      grid-template-columns: 1fr;
    }

    .abundance-receipt .delivery-actions {
      grid-column: auto;
    }
  }
</style>
