const states = new Set(['idle', 'running', 'approval', 'interrupted', 'failed']);
const sessionsFrom = value => Array.isArray(value) ? value : Array.isArray(value?.sessions) ? value.sessions : [];
const defaultSettings = { enabled:false, detailedPreviews:false, reminders:false, quietStart:22, quietEnd:8 };

// Owns observation for the workspace, not the chat drawer. It only reads existing
// sessions. Sending, approval and retry stay with explicit user actions in chat.
export class AttentionController {
  constructor(bridge, workspaceId, options = {}) {
    if (!workspaceId) throw new Error('Select a private workspace first.');
    this.bridge=bridge; this.workspaceId=workspaceId; this.options=options;
    this.changed=options.changed || (()=>{}); this.lastEmitted=null; this.onOpen=options.onOpen || (()=>{});
    this.schedule=options.schedule || ((fn,ms)=>globalThis.setTimeout(fn,ms));
    this.clear=options.clear || (timer=>globalThis.clearTimeout(timer));
    this.now=options.now || (()=>new Date()); this.getChat=options.getChat || (()=>null);
    this.items=[]; this.unreadCount=0; this.settings={...defaultSettings}; this.error=null; this.loading=false; this.pending=false;
    this.permission='unknown'; this.running=false; this.timer=null; this.flight=null; this.epoch=0; this.sessions=new Map(); this.lastRefreshSuccessful=false;
  }
  emit() {
    const signature=JSON.stringify({items:this.items,unreadCount:this.unreadCount,settings:this.settings,error:this.error,loading:this.loading,pending:this.pending,permission:this.permission,observationError:this.observationError,deliveryError:this.deliveryError});
    if(signature!==this.lastEmitted){this.lastEmitted=signature;this.changed();}
  }
  clock() {
    const date=this.now();
    const today=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return {workspaceId:this.workspaceId,today,now:date.getTime(),localHour:date.getHours()};
  }
  call(op,input={}) { return this.bridge.call(`attention.${op}`,{...this.clock(),...input}); }
  accept(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.items)) throw new Error('Attention data is unavailable.');
    this.items=snapshot.items; this.unreadCount=Number.isSafeInteger(snapshot.unreadCount) ? snapshot.unreadCount : 0;
    if(snapshot.settings && typeof snapshot.settings==='object') this.settings={...defaultSettings,...snapshot.settings};
  }
  start() { if(this.running) return this.flight; this.running=true; return this.refresh(); }
  stop() {this.running=false;this.epoch++;if(this.timer!==null)this.clear(this.timer);this.timer=null;}
  queue() {
    if(!this.running || this.timer!==null) return;
    this.timer=this.schedule(()=>{this.timer=null;void this.refresh();},15000);
    this.timer?.unref?.();
  }
  async observe() {
    if(!this.bridge.chatList) return [];
    const list=sessionsFrom(await this.bridge.chatList(this.workspaceId));
    const active=this.getChat(); const observed=[];
    // Bound background work. A partial snapshot upserts observations; it never
    // asserts that unvisited sessions or their saved completion receipts vanished.
    const ordered=list.filter(entry=>entry && typeof entry.sessionId==='string' && states.has(entry.state));
    // Visit all saved sessions fairly, including idle sessions first seen after
    // restart. Only fresh reads are submitted; list placeholders are not evidence.
    const candidates=ordered.filter(entry=>active?.current?.sessionId!==entry.sessionId);
    const offset=(this.observationCursor || 0)%Math.max(candidates.length,1);
    const selected=new Set(Array.from({length:Math.min(8,candidates.length)},(_,i)=>candidates[(offset+i)%candidates.length].sessionId));
    this.observationCursor=(offset+selected.size)%Math.max(candidates.length,1);
    for(const entry of ordered) {
      let current;
      if(active?.current?.sessionId===entry.sessionId) {
        if(active.pending || active.reading)continue;
        const saved=this.sessions.get(entry.sessionId);
        const unseenReceipt=active.current.decisionReceipt && JSON.stringify(active.current.decisionReceipt)!==JSON.stringify(saved?.decisionReceipt);
        if(active.visible && active.observationPaused && active.current.state==='running' && this.bridge.chatPoll){
          current=await this.bridge.chatPoll(this.workspaceId,entry.sessionId);
          active.accept?.(current);
        } else if(active.visible || unseenReceipt)current=active.current;
        else if(entry.state==='running' && this.bridge.chatPoll)current=await this.bridge.chatPoll(this.workspaceId,entry.sessionId);
        else current=await this.bridge.chatRead(this.workspaceId,entry.sessionId);
      } else if(selected.has(entry.sessionId)) {
        current=entry.state==='running' && this.bridge.chatPoll ? await this.bridge.chatPoll(this.workspaceId,entry.sessionId) : await this.bridge.chatRead(this.workspaceId,entry.sessionId);
      } else continue;
      if(!current || current.sessionId!==entry.sessionId || !states.has(current.state)) continue;
      const responseId=current.state==='idle' && Array.isArray(current.messages) ? [...current.messages].reverse().find(message=>message.role==='assistant' && typeof message.id==='string' && message.text?.trim())?.id : undefined;
      const value={...(responseId?{responseId}:{}),sessionId:current.sessionId,state:current.state,title:entry.title || 'Conversation',...(Array.isArray(current.approvals)?{approvals:current.approvals}:{}),...(current.decisionReceipt?{decisionReceipt:current.decisionReceipt}:{}),...(Array.isArray(current.recordLinks)?{recordLinks:current.recordLinks}:{})};
      this.sessions.set(entry.sessionId,value);observed.push(value);
    }
    return observed;
  }
  refresh() {
    if(this.flight) return this.flight;
    const epoch=this.epoch;this.loading=!this.items.length;this.emit();
    this.flight=(async()=>{
      this.lastRefreshSuccessful=false;
      try {
        // A provider outage must not hide ordinary local reminders. Omit session
        // updates on observation failure rather than marking old decisions gone.
        let sessions;try {sessions=await this.observe();this.observationError=null;}catch{this.observationError='Conversation updates are unavailable. Local reminders remain available.';}
        const value=await this.call('refresh',sessions===undefined?{}:{sessions});
        if(epoch!==this.epoch) return;
        this.accept(value);this.error=null;this.lastRefreshSuccessful=true;
        try {await this.deliver();}catch{this.deliveryError='A desktop alert could not be submitted. The item remains in GiGi.';}
      } catch {if(epoch===this.epoch)this.error='Could not refresh attention items. Check again before acting.';}
      finally {if(epoch===this.epoch){this.loading=false;this.emit();}this.flight=null;this.queue();}
    })();
    return this.flight;
  }
  async update(id,action,snoozedUntil) {
    if(this.pending || !['read','dismiss','snooze'].includes(action)) return false;
    const item=this.items.find(x=>x.id===id);if(!item)return false;
    this.pending=true;this.emit();
    try {const value=await this.call('update',{id,expectedRevision:item.revision,action,...(action==='snooze'?{snoozedUntil:snoozedUntil ?? this.now().getTime()+3600000}:{})});this.accept(value);this.error=null;return true;}
    catch {this.error='This item may have changed. Refresh before trying again.';return false;}
    finally {this.pending=false;this.emit();}
  }
  async open(id,mode='review') {
    if(this.pending) return;
    await this.refresh();if(!this.lastRefreshSuccessful)return;
    const item=this.items.find(x=>x.id===id);if(!item){this.error='This item is no longer current.';this.emit();return;}
    if(await this.update(id,'read')) await this.onOpen(item,mode);
  }
  async saveSettings(patch) {
    if(this.pending)return false;this.pending=true;this.emit();
    try {const value=await this.call('settings',{patch});if(!value?.settings || typeof value.settings!=='object')throw new Error('Settings unavailable');this.settings={...defaultSettings,...value.settings};this.error=null;return true;}
    catch {this.error='Could not save notification settings. Your previous settings remain in use.';return false;}
    finally {this.pending=false;this.emit();}
  }
  async deliver() {
    if(!this.options.onDelivery)return;
    // Native code owns permission, focus checks, durable claiming and the exact
    // notification body. Web content never supplies notification text or tokens.
    const result=await this.options.onDelivery();
    if(result===false || result?.status==='failed' || ['native_delivery_failed','outcome_unknown'].includes(result?.reason))this.deliveryError='A desktop alert could not be submitted. The item remains in GiGi.';
    else this.deliveryError=null;
  }
}
