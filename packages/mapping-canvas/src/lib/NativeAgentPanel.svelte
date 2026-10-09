<script lang="ts">
  import { onMount } from 'svelte';
  import { invokeNative } from './native-pairing';
  import type { CanvasOperation } from './paired-session';
  let {selectedIds, revision, busy, action}: {selectedIds:string[];revision:number;busy:boolean;action:(command:string,args:Record<string,unknown>)=>Promise<Record<string,unknown>>} = $props();
  type Proposal = {operationId:string;expectedRevision:number;operations:CanvasOperation[]};
  type Access = {active:boolean;exists?:boolean;expiresAt?:string;editIds?:string[];socketPath?:string;pending?:Proposal[]};
  let open=$state(false), access=$state<Access>({active:false}), allowProposals=$state(false), working=$state(false), error=$state(''), secret=$state('');
  async function refresh(){try{access=await invokeNative<Access>('draw_agent_status');if(!access.active)secret='';}catch(e){error=String(e);}}
  onMount(()=>{void refresh();const timer=setInterval(()=>{if(open&&!working)void refresh();},1000);return()=>clearInterval(timer);});
  async function run(command:string,args:Record<string,unknown>={}){
    working=true;error='';
    try{const result=await action(command,args);if(typeof result.token==='string')secret=result.token;if(typeof result.error==='string')error=result.error;if(command==='draw_agent_revoke')secret='';await refresh();}
    catch(e){error=e instanceof Error?e.message:String(e);}finally{working=false;}
  }
</script>
<button class="agent-toggle" aria-expanded={open} onclick={()=>{open=!open;if(open)void refresh();}}>Local agent{access.active?' · active':''}</button>
{#if open}
  <section class="agent-panel" aria-label="Local agent access">
    <header><h2>Local agent access</h2><button aria-label="Close local agent panel" onclick={()=>open=false}>×</button></header>
    <p>Access lasts 10 minutes in this app process. The agent can read this Canvas. Every proposed edit needs your approval here.</p>
    {#if access.exists}
      <p role="status">{access.active?'Session active':'Session expired or document replaced'} · {access.editIds?.length || 0} {access.editIds?.length===1?'layer':'layers'} available for proposals</p>
      <small>Expires {access.expiresAt ? new Date(access.expiresAt).toLocaleTimeString() : 'soon'}. Closing this panel does not revoke access.</small>
      <details class="connection"><summary>Connection details</summary>
      {#if secret}<label>Session token<input aria-label="Local agent session token" readonly type="password" value={secret} /></label><button onclick={()=>void navigator.clipboard.writeText(secret)}>Copy session token</button>{/if}
      {#if access.socketPath}<label>Local socket<input aria-label="Local agent socket path" readonly value={access.socketPath} /></label>{/if}
      <p class="hint">Use the source-run native MCP companion with this socket and the token in DRAW_AGENT_TOKEN. No provider is registered automatically.</p>
      </details>
      <button disabled={working} onclick={()=>void run('draw_agent_revoke')}>Revoke local access</button>
    {:else}
      <label class="scope"><input type="checkbox" bind:checked={allowProposals} disabled={!selectedIds.length || busy} />Allow proposals for {selectedIds.length} selected layers</label>
      <p class="hint">Groups, locks, and visibility changes require native-owner editing. Unselected layers cannot be edited.</p>
      <button disabled={busy || working || (allowProposals && !selectedIds.length)} onclick={()=>void run('draw_agent_start',{ids:allowProposals?[...selectedIds]:[]})}>Start {allowProposals?'reviewed proposal':'read-only'} session</button>
    {/if}
    {#each access.pending || [] as proposal (proposal.operationId)}
      <article aria-label="Agent proposal">
        <strong>{proposal.operations.length} proposed {proposal.operations.length===1?'operation':'operations'}</strong>
        <p>Base revision {proposal.expectedRevision} · current {revision}</p>
        <details><summary>Review exact operations</summary><pre>{JSON.stringify(proposal.operations,null,2)}</pre></details>
        {#if proposal.expectedRevision!==revision}<p class="error">Canvas changed. Reject this proposal and ask for a fresh one.</p>{/if}
        <button disabled={busy || working || !access.active || proposal.expectedRevision!==revision} onclick={()=>void run('draw_agent_review',{operationId:proposal.operationId,approve:true})}>Approve proposal</button>
        <button disabled={working} onclick={()=>void run('draw_agent_review',{operationId:proposal.operationId,approve:false})}>Reject proposal</button>
      </article>
    {/each}
    {#if error}<p role="alert" class="error">{error}</p>{/if}
  </section>
{/if}
<style>
  .agent-toggle{white-space:nowrap}
  .agent-panel{position:fixed;right:var(--space-md);top:var(--space-3xl);z-index:80;width:min(28rem,calc(100vw - var(--space-xl)));max-height:80vh;overflow:auto;background:var(--color-bg-elevated);color:var(--color-fg-primary);border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-lg)}
  header{position:sticky;top:calc(-1 * var(--space-lg));padding-block:var(--space-sm);background:var(--color-bg-elevated);z-index:1;display:flex;justify-content:space-between;align-items:center;gap:var(--space-md)}h2{font-size:var(--text-h5);margin:0}p{line-height:1.5;margin:var(--space-sm) 0}.hint,small{font-size:var(--text-caption);color:var(--color-fg-secondary)}label{display:flex;flex-direction:column;gap:var(--space-xs);margin:var(--space-sm) 0}.scope{flex-direction:row;align-items:center}input{min-width:0;width:100%;padding:var(--space-xs);background:var(--color-bg-surface);color:inherit;border:1px solid var(--color-border-default)}input[type=checkbox]{width:auto}button{margin:var(--space-xs);padding:var(--space-xs) var(--space-sm);color:inherit;background:var(--color-bg-surface);border:1px solid var(--color-border-default);border-radius:var(--radius-sm)}button:disabled{opacity:.45}article{border-top:1px solid var(--color-border-default);margin-top:var(--space-md);padding-top:var(--space-md)}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:var(--text-caption);max-height:16rem;overflow:auto}.error{color:var(--color-error)}
</style>
