<script lang="ts">
  import type { DrawWebMcpTool } from './webmcp';
  let { projectId, ready, tools, mode = 'canvas' }: { projectId: string; ready: boolean; tools: DrawWebMcpTool[]; mode?: 'canvas' | 'motion' } = $props();
  type Connection = { sessionId: string; browserToken: string; expires: number; pairingCode?: string };
  let connection = $state<Connection | null>(null);
  let open = $state(false), busy = $state(false), connected = $state(false);
  let name = $state(''), message = $state(''), running = $state('');
  let reconnect = $state(0);
  const catalog = () => tools.map(({ execute: _execute, ...definition }) => definition);
  const storageKey = (id: string) => `draw-agent-connection:${id}`;
  async function request(input: Record<string, unknown>, current = connection) {
    const response = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(current ? { Authorization: `Bearer ${current.browserToken}` } : {}) }, signal: AbortSignal.timeout(12_000), body: JSON.stringify({ ...input, ...(current ? { sessionId: current.sessionId } : {}) }) });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || 'Connection unavailable.'), { status: response.status });
    return result;
  }
  function remember(value: Connection | null, id = projectId) {
    try { if (value) sessionStorage.setItem(storageKey(id), JSON.stringify(value)); else sessionStorage.removeItem(storageKey(id)); } catch { /* Current-page connection still works without persistence. */ }
  }
  async function connect() {
    busy = true; message = '';
    try {
      const created = await request({ action: 'create', projectId, mode, tools: catalog() }, null) as Connection;
      connection = created; remember(created); reconnect += 1;
    } catch (error) { message = error instanceof Error ? error.message : 'Could not connect.'; }
    finally { busy = false; }
  }
  async function disconnect() {
    busy = true;
    try { await request({ action: 'revoke' }); remember(null); connection = null; connected = false; name = ''; message = 'Disconnected. Agent access has been revoked.'; }
    catch (error) { message = error instanceof Error ? error.message : 'Could not revoke connection. Retry.'; }
    finally { busy = false; }
  }
  $effect(() => {
    const id = projectId;
    if (!ready || !tools.length) return;
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey(id)) || 'null') as Connection | null;
      connection = value && value.expires > Date.now() ? value : null;
    } catch { connection = null; }
    connected = false; name = '';
  });
  $effect(() => {
    const current = connection, id = projectId, currentMode = mode, availableTools = tools;
    reconnect;
    if (!ready || !current || !availableTools.length) return;
    let stopped = false, timer: ReturnType<typeof setTimeout> | undefined;
    let sendCatalog = true;
    const poll = async () => {
      try {
        const result = await request({ action: 'poll', projectId: id, mode: currentMode, ...(sendCatalog ? { tools: availableTools.map(({ execute: _execute, ...definition }) => definition) } : {}) }, current);
        if (stopped) return;
        sendCatalog = false; connected = true; name = result.agentName || ''; message = '';
        if (name && current.pairingCode) { delete current.pairingCode; remember(current, id); }
        if (result.command) {
          const command = result.command;
          const tool = availableTools.find(item => item.name === command.tool);
          let output: unknown; let failed = false;
          running = tool?.title || command.tool;
          try {
            if (!tool || projectId !== id || command.deadline <= Date.now()) throw new Error('Command target is no longer available.');
            output = await tool.execute(command.arguments);
          } catch (error) { failed = true; output = { error: error instanceof Error ? error.message : 'Tool execution failed.' }; }
          // A failed acknowledgement is never permission to execute again.
          if (new TextEncoder().encode(JSON.stringify(output ?? null)).byteLength > 500_000) { failed = true; output = { error: 'Tool completed but its result exceeds the connection limit. Inspect a smaller selection before retrying any mutation.' }; }
          await request({ action: 'result', commandId: command.id, result: output, failed }, current);
          running = '';
        }
      } catch (error) {
        if (stopped) return;
        connected = false; running = ''; message = error instanceof Error ? error.message : 'Reconnecting…';
        if ((error as { status?: number }).status === 403) { remember(null, id); connection = null; return; }
      }
      if (!stopped) timer = setTimeout(poll, name ? 1500 : 3000);
    };
    void poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  });
</script>

<div class="agent-connection">
  <button class="connection-toggle" aria-expanded={open} onclick={() => open = !open}>
    <span class:online={connected && !!name} class="dot"></span>{connection ? name ? connected ? 'Agent connected' : 'Reconnecting' : 'Pairing agent' : 'Connect agent'}
  </button>
  {#if open}
    <section aria-label="Agent connection" class="connection-panel">
      <strong>{name ? `Connected to ${name}` : 'Work with an agent'}</strong>
      <p>Give an agent access to this project’s open Canvas or Motion space. You can disconnect at any time.</p>
      {#if connection}
        {#if connection.pairingCode && !name}
          <label for="draw-pairing-code">Pairing code</label>
          <input id="draw-pairing-code" readonly value={connection.pairingCode} onfocus={(event) => event.currentTarget.select()} />
          <p>Ask your Draw agent to connect with this code. It can be used once within 10 minutes.</p>
        {:else}
          <p>{connected ? 'Connection ready' : 'Reconnecting…'} · {mode === 'canvas' ? 'Canvas' : 'Motion'}</p>
          <p class="detail">Agent name is self-reported. Access expires {new Date(connection.expires).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</p>
        {/if}
        {#if running}<p role="status">{running}…</p>{/if}
        <button disabled={busy} onclick={disconnect}>Disconnect agent</button>
      {:else}
        <p class="detail">Tool requests and results pass through Draw’s service. Command receipts expire after 10 minutes. Your project stays on this device. Pairing lasts up to 24 hours in this tab.</p>
        <button disabled={busy || !ready} onclick={connect}>{busy ? 'Connecting…' : 'Create connection'}</button>
      {/if}
      {#if message}<p role="status">{message}</p>{/if}
    </section>
  {/if}
</div>

<style>
  .agent-connection{position:relative;font-size:12px}.connection-toggle{display:flex;align-items:center;gap:7px;white-space:nowrap}.dot{width:6px;height:6px;border-radius:50%;background:#777}.dot.online{background:#9fbd99}.connection-panel{position:absolute;z-index:70;right:0;top:calc(100% + 10px);width:min(340px,calc(100vw - 32px));padding:18px;border:1px solid #444;border-radius:10px;background:#171717;color:#eee;box-shadow:0 12px 40px #0008;box-sizing:border-box}.connection-panel strong{font-size:14px}.connection-panel p{line-height:1.5;margin:10px 0}.connection-panel .detail{color:#aaa;font-size:11px}.connection-panel label{display:block;margin-bottom:5px}.connection-panel input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #555;border-radius:4px;background:#090909;color:#eee;font:11px monospace}.connection-panel button{margin-top:6px;padding:7px 10px;border:1px solid #555;border-radius:5px;background:#252525;color:#eee;cursor:pointer}.connection-panel button:disabled{opacity:.5}
</style>
