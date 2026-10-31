import {confirmAction} from './confirm.mjs';
import {musicView} from './music-view.mjs';
import {captureViewState,restoreViewState} from './view-state.mjs';

/** Local UI controller. The native picker owns path selection; this bridge never accepts arbitrary paths. */
export function mountMusic(container,{call,workspaceId,confirm=confirmAction}={}) {
 let disposed=false,requestRevision=0,editing=null,dirty=false,importRequest=null,previewId=null,renderedEditorId=null;
 let state={items:[],total:0,offset:0,hasMore:false,query:'',kind:'',busy:false,loading:true,notice:'',error:''};
 const content=document.createElement('div'); const playerHost=document.createElement('div');
 playerHost.className='music-player'; container.replaceChildren(playerHost,content);
 const invoke=(operation,input={})=>call(operation,{...input,workspaceId});
 const render=(preserve=true)=>{if(disposed)return;const snapshot=preserve?captureViewState(content):null;if(snapshot&&renderedEditorId!==editing?.id)snapshot.forms=snapshot.forms.filter(form=>form.id!=='music-edit-form');renderedEditorId=editing?.id;const y=globalThis.scrollY||0;content.innerHTML=musicView({...state,editing,dirty,importing:Boolean(importRequest)});restoreViewState(content,snapshot);globalThis.scrollTo?.(0,y);};
 function stop(restoreFocus=false){const previousId=previewId;previewId=null;const media=playerHost.querySelector('audio,video');if(media){media.pause();media.removeAttribute('src');media.load();}playerHost.replaceChildren();if(restoreFocus&&previousId){[...content.querySelectorAll('[data-music-preview]')].find(button=>button.dataset.musicPreview===previousId)?.focus();}}
 async function load(preserve=true){
  const revision=++requestRevision;state.loading=true;state.error='';render(preserve);
  try{const result=await invoke('music.list',{query:state.query,kind:state.kind,offset:state.offset});if(disposed||revision!==requestRevision)return;state={...state,...result,error:''};}
  catch(error){if(disposed||revision!==requestRevision)return;state.error=error.message||String(error);state.notice='';}
  finally{if(!disposed&&revision===requestRevision){state.loading=false;render();}}
 }
 async function action(operation,input={},after){
   if(state.busy)return;
   const previousFocus=captureViewState(content);
   state.busy=true;state.error='';render();
   try{const result=await invoke(operation,input);if(disposed)return;await after?.(result);}
   catch(error){if(!disposed)state.error=error.message||String(error);}
   finally{if(!disposed){state.busy=false;render();const active=globalThis.document?.activeElement;if(!active||active===document.body||active===document.documentElement)restoreViewState(content,{...previousFocus,forms:[],details:[]});}}
 }
 const canLeave=async()=>!dirty||await confirm('Discard unsaved music organization changes?',{title:'Discard changes?',acceptLabel:'Discard changes'});
 async function click(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-music-cancel')){if(importRequest){try{await invoke('music.cancel',{requestId:importRequest});state.notice='Cancellation requested. Waiting for the import receipt.';}catch(error){state.error=error.message||String(error);}render();}return;}
  if(state.busy)return;
  if(button.hasAttribute('data-music-retry')){await load();return;}
  if(button.hasAttribute('data-music-reset')){if(!await canLeave())return;editing=null;dirty=false;state.query='';state.kind='';state.offset=0;await load(false);content.querySelector('#music-query')?.focus();return;}
  if(button.dataset.musicImport){
   if(!await canLeave())return;editing=null;dirty=false;importRequest=crypto.randomUUID();
   await action('music.import',{mode:button.dataset.musicImport,requestId:importRequest},async result=>{
    state.notice=result.cancelled?'Import cancelled. No new entries saved.':`Added ${result.added} ${result.added===1?'entry':'entries'}. ${result.duplicates||0} duplicates and ${result.skipped||0} unreadable or excluded entries skipped.${result.limited?' The import or library limit was reached; select a smaller folder for the remaining files.':''} Nothing uploaded.`;
    state.offset=0;await load();
   });importRequest=null;return;
  }
  if(button.hasAttribute('data-music-edit-cancel')){if(await canLeave()){editing=null;dirty=false;await load();}return;}
  const find=id=>state.items.find(item=>item.id===id);
  if(button.dataset.musicEdit){if(!await canLeave())return;editing={...find(button.dataset.musicEdit)};dirty=false;render();content.querySelector('[name="title"]')?.focus();return;}
  if(button.dataset.musicRemove){const item=find(button.dataset.musicRemove);if(!item||!await confirm(`Remove “${item.title}” from this library? The original file remains untouched.`,{title:'Remove library entry?',acceptLabel:'Remove entry',cancelLabel:'Keep entry'}))return;await action('music.remove',{id:item.id},async()=>{stop();state.notice='Removed library entry. Original file unchanged.';if(editing?.id===item.id){editing=null;dirty=false;}await load();});return;}
  if(button.dataset.musicReconnect){await action('music.reconnect',{id:button.dataset.musicReconnect},async result=>{state.notice=result.cancelled?'Reconnect cancelled.':'Original reconnected. Nothing uploaded.';await load();});return;}
  if(button.dataset.musicPreview){
   const item=find(button.dataset.musicPreview);if(!item)return;
   await action('music.preview',{id:item.id},result=>{
    stop();previewId=item.id;const heading=document.createElement('strong');heading.textContent=result.title;
    const media=document.createElement(result.kind==='video'?'video':'audio');media.controls=true;media.tabIndex=0;media.preload='metadata';media.setAttribute('aria-label',`Local preview of ${result.title}`);
    const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');status.textContent='Local preview. Playback depends on this Mac’s codec support.';
    media.addEventListener('error',()=>{status.textContent='This media cannot be played here. It may use an unsupported codec or be unavailable. Reconnect the original, or open it in its own application.';});
    const close=document.createElement('button');close.className='btn';close.textContent='Close preview';close.addEventListener('click',()=>stop(true));
    media.src=`gigi-media://localhost/${encodeURIComponent(workspaceId)}/${encodeURIComponent(item.id)}`;playerHost.append(heading,media,status,close);media.play().catch(()=>{status.textContent='Press Play to start. If playback fails, this format or codec may not be supported.';});
   });playerHost.querySelector('audio,video')?.focus();playerHost.scrollIntoView?.({block:'nearest'});return;
  }
  if(button.dataset.musicPage){if(!await canLeave())return;editing=null;dirty=false;state.offset=Math.max(0,state.offset+(button.dataset.musicPage==='next'?100:-100));await load();}
 }
 async function submit(event){
  const form=event.target;event.preventDefault();if(state.busy)return;const values=Object.fromEntries(new FormData(form));
  if(form.hasAttribute('data-music-search')){if(!await canLeave())return;editing=null;dirty=false;state.query=values.query;state.kind=values.kind;state.offset=0;await load();}
  else if(form.hasAttribute('data-music-edit-form')&&editing){await action('music.edit',{id:editing.id,expectedRevision:editing.organizationRevision,...values},async()=>{editing=null;dirty=false;state.notice='Organization saved in this workspace.';await load();});}
 }
 function input(event){if(event.target.closest('[data-music-edit-form]')&&editing){editing[event.target.name]=event.target.value;dirty=true;}}
 function keydown(event){if(event.key==='Escape'&&previewId){event.preventDefault();stop(true);}}
 const refresh=()=>{if(!disposed&&!state.busy&&!dirty&&!editing)void load();};
 globalThis.window?.addEventListener('focus',refresh);
 container.addEventListener('keydown',keydown);
 content.addEventListener('click',click);content.addEventListener('submit',submit);content.addEventListener('input',input);
 render();void load();
 return {canLeave,dispose(){disposed=true;requestRevision++;if(importRequest)void invoke('music.cancel',{requestId:importRequest}).catch(()=>{});stop();globalThis.window?.removeEventListener('focus',refresh);container.removeEventListener('keydown',keydown);content.removeEventListener('click',click);content.removeEventListener('submit',submit);content.removeEventListener('input',input);}};
}
