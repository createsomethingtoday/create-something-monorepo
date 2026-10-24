const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors = {
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
  return errors[code] || 'The request could not finish. Your draft is preserved. Check connection status or reconnect; billing has not changed.';
}
export function disconnectNotice(outcome) {
  const local = outcome?.localTokensRemoved === true ? 'Local account tokens removed.' : 'Local token removal is unconfirmed.';
  const remote = {
    no_refresh_token: 'No refresh token was present; no remote revocation request was sent. Remote invalidation is unverified.',
    not_attempted_unverifiable: 'Remote revocation was not attempted and cannot be verified. Review access in ChatGPT settings.',
    request_succeeded: 'Remote revocation request acknowledged. This does not prove server-side token invalidation.',
    request_failed_or_unverifiable: 'Remote revocation request failed or could not be verified. Review access in ChatGPT settings.',
  }[outcome?.remoteRevocation] || 'Remote revocation outcome is unknown; no usable receipt was returned. Review access in ChatGPT settings.';
  return `${local} ${remote}`;
}
export class AiConnection {
  constructor(bridge, changed = () => {}) { this.bridge=bridge;this.changed=changed;this.status=null;this.models=[];this.model='';this.draft='';this.reply='';this.error='';this.disconnectNotice='';this.busy=false;this.epoch=0; }
  async refresh() {
    this.disconnectNotice='';
    try { const previous=this.status?.activeClientId;this.status=await this.bridge.call('ai.connection.status');if(previous!==this.status?.activeClientId||!this.status?.accounts?.some(a=>a.clientId===this.status.activeClientId&&a.connected&&a.planEnabled)){this.models=[];this.model='';this.reply='';} this.error=this.status.error ? connectionError(this.status.error) : ''; }
    catch(e) {this.status=null;this.models=[];this.model='';this.reply='';this.error=connectionError(e);}
    this.changed();
  }
  async action(action, clientId) {
    if (action==='cancel') { this.disconnectNotice='';this.epoch++;this.reply='';try{this.status=await this.bridge.call('ai.connection.cancel');this.error=this.status?.error?connectionError(this.status.error):'';}catch(e){this.error=connectionError(e);}this.changed();return; }
    if(this.busy)return;
    if(!['connect','select','disconnect','models','ask','refresh','usage'].includes(action))return;
    if(action==='refresh'){await this.refresh();return;}
    if(['select','disconnect'].includes(action)&&!this.status?.accounts?.some(a=>a.clientId===clientId)&&!this.status?.pendingClientIds?.includes(clientId))return;
    if(action==='ask'&&(!this.draft.trim()||!this.models.some(m=>m.slug===this.model)))return;
    this.busy=true;this.error='';this.disconnectNotice='';if(action==='ask')this.reply='';const epoch=++this.epoch;this.changed();
    try {
      if(action==='usage') { await this.bridge.call('ai.connection.usage'); } else if(action==='ask') {
        const result=await this.bridge.call('ai.connection.ask',{model:this.model,text:this.draft});
        if(epoch===this.epoch)this.reply=String(result?.text??'');
      } else if(action==='models') {
        const models=await this.bridge.call('ai.connection.models');
        if(epoch===this.epoch){this.models=Array.isArray(models)?models.filter(m=>typeof m.slug==='string'&&typeof m.displayName==='string'):[];this.model=this.models.some(m=>m.slug===this.model)?this.model:(this.models[0]?.slug||'');}
      } else {
        const result=await this.bridge.call(`ai.connection.${action}`,clientId?{clientId}:{});
        if(epoch===this.epoch){this.status=result;this.error=result?.error?connectionError(result.error):'';if(action==='disconnect')this.disconnectNotice=disconnectNotice(result?.disconnectOutcome);this.models=[];this.model='';this.reply='';}
      }
    }catch(e){if(epoch===this.epoch){const message=connectionError(e);await this.refresh();if(epoch===this.epoch){this.error=message;if(action==='disconnect')this.disconnectNotice=disconnectNotice();}}}
    finally{this.busy=false;this.changed();}
  }
}
export function aiConnectionView(c) {
  const s=c?.status, busy=!!(c?.busy||s?.busy), available=s?.available===true;
  const accounts=Array.isArray(s?.accounts)?s.accounts:[], active=accounts.find(a=>a.clientId===s?.activeClientId), plan=!!active?.connected&&!!active?.planEnabled;
  const button=(action,text,id,disabled=false)=>`<button type="button" class="btn" data-ai-action="${action}"${id?` data-ai-client="${escape(id)}"`:''}${disabled?' disabled':''}>${text}</button>`;
  return `<section class="panel" aria-labelledby="ai-connection-title"><div class="panel-head"><h2 id="ai-connection-title">Optional ChatGPT connection</h2><small>${available?'Free open-source local app':'Connection unavailable'}</small></div><p>Ask GiGi continues to use installed Codex. This separate text-only connection sends only the message you type below to OpenAI. It cannot read records, use local tools or approve changes.</p><p class="muted">GiGi source sign-in and Google or Instagram permissions stay separate. Eligible ChatGPT plan usage has limits; there is no automatic API billing fallback.</p>${button('connect','Continue with ChatGPT',null,!available||busy)} ${button('refresh','Check status',null,busy)} ${busy?button('cancel','Cancel request'):''}${button('usage','Manage ChatGPT usage and access',null,busy||!available)}<div aria-live="polite">${busy?'<p>Request in progress…</p>':''}${c?.error?`<p role="alert">${escape(c.error)}</p>`:''}${c?.disconnectNotice?`<p role="status">${escape(c.disconnectNotice)}</p>`:''}</div>${accounts.map(a=>`<div class="section-gap"><strong>${escape(a.email||'ChatGPT account')}</strong><p>${a.clientId===s.activeClientId?'Selected account. ':''}${a.connected?(a.planEnabled?'Plan usage enabled.':'Identity connected; plan usage disabled.'):'Disconnected.'}</p>${button('select','Select',a.clientId,busy||a.clientId===s.activeClientId)} ${button('connect','Reconnect',a.clientId,busy||!available)} ${button('disconnect','Disconnect',a.clientId,busy)}</div>`).join('')}${(s?.pendingClientIds||[]).map(id=>`<p>Incomplete sign-in. ${button('connect','Complete sign-in',id,busy||!available)}</p>`).join('')}${plan?`<div class="section-gap">${button('models','Load available models',null,busy)}<label for="ai-model">Model</label><select id="ai-model"${busy?' disabled':''}><option value="">Choose a model</option>${(c.models||[]).map(m=>`<option value="${escape(m.slug)}"${c.model===m.slug?' selected':''}>${escape(m.displayName)}</option>`).join('')}</select><label for="ai-message">Message to OpenAI</label><textarea id="ai-message" maxlength="65536"${busy?' disabled':''}>${escape(c.draft)}</textarea>${button('ask','Send message',null,busy||!c.draft?.trim()||!c.model)}${c.reply?`<div class="section-gap" role="status"><h3>Reply</h3><p style="white-space:pre-wrap">${escape(c.reply)}</p></div>`:''}</div>`:''}</section>`;
}
