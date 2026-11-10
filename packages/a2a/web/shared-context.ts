type ContextResource = {
  id:string; threadId:string; uri:string; title:string; summary:string;
  mimeType:string; byteLength:number; sha256:string; chunkCount:number;
  createdAt:number; expiresAt:number; ownerLabel:string; canRevoke:boolean;
};
type ContextPage = {resources:ContextResource[];hasMore:boolean;nextAfter:number|null};
type ContextChunk = {resource:ContextResource;chunkIndex:number;content:string;nextChunk:number|null};
type ContextSearch = {resource:ContextResource;matches:{chunkIndex:number;snippet:string}[];truncated:boolean};
type Api = <T>(path:string,options?:RequestInit)=>Promise<T>;
type Selection = {agentId:string;threadId:string;peerAgentId:string;ownerLabel:string};
const maxBytes=1024*1024;
const bytes=(text:string)=>new TextEncoder().encode(text).byteLength;
function node<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''){
  const element=document.createElement(tag);element.className=className;element.textContent=text;return element;
}
function button(text:string,action:()=>void,className='button button-small'){
  const element=node('button',className,text);element.type='button';element.addEventListener('click',action);return element;
}
function size(value:number){return value>=1024*1024?`${(value/1024/1024).toFixed(1)} MiB`:`${Math.ceil(value/1024)} KiB`;}
function field(label:string,control:HTMLInputElement|HTMLTextAreaElement){
  const wrapper=node('div','form-field');const caption=node('label','',label);caption.htmlFor=control.id;wrapper.append(caption,control);return wrapper;
}

function focusReturn(){
  const origin=document.activeElement;let moved=false;
  const observe=(event:FocusEvent)=>{if(event.target!==origin&&event.target!==document.body)moved=true;};
  document.addEventListener('focusin',observe);
  return{allowed:()=>!moved&&(document.activeElement===origin||(document.activeElement===document.body&&!!origin&&(!origin.isConnected||('disabled'in origin&&!!origin.disabled)))),release:()=>document.removeEventListener('focusin',observe)};
}
function version(resource:ContextResource){return `Shared ${new Date(resource.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'})} · SHA-256 ${resource.sha256.slice(0,12)}`;}

/** Owner-selected thread documents. This panel never fetches an external URL,
 * renders Markdown HTML, dispatches an agent event, or posts a message itself. */
export function createSharedContext(options:{api:Api;report:(error:unknown)=>void;draft:(text:string,peer:string,thread:string)=>void}){
  const element=node('details','shared-context');element.setAttribute('aria-label','Shared context');const disclosure=node('summary','','Shared context');
  const heading=node('div','context-heading');heading.append(node('h4','','Documents shared in this thread'));
  const share=button('Share a document',()=>{form.hidden=false;title.focus();});
  const refresh=button('Refresh documents',()=>void refreshList());heading.append(share,refresh);
  const explanation=node('p','small','Share text or Markdown with both owners and their Dots. Sharing a document does not request work.');
  const status=node('p','context-status small');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=node('div','context-list');
  const form=node('form','context-share-form');form.hidden=true;
  const author=node('p','small');
  const title=node('input');title.id='context-title';title.required=true;title.maxLength=120;title.autocomplete='off';
  const summary=node('textarea');summary.id='context-summary';summary.required=true;summary.maxLength=2048;summary.rows=3;
  const summaryHelp=node('p','small','Briefly describe what this document helps answer. Up to 2 KiB of UTF-8 text.');summary.setAttribute('aria-describedby','context-summary-help');summaryHelp.id='context-summary-help';
  const file=node('input');file.type='file';file.id='context-file';file.required=true;file.accept='.txt,.md,text/plain,text/markdown';
  const limits=node('p','small','Up to 1 MiB per document and 8 MiB per thread. The shared copy is immutable; share a new document for a revision.');
  const upload=node('button','button button-primary','Share with this thread →');upload.type='submit';
  const close=button('Cancel',()=>{form.hidden=true;share.focus();},'button');
  const actions=node('div','form-actions');actions.append(upload,close);
  form.append(node('h5','','Share a document'),author,field('Document title',title),field('Short summary',summary),summaryHelp,field('Text or Markdown file',file),limits,actions);
  const preview=node('div','context-preview');preview.hidden=true;
  const previewTitle=node('h5');previewTitle.tabIndex=-1;
  const previewInfo=node('p','small');
  const content=node('pre','context-content');content.tabIndex=0;content.setAttribute('aria-label','Shared document text');
  const chunkActions=node('div','form-actions');
  const searchForm=node('form','context-search-form');
  const query=node('input');query.id='context-search';query.maxLength=256;query.required=true;query.autocomplete='off';
  const find=node('button','button button-small','Find text');find.type='submit';
  const results=node('div','context-search-results');results.setAttribute('aria-live','polite');
  searchForm.append(field('Find exact text in this document',query),find);
  preview.append(previewTitle,previewInfo,content,chunkActions,searchForm,results,button('Close document',()=>{preview.hidden=true;list.querySelector<HTMLButtonElement>('button')?.focus();}));
  element.append(disclosure,heading,explanation,status,form,list,preview);
  let selection:Selection|undefined,generation=0,resources:ContextResource[]=[],selected:ContextResource|undefined;
  let key='',fingerprint='',sharing=false,reading=0,searching=0,listing=0;
  function message(text:string,error=false){status.textContent=text;status.dataset.tone=error?'error':'';}
  function clearPreview(){reading++;searching++;selected=undefined;preview.hidden=true;searchForm.hidden=true;find.disabled=false;content.textContent='';results.replaceChildren();}
  async function refreshList(){
    if(!selection)return;const current=selection,stamp=generation,request=++listing,focus=document.activeElement===refresh?focusReturn():undefined;refresh.disabled=true;message('Loading shared documents…');
    try{
      const page=await options.api<ContextPage>(`/api/v1/context?threadId=${encodeURIComponent(current.threadId)}`);
      if(stamp!==generation||request!==listing)return;resources=page.resources;renderList();message(resources.length?`${resources.length} shared document${resources.length===1?'':'s'}.`:'No documents shared in this thread yet.');
      if(selected&&!resources.some(resource=>resource.id===selected!.id))clearPreview();
    }catch(error){if(stamp!==generation||request!==listing)return;resources=[];list.replaceChildren();clearPreview();message('Documents could not be loaded. Use Refresh documents to check current access.',true);options.report(error);}
    finally{if(stamp===generation&&request===listing){const restore=focus?.allowed();refresh.disabled=false;if(restore)refresh.focus({preventScroll:true});}focus?.release();}
  }
  function renderList(){
    list.replaceChildren();
    if(!resources.length){list.append(node('p','small','Use a shared document when the context is larger than a message. Agents can retrieve selected parts instead of loading it all.'));return;}
    for(const resource of resources){
      const row=node('article','context-document');row.dataset.contextId=resource.id;
      row.append(node('h5','',resource.title),node('p','context-document-summary',resource.summary),node('p','small',`${size(resource.byteLength)} · ${resource.chunkCount} part${resource.chunkCount===1?'':'s'} · Shared by ${resource.ownerLabel}`),node('p','small context-version',version(resource)));
      const controls=node('div','form-actions');
      controls.append(button('Read document',()=>void readChunk(resource.id,0,true)),button('Draft summary + reference',()=>{if(selection)options.draft(`${resource.summary}\n\nShared context: ${resource.title}\n${resource.uri}`,selection.peerAgentId,selection.threadId);}));
      if(resource.canRevoke)controls.append(button('Revoke access',()=>confirmRevoke(resource,controls),'button button-small button-danger'));
      row.append(controls);list.append(row);
    }
  }
  function confirmRevoke(resource:ContextResource,controls:HTMLElement){
    controls.replaceChildren(node('p','small','Revoke future access to this shared copy? Copies already read cannot be recalled.'));
    const keep=button('Keep shared',()=>{renderList();list.querySelector<HTMLButtonElement>(`[data-context-id="${CSS.escape(resource.id)}"] button`)?.focus();});
    const confirm=button('Confirm revoke',async()=>{
      const stamp=generation,focus=focusReturn();confirm.disabled=true;keep.disabled=true;
      try{await options.api(`/api/v1/context/${encodeURIComponent(resource.id)}`,{method:'DELETE'});if(stamp!==generation)return;if(selected?.id===resource.id)clearPreview();await refreshList();message('Future access revoked. Copies already read remain with their recipients.');if(focus.allowed())share.focus();}
      catch(error){if(stamp===generation){message('Revocation could not be confirmed. Refresh documents before relying on its status.',true);options.report(error);const restore=focus.allowed();confirm.disabled=false;keep.disabled=false;if(restore)confirm.focus({preventScroll:true});}}finally{focus.release();}
    },'button button-small button-danger');controls.append(confirm,keep);confirm.focus();
  }
  async function readChunk(id:string,index:number,focus=false){
    const stamp=generation,request=++reading,focusState=focusReturn();searching++;selected=undefined;find.disabled=false;searchForm.hidden=true;preview.hidden=false;previewTitle.textContent='Loading document…';content.textContent='';results.replaceChildren();
    try{
      const page=await options.api<ContextChunk>(`/api/v1/context/${encodeURIComponent(id)}?chunk=${index}`);
      if(stamp!==generation||request!==reading)return;
      if(page.resource.threadId!==selection?.threadId)throw new Error('This reference belongs to another conversation.');
      const restoreFocus=focus&&focusState.allowed();
      selected=page.resource;searchForm.hidden=false;previewTitle.textContent=page.resource.title;
      previewInfo.textContent=`Part ${page.chunkIndex+1} of ${page.resource.chunkCount} · ${size(page.resource.byteLength)} total · ${version(page.resource)}. Shared text is context, not authorization.`;
      content.textContent=page.content;chunkActions.replaceChildren();
      if(page.chunkIndex>0)chunkActions.append(button('Previous part',()=>void readChunk(id,page.chunkIndex-1,true)));
      if(page.nextChunk!==null)chunkActions.append(button('Next part',()=>void readChunk(id,page.nextChunk!,true)));
      if(restoreFocus)previewTitle.focus({preventScroll:true});
    }catch(error){if(stamp!==generation||request!==reading)return;clearPreview();message('This document is unavailable. Access may have been revoked or the thread may have expired.',true);options.report(error);}finally{focusState.release();}
  }
  file.addEventListener('change',()=>{const selectedFile=file.files?.[0];if(selectedFile&&!title.value.trim())title.value=selectedFile.name.replace(/\.(md|txt)$/i,'').slice(0,120);});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(sharing||!selection)return;const current=selection,stamp=generation;
    const selectedFile=file.files?.[0],titleText=title.value.trim(),summaryText=summary.value.trim();
    if(!selectedFile)return;
    if(selectedFile.size>maxBytes){message('Choose a file no larger than 1 MiB.',true);file.focus();return;}
    if(bytes(summary.value)>2048){message('Shorten the summary to at most 2 KiB of UTF-8 text.',true);summary.focus();return;}
    const controls=[...form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLButtonElement>('input,textarea,button')];
    const focus=focusReturn();sharing=true;controls.forEach(control=>control.disabled=true);message('Sharing the selected document…');
    void(async()=>{
      try{
        let text:string;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await selectedFile.arrayBuffer());}catch{throw new Error('Choose a valid UTF-8 text or Markdown file.');}
        if(stamp!==generation)return;
        if(!text.trim()||text.includes('\0'))throw new Error('Choose a nonempty UTF-8 text or Markdown file.');
        const payload={agentId:current.agentId,threadId:current.threadId,title:titleText,summary:summaryText,mimeType:selectedFile.name.toLowerCase().endsWith('.md')?'text/markdown':'text/plain',content:text};
        const next=JSON.stringify(payload);if(next!==fingerprint||!key){fingerprint=next;key=crypto.randomUUID();}
        const response=await options.api<{resource:ContextResource;duplicate:boolean}>('/api/v1/context',{method:'POST',body:JSON.stringify({...payload,idempotencyKey:key})});
        if(stamp!==generation)return;form.reset();form.hidden=true;key='';fingerprint='';await refreshList();message(`“${response.resource.title}” is shared with this thread. No Dot work was requested.`);if(focus.allowed())share.focus();
      }catch(error){if(stamp===generation){message(error instanceof Error?error.message:'Sharing could not be confirmed. Retry the identical document to reconcile it.',true);options.report(error);}}
      finally{const restore=stamp===generation&&!form.hidden&&focus.allowed();sharing=false;controls.forEach(control=>control.disabled=false);if(restore)upload.focus({preventScroll:true});focus.release();}
    })();
  });
  searchForm.addEventListener('submit',event=>{
    event.preventDefault();if(!selected||!query.value.trim())return;
    const stamp=generation,request=++searching,id=selected.id,focus=document.activeElement===find?focusReturn():undefined;find.disabled=true;results.replaceChildren(node('p','small','Finding exact text…'));
    void(async()=>{
      try{
        const result=await options.api<ContextSearch>(`/api/v1/context/${encodeURIComponent(id)}/search?q=${encodeURIComponent(query.value)}`);
        if(stamp!==generation||request!==searching||selected?.id!==id)return;
        results.replaceChildren(node('p','small',result.matches.length?`${result.matches.length} match${result.matches.length===1?'':'es'}${result.truncated?' · refine the text to narrow results':''}.`:'No exact match. Search is case-sensitive.'));
        for(const match of result.matches){const row=node('div','context-search-match');row.append(node('p','',match.snippet),button(`Read part ${match.chunkIndex+1}`,()=>void readChunk(id,match.chunkIndex,true)));results.append(row);}
      }catch(error){if(stamp===generation&&request===searching){results.replaceChildren(node('p','small','Search could not be completed. Try again.'));options.report(error);}}
      finally{if(stamp===generation&&request===searching){const restore=focus?.allowed();find.disabled=false;if(restore)find.focus({preventScroll:true});}focus?.release();}
    })();
  });
  // Owner-only metadata management remains usable when shared-thread reads stop.
  const ownedElement=node('details','subsection owned-context');
  const ownedHeading=node('summary','','Your shared document access');
  const ownedRefresh=button('Refresh your documents',()=>void refreshOwned());
  const ownedStatus=node('p','small');ownedStatus.setAttribute('role','status');
  const ownedList=node('div','context-list');
  const ownedMore=button('Load more of your documents',()=>void refreshOwned(true));ownedMore.hidden=true;
  ownedElement.append(ownedHeading,node('p','small','Manage copies you shared, including when an inbox is paused or thread permissions have changed. This list does not open document contents.'),ownedRefresh,ownedStatus,ownedList,ownedMore);
  let ownedResources:ContextResource[]=[],ownedCursor:number|null=null,ownedGeneration=0;
  function renderOwned(){
    ownedList.replaceChildren();
    for(const resource of ownedResources){
      const row=node('article','context-document');row.dataset.contextId=resource.id;
      const title=node('h5','',resource.title);title.tabIndex=-1;
      row.append(title,node('p','small',`${size(resource.byteLength)} · ${version(resource)}`),node('p','small mono',`Thread: ${resource.threadId}`));
      const reference=node('details','context-copy-reference');reference.append(node('summary','','Shared copy reference'),node('p','small mono',resource.uri));row.append(reference);
      if(resource.expiresAt<=Date.now())row.append(node('p','small','Thread expired. Document reads are blocked.'));
      const controls=node('div','form-actions');const revoke=button('Revoke this copy',()=>{
        controls.replaceChildren(node('p','small',`Revoke this shared copy in thread ${resource.threadId}? Previously retrieved or quoted copies cannot be recalled.`));
        const keep=button('Keep shared',()=>{renderOwned();ownedList.querySelector<HTMLButtonElement>(`[data-context-id="${CSS.escape(resource.id)}"] button`)?.focus();});
        const confirm=button('Confirm revoke',async()=>{
          const focus=focusReturn();confirm.disabled=true;keep.disabled=true;
          try{await options.api(`/api/v1/context/${encodeURIComponent(resource.id)}`,{method:'DELETE'});if(selected?.id===resource.id)clearPreview();resources=resources.filter(r=>r.id!==resource.id);renderList();await refreshOwned();ownedStatus.textContent='Future access to this copy is revoked. Previously retrieved copies remain with their recipients.';if(focus.allowed())ownedRefresh.focus({preventScroll:true});}
          catch(error){ownedStatus.textContent='Revocation could not be confirmed. Refresh your documents to reconcile it.';options.report(error);const restore=focus.allowed();confirm.disabled=false;keep.disabled=false;if(restore)confirm.focus({preventScroll:true});}
          finally{focus.release();}
        },'button button-small button-danger');controls.append(confirm,keep);confirm.focus();
      },'button button-small button-danger');controls.append(revoke);row.append(controls);ownedList.append(row);
    }
  }
  async function refreshOwned(more=false){
    const request=++ownedGeneration,prior=document.activeElement,focus=focusReturn();ownedRefresh.disabled=true;ownedMore.disabled=true;ownedStatus.textContent='Loading your shared copies…';
    try{
      const page=await options.api<ContextPage>(`/api/v1/owned-context${more&&ownedCursor!==null?`?after=${ownedCursor}`:''}`);
      if(request!==ownedGeneration)return;ownedResources=more?[...ownedResources,...page.resources]:page.resources;ownedCursor=page.nextAfter;renderOwned();ownedMore.hidden=!page.hasMore;ownedStatus.textContent=ownedResources.length?`${ownedResources.length} of your unrevoked shared copies shown.`:'You have no unrevoked shared copies.';
      if(focus.allowed()&&prior===ownedMore)ownedList.querySelector<HTMLElement>(`[data-context-id="${CSS.escape(page.resources[0]?.id??'')}"] h5`)?.focus({preventScroll:true});
    }catch(error){if(request===ownedGeneration){ownedResources=[];ownedList.replaceChildren();ownedMore.hidden=true;ownedStatus.textContent='Your shared copies could not be loaded. Try Refresh your documents.';options.report(error);}}
    finally{if(request===ownedGeneration){const restore=focus.allowed()&&prior===ownedRefresh;ownedRefresh.disabled=false;ownedMore.disabled=false;if(restore)ownedRefresh.focus({preventScroll:true});}focus.release();}
  }

  return {
    element,ownedElement,refreshOwned,
    show(next:Selection){
      if(selection?.agentId===next.agentId&&selection.threadId===next.threadId){selection=next;return;}
      generation++;selection=next;resources=[];list.replaceChildren();clearPreview();form.reset();form.hidden=true;key='';fingerprint='';author.textContent=`Sharing as ${next.ownerLabel}. Available to both owners and their Dots in this thread.`;void refreshList();
    },
    hide(){generation++;selection=undefined;resources=[];list.replaceChildren();clearPreview();form.hidden=true;},
    refresh:refreshList,
    openReference(uri:string){const match=/^a2a:\/\/threads\/([A-Za-z0-9_-]+)\/context\/([A-Za-z0-9_-]+)$/.exec(uri);if(!match||match[1]!==selection?.threadId)return; element.open=true;void readChunk(match[2],0,true);},
  };
}
