import { escapeHtml as safe } from './reference-layout.mjs';
import { boundedStatusRead } from './optional-status.mjs';

export const ASSISTANT_FIRST_PROMPT = 'Read my GiGi workspace with gigi_workspace_get. Tell me its name and ID, then use a bounded read to tell me what is ready to review. Do not change any records.';
const loginStates = new Set(['starting','pending','verifying','completed','cancelling','cancelled','failed','unknown','expired']);
const activeLogin = value => ['starting','pending','verifying','cancelling'].includes(value?.state);
const identifier = value => typeof value === 'string' && value.trim() && value.length <= 128 && !/[\u0000-\u001f]/.test(value);
const loginErrors = {
  login_not_found: 'This sign-in attempt is unavailable. Check Codex status before starting again.',
  login_in_progress: 'A sign-in attempt is already active. Check sign-in status before starting another.',
  login_unavailable: 'The sign-in page is unavailable. Check sign-in status or use the Codex setup guide.',
  browser_unavailable: 'GiGi could not open your browser. Open the same sign-in page again; do not start another attempt.',
};

/** Explicit assistant setup actions. A status read never starts auth or inference. */
export class AssistantSetup {
  constructor(bridge, workspaceId, changed = () => {}) {
    if (!identifier(workspaceId)) throw new Error('Select a private workspace first.');
    this.bridge=bridge;this.workspaceId=workspaceId;this.changed=changed;
    this.status=null;this.busy=false;this.operation='';this.error='';this.login=null;this.external=null;this.provider='codex';
    this.epoch=0;this.disposed=false;this.pollTimer=null;this.loginDeadline=0;this.pollingPaused=false;
  }
  get workspaceVerified() {
    const s=this.status;
    return s?.provider==='codex' && s.available===true && s.authenticated===true && s.toolsAvailable===true && s.workspaceVerified===true && s.workspace?.id===this.workspaceId && typeof s.workspace.name==='string' && !!s.workspace.name.trim() && s.workspace.name.length<=512 && !/[\u0000-\u001f]/.test(s.workspace.name) && Number.isFinite(s.checkedAt) && s.checkedAt>0 && s.checkedAt<=Date.now()+10_000;
  }
  clearPoll() { clearTimeout(this.pollTimer);this.pollTimer=null; }
  setWorkspace(workspaceId) {
    if (!identifier(workspaceId)) throw new Error('Select a private workspace first.');
    if(workspaceId===this.workspaceId)return;
    this.epoch++;this.clearPoll();this.workspaceId=workspaceId;this.status=null;this.login=null;this.external=null;this.error='';this.busy=false;this.operation='';this.changed();
  }
  dispose() { this.disposed=true;this.epoch++;this.clearPoll(); }
  async perform(operation, task, fallback) {
    if(this.disposed||this.busy)return;
    const epoch=++this.epoch,workspaceId=this.workspaceId;
    const current=()=>!this.disposed&&this.epoch===epoch&&this.workspaceId===workspaceId;
    this.busy=true;this.operation=operation;this.error='';this.pollingPaused=false;this.changed();
    try { await task(current,workspaceId); }
    catch(error) { if(current()){const code=typeof error==='string'?error:error?.message;this.error=Object.hasOwn(loginErrors,code)?loginErrors[code]:fallback;this.pollingPaused=true;} }
    finally { if(current()){this.busy=false;this.operation='';this.changed();this.schedulePoll();} }
  }
  async refresh() {
    if(this.busy||this.disposed)return;
    this.status=null;
    return this.perform('refresh',async(current,workspaceId)=>{
      const started=Date.now();const value=await boundedStatusRead(()=>this.bridge.chatStatus(workspaceId));
      if(current())this.status=Number.isFinite(value?.checkedAt)&&value.checkedAt>=started-5000?value:null;
      if(current()&&value?.available&&typeof this.bridge.call==='function'&&!this.login){
        // Resume only a job already owned by this workspace; this never begins sign-in.
        try {const job=await boundedStatusRead(()=>this.bridge.call('agent.chat.login.read',{workspaceId}));if(current()&&job?.state!=='idle'&&identifier(job?.loginId)&&loginStates.has(job?.state)){this.acceptLogin(job);this.loginDeadline=Math.min(job.expiresAt||Date.now()+600_000,Date.now()+600_000);}} catch { /* Optional sign-in readback must not erase checked workspace access. */ }
      }
    },'GiGi could not check Codex on this Mac. Check again or use the setup guide.');
  }
  acceptLogin(value, expectedId) {
    if(!value||!identifier(value.loginId)||!loginStates.has(value.state)||(expectedId&&value.loginId!==expectedId))throw Error('login_unavailable');
    // Never retain an authorization URL in UI state.
    this.login={loginId:value.loginId,state:value.state,...(typeof value.authenticated==='boolean'?{authenticated:value.authenticated}:{}),...(typeof value.reason==='string'?{reason:value.reason}:{}),...(Number.isFinite(value.expiresAt)?{expiresAt:value.expiresAt}:{})};
  }
  async startLogin() {
    if(this.login&&['starting','pending','verifying','cancelling','unknown'].includes(this.login.state))return this.readLogin();
    this.clearPoll();this.status=null;
    return this.perform('login',async(current,workspaceId)=>{
      const value=await this.bridge.call('agent.chat.login.start',{workspaceId});
      if(!current())return;this.acceptLogin(value);this.loginDeadline=Math.min(value.expiresAt||Date.now()+600_000,Date.now()+600_000);
      if(value.state==='pending')await this.bridge.call('agent.chat.login.open',{workspaceId,loginId:value.loginId});
    },'Sign-in could not be confirmed. Check sign-in status before starting another attempt.');
  }
  async openLogin() {
    if(!this.login)return;
    return this.perform('open-login',async(_current,workspaceId)=>{await this.bridge.call('agent.chat.login.open',{workspaceId,loginId:this.login.loginId});},'GiGi could not open the sign-in page. Check sign-in status before starting again.');
  }
  async readLogin() {
    if(!this.login)return;
    this.clearPoll();
    return this.perform('read-login',async(current,workspaceId)=>{
      const expectedId=this.login.loginId;const value=await boundedStatusRead(()=>this.bridge.call('agent.chat.login.read',{workspaceId,loginId:expectedId}));
      if(!current())return;this.acceptLogin(value,expectedId);
      if(value.state==='completed'&&value.authenticated===true){const status=await boundedStatusRead(()=>this.bridge.chatStatus(workspaceId));if(current())this.status=status;}
    },'Check sign-in status before starting another attempt. GiGi could not confirm the result.');
  }
  async cancelLogin() {
    if(!this.login)return;this.clearPoll();
    return this.perform('cancel-login',async(current,workspaceId)=>{
      const expectedId=this.login.loginId;const value=await this.bridge.call('agent.chat.login.cancel',{workspaceId,loginId:expectedId});
      if(current())this.acceptLogin(value,expectedId);
    },'Check sign-in status before starting another attempt. Cancellation could not be confirmed.');
  }
  schedulePoll() {
    this.clearPoll();
    if(this.disposed||this.busy||this.pollingPaused||!activeLogin(this.login))return;
    if(this.loginDeadline&&Date.now()>this.loginDeadline+5000){this.error='Sign-in reached its time limit. Check sign-in status before starting again.';this.changed();return;}
    this.pollTimer=setTimeout(()=>{this.pollTimer=null;void this.readLogin();},1500);this.pollTimer.unref?.();
  }
  async prepareExternal(provider='codex') {
    if(!['codex','claude'].includes(provider))return;
    this.provider=provider;
    return this.perform('prepare',async(current)=>{const value=await this.bridge.prepareAgent();if(current())this.external=value;},'GiGi could not prepare the connector. Your existing assistant configuration is unchanged.');
  }
}

export function assistantSetupView(c) {
  const ready=c.workspaceVerified,s=c.status,job=c.login,busy=c.busy;
  const waiting=job&&['starting','pending','verifying','cancelling','unknown'].includes(job.state);
  const toolsMissing=s?.reason==='gigi_tools_unavailable';
  const label=ready?'Workspace access checked':busy?'Checking assistant':!s?'Not checked':toolsMissing?'Workspace tools unavailable':!s.available?'Codex unavailable':!s.authenticated?'Sign in needed':!s.toolsAvailable?'Workspace tools unavailable':'Workspace access unverified';
  const button=(action,text,disabled=false)=>`<button type="button" class="btn" data-assistant-action="${action}"${disabled?' disabled':''}>${text}</button>`;
  const next=ready?`Codex can read ${safe(s.workspace.name)}. Try a first read-only answer when you are ready.`:toolsMissing?'Codex is signed in, but GiGi’s workspace tools are unavailable. Check again or ask the GiGi operator to check this app.':s&&!s.available?'Install the Codex CLI on this Mac, then check again. Your local records stay available.':s&&!s.authenticated?'Sign in with your ChatGPT account using Codex’s browser sign-in.':s?.authenticated?'GiGi could not verify this workspace. Check again before asking about its records.':'Check Codex and this workspace before your first conversation.';
  const loginText={pending:'Finish Codex sign-in in your browser, then return here.',starting:'Starting Codex sign-in…',verifying:'Checking the signed-in Codex account…',cancelling:'Waiting for Codex to confirm cancellation.',cancelled:'Sign-in request stopped. Cancelling does not sign out an existing Codex account.',completed:'Codex sign-in completed. Workspace access is checked separately.',failed:'Sign-in did not finish. Check Codex status before trying again.',unknown:'The sign-in outcome is uncertain. Check sign-in status before starting another attempt.',expired:'This sign-in attempt expired. Check Codex status before trying again.'};
  const command=c.provider==='claude'?c.external?.claudeCommand:c.external?.codexCommand;
  return `<section class="panel assistant-setup" aria-labelledby="assistant-setup-title"><div class="panel-head"><h2 id="assistant-setup-title">Connect your assistant</h2><span class="tag ${ready?'':'off'}">${safe(label)}</span></div><p>${next}</p><p class="muted">Ask GiGi uses installed Codex and your ChatGPT subscription. This check makes no model request and changes no records.</p><div class="inline-actions">${button('refresh','Check workspace access',busy)}${ready?button('ask','Try Ask GiGi',busy):s?.available&&!s?.authenticated&&!waiting?button('login','Sign in to Codex',busy):''}<button type="button" class="btn text" data-help="codex-setup">Codex setup guide ↗</button></div><div aria-live="polite" aria-atomic="true">${c.error?`<p role="alert">${safe(c.error)}</p>`:''}${job?`<p role="status">${safe(loginText[job.state]||'Check sign-in status.')}</p>`:''}${waiting?`<div class="inline-actions">${job.state==='pending'?button('open-login','Open sign-in page again',busy):''}${button('read-login','Check sign-in status',busy)}${button('cancel-login','Cancel sign-in request',busy)}</div>`:''}${ready?`<p class="muted">Checked ${safe(new Date(s.checkedAt).toLocaleString())}. This verifies workspace tool access. Your first assistant answer and phone connection are separate checks.</p>`:''}</div><details><summary>Use an external Codex or Claude Code session</summary><p>Prepare GiGi’s connector, run its exact command in your chosen agent, then verify a real workspace tool call. Preparation does not install or connect the agent.</p><div class="inline-actions">${button('prepare-codex','Prepare for Codex',busy)}${button('prepare-claude','Prepare for Claude Code',busy)}</div>${c.external?`<p role="status">Prepared · Not verified</p>${command?`<pre class="config">${safe(command)}</pre>${button('copy-command','Copy setup command',busy)}`:''}${c.external.starterPrompt?`<pre class="config prompt">${safe(c.external.starterPrompt)}</pre>${button('copy-prompt','Copy verification prompt',busy)}`:''}`:''}</details></section>`;
}
