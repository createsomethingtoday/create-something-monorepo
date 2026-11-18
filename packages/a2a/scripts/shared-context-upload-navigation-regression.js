// Owned GET-only preview. All context uploads are held/fake responses, never forwarded.
(async () => {
  if (location.origin !== 'http://127.0.0.1:4201') throw Error('Own synthetic preview only');
  const original=window.fetch,calls=[];
  const wait=async test=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');};
  const pane=label=>document.querySelector('.shared-tabs button[aria-label="'+label+'"]').click();
  const form=()=>document.querySelector('#f-context-title')?.form;
  let release;
  try {
    window.fetch=(input,init)=>{
      const method=init?.method??'GET';
      if(method==='POST'&&String(input).endsWith('/context')){
        calls.push(JSON.parse(init.body));
        const reply=()=>new Response(JSON.stringify({context:{id:'synthetic-context-ack'}}),{headers:{'Content-Type':'application/json'}});
        if(calls.length===1)return new Promise(resolve=>{release=()=>resolve(reply());});
        return Promise.resolve(reply());
      }
      if(!['GET','HEAD'].includes(method))throw Error('Unexpected mutation blocked');
      return original(input,init);
    };
    pane('Shared context');await wait(()=>form());
    for(const [id,value] of [['#f-context-title','Synthetic context navigation'],['#f-context-text','Unsent synthetic document body']]){
      const input=document.querySelector(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const first=form(),firstSubmit=first.querySelector('button[type=submit]');first.requestSubmit();await wait(()=>release);
    pane('Messages · conversation');pane('Shared context');await wait(()=>form()&&form()!==first);
    const pendingDisabled=form().querySelector('button[type=submit]').disabled;
    release();await wait(()=>!firstSubmit.disabled&&form());
    const title=document.querySelector('#f-context-title').value,text=document.querySelector('#f-context-text').value;
    form().requestSubmit();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return {pass:pendingDisabled&&calls.length===1&&title===''&&text==='',pendingDisabled,posts:calls.length,titleAfterAcknowledgment:title,textAfterAcknowledgment:text,scope:'Tab-local held/fake context acknowledgments; no persisted uploads'};
  } finally {window.fetch=original;document.querySelector('#refresh').click();}
})()
