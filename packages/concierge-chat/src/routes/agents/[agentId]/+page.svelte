<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let composerText = '';
  let pending = false;

  $: selectedAgent = data.selectedAgent;
  $: messages = form?.messages ?? data.initialMessages;
  $: conversationId = form?.conversationId ?? '';
  $: proofEvents = form?.proofEvents ?? data.initialProofEvents;
  $: submitError = form?.submitError ?? '';
  $: transcript = JSON.stringify(messages);
  $: activeAgentHref = selectedAgent ? `/agents/${selectedAgent.id}` : '/agents';

  function usePrompt(prompt: string) {
    composerText = prompt;
  }
</script>

<svelte:head>
  <title>{selectedAgent ? `${selectedAgent.label} Operator Chat` : 'Operator Chat'}</title>
</svelte:head>

{#if !data.accessAllowed || !selectedAgent}
  <section class="access-shell glass panel">
    <div class="access-copy">
      <div class="eyebrow">Operator Access</div>
      <h1 class="section-title">Sign in through .agency to use Dify operator chat.</h1>
      <p class="muted">
        The chat proxy will not call Dify until staff access is active for this browser.
      </p>
    </div>
    <a class="link-button" href={data.controlPlaneHref} target="_blank" rel="noreferrer"
      >Staff sign-in</a
    >
  </section>
{:else}
  <section class="operator-chat-shell">
    <aside class="rail glass context-rail" aria-label="Agent context">
      <div class="rail-header">
        <a class="back-link" href="/agents">Agents</a>
        <div>
          <div class="eyebrow">Context Rail</div>
          <h1>{selectedAgent.label}</h1>
        </div>
        <span
          class={`status-pill ${selectedAgent.credentialState === 'available' ? 'good' : 'warn'}`}
        >
          {selectedAgent.credentialState === 'available' ? 'Key ready' : 'Needs key'}
        </span>
      </div>

      <div class="context-list">
        <div>
          <span>Client</span>
          <strong>{selectedAgent.client}</strong>
        </div>
        <div>
          <span>Lane</span>
          <strong>{selectedAgent.lane}</strong>
        </div>
        <div>
          <span>State</span>
          <strong>{selectedAgent.operatorStateLabel}</strong>
        </div>
        <div>
          <span>API binding</span>
          <strong>{selectedAgent.apiKeyEnv}</strong>
        </div>
      </div>

      <div class="operator-note">
        <strong>{selectedAgent.nextAction}</strong>
        <p>{selectedAgent.operatorStateDetail}</p>
      </div>

      <nav class="agent-switcher" aria-label="Switch Dify agent">
        {#each data.agents as agent}
          <a class:active={activeAgentHref === `/agents/${agent.id}`} href={`/agents/${agent.id}`}>
            <span>{agent.label}</span>
            <small>{agent.credentialState === 'available' ? 'ready' : 'key'}</small>
          </a>
        {/each}
      </nav>
    </aside>

    <section class="chat-panel glass" aria-label="Operator conversation">
      <header class="chat-header">
        <div>
          <div class="eyebrow">Chat Rail</div>
          <h2>{selectedAgent.lane}</h2>
        </div>
        <form method="POST" action="?/reset">
          <button class="secondary-button" type="submit">Reset</button>
        </form>
      </header>

      <div class="message-list" role="log" aria-live="polite">
        {#each messages as message}
          <article class={`message ${message.role} ${message.state ?? 'ready'}`}>
            <div class="message-meta">
              <span>{message.author}</span>
              <time datetime={message.createdAt}>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </div>
            <p>{message.body}</p>
          </article>
        {/each}
        {#if pending}
          <article class="message assistant pending">
            <div class="message-meta">
              <span>{selectedAgent.label}</span>
              <span>working</span>
            </div>
            <p>Calling Dify through the server proxy.</p>
          </article>
        {/if}
      </div>

      <div class="starter-strip" aria-label="Starter prompts">
        {#each selectedAgent.starterPrompts as prompt}
          <button type="button" class="prompt-button" onclick={() => usePrompt(prompt)}
            >{prompt}</button
          >
        {/each}
      </div>

      <form
        class="composer"
        method="POST"
        use:enhance={() => {
          pending = true;
          return async ({ update }) => {
            await update();
            pending = false;
            composerText = '';
          };
        }}
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="transcript" value={transcript} />
        <textarea
          name="message"
          bind:value={composerText}
          rows="4"
          maxlength="6000"
          placeholder={selectedAgent.credentialState === 'available'
            ? 'Ask for the next operator action.'
            : `Bind ${selectedAgent.apiKeyEnv} before calling this agent.`}
          disabled={pending || selectedAgent.credentialState !== 'available'}
        ></textarea>
        <div class="composer-actions">
          {#if submitError}
            <p class="composer-error">{submitError}</p>
          {/if}
          <button type="submit" disabled={pending || selectedAgent.credentialState !== 'available'}>
            {pending ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </section>

    <aside class="rail glass proof-rail" aria-label="Proof and actions">
      <div class="rail-header">
        <div>
          <div class="eyebrow">Proof Rail</div>
          <h2>Evidence and gates</h2>
        </div>
        <span
          class={`status-pill ${selectedAgent.operatorState === 'production_verified' ? 'good' : 'warn'}`}
        >
          {selectedAgent.operatorStateLabel}
        </span>
      </div>

      <div class="policy-box">
        <span>Boundary</span>
        <strong>{selectedAgent.policyBoundary}</strong>
      </div>

      <div class="proof-list">
        {#if proofEvents.length === 0}
          <div class="proof-item warn">
            <span>Run proof</span>
            <strong>No Dify turn in this session yet.</strong>
            <p>{selectedAgent.smokeCommand}</p>
          </div>
        {:else}
          {#each proofEvents as proof}
            <div class={`proof-item ${proof.tone}`}>
              <span>{proof.label}</span>
              <strong>{proof.value}</strong>
              <p>{proof.detail}</p>
            </div>
          {/each}
        {/if}
      </div>

      <div class="proof-item">
        <span>Eval</span>
        <strong>{selectedAgent.evalSuite}</strong>
        <p>Attach current eval evidence before production-ready claims.</p>
      </div>
    </aside>
  </section>
{/if}

<style>
  .access-shell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .access-copy {
    display: grid;
    gap: 0.75rem;
    max-width: 42rem;
  }

  .link-button,
  .secondary-button,
  .prompt-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .link-button {
    padding: 0.8rem 1.1rem;
    border-radius: 999px;
    background: var(--button-bg);
    color: var(--button-ink);
    font-weight: 700;
    box-shadow: 0 16px 34px rgba(49, 92, 255, 0.22);
    white-space: nowrap;
  }

  .operator-chat-shell {
    display: grid;
    grid-template-columns: minmax(240px, 0.72fr) minmax(420px, 1.35fr) minmax(260px, 0.78fr);
    gap: 1rem;
    align-items: start;
  }

  .rail,
  .chat-panel {
    padding: 1rem;
    min-width: 0;
  }

  .rail {
    display: grid;
    gap: 1rem;
    position: sticky;
    top: 7rem;
  }

  .rail-header,
  .chat-header {
    display: flex;
    justify-content: space-between;
    gap: 0.85rem;
    align-items: flex-start;
  }

  .rail-header h1,
  .rail-header h2,
  .chat-header h2 {
    margin: 0.7rem 0 0;
    font-size: 1.2rem;
    letter-spacing: 0;
  }

  .back-link {
    color: var(--muted-strong);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .context-list,
  .agent-switcher,
  .proof-list {
    display: grid;
    gap: 0.65rem;
  }

  .context-list div,
  .operator-note,
  .policy-box,
  .proof-item {
    display: grid;
    gap: 0.45rem;
    padding: 0.85rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-tight);
    background: rgba(7, 10, 16, 0.42);
  }

  .context-list span,
  .policy-box span,
  .proof-item span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .context-list strong,
  .policy-box strong,
  .proof-item strong {
    overflow-wrap: anywhere;
    line-height: 1.35;
  }

  .operator-note p,
  .proof-item p {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .agent-switcher a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-tight);
    text-decoration: none;
    color: var(--ink-soft);
    background: rgba(167, 184, 255, 0.05);
  }

  .agent-switcher a.active {
    border-color: var(--line-accent);
    background: rgba(167, 184, 255, 0.13);
  }

  .agent-switcher small {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .chat-panel {
    display: grid;
    gap: 1rem;
    min-height: 76vh;
  }

  .secondary-button,
  .prompt-button {
    border-radius: var(--radius-tight);
    background: var(--surface-overlay);
    color: var(--ink-soft);
    border-color: var(--line);
    box-shadow: none;
  }

  .secondary-button {
    padding: 0.55rem 0.75rem;
  }

  .message-list {
    display: grid;
    align-content: end;
    gap: 0.75rem;
    min-height: 40vh;
    max-height: 58vh;
    overflow: auto;
    padding-right: 0.2rem;
  }

  .message {
    display: grid;
    gap: 0.45rem;
    max-width: min(92%, 48rem);
    padding: 0.9rem 1rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(11, 15, 24, 0.82);
  }

  .message.user {
    justify-self: end;
    background: rgba(167, 184, 255, 0.1);
    border-color: rgba(167, 184, 255, 0.24);
  }

  .message.blocked {
    border-color: rgba(241, 197, 107, 0.24);
    background: rgba(241, 197, 107, 0.08);
  }

  .message.pending {
    border-color: rgba(241, 197, 107, 0.2);
  }

  .message-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .message p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .starter-strip {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .prompt-button {
    max-width: 100%;
    padding: 0.55rem 0.7rem;
    font-size: 0.84rem;
    text-align: left;
  }

  .composer {
    display: grid;
    gap: 0.75rem;
  }

  .composer textarea {
    width: 100%;
    min-height: 8rem;
    resize: vertical;
    border-radius: 14px;
    padding: 0.9rem 1rem;
    line-height: 1.5;
  }

  .composer-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .composer-error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }

  .proof-item.good {
    border-color: rgba(121, 217, 176, 0.2);
    background: rgba(121, 217, 176, 0.08);
  }

  .proof-item.warn {
    border-color: rgba(241, 197, 107, 0.22);
    background: rgba(241, 197, 107, 0.08);
  }

  .proof-item.danger {
    border-color: rgba(255, 150, 144, 0.24);
    background: rgba(255, 150, 144, 0.08);
  }

  @media (max-width: 1180px) {
    .operator-chat-shell {
      grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
    }

    .proof-rail {
      grid-column: 1 / -1;
      position: static;
    }
  }

  @media (max-width: 780px) {
    .access-shell,
    .operator-chat-shell,
    .rail-header,
    .chat-header,
    .composer-actions {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }

    .rail {
      position: static;
    }

    .message {
      max-width: 100%;
    }
  }
</style>
