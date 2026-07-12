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
  <section class="access-shell performance-paper">
    <div class="access-copy">
      <div class="eyebrow">Staff access</div>
      <h1 class="section-title">Sign in with CREATE SOMETHING to use Dify operator chat.</h1>
      <p class="muted">
        The chat proxy will not call Dify until a verified staff session is active for this browser.
        {data.accessDetail}
      </p>
    </div>
    <a class="link-button" href={data.signInUrl}>Staff sign-in</a>
  </section>
{:else}
  <section class="operator-chat-shell">
    <aside class="rail performance-paper context-rail" aria-label="Agent context">
      <div class="rail-header">
        <a class="back-link" href="/agents">Agents</a>
        <div>
          <div class="eyebrow">Context Rail</div>
          <h1>{selectedAgent.label}</h1>
        </div>
        <span
          class={`status-pill ${selectedAgent.credentialState === 'available' ? 'ready' : 'review'}`}
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

    <section class="chat-panel performance-paper" aria-label="Operator conversation">
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

    <aside class="rail performance-paper proof-rail" aria-label="Proof and actions">
      <div class="rail-header">
        <div>
          <div class="eyebrow">Proof Rail</div>
          <h2>Evidence and gates</h2>
        </div>
        <span
          class={`status-pill ${selectedAgent.operatorState === 'production_verified' ? 'ready' : 'review'}`}
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
          <div class="proof-item review">
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
    width: min(var(--content-width-performance), calc(100% - 2.5rem));
    margin: 2rem auto 0;
    padding: 1.1rem;
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

  .operator-chat-shell {
    display: grid;
    grid-template-columns: minmax(270px, 0.78fr) minmax(420px, 1.35fr) minmax(280px, 0.82fr);
    gap: 0.8rem;
    align-items: start;
    width: min(92rem, calc(100% - 2.5rem));
    margin-inline: auto;
    padding-block: 1rem 3rem;
  }

  .rail,
  .chat-panel {
    min-width: 0;
  }

  .rail {
    display: grid;
    gap: 1rem;
    position: sticky;
    top: 5.9rem;
    padding: 0.95rem;
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
    font-weight: 400;
    line-height: 1.16;
  }

  .back-link {
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0;
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
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-sm);
    background: var(--color-performance-panel);
  }

  .context-list span,
  .policy-box span,
  .proof-item span {
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .context-list strong,
  .policy-box strong,
  .proof-item strong {
    overflow-wrap: anywhere;
    line-height: 1.35;
  }

  .context-list div:nth-child(4) strong {
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 400;
    line-height: 1.34;
  }

  .operator-note p,
  .proof-item p {
    margin: 0;
    color: var(--color-performance-muted);
    font-size: 0.9rem;
  }

  .agent-switcher a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-sm);
    text-decoration: none;
    color: var(--color-performance-ink);
    background: var(--color-performance-panel);
  }

  .agent-switcher a:hover,
  .agent-switcher a.active {
    border-color: var(--color-performance-line-strong);
    background: var(--color-performance-paper);
    opacity: 1;
  }

  .agent-switcher small {
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .chat-panel {
    display: grid;
    gap: 1rem;
    min-height: 76vh;
    padding: 0;
  }

  .chat-panel::before,
  .rail::before {
    content: '';
    display: block;
    height: 0.24rem;
    margin: -0.95rem -0.95rem 0.1rem;
    background: linear-gradient(
      90deg,
      var(--color-performance-ready-soft),
      var(--color-performance-signal-soft),
      var(--color-performance-stop-soft)
    );
  }

  .chat-panel::before {
    margin: 0;
  }

  .chat-header,
  .message-list,
  .starter-strip,
  .composer {
    padding-inline: 1rem;
  }

  .chat-header {
    padding-top: 1rem;
  }

  .composer {
    padding-bottom: 1rem;
  }

  .secondary-button,
  .prompt-button {
    border-radius: var(--radius-performance-sm);
    background: var(--color-performance-panel);
    color: var(--color-performance-ink);
    border-color: var(--color-performance-line);
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
    padding-right: 1rem;
  }

  .message {
    display: grid;
    gap: 0.45rem;
    max-width: min(92%, 48rem);
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-performance-line);
    border-radius: 6px;
    background: var(--color-performance-panel);
  }

  .message.user {
    justify-self: end;
    background: color-mix(in srgb, var(--color-performance-signal-soft) 22%, white);
    border-color: color-mix(
      in srgb,
      var(--color-performance-signal-soft) 65%,
      var(--color-performance-line)
    );
  }

  .message.blocked {
    border-color: color-mix(
      in srgb,
      var(--color-performance-signal-soft) 65%,
      var(--color-performance-line)
    );
    background: color-mix(in srgb, var(--color-performance-signal-soft) 20%, white);
  }

  .message.pending {
    border-color: color-mix(
      in srgb,
      var(--color-performance-stop-soft) 70%,
      var(--color-performance-line)
    );
    background: color-mix(in srgb, var(--color-performance-stop-soft) 18%, white);
  }

  .message-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0;
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
    color: var(--color-performance-muted);
  }

  .composer {
    display: grid;
    gap: 0.75rem;
  }

  .composer textarea {
    width: 100%;
    min-height: 8rem;
    resize: vertical;
    border-radius: var(--radius-performance-sm);
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
    color: var(--color-performance-stop);
    font-size: 0.9rem;
  }

  .proof-item.ready {
    border-color: color-mix(
      in srgb,
      var(--color-performance-ready) 18%,
      var(--color-performance-line)
    );
    background: color-mix(in srgb, var(--color-performance-ready-soft) 42%, white);
  }

  .proof-item.review {
    border-color: color-mix(
      in srgb,
      var(--color-performance-review) 42%,
      var(--color-performance-line)
    );
    background: color-mix(in srgb, var(--color-performance-review-soft) 55%, white);
  }

  .proof-item.stop {
    border-color: color-mix(
      in srgb,
      var(--color-performance-stop) 22%,
      var(--color-performance-line)
    );
    background: color-mix(in srgb, var(--color-performance-stop-soft) 25%, white);
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

    .access-shell,
    .operator-chat-shell {
      width: min(100% - 1.5rem, 92rem);
    }

    .message {
      max-width: 100%;
    }
  }
</style>
