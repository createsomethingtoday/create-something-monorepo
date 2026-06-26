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

  async function askJobAgent(prompt: string | undefined = undefined) {
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
