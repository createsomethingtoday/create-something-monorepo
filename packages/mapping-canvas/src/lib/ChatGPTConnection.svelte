<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { chatGPT, chatGPTError, chatGPTDisconnectNotice, activeChatGPTAccount, canUseChatGPTPlan, type ChatGPTStatus, type ChatGPTModel } from './native-chatgpt';
  let open = $state(false), status = $state<ChatGPTStatus>({ available: false, busy: false, accounts: [], pendingClientIds: [] });
  let working = $state(false), connecting = $state(false), disconnecting = $state(false), error = $state(''), notice = $state(''), safetyWarning = $state('');
  let models = $state<ChatGPTModel[]>([]), model = $state(''), input = $state(''), answer = $state('');
  let trigger: HTMLButtonElement | undefined = $state();
  let heading: HTMLHeadingElement | undefined = $state();
  let generation = 0, componentAlive = true;
  const cancelledConnects = new Set<number>();
  const account = $derived(activeChatGPTAccount(status));
  const planReady = $derived(canUseChatGPTPlan(status));
  const busy = $derived(working || status.busy);
  onMount(() => { let live = true; void chatGPT.status().then(value => { if (live) status = value; }).catch(() => { if (live) error = chatGPTError('UNAVAILABLE'); }); const timer = setInterval(() => { if (open && status.busy && !working && !connecting) { const id = generation; void chatGPT.status().then(value => { if (live && id === generation) apply(value); }).catch(() => {}); } }, 500); return () => { live = false; componentAlive = false; cancelledConnects.clear(); generation++; clearInterval(timer); }; });
  function apply(value: ChatGPTStatus) { const before = activeChatGPTAccount(status), after = activeChatGPTAccount(value); if (value.activeClientId !== status.activeClientId || before?.connected !== after?.connected || before?.planEnabled !== after?.planEnabled) { models = []; model = ''; answer = ''; } status = value; if (value.error) error = chatGPTError(value.error); }
  async function toggle() { if (open) return close(); open = true; await tick(); heading?.focus(); }
  async function close() { open = false; await tick(); trigger?.focus(); }
  async function failed(e: unknown, id: number) {
    if (!componentAlive) return;
    if (id !== generation) {
      if (cancelledConnects.has(id) && e === 'cancelled_revocation_unconfirmed') safetyWarning = 'Remote access cleanup was not confirmed after a cancelled sign-in. Review Draw access in ChatGPT Settings.';
      return;
    }
    error = chatGPTError(e);
    try { const value = await chatGPT.status(); if (id === generation) apply(value); } catch { /* Preserve the sanitized original error and typed request. */ }
  }
  async function connect(clientId: string | null = null) {
    if (busy) return; const id = ++generation; working = true; connecting = true; error = ''; notice = ''; models = []; model = ''; answer = '';
    try { const value = await chatGPT.connect(clientId); if (id === generation) { apply(value); notice = 'ChatGPT connection updated.'; } }
    catch (e) { await failed(e, id); }
    finally { cancelledConnects.delete(id); if (id === generation) { working = false; connecting = false; } }
  }
  async function cancel() {
    if (disconnecting || (!working && !connecting)) return;
    if (connecting) cancelledConnects.add(generation);
    const id = ++generation; working = true; connecting = false; error = ''; notice = 'Cancellation requested. You can keep drawing.';
    try { await chatGPT.cancel(); const value = await chatGPT.status(); if (id === generation) apply(value); } catch { if (id === generation) error = chatGPTError('cancelled'); }
    finally { if (id === generation) working = false; }
  }
  async function changeAccount(clientId: string) {
    if (busy) return; const id = ++generation; working = true; error = ''; notice = ''; models = []; model = ''; answer = '';
    try { const value = await chatGPT.select(clientId); if (id === generation) apply(value); }
    catch (e) { await failed(e, id); }
    finally { if (id === generation) working = false; }
  }
  async function disconnect() {
    if (!account || disconnecting) return;
    if (connecting) cancelledConnects.add(generation);
    connecting = false;
    const id = ++generation; const clientId = account.clientId; disconnecting = true; working = true; error = ''; notice = ''; models = []; model = ''; answer = '';
    try { await chatGPT.cancel(); const value = await chatGPT.disconnect(clientId); if (id === generation) { apply(value); notice = chatGPTDisconnectNotice(value.disconnectOutcome); } }
    catch (e) { await failed(e, id); }
    finally { if (id === generation) { working = false; disconnecting = false; } }
  }
  async function manageUsage() { try { await chatGPT.openUsage(); } catch { error = 'Could not open ChatGPT Settings. Open chatgpt.com/settings/usage in your browser.'; } }
  async function loadModels() {
    if (!planReady || busy) return; const id = ++generation; const clientId = status.activeClientId; working = true; error = ''; answer = ''; models = []; model = '';
    try { const value = await chatGPT.models(); if (id === generation && status.activeClientId === clientId) { models = value; model = value[0]?.slug || ''; if (!value.length) notice = 'No models are currently available for this account.'; } }
    catch (e) { await failed(e, id); }
    finally { if (id === generation) working = false; }
  }
  async function ask() {
    if (!planReady || busy || !model || !input.trim()) return; const id = ++generation; const clientId = status.activeClientId; working = true; error = ''; notice = ''; answer = '';
    try { const value = await chatGPT.respond(model, input); if (id === generation && status.activeClientId === clientId) answer = value; }
    catch (e) { await failed(e, id); }
    finally { if (id === generation) working = false; }
  }
</script>
<button bind:this={trigger} class="connection-toggle" onkeydown={(event) => event.stopPropagation()} aria-expanded={open} aria-controls="draw-chatgpt-panel" onclick={() => void toggle()}>ChatGPT{account?.connected ? ' · connected' : ''}</button>
{#if open}
  <div id="draw-chatgpt-panel" class="connection-panel" aria-label="ChatGPT connection" role="dialog" aria-modal="false" onkeydown={(event) => { event.stopPropagation(); if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); void close(); } }} oncopy={(event) => event.stopPropagation()} onpaste={(event) => event.stopPropagation()} tabindex="-1">
    <header><h2 bind:this={heading} tabindex="-1">ChatGPT connection</h2><button aria-label="Close ChatGPT connection" onclick={() => void close()}>×</button></header>
    <p>Optional AI for text you choose to send. Drawing works without an account.</p>
    <p class="hint">This connection does not grant canvas access, approve edits or connect other services.</p>
    {#if !status.available}<p>ChatGPT is unavailable in this app. Keep drawing offline.</p>{:else}
      {#if status.pendingClientIds?.length}<p>Sign-in was interrupted before it completed.</p>{#each status.pendingClientIds as pendingId, index (pendingId)}<button disabled={busy} onclick={() => void connect(pendingId)}>Retry incomplete connection{status.pendingClientIds.length > 1 ? ` ${index + 1}` : ''}</button>{/each}{/if}
      {#if status.accounts.length}<label>Saved ChatGPT account<select aria-label="Saved ChatGPT account" value={status.activeClientId || ''} disabled={busy} onchange={(event) => void changeAccount(event.currentTarget.value)}><option value="" disabled>Choose an account</option>{#each status.accounts as saved, index (saved.clientId)}<option value={saved.clientId}>{saved.email || saved.subject} · {saved.connected ? saved.planEnabled ? 'plan enabled' : 'identity only' : 'signed out'} · connection {index + 1}</option>{/each}</select></label>{/if}
      {#if connecting}<p role="status">Complete sign-in in your system browser.</p><button onclick={() => void cancel()}>Cancel sign-in</button>{:else}<button disabled={busy} onclick={() => void connect()}>{status.accounts.length || status.pendingClientIds?.length ? 'Add ChatGPT account' : 'Continue with ChatGPT'}</button>{/if}
      {#if !account}
        {#each status.accounts as saved, index (saved.clientId)}
          {#if !saved.connected}<button disabled={busy} onclick={() => void connect(saved.clientId)}>Continue with saved ChatGPT account · {saved.email || saved.subject} · connection {index + 1}</button>{/if}
        {/each}
      {/if}
      {#if account}
        {#if !account.connected}<button disabled={busy} onclick={() => void connect(account.clientId)}>Continue with saved ChatGPT account</button>{/if}
        <p>{account.connected ? 'Identity connected' : 'Signed out'} · ChatGPT plan usage {account.connected && account.planEnabled ? 'enabled' : 'not enabled'}</p>
        {#if account.connected && !account.planEnabled}<button disabled={busy} onclick={() => void connect(account.clientId)}>Enable ChatGPT plan usage</button>{/if}
        {#if account.connected}<button disabled={disconnecting} onclick={() => void disconnect()}>Disconnect ChatGPT</button>{/if}
      {/if}
      {#if working && !connecting && !disconnecting}<button onclick={() => void cancel()}>Cancel request</button>{/if}
      {#if status.busy && !working && !connecting}<p role="status">Finishing an earlier connection operation. Draw is checking its status.</p>{/if}
      <p class="hint">Eligible requests use this account’s ChatGPT plan or available credits. Manage limits in ChatGPT Settings → Usage. Draw never switches to paid API billing automatically.</p><button onclick={() => void manageUsage()}>Manage usage</button>
      {#if planReady}
        <button disabled={busy} onclick={() => void loadModels()}>Load available models</button>
        {#if models.length}<label>Model<select aria-label="ChatGPT model" bind:value={model} disabled={busy}>{#each models as entry}<option value={entry.slug}>{entry.displayName}</option>{/each}</select></label>{/if}
        <label>Text to send<textarea aria-label="Text to send to ChatGPT" bind:value={input} maxlength="8000" disabled={busy} rows="4" placeholder="Ask a question or paste text you want help with."></textarea></label>
        <p class="hint">Only this typed text is sent to OpenAI. Canvas content is not attached. Responses cannot edit your drawing.</p>
        <button disabled={busy || !model || !input.trim()} onclick={() => void ask()}>{working ? 'Working…' : 'Send text to ChatGPT'}</button>
      {/if}
    {/if}
    {#if safetyWarning}<p role="alert" class="error">{safetyWarning}</p>{/if}
    {#if error}<div role="alert" class="error"><p>{error}</p>{#if error === chatGPTError('usage_limit_reached')}<button class="primary" onclick={() => void manageUsage()}>Manage usage</button>{/if}</div>{/if}
    {#if notice}<p role="status" aria-live="polite">{notice}</p>{/if}
    {#if answer}<article aria-label="ChatGPT response"><h3>Response</h3><p class="answer">{answer}</p></article>{/if}
  </div>
{/if}
<style>
  .connection-toggle{white-space:nowrap}.connection-panel{--panel-top:min(var(--space-3xl),20dvh);position:fixed;box-sizing:border-box;right:var(--space-md);top:var(--panel-top);z-index:81;width:min(28rem,calc(100vw - var(--space-xl)));max-height:calc(100dvh - var(--panel-top) - var(--space-md));overflow:auto;background:var(--color-bg-elevated);color:var(--color-fg-primary);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-lg)}
  header{position:sticky;top:calc(-1 * var(--space-lg));background:var(--color-bg-elevated);padding-block:var(--space-sm);z-index:1;display:flex;justify-content:space-between;align-items:center;gap:var(--space-md)}h2{font-size:var(--text-h5);margin:0}h3{font-size:var(--text-body)}p{line-height:1.5;margin:var(--space-sm) 0}.hint{font-size:var(--text-caption);color:var(--color-fg-secondary)}label{display:grid;gap:var(--space-xs);margin:var(--space-sm) 0}select,textarea{min-width:0;width:100%;font:inherit;padding:var(--space-sm);background:var(--color-bg-surface);color:inherit;border:1px solid var(--color-border-default)}button{min-height:44px;margin:var(--space-xs);padding:var(--space-xs) var(--space-sm);color:inherit;background:var(--color-bg-surface);border:1px solid var(--color-border-default);border-radius:var(--radius-sm)}button:disabled{opacity:.45}.primary{border-color:#fcaa2d}.answer{white-space:pre-wrap;overflow-wrap:anywhere}.error{color:var(--color-error)}article{border-top:1px solid var(--color-border-default);margin-top:var(--space-md);padding-top:var(--space-md)}:focus-visible{outline:2px solid #fcaa2d;outline-offset:2px}
</style>
