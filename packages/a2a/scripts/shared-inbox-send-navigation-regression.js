// Actual built UI, held/fake POST acknowledgments only; never forward a mutation.
(async () => {
  if (location.origin !== 'http://127.0.0.1:4201') throw Error('Own GET-only preview only');
  const original = window.fetch, results = [];
  const wait = async test => { for (let i=0;i<200;i++) { if(test()) return; await new Promise(r=>setTimeout(r,10)); } throw Error('Timed out'); };
  const json = value => new Response(JSON.stringify(value), {headers:{'Content-Type':'application/json'}});
  const refresh = async () => { const old=document.querySelector('.shared-compose');document.querySelector('#refresh').click();await wait(()=>document.querySelector('.shared-compose')&&document.querySelector('.shared-compose')!==old); };
  const listData = await (await original('/api/v2/inboxes')).json();
  const list = Array.isArray(listData) ? listData : listData.inboxes;
  const primary = list[0], secondary={...primary,id:'SYNTHETIC-send-race-secondary',name:'Synthetic second inbox'};
  const page = await (await original('/api/v2/inboxes/'+primary.id+'/messages')).json();
  try {
    for (const kind of ['conversation','request']) {
      let release;
      const calls=[],postedId=crypto.randomUUID(),text='Synthetic '+kind+' navigation race';
      window.fetch=(input,init)=>{
        const url=String(input),method=init?.method??'GET';
        if(method==='POST'&&/\/messages$/.test(url)) {
          const body=JSON.parse(init.body);calls.push(body);
          const posted={...page.items[0],id:postedId,cursor:99999,text:body.text,kind:body.kind,state:body.kind==='request'?'pending':'posted',author_kind:'owner',author_agent_id:null,assignee_agent_id:body.assigneeAgentId??null,assignment_version:1};
          if(calls.length===1)return new Promise(resolve=>{release=()=>resolve(json(posted));});
          return Promise.resolve(json(posted));
        }
        if(!['GET','HEAD'].includes(method))throw Error('Unexpected mutation blocked');
        if(url.endsWith('/inboxes'))return Promise.resolve(json(Array.isArray(listData)?[...list,secondary]:{...listData,inboxes:[...list,secondary]}));
        if(url.includes(secondary.id))return original(url.replace(secondary.id,primary.id),init);
        return original(input,init);
      };
      await refresh();
      const form=document.querySelector('.shared-compose'),input=form.querySelector('textarea'),mode=form.querySelector('select[name=kind]');
      input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));
      mode.value=kind;mode.dispatchEvent(new Event('change',{bubbles:true}));
      if(kind==='request'){const a=form.querySelector('select[name=assignee]');a.value=a.options[1].value;a.dispatchEvent(new Event('change',{bubbles:true}));}
      const oldSubmit=form.querySelector('button[type=submit]');form.requestSubmit();await wait(()=>release);
      [...document.querySelectorAll('.inbox-option')].find(e=>e.textContent.includes(secondary.name)).click();
      await wait(()=>document.querySelector('.workspace-title')?.textContent===secondary.name&&document.querySelector('.shared-compose'));
      [...document.querySelectorAll('.inbox-option')].find(e=>e.textContent.includes(primary.name)).click();
      await wait(()=>document.querySelector('.workspace-title')?.textContent===primary.name&&document.querySelector('.shared-compose'));
      const restored=document.querySelector('.shared-compose');
      const restoredDraft=restored.querySelector('textarea').value,restoredEnabled=!restored.querySelector('button[type=submit]').disabled;
      release();await wait(()=>!oldSubmit.disabled);
      restored.requestSubmit();await wait(()=>calls.length===2&&!!document.getElementById('message-'+postedId));
      results.push({kind,restoredDraft,restoredEnabled,pass:calls[0].idempotencyKey===calls[1].idempotencyKey,keys:calls.map(c=>c.idempotencyKey),postedRows:document.querySelectorAll('#message-'+postedId).length,draftAfterAcknowledgment:document.querySelector('.shared-compose textarea').value});
      window.fetch=original;await refresh();
    }
    return {pass:results.every(r=>r.pass&&r.postedRows===1&&r.draftAfterAcknowledgment===''),scope:'Tab-local fake acknowledgments; no persisted sends',results};
  } finally { window.fetch=original; }
})()
