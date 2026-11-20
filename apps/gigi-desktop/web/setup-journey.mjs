const steps=new Set(['assistant','source','results','ready']);
const intents=new Set(['contacts','gigs','tasks']);
const providers=new Set(['gmail','googlecalendar']);
/** Navigation only. Native readbacks, never this journal, establish completion. */
export class SetupJourney {
 constructor(workspaceId,{storage=globalThis.localStorage}={}) {
  this.workspaceId=workspaceId;this.storage=storage;this.warning=false;
  this.key=`gigi:setup-journey:v1:${workspaceId}`;
  this.state={version:1,workspaceId,mode:'idle',step:'assistant',intent:'contacts',requests:{}};
  try {const raw=storage?.getItem(this.key);if(raw){if(raw.length>8192)throw Error();const s=JSON.parse(raw);if(s.version!==1||s.workspaceId!==workspaceId||!['idle','active','paused','finished'].includes(s.mode)||!steps.has(s.step)||!intents.has(s.intent))throw Error();this.state={...this.state,mode:s.mode,step:s.step,intent:s.intent,requests:{}};for(const p of providers)if(typeof s.requests?.[p]==='string'&&/^[a-f\d-]{36}$/i.test(s.requests[p]))this.state.requests[p]=s.requests[p];}}catch{this.warning=true;}
 }
 get open(){return this.state.mode==='active';}
 _persist(){try{if(!this.storage?.setItem)throw Error();this.storage.setItem(this.key,JSON.stringify(this.state));}catch{this.warning=true;}}
 start(step='assistant',intent=this.state.intent){this.move(step,intent);this.state.mode='active';this._persist();}
 resume(){this.state.mode='active';this._persist();}
 move(step,intent=this.state.intent){if(!steps.has(step)||!intents.has(intent))throw Error('Choose a setup step.');this.state.step=step;this.state.intent=intent;this._persist();}
 pause(){this.state.mode='paused';this._persist();}
 finish(){this.state.mode='finished';this._persist();}
 connectionRequest(provider){if(!providers.has(provider))throw Error('Choose Gmail or Calendar.');if(!this.state.requests[provider]){this.state.requests[provider]=crypto.randomUUID();this._persist();}return this.state.requests[provider];}
 clearConnectionRequest(provider){if(providers.has(provider)){delete this.state.requests[provider];this._persist();}}
}
