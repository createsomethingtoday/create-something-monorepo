import {SetupJourney} from './setup-journey.mjs';
import {AssistantSetup,ASSISTANT_FIRST_PROMPT} from './setup-assistant.mjs';
import {SetupImports,setupImportIntents} from './setup-imports.mjs';
import {setupJourneyView,setupInvitation} from './setup-journey-view.mjs';
import {pendingAccountForProvider,pendingConsentForProvider,sourceCanBegin,sourceSessionBlocked} from './model.mjs';
import {sourceSignInNeeded,sourceErrorMessage} from './setup-view.mjs';
const message=e=>String(e?.message||e||'This step could not be confirmed.').slice(0,500);
/** Owns the connected setup lifecycle; native receipts own completion evidence. */
export class ConnectedSetup {
 constructor(bridge,{changed=()=>{},onManual=()=>{},onExplore=()=>{},onFinish=()=>{},onAsk=()=>{},storage=globalThis.localStorage,clipboard=()=>globalThis.navigator?.clipboard}={}) {
  Object.assign(this,{bridge,changed,onManual,onExplore,onFinish,onAsk,storage,clipboard});this.workspace=null;this.journey=null;this.assistant=null;this.imports=null;this.attempts={};this.connecting=null;this.error='';this.epoch=0;
 }
 mount(workspace,{autoStart=false}={}) {
  if(!workspace?.id)return;
  if(this.workspace?.id!==workspace.id){this.assistant?.dispose();this.epoch++;this.workspace=workspace;this.journey=new SetupJourney(workspace.id,{storage:this.storage});const epoch=this.epoch;const changed=()=>{if(epoch===this.epoch)this.changed();};this.assistant=new AssistantSetup(this.bridge,workspace.id,changed);this.imports=new SetupImports(this.bridge,workspace.id,{storage:this.storage,onChange:changed});this.imports.setIntent(this.journey.state.intent);this.attempts={};this.error='';this.connecting=null;}
  if(autoStart&&this.journey.state.mode==='idle')this.journey.start();
 }
 get open(){return !!this.journey?.open;}
 view(){return setupJourneyView({journey:this.journey,workspace:this.workspace,assistant:this.assistant,imports:this.imports,attempt:this.attempts[this.imports.state.provider],connecting:this.connecting,error:this.error});}
 invitation(){return setupInvitation(this.journey,this.assistant,this.imports);}
 capture(form){if(form?.id==='setup-candidate-form')this.imports?.updateDraft(Object.fromEntries(new FormData(form)));}
 async refresh(){if(!this.open)return;if(this.journey.state.step==='assistant')await this.assistant.refresh();else await this.imports.restore(this.journey.state.intent);}
 _activate(){if(this.assistant?.disposed){const epoch=this.epoch;this.assistant=new AssistantSetup(this.bridge,this.workspace.id,()=>{if(epoch===this.epoch)this.changed();});}}
 async openAt(step){this._activate();if(step)this.journey.start(step);else this.journey.resume();this.error='';this.changed();await this.refresh();}
 async intent(intent){if(this.imports.busy||this.connecting)return;this.journey.move('source',intent);this.error='';this.imports.setIntent(intent);this.changed();await this.imports.restore(intent);}
 async assistantAction(action){
  this.error='';const c=this.assistant;
  const map={refresh:'refresh',login:'startLogin','open-login':'openLogin','read-login':'readLogin','cancel-login':'cancelLogin'};
  try{
   if(map[action])await c[map[action]]();
   else if(action==='ask'){if(!c.workspaceVerified)throw Error('Check this workspace before asking about its records.');await this.onAsk(ASSISTANT_FIRST_PROMPT);}
   else if(action==='prepare-codex'||action==='prepare-claude')await c.prepareExternal(action==='prepare-codex'?'codex':'claude');
   else if(action==='copy-command'||action==='copy-prompt'){const value=action==='copy-prompt'?c.external?.starterPrompt:c.provider==='claude'?c.external?.claudeCommand:c.external?.codexCommand;if(!value)throw Error('Prepare this connector before copying.');if(!this.clipboard()?.writeText)throw Error('Clipboard unavailable. Select the full command above and copy it.');await this.clipboard().writeText(value);}
  }catch(e){this.error=message(e);}this.changed();
 }
 async _source(action){
  if(this.connecting||this.imports.busy)return;
  const provider=this.imports.state.provider,epoch=this.epoch,workspace=this.workspace.id;this.connecting=action;this.error='';this.changed();
  try{
   if(action==='source-signin'){
    if(sourceSessionBlocked(this.imports.state.source))throw Error(sourceErrorMessage(this.imports.state.source.detail));
    if(!sourceSignInNeeded({[provider]:this.imports.state.source}))throw Error('Check source status before signing in again.');
    await this.bridge.signIn();
   }
   else if(action==='source-connect'){
    const source=this.imports.state.source;
    if(!sourceCanBegin(source))throw Error('Check source status before starting another connection.');
    if(source?.state==='connected')return;
    const attempt=await this.bridge.beginConnection(provider,this.journey.connectionRequest(provider));
    if(epoch!==this.epoch||workspace!==this.workspace.id)return;
    this.attempts[provider]=attempt;
    await this.imports.refreshSource(provider);
    const url=pendingConsentForProvider(this.imports.state.source,this.attempts,provider);
    if(url)await this.bridge.openConsent(url,provider);
   }else if(action==='source-open'){
    const url=pendingConsentForProvider(this.imports.state.source,this.attempts,provider);if(!url)throw Error('Check connection status before reopening sign-in.');await this.bridge.openConsent(url,provider);
   }else if(action==='source-verify'){
    const id=pendingAccountForProvider(this.imports.state.source,provider);if(!id||sourceSessionBlocked(this.imports.state.source))throw Error('Check source status to find the pending connection.');await this.bridge.reconcileConnection(provider,id);
   }
   if(epoch!==this.epoch)return;
   await this.imports.refreshSource(provider);
   if(this.imports.state.source?.state==='connected')this.journey.clearConnectionRequest(provider);
  }catch(e){if(epoch===this.epoch)this.error=message(e);}
  finally{if(epoch===this.epoch){this.connecting=null;this.changed();}}
 }
 async action(action){
  if(!this.journey)return;
  this.error='';
  try{
   if(action==='open'){await this.openAt();return;}
   if(action==='back'){
    if(this.imports.busy||this.connecting||this.assistant.busy)return;
    await this.openAt(this.journey.state.step==='source'?'assistant':this.journey.state.step==='ready'?'results':'source');return;
   }
   if(action==='pause'||action==='finish'||action==='manual'){
    if(action==='finish')this.journey.finish();else this.journey.pause();this.assistant.dispose();this.changed();
    await(action==='manual'?this.onManual():action==='finish'?this.onFinish():this.onExplore());return;
   }
   if(action==='sources'){if(!this.assistant.workspaceVerified)throw Error('Check workspace access first, or choose manual work.');this.journey.move('source');this.changed();await this.imports.restore(this.journey.state.intent);return;}
   if(action.startsWith('source-')){await this._source(action);return;}
   if(['preview','next-preview','fresh-preview'].includes(action)){this.journey.move('results');this.changed();await this.imports.preview(this.journey.state.intent,{fresh:action==='fresh-preview'});}
   else if(action==='import-reviewed')await this.imports.importReviewed();
   else if(action==='check-import')await this.imports.checkReceipt();
   else if(action==='discard-preview')await this.imports.cancelPreview();
   else if(action==='save-result')await this.imports.saveReviewed();
   else if(action==='recover-result')await this.imports.recoverSave();
   else if(action==='edit-result')this.imports.editCandidate();
   else if(action==='ready'){if(!this.imports.state.wins.length)throw Error('Save and check one result first, or continue manually.');this.journey.move('ready');}
   else if(action==='phone-codex')await this.bridge.call('help.open',{topic:'codex-phone'});
   else if(action==='copy-phone-prompt'){if(!this.clipboard()?.writeText)throw Error('Clipboard unavailable. Open the prompt and copy it.');await this.clipboard().writeText(`Use gigi_workspace_get and confirm workspace ${this.workspace.name} (${this.workspace.id}). Do not change any records.`);}
  }catch(e){this.error=message(e);}this.changed();
 }
 selectCandidate(id){this.imports.selectCandidate(id);}
 review(form){this.imports.reviewCandidate(Object.fromEntries(new FormData(form)));}
 leave(){if(this.open)this.journey.pause();this.assistant?.dispose();}
}
