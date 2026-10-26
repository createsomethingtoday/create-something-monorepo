const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEXT_BYTE_LIMIT = 65536;
const MESSAGE_TOO_LARGE = 'Message exceeds 64 KiB of UTF-8 text. Shorten it before sending.';
export function messageBudget(text) {
  const bytes = new TextEncoder().encode(text).length;
  return { bytes, overLimit: bytes > TEXT_BYTE_LIMIT, help: bytes > TEXT_BYTE_LIMIT ? MESSAGE_TOO_LARGE : 'Message limit: 64 KiB of UTF-8 text.' };
}
export function updateAiDraft(c, value, root) {
  c.draft=value;
  const budget=messageBudget(value), send=root.querySelector('[data-ai-action="ask"]'), help=root.querySelector('#ai-message-budget'), input=root.querySelector('#ai-message');
  if(send)send.disabled=!!c.busy||!!c.status?.busy||!value.trim()||!c.model||budget.overLimit;
  if(help)help.textContent=budget.help;
  input?.setAttribute?.('aria-invalid',String(budget.overLimit));
  if(!budget.overLimit&&c.error===MESSAGE_TOO_LARGE){c.error='';const error=root.querySelector('#ai-connection-error');if(error){error.textContent='';error.hidden=true;}}
}
const errors = {
  account_changed:'The selected account changed. Check the current account and load its models before sending again. Your draft is preserved.',
  sign_in_required:'Connect or reconnect your ChatGPT account.', provider_admission_required:'This build is not admitted for this connection.', sign_in_timed_out:'Sign-in timed out. Your draft is preserved.', cancelled_revocation_unconfirmed:'Cancelled; removal of remote access is unconfirmed. Review access in ChatGPT settings.', refresh_models_required:'Load the model catalog again before sending.',
  cancelled:'Request cancelled.', connection_busy:'A connection request is still finishing. Cancel it or try again shortly.',
  admission_required:'This build does not support app-owned ChatGPT connections.', invalid_request:'Check the selected account, model and message.',
  network_unavailable:'Connection unavailable. Your draft is preserved.', browser_unavailable:'The system browser could not open. Try again.',
  usage_limit_reached:'ChatGPT usage is exhausted. Review usage settings or try later. Billing has not changed.',
  unauthorized:'Reconnect this account before asking again.', plan_permission_required:'Enable eligible plan usage by reconnecting this account.',
  revocation_unconfirmed:'Revocation could not be confirmed. Review access in ChatGPT settings before retrying.',
};
export function connectionError(error) {
  const code = typeof error === 'string' ? error : error?.message;
  return (typeof code === 'string' && Object.hasOwn(errors, code) ? errors[code] : '') || 'The request could not finish. Your draft is preserved. Check connection status or reconnect; billing has not changed.';
}
export function disconnectNotice(outcome) {
  const local = outcome?.localTokensRemoved === true ? 'Local account tokens removed.' : 'Local token removal is unconfirmed.';
  const outcomes = {
    no_refresh_token: 'No refresh token was present; no remote revocation request was sent. Remote invalidation is unverified.',
    not_attempted_unverifiable: 'Remote revocation was not attempted and cannot be verified. Review access in ChatGPT settings.',
    request_succeeded: 'Remote revocation request acknowledged. This does not prove server-side token invalidation.',
    request_failed_or_unverifiable: 'Remote revocation request failed or could not be verified. Review access in ChatGPT settings.',
  };
  const remote = (typeof outcome?.remoteRevocation === 'string' && Object.hasOwn(outcomes, outcome.remoteRevocation) ? outcomes[outcome.remoteRevocation] : '') || 'Remote revocation outcome is unknown; no usable receipt was returned. Review access in ChatGPT settings.';
  return `${local} ${remote}`;
}
export class AiConnection {
  constructor(bridge, changed = () => {}) { this.bridge=bridge;this.changed=changed;this.status=null;this.models=[];this.model='';this.draft='';this.reply='';this.error='';this.disconnectNotice='';this.busy=false;this.operation='';this.epoch=0;this.operationEpoch=null;this.cancelledConnectEpochs=new Set();this.safetyWarning=''; }
  async refresh() {
    this.disconnectNotice='';
    try { const previous=this.status?.activeClientId;this.status=await this.bridge.call('ai.connection.status');if(previous!==this.status?.activeClientId||!this.status?.accounts?.some(a=>a.clientId===this.status.activeClientId&&a.connected&&a.planEnabled)){this.models=[];this.model='';this.reply='';} this.error=this.status.error ? connectionError(this.status.error) : ''; }
    catch(e) {this.status=null;this.models=[];this.model='';this.reply='';this.error=connectionError(e);}
    this.changed();
  }
  async action(action, clientId) {
    if (action==='cancel') { if(!this.busy||!this.operation||this.operation==='disconnect')return;if(this.operation==='connect'&&this.operationEpoch!==null)this.cancelledConnectEpochs.add(this.operationEpoch);this.disconnectNotice='';this.epoch++;this.reply='';try{this.status=await this.bridge.call('ai.connection.cancel');this.error=this.status?.error?connectionError(this.status.error):'';}catch(e){this.error=connectionError(e);}this.changed();return; }
    if(this.busy)return;
    if(!['connect','select','disconnect','models','ask','refresh','usage'].includes(action))return;
    if(action==='refresh'){await this.refresh();return;}
    if(['select','disconnect'].includes(action)&&!this.status?.accounts?.some(a=>a.clientId===clientId)&&!this.status?.pendingClientIds?.includes(clientId))return;
    const expectedClientId=this.status?.activeClientId;
    if(['models','ask'].includes(action)&&(!expectedClientId||!this.status?.accounts?.some(a=>a.clientId===expectedClientId&&a.connected&&a.planEnabled)))return;
    if(action==='ask'&&messageBudget(this.draft).overLimit){this.error=MESSAGE_TOO_LARGE;this.changed();return;}
    if(action==='ask'&&(!this.draft.trim()||!this.models.some(m=>m.slug===this.model)))return;
    this.busy=true;this.operation=action;this.error='';this.disconnectNotice='';if(action==='ask')this.reply='';const epoch=++this.epoch;this.operationEpoch=epoch;this.changed();
    try {
      if(action==='usage') { const previous=this.status?.activeClientId;const result=await this.bridge.call('ai.connection.usage');if(epoch===this.epoch){this.status=result;if(previous!==result?.activeClientId||!result?.accounts?.some(a=>a.clientId===result.activeClientId&&a.connected&&a.planEnabled)){this.models=[];this.model='';this.reply='';}} } else if(action==='ask') {
        const result=await this.bridge.call('ai.connection.ask',{expectedClientId,model:this.model,text:this.draft});
        if(epoch===this.epoch)this.reply=String(result?.text??'');
      } else if(action==='models') {
        const models=await this.bridge.call('ai.connection.models',{expectedClientId});
        if(epoch===this.epoch){this.models=Array.isArray(models)?models.filter(m=>typeof m.slug==='string'&&typeof m.displayName==='string'):[];this.model=this.models.some(m=>m.slug===this.model)?this.model:(this.models[0]?.slug||'');}
      } else {
        const result=await this.bridge.call(`ai.connection.${action}`,clientId?{clientId}:{});
        if(epoch===this.epoch){this.status=result;this.error=result?.error?connectionError(result.error):'';if(action==='disconnect')this.disconnectNotice=disconnectNotice(result?.disconnectOutcome);this.models=[];this.model='';this.reply='';}
      }
    }catch(e){const lateCode=typeof e==='string'?e:e?.message;if(epoch!==this.epoch&&this.cancelledConnectEpochs.has(epoch)&&lateCode==='cancelled_revocation_unconfirmed'){this.safetyWarning=connectionError('cancelled_revocation_unconfirmed');}if(epoch===this.epoch){if(lateCode==='account_changed'){this.models=[];this.model='';this.reply='';}const message=connectionError(e);await this.refresh();if(epoch===this.epoch){this.error=message;if(action==='disconnect')this.disconnectNotice=disconnectNotice();}}}
    finally{this.cancelledConnectEpochs.delete(epoch);this.operationEpoch=null;this.busy=false;this.operation='';this.changed();}
  }
}
export function aiConnectionView(c) {
  const budget=messageBudget(c?.draft||'');
  const s=c?.status, busy=!!(c?.busy||s?.busy), available=s?.available===true;
  const accounts=Array.isArray(s?.accounts)?s.accounts:[], active=accounts.find(a=>a.clientId===s?.activeClientId), plan=!!active?.connected&&!!active?.planEnabled;
  const button=(action,text,id,disabled=false)=>`<button type="button" class="btn" data-ai-action="${action}"${id?` data-ai-client="${escape(id)}"`:''}${disabled?' disabled':''}>${text}</button>`;
  return `<section class="panel" aria-labelledby="ai-connection-title"><div class="panel-head"><h2 id="ai-connection-title">Optional ChatGPT connection</h2><small>${available?'Free open-source local app':'Connection unavailable'}</small></div><p>Ask GiGi continues to use installed Codex. This separate text-only connection sends only the message you type below to OpenAI. It cannot read records, use local tools or approve changes.</p><p class="muted">GiGi source sign-in and Google or Instagram permissions stay separate. Eligible ChatGPT plan usage has limits; there is no automatic API billing fallback.</p>${button('connect','Continue with ChatGPT',null,!available||busy)} ${button('refresh','Check status',null,!!c?.busy)} ${c?.busy&&c?.operation&&c.operation!=='disconnect'?button('cancel','Cancel request'):''}${button('usage','Manage ChatGPT usage and access',null,busy||!available)}<div aria-live="polite">${busy?'<p>Request in progress…</p>':''}${c?.error?`<p id="ai-connection-error" role="alert">${escape(c.error)}</p>`:''}${c?.disconnectNotice?`<p role="status">${escape(c.disconnectNotice)}</p>`:''}${c?.safetyWarning?`<p id="ai-connection-safety-warning" role="alert">${escape(c.safetyWarning)}</p>`:''}</div>${accounts.map(a=>`<div class="section-gap"><strong>${escape(a.email||'ChatGPT account')}</strong><p>${a.clientId===s.activeClientId?'Selected account. ':''}${a.connected?(a.planEnabled?'Plan usage enabled.':'Identity connected; plan usage disabled.'):'Disconnected.'}</p>${button('select','Select',a.clientId,busy||a.clientId===s.activeClientId)} ${button('connect','Reconnect',a.clientId,busy||!available)} ${button('disconnect','Disconnect',a.clientId,busy)}</div>`).join('')}${(s?.pendingClientIds||[]).map(id=>`<p>Incomplete sign-in. ${button('connect','Complete sign-in',id,busy||!available)}</p>`).join('')}${plan?`<div class="section-gap">${button('models','Load available models',null,busy)}<label for="ai-model">Model</label><select id="ai-model"${busy?' disabled':''}><option value="">Choose a model</option>${(c.models||[]).map(m=>`<option value="${escape(m.slug)}"${c.model===m.slug?' selected':''}>${escape(m.displayName)}</option>`).join('')}</select><label for="ai-message">Message to OpenAI</label><p id="ai-message-budget" class="muted" aria-live="polite">${escape(budget.help)}</p><textarea id="ai-message" maxlength="65536" aria-describedby="ai-message-budget" aria-invalid="${budget.overLimit}"${busy?' disabled':''}>${escape(c.draft)}</textarea>${button('ask','Send message',null,busy||!c.draft?.trim()||!c.model||budget.overLimit)}${c.reply?`<div class="section-gap" role="status"><h3>Reply</h3><p style="white-space:pre-wrap">${escape(c.reply)}</p></div>`:''}</div>`:''}</section>`;
}
