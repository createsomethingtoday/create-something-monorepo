import {sourceDraft, reviewSourceDraft} from './source-proposal.mjs';

export const setupImportIntents=Object.freeze([
  {id:'contacts',provider:'gmail',entity:'contacts',label:'People from recent email'},
  {id:'gigs',provider:'googlecalendar',entity:'gigs',label:'Upcoming calendar commitments'},
  {id:'tasks',provider:'gmail',entity:'tasks',label:'Email follow-ups'},
]);
const intentFor=id=>{const intent=setupImportIntents.find(item=>item.id===id);if(!intent)throw new Error('Choose people, calendar commitments or follow-ups.');return intent;};
const sourceEntity=provider=>provider==='gmail'?'interactions':'schedule';
const clone=value=>structuredClone(value);
const textError=error=>String(error?.message || error || 'This step could not be verified.').slice(0,500);
const sourceStatusErrors=new Set(['session_expired','reauthentication_required','unauthorized','access_denied','session_busy','session_lock_unverified','provider_unavailable','unconfigured','refresh_in_progress','refresh_outcome_unknown']);
const running=receipt=>['committing','cancelling'].includes(receipt?.state);
const sameSource=(a,b)=>['provider','connectedAccountId','collectionId','externalId'].every(key=>a?.[key]===b?.[key]);
function windowFor(intent,now) {
  const end=new Date(now),start=new Date(now);
  if(intent==='gigs')end.setUTCMonth(end.getUTCMonth()+3);
  else if(intent==='contacts')start.setUTCFullYear(start.getUTCFullYear()-1);
  else start.setUTCMonth(start.getUTCMonth()-1);
  return {from:start.toISOString(),to:end.toISOString(),...(intent==='gigs'?{calendarId:'primary'}:{})};
}

/** Owns one explicit, bounded setup action at a time. Provider consent remains
 * separate. Every write is persisted before submission; restore performs reads. */
export class SetupImports {
  constructor(bridge,workspaceId,{storage=globalThis.localStorage,now=Date.now,onChange=()=>{}}={}) {
    if(!workspaceId)throw new Error('Select a private workspace first.');
    this.bridge=bridge;this.workspaceId=workspaceId;this.storage=storage;this.now=now;this.onChange=onChange;
    this.busy=null;this.error=null;this.state=this._empty('contacts');
  }
  _empty(intent) {return {intent,provider:intentFor(intent).provider,selection:windowFor(intent,this.now()),source:null,preview:null,receipt:null,candidates:[],proposal:null,wins:[],needsFreshPreview:false,sourceMismatch:false,importInput:null};}
  _key(intent=this.state.intent) {return `gigi.setup-imports.v1:${encodeURIComponent(this.workspaceId)}:${intentFor(intent).provider}:${intent}`;}
  _emit() {this.onChange(this);}
  _persist() {
    if(!this.storage?.setItem)throw new Error('Setup progress cannot be saved on this Mac. Restore local storage before importing or creating records.');
    this.storage.setItem(this._key(),JSON.stringify({version:1,workspaceId:this.workspaceId,...this.state}));
  }
  _load(intent) {
    const empty=this._empty(intent),raw=this.storage?.getItem?.(this._key(intent));
    if(!raw)return empty;
    if(raw.length>1048576)throw new Error('Saved setup progress is too large. Review local setup storage.');
    const value=JSON.parse(raw);
    if(value.version!==1 || value.workspaceId!==this.workspaceId || value.intent!==intent || value.provider!==empty.provider)throw new Error('Saved setup progress belongs to a different workspace or source.');
    const state={...empty};
    for(const key of Object.keys(empty))if(Object.hasOwn(value,key))state[key]=value[key];
    state.source=null;state.sourceMismatch=false;
    if(!Array.isArray(state.candidates)||state.candidates.length>25||!Array.isArray(state.wins)||state.wins.length>100)throw new Error('Saved setup progress needs review.');
    if(state.proposal && (state.proposal.workspaceId!==this.workspaceId || state.proposal.entity!==intent))throw new Error('Saved proposal belongs to a different workspace or result.');
    if(state.importInput && state.importInput.workspaceId!==this.workspaceId)throw new Error('Saved import belongs to another workspace.');
    return state;
  }
  async _run(action,operation) {
    if(this.busy)return null;
    this.busy=action;this.error=null;this._emit();
    try {return await operation();}
    catch(error) {
      this.error=textError(error);
      if(/expired|scope changed|unscoped source cursor/i.test(this.error))this.state.needsFreshPreview=true;
      return null;
    } finally {this.busy=null;this._emit();}
  }
  setIntent(intent) {
    if(this.busy)return null;
    try {this.state=this._load(intent);this.error=null;this._emit();return this.state;}
    catch(error){this.error=textError(error);this._emit();return null;}
  }
  clearError(){this.error=null;this._emit();}
  _account(allowMismatch=false) {
    const source=this.state.source;
    if(source?.provider!==this.state.provider || source.state!=='connected' || !source.connectedAccountId || this.state.sourceMismatch&&!allowMismatch || ['session_busy','session_lock_unverified'].includes(source.detail))throw new Error('Verify this source account before reading or importing. Connecting does not import records.');
    return source.connectedAccountId;
  }
  async _refresh(provider=this.state.provider) {
    if(provider!==this.state.provider)throw new Error('Choose the setup step for this source first.');
    let source;
    try {source=await this.bridge.sourceStatus(this.workspaceId,provider);}
    catch(error) {
      const code=textError(error);
      if(!sourceStatusErrors.has(code))throw error;
      source={provider,state:code==='unconfigured'?'unconfigured':'unavailable',detail:code};
    }
    if(source?.provider!==provider)throw new Error('Source status could not be verified.');
    this.state.source=source;
    const scope=this.state.receipt?.scope || this.state.preview?.scope;
    this.state.sourceMismatch=!!(scope?.connectedAccountId && source.connectedAccountId && scope.connectedAccountId!==source.connectedAccountId);
    return source;
  }
  refreshSource(provider=this.state.provider) {return this._run('status',()=>this._refresh(provider));}
  restore(intent=this.state.intent) {
    return this._run('restore',async()=>{
      this.state=this._load(intent);
      await this._refresh();
      if(this.state.proposal?.phase==='submitted')await this._recoverSave();
      const jobId=this.state.importInput?.previewId || this.state.receipt?.jobId;
      if(jobId)await this._readReceipt(jobId);
      else if(this.state.preview && this.state.preview.expiresAt*1000<=this.now()) {this.state.preview=null;this.state.needsFreshPreview=true;}
      // Reconfirm saved first wins instead of treating local progress as proof.
      const wins=[];
      for(const win of this.state.wins) {
        try {const record=await this.bridge.getRecord(this.workspaceId,win.entity,win.id,'full');if(this._linked(record,win.sourceEntity || sourceEntity(this.state.provider),win.sourceId))wins.push({...win,title:record.title,verifiedAt:new Date(this.now()).toISOString()});}catch{/* unavailable records are not confirmed wins */}
      }
      this.state.wins=wins;this._persist();return this.state;
    });
  }
  preview(intent=this.state.intent,{fresh=false}={}) {
    return this._run('preview',async()=>{
      if(intent!==this.state.intent)this.state=this._load(intent);
      if(this.state.proposal?.phase==='submitted')throw new Error('Check the unconfirmed save before reading another page.');
      if(running(this.state.receipt))throw new Error('Stop the import or check its receipt before reading another page.');
      if(this.state.needsFreshPreview&&!fresh)throw new Error('This preview or continuation expired. Start a fresh preview; existing records remain.');
      if(!this.state.source)await this._refresh();
      const account=this._account(fresh);
      const cursor=fresh ? undefined : this.state.receipt ? this.state.receipt.state==='complete' ? this.state.receipt.nextCursor || undefined : this.state.receipt.retryCursor || undefined : this.state.preview?.nextCursor || undefined;
      const preview=await this.bridge.previewSource(this.workspaceId,this.state.provider,account,this.state.selection,cursor);
      if(!preview?.previewId||!preview.revision||preview.scope?.workspaceId!==this.workspaceId||preview.scope?.provider!==this.state.provider||preview.scope?.connectedAccountId!==account)throw new Error('The source preview scope could not be verified.');
      this.state.preview=preview;this.state.receipt=null;this.state.importInput=null;this.state.candidates=[];this.state.proposal=null;this.state.needsFreshPreview=false;this.state.sourceMismatch=false;
      this._persist();return preview;
    });
  }
  async _readReceipt(jobId) {
    const receipt=await this.bridge.importStatus(this.workspaceId,jobId);
    if(receipt?.previewId!==jobId && receipt?.jobId!==jobId)throw new Error('Import receipt could not be verified.');
    if(receipt.state==='preview') {this.state.preview=receipt;return receipt;}
    if(!['complete','partial','cancelled','committing','cancelling'].includes(receipt.state))throw new Error('GiGi has not confirmed this import. Check its receipt before continuing.');
    if(receipt.scope?.workspaceId!==this.workspaceId || receipt.scope?.provider!==this.state.provider)throw new Error('Import receipt belongs to another workspace or source.');
    const account=this.state.preview?.scope?.connectedAccountId || this.state.receipt?.scope?.connectedAccountId;
    if(account && receipt.scope?.connectedAccountId!==account)throw new Error('Import account readback mismatch.');
    this.state.receipt=receipt;
    if(!running(receipt)) {
      const candidates=[];
      for(const row of receipt.records || []) {
        if(candidates.length>=25)break;
        if(row.entity!==sourceEntity(this.state.provider)||!row.id)throw new Error('Import receipt contains an unexpected result.');
        const record=await this.bridge.getRecord(this.workspaceId,row.entity,row.id,'full');
        if(record?.id!==row.id || record.workspaceId!==this.workspaceId || record.entity!==row.entity || record.source?.kind!=='import' || record.source.provider!==this.state.provider || record.source.connectedAccountId!==receipt.scope.connectedAccountId || !record.source.collectionId || !record.source.externalId)throw new Error('Saved source record could not be verified. Check the import receipt and local records.');
        candidates.push(record);
      }
      this.state.candidates=candidates;
    }
    this._persist();return receipt;
  }
  checkReceipt() {return this._run('receipt',async()=>{const id=this.state.importInput?.previewId || this.state.receipt?.jobId || this.state.preview?.previewId;if(!id)throw new Error('No import is available to check.');return this._readReceipt(id);});}
  importReviewed() {
    return this._run('import',async()=>{
      this._account();
      if(this.state.importInput) {
        const receipt=await this._readReceipt(this.state.importInput.previewId);
        if(receipt.state!=='preview')return receipt;
      }
      const preview=this.state.preview;
      if(!preview || !preview.records?.length || this.state.receipt)throw new Error('Review a source preview before approving its import.');
      if(preview.expiresAt*1000<=this.now()){this.state.needsFreshPreview=true;throw new Error('This preview expired. Start a fresh preview before importing.');}
      if(preview.scope?.connectedAccountId!==this._account())throw new Error('The source account changed. Start a fresh preview.');
      const input=this.state.importInput || {workspaceId:this.workspaceId,previewId:preview.previewId,expectedRevision:preview.revision,idempotencyKey:crypto.randomUUID(),confirmed:true};
      this.state.importInput=input;this._persist();
      try {await this.bridge.commitSource(this.workspaceId,input.previewId,input.expectedRevision,input.idempotencyKey);}
      catch(error) {try {const receipt=await this._readReceipt(input.previewId);if(receipt.state!=='preview')return receipt;}catch{}throw new Error(`GiGi has not confirmed this import. Check its receipt before retrying. ${textError(error)}`);}
      return this._readReceipt(input.previewId);
    });
  }
  selectCandidate(id) {
    if(this.busy)return null;
    try {
      if(this.state.proposal?.phase==='submitted')throw new Error('Check the unconfirmed save before starting another proposal.');
      const source=this.state.candidates.find(row=>row.id===id);
      if(!source)throw new Error('Open a verified imported source candidate first.');
      this.state.proposal=sourceDraft(this.workspaceId,source.entity,source,this.state.intent);this._persist();this.error=null;this._emit();return this.state.proposal;
    }catch(error){this.error=textError(error);this._emit();return null;}
  }
  reviewCandidate(values) {
    if(this.busy)return null;
    try {
      if(!this.state.proposal || this.state.proposal.phase==='submitted')throw new Error('Open a source candidate and review it before saving.');
      this.state.proposal=reviewSourceDraft(this.state.proposal,values);this._persist();this.error=null;this._emit();return this.state.proposal;
    }catch(error){this.error=textError(error);this._emit();return null;}
  }
  updateDraft(values) {
    if(this.state.proposal?.phase!=='draft')return null;
    try {
      const next={...this.state.proposal};
      for(const [key,maximum] of [['title',500],['email',320],['date',150],['workKind',40]]) {
        if(Object.hasOwn(values,key)) {
          const value=String(values[key] ?? '');
          if(new TextEncoder().encode(value).length>maximum)throw new Error(`The ${key} value is too long to save as a draft.`);
          next[key]=value;
        }
      }
      this.state.proposal=next;this._persist();return next;
    }catch(error){this.error=textError(error);return null;}
  }
  editCandidate() {
    if(this.busy || this.state.proposal?.phase!=='review')return null;
    this.state.proposal={...this.state.proposal,phase:'draft',payload:undefined};this._persist();this._emit();return this.state.proposal;
  }
  _linked(record,entity,id) {
    return record?.workspaceId===this.workspaceId && Array.isArray(record.relations) && record.relations.some(link=>link.fromEntity===record.entity && link.fromId===record.id && link.toEntity===entity && link.toId===id || link.toEntity===record.entity && link.toId===record.id && link.fromEntity===entity && link.fromId===id);
  }
  async _verifyWin(result,proposal) {
    if(!result?.id || !['created','existing'].includes(result.sourceProposal?.outcome) || result.sourceProposal.sourceEntity!==proposal.sourceRecord.entity || result.sourceProposal.sourceId!==proposal.sourceRecord.id)throw new Error('The saved result could not be verified. Check the exact save receipt.');
    const saved=await this.bridge.getRecord(this.workspaceId,proposal.entity,result.id,'full');
    if(saved?.id!==result.id || saved.entity!==proposal.entity || !this._linked(saved,proposal.sourceRecord.entity,proposal.sourceRecord.id))throw new Error('The saved record or its source link could not be verified. Check the exact save receipt.');
    if(proposal.entity==='contacts' && result.sourceProposal.outcome==='created' && saved.fields?.Email!==proposal.payload.fields.Email)throw new Error('The saved contact email could not be verified.');
    // Existing contacts may be manual or have an earlier Gmail source. The
    // receipt and exact relation establish reuse without rewriting provenance.
    if(proposal.entity!=='contacts' || result.sourceProposal.outcome==='created') {
      const origin=saved.source?.kind==='manual'?saved.source.origin:saved.source;
      if(!sameSource(origin,proposal.sourceRecord.expectedRecord.source))throw new Error('Saved source attribution could not be verified.');
    }
    const prior=this.state.wins.find(item=>item.id===saved.id && item.entity===saved.entity);
    const win={id:saved.id,entity:saved.entity,title:saved.title,outcome:result.sourceProposal.outcome,sourceId:proposal.sourceRecord.id,sourceIds:[...new Set([...(prior?.sourceIds || []),...(prior?.sourceId?[prior.sourceId]:[]),proposal.sourceRecord.id])],sourceEntity:proposal.sourceRecord.entity,verifiedAt:new Date(this.now()).toISOString()};
    this.state.wins=[...this.state.wins.filter(item=>item.sourceId!==win.sourceId && !(item.id===win.id && item.entity===win.entity)),win].slice(-100);this.state.proposal=null;this._persist();return win;
  }
  async _recoverSave() {
    const proposal=this.state.proposal;
    if(!proposal?.payload || proposal.phase!=='submitted')throw new Error('No unconfirmed save is available.');
    const payload=proposal.payload;
    const result=await this.bridge.call('records.get',{workspaceId:this.workspaceId,entity:proposal.entity,id:payload.id,saveReceipt:{idempotencyKey:payload.idempotencyKey,expectedInput:clone(payload)}});
    if(!result?.receiptFound)return null;
    return this._verifyWin(result.record,proposal);
  }
  recoverSave() {return this._run('recover',()=>this._recoverSave());}
  saveReviewed() {
    return this._run('save',async()=>{
      const proposal=this.state.proposal;
      if(!proposal?.payload || !['review','submitted'].includes(proposal.phase))throw new Error('Review the record before approving its save.');
      if(proposal.phase==='submitted') {const recovered=await this._recoverSave();if(recovered)return recovered;}
      proposal.phase='submitted';this._persist();
      try {const result=await this.bridge.call('records.save',clone(proposal.payload));return await this._verifyWin(result,proposal);}
      catch(error) {try{const recovered=await this._recoverSave();if(recovered)return recovered;}catch{}throw new Error(`GiGi has not confirmed this save. Recover its receipt or retry the same reviewed request. ${textError(error)}`);}
    });
  }
  cancelPreview() {
    return this._run('cancel',async()=>{
      const id=this.state.preview?.previewId || this.state.receipt?.jobId;
      if(!id)throw new Error('No source preview or import is available to stop.');
      await this.bridge.cancelImport(this.workspaceId,id);const receipt=await this._readReceipt(id);
      this.state.preview=null;this._persist();return receipt;
    });
  }
}
