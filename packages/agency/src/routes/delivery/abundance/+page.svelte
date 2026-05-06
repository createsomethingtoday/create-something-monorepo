<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    abundanceArtifactLinks,
    abundanceDeliverySummary,
    abundanceStaffHeadcountAgent,
    abundanceNextReview,
    abundanceOperatingLayers,
    abundancePrivateArtifacts,
    abundanceSuggestedPrompts
  } from '$lib/delivery/abundance';

  type DeliveryAgentMessage = {
    role: 'agent' | 'client';
    body: string;
    reasoningNote?: string;
    grounding?: string[];
    followUpQuestions?: string[];
    insightDraft?: {
      type: string;
      label: string;
      value: string;
    } | null;
  };

  type DeliveryAgentResponse = {
    answer: string;
    reasoningNote?: string;
    grounding?: string[];
    followUpQuestions?: string[];
    insightDraft?: DeliveryAgentMessage['insightDraft'];
    error?: string;
  };

  const reviewPath = [
    {
      step: '01',
      href: '#latest-agent',
      label: 'Review the latest agent',
      detail: 'Open the Staff Headcount Agent and confirm what the MCP surface can explain.'
    },
    {
      step: '02',
      href: '#artifacts',
      label: 'Open the proof set',
      detail: 'Use the live app, walkthroughs, and generated package as the client-safe review set.'
    },
    {
      step: '03',
      href: '#ask-delivery',
      label: 'Close context gaps',
      detail: 'Ask the bounded delivery agent what changed, what is private, and what needs a decision.'
    },
    {
      step: '04',
      href: '#next-review',
      label: 'Decide the next pass',
      detail: 'Confirm field mapping, MCP credentials, review ownership, and operator access.'
    }
  ];

  let deliveryMessages: DeliveryAgentMessage[] = [
    {
      role: 'agent',
      body:
        'Ask about what changed, what is private, what needs a decision, or how the database, MCP, and agent pieces fit together.'
    }
  ];

  let deliveryQuestion = '';
  let isAskingDeliveryAgent = false;
  let deliveryAgentError = '';

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
      const response = await fetch('/api/delivery/abundance/ask', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ message, history })
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
          reasoningNote: payload.reasoningNote,
          grounding: payload.grounding,
          followUpQuestions: payload.followUpQuestions,
          insightDraft: payload.insightDraft
        }
      ];
    } catch (error) {
      deliveryAgentError =
        error instanceof Error ? error.message : 'The delivery agent could not answer that question.';
    } finally {
      isAskingDeliveryAgent = false;
    }
  }
</script>

<SEO
  title="Abundance Delivery | The NP Group"
  description="Client delivery page for The NP Group's Abundance nurse staffing system: live concierge app, database, MCP surfaces, agent boundary, walkthroughs, and private source artifacts."
  keywords="Abundance, The NP Group, nurse staffing, MCP, workflow delivery, CREATE SOMETHING"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Client Delivery</span>
      <h1>{abundanceDeliverySummary.headline}</h1>
      <p>
        {abundanceDeliverySummary.description}
      </p>
      <div class="delivery-actions" aria-label="Primary delivery actions">
        <a href="#latest-agent">Review latest agent</a>
        <a href="#next-review">See decisions</a>
      </div>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <span class="status-dot"></span>
      <p><strong>Client</strong><span>{abundanceDeliverySummary.client}</span></p>
      <p><strong>Owner</strong><span>{abundanceDeliverySummary.owner}</span></p>
      <p><strong>Phase</strong><span>{abundanceDeliverySummary.phase}</span></p>
      <p><strong>Private data</strong><span>Paylocity export received</span></p>
      <p class="status-note"><strong>Next decision</strong><span>{abundanceNextReview[0]}</span></p>
    </aside>
  </div>
</section>

<nav class="review-path shell-inner-pad" aria-label="Recommended delivery review path">
  {#each reviewPath as item}
    <a href={item.href} class="review-path__item">
      <span>{item.step}</span>
      <strong>{item.label}</strong>
      <small>{item.detail}</small>
    </a>
  {/each}
</nav>

<section class="delivery-section" id="latest-agent">
  <div class="shell-inner-pad">
    <div class="agent-delivery product-surface" aria-labelledby="latest-agent-heading">
      <div class="agent-delivery__copy">
        <span class="product-kicker">{abundanceStaffHeadcountAgent.meta}</span>
        <h2 id="latest-agent-heading">{abundanceStaffHeadcountAgent.label}</h2>
        <p>{abundanceStaffHeadcountAgent.summary}</p>

        <div class="agent-delivery__points">
          {#each abundanceStaffHeadcountAgent.valuePoints as point}
            <p>{point}</p>
          {/each}
        </div>

        <p class="agent-delivery__guardrail">{abundanceStaffHeadcountAgent.guardrail}</p>
        <p class="agent-delivery__guardrail">{abundanceStaffHeadcountAgent.evaluationNote}</p>

        <a class="agent-delivery__link" href={abundanceStaffHeadcountAgent.chatUrl} target="_blank" rel="noreferrer">
          Open full chat
        </a>
      </div>

      <div class="agent-delivery__embed" aria-label="Embedded Abundance Staff Headcount Agent">
        <div class="agent-delivery__embed-header">
          <span>Embedded review surface</span>
          <a href={abundanceStaffHeadcountAgent.chatUrl} target="_blank" rel="noreferrer">Open direct</a>
        </div>
        <iframe
          src={abundanceStaffHeadcountAgent.embedUrl}
          title={abundanceStaffHeadcountAgent.label}
          allow="microphone"
        ></iframe>
      </div>
    </div>
  </div>
</section>

<section class="delivery-section" id="artifacts">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Artifacts</span>
      <h2>What is ready to review.</h2>
      <p>
        These links are client-safe. Token-bearing MCP URLs, employee rows, and private Notion
        details are intentionally excluded.
      </p>
    </div>

    <div class="artifact-grid">
      {#each abundanceArtifactLinks as artifact}
        <a class="artifact-link product-surface" href={artifact.href} target="_blank" rel="noreferrer">
          <span>{artifact.meta}</span>
          <strong>{artifact.label}</strong>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section" id="ask-delivery">
  <div class="shell-inner-pad">
    <div class="delivery-agent product-surface">
      <div class="delivery-agent__intro">
        <span class="product-kicker">Ask This Delivery</span>
        <h2>Use chat to close understanding gaps.</h2>
        <p>
          This bounded agent answers only from the sanitized delivery context. It is useful for
          explaining the work, identifying decisions, and turning client replies into structured
          insight notes.
        </p>
      </div>

      <div class="suggested-prompts" aria-label="Suggested delivery questions">
        {#each abundanceSuggestedPrompts as prompt}
          <button type="button" on:click={() => askDeliveryAgent(prompt)} disabled={isAskingDeliveryAgent}>
            {prompt}
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

            {#if message.reasoningNote}
              <div class="agent-meta">
                <strong>How I read this</strong>
                <span>{message.reasoningNote}</span>
              </div>
            {/if}

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
                  <button type="button" on:click={() => askDeliveryAgent(question)} disabled={isAskingDeliveryAgent}>
                    {question}
                  </button>
                {/each}
              </div>
            {/if}

            {#if message.insightDraft}
              <div class="agent-meta">
                <strong>Insight draft</strong>
                <span>{message.insightDraft.label}</span>
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

<section class="delivery-section" id="operating-model">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Database / Automation / Judgment</span>
      <h2>The delivery is organized around the operating model.</h2>
    </div>

    <div class="layer-grid">
      {#each abundanceOperatingLayers as layer}
        <article class="product-surface layer-card">
          <span class="layer-tier">{layer.tier}</span>
          <h3>{layer.title}</h3>
          <p class="layer-status">{layer.status}</p>
          <p>{layer.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section" id="next-review">
  <div class="shell-inner-pad evidence-layout">
    <div class="product-surface product-surface--soft evidence-panel">
      <span class="product-kicker">Private Source Artifacts</span>
      <h2>Received, but not published.</h2>
      <div class="evidence-list">
        {#each abundancePrivateArtifacts as item}
          <p>{item}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>What needs a human decision.</h2>
      <div class="evidence-list">
        {#each abundanceNextReview as item}
          <p>{item}</p>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .delivery-hero {
    min-height: auto;
    display: flex;
    align-items: center;
    padding: clamp(48px, 7vw, 82px) 0 clamp(28px, 5vw, 56px);
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
    font-family: var(--font-display);
    font-size: clamp(48px, 8vw, 104px);
    line-height: 0.92;
    letter-spacing: 0;
  }

  .delivery-copy p,
  .section-lead p,
  .layer-card p,
  .evidence-list p {
    color: rgba(246, 247, 251, 0.72);
  }

  .delivery-copy p {
    max-width: 760px;
    font-size: clamp(19px, 2vw, 25px);
    line-height: 1.35;
  }

  .delivery-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 28px;
  }

  .delivery-actions a,
  .review-path__item {
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.055);
    color: rgba(246, 247, 251, 0.9);
    text-decoration: none;
  }

  .delivery-actions a {
    padding: 11px 14px;
  }

  .delivery-actions a:first-child {
    border-color: rgba(94, 234, 212, 0.36);
    background: rgba(94, 234, 212, 0.12);
    color: #ffffff;
  }

  .delivery-actions a:hover,
  .review-path__item:hover {
    border-color: rgba(94, 234, 212, 0.72);
    color: #ffffff;
  }

  .delivery-status {
    display: grid;
    gap: 18px;
    padding: 22px;
    border-top: 4px solid rgba(94, 234, 212, 0.78);
  }

  .delivery-status p {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
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
    color: rgba(246, 247, 251, 0.68);
    text-align: right;
  }

  .delivery-status .status-note {
    display: grid;
    gap: 8px;
  }

  .delivery-status .status-note span {
    text-align: left;
    line-height: 1.45;
  }

  .status-dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    background: #5eead4;
    box-shadow: 0 0 34px rgba(94, 234, 212, 0.75);
  }

  .review-path {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 0;
    margin-bottom: clamp(20px, 4vw, 42px);
  }

  .review-path__item {
    display: grid;
    gap: 9px;
    min-height: 154px;
    align-content: start;
    padding: 18px;
  }

  .review-path__item span {
    color: #5eead4;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }

  .review-path__item strong {
    font-size: 1.05rem;
    line-height: 1.2;
  }

  .review-path__item small {
    color: rgba(246, 247, 251, 0.62);
    font-size: 0.92rem;
    line-height: 1.4;
  }

  .delivery-section {
    padding: clamp(36px, 6vw, 76px) 0;
    scroll-margin-top: 32px;
  }

  .section-lead {
    max-width: 760px;
    margin-bottom: 28px;
  }

  .section-lead h2 {
    margin: 10px 0 12px;
    max-width: 720px;
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 64px);
    line-height: 1;
    letter-spacing: 0;
  }

  .artifact-grid,
  .layer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .layer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .artifact-link {
    display: grid;
    min-height: 150px;
    align-content: space-between;
    padding: 20px;
    text-decoration: none;
  }

  .artifact-link span,
  .layer-tier,
  .layer-status {
    color: #5eead4;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .artifact-link strong {
    font-size: 1.2rem;
    line-height: 1.15;
  }

  .delivery-agent {
    display: grid;
    gap: 22px;
    padding: clamp(20px, 4vw, 34px);
    border-top: 4px solid rgba(94, 234, 212, 0.78);
  }

  .agent-delivery {
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(360px, 1.14fr);
    gap: clamp(18px, 4vw, 34px);
    align-items: stretch;
    padding: clamp(20px, 4vw, 34px);
    border-top: 4px solid rgba(167, 184, 255, 0.76);
  }

  .agent-delivery__copy {
    display: grid;
    gap: 14px;
    align-content: start;
  }

  .agent-delivery__copy h2 {
    margin: 8px 0 2px;
    font-family: var(--font-display);
    font-size: clamp(30px, 5vw, 58px);
    line-height: 1;
    letter-spacing: 0;
  }

  .agent-delivery__copy p {
    margin: 0;
    color: rgba(246, 247, 251, 0.72);
    font-size: 1.03rem;
    line-height: 1.55;
  }

  .agent-delivery__points {
    display: grid;
    gap: 10px;
    margin: 4px 0;
  }

  .agent-delivery__points p,
  .agent-delivery__guardrail {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 10px;
  }

  .agent-delivery__guardrail {
    color: rgba(246, 247, 251, 0.6) !important;
  }

  .agent-delivery__link {
    width: fit-content;
    border: 1px solid rgba(94, 234, 212, 0.36);
    background: rgba(94, 234, 212, 0.12);
    color: #ffffff;
    padding: 11px 14px;
    text-decoration: none;
  }

  .agent-delivery__link:hover {
    border-color: rgba(94, 234, 212, 0.72);
  }

  .agent-delivery__embed {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: clamp(560px, 58vw, 700px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.32);
  }

  .agent-delivery__embed-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.035);
    padding: 11px 14px;
  }

  .agent-delivery__embed-header span,
  .agent-delivery__embed-header a {
    color: rgba(246, 247, 251, 0.72);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-decoration: none;
  }

  .agent-delivery__embed-header a {
    color: #5eead4;
  }

  .agent-delivery__embed iframe {
    display: block;
    width: 100%;
    height: 100%;
    min-height: clamp(500px, 52vw, 640px);
    border: 0;
    background: #0b0b10;
  }

  .delivery-agent__intro {
    max-width: 820px;
  }

  .delivery-agent__intro h2 {
    margin: 10px 0 12px;
    font-family: var(--font-display);
    font-size: clamp(30px, 5vw, 58px);
    line-height: 1;
    letter-spacing: 0;
  }

  .delivery-agent__intro p {
    color: rgba(246, 247, 251, 0.72);
    font-size: 1.05rem;
    line-height: 1.55;
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
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(246, 247, 251, 0.88);
    padding: 10px 13px;
    font: inherit;
    cursor: pointer;
  }

  .suggested-prompts button:hover,
  .follow-up-list button:hover,
  .delivery-agent__form button:hover {
    border-color: rgba(94, 234, 212, 0.62);
    color: #ffffff;
  }

  .suggested-prompts button:disabled,
  .follow-up-list button:disabled,
  .delivery-agent__form button:disabled {
    cursor: not-allowed;
    opacity: 0.54;
  }

  .chat-log {
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
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .chat-message.message-client {
    justify-self: end;
    background: rgba(94, 234, 212, 0.11);
    border-color: rgba(94, 234, 212, 0.2);
  }

  .chat-message > span,
  .agent-meta strong,
  .follow-up-list strong,
  .delivery-agent__form label {
    color: #5eead4;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .chat-message p {
    margin: 0;
    color: rgba(246, 247, 251, 0.78);
    line-height: 1.55;
  }

  .agent-meta {
    display: grid;
    gap: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 10px;
  }

  .agent-meta span {
    color: rgba(246, 247, 251, 0.66);
  }

  .follow-up-list {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
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
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.28);
    color: #ffffff;
    padding: 13px 14px;
    font: inherit;
    line-height: 1.45;
  }

  .delivery-agent__form textarea:focus {
    outline: 2px solid rgba(94, 234, 212, 0.36);
    outline-offset: 2px;
  }

  .delivery-agent__form button {
    min-width: 116px;
    background: rgba(94, 234, 212, 0.14);
  }

  .delivery-agent__error {
    margin: 0;
    color: #fca5a5;
  }

  .layer-card {
    padding: 24px;
    border-top: 4px solid rgba(167, 184, 255, 0.76);
  }

  .layer-card h3,
  .evidence-panel h2 {
    margin: 14px 0 10px;
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
    border-top: 4px solid rgba(247, 200, 115, 0.8);
  }

  .evidence-list {
    display: grid;
    gap: 12px;
  }

  .evidence-list p {
    margin: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 12px;
  }

  @media (max-width: 980px) {
    .delivery-hero__inner,
    .agent-delivery,
    .review-path,
    .artifact-grid,
    .layer-grid,
    .evidence-layout,
    .delivery-agent__form div {
      grid-template-columns: 1fr;
    }

    .delivery-hero {
      min-height: auto;
    }

    .chat-message {
      max-width: 100%;
    }
  }

  @media (max-width: 640px) {
    .delivery-copy h1 {
      font-size: clamp(40px, 13vw, 54px);
    }

    .delivery-status p {
      display: grid;
      gap: 6px;
    }

    .delivery-status span {
      text-align: left;
    }

    .agent-delivery__embed,
    .agent-delivery__embed iframe {
      min-height: 620px;
    }
  }
</style>
