import {useEffect,useId,useRef,useState} from 'react';

const endpoint='https://templates.webflow.com/templates-api/api/templates/support-request';
const topics={pre_purchase:'Pre-purchase question',bug_help:'Bug or help using the template',customization:'Customization request',file_request:'File request',refund_licensing:'Refund or licensing question',other:'Other'};
/** Uses the published Marketplace support contract; no alternate delivery backend. */
export default function SupportRequest({templateSlug,templateName,creatorName,buttonLabel}:{templateSlug:string;templateName:string;creatorName:string;buttonLabel?:string}){
 const id=useId();const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const [topic,setTopic]=useState('');const [name,setName]=useState('');const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [website,setWebsite]=useState('');
 const [status,setStatus]=useState<'editing'|'sending'|'sent'|'failed'>('editing');const [error,setError]=useState('');const key=useRef('');const sending=useRef(false);
 const [ready,setReady]=useState(false);const signature=useRef('');const draftKey=`source-support-draft:${templateSlug}`;
 const canSend=!import.meta.env.DEV;
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(saved&&Date.now()-saved.updated<6*60*60*1000&&typeof saved.topic==='string'&&typeof saved.email==='string'&&typeof saved.message==='string'&&typeof saved.name==='string'){setTopic(saved.topic in topics?saved.topic:'');setName(saved.name.slice(0,160));setEmail(saved.email.slice(0,254));setMessage(saved.message.slice(0,4000));key.current=typeof saved.key==='string'?saved.key:crypto.randomUUID();signature.current=JSON.stringify([saved.topic,saved.name,saved.email,saved.message])}}catch{}setReady(true);
 },[draftKey]);
 useEffect(()=>{if(!ready||status==='sent')return;const next=JSON.stringify([topic,name,email,message]);if(signature.current!==next||!key.current){key.current=crypto.randomUUID();signature.current=next}try{sessionStorage.setItem(draftKey,JSON.stringify({topic,name,email,message,key:key.current,updated:Date.now()}))}catch{}},[ready,topic,name,email,message,draftKey,status]);
 function close(){if(sending.current)return;dialog.current?.close();trigger.current?.focus();}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;
  if(message.trim().length<10){setError('Enter a message of at least 10 characters.');return;}
  if(!canSend){setError('Sending is disabled in development. Your message has not been sent.');return;}
  sending.current=true;setStatus('sending');setError('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_slug:templateSlug,request_type:topic,buyer_name:name.trim(),buyer_email:email.trim(),message:message.trim(),website,idempotency_key:key.current}),signal:AbortSignal.timeout(20000)});
   const result=await response.json();
   if(response.ok&&result.success&&typeof result.data?.request_id==='string'){setStatus('sent');try{sessionStorage.removeItem(draftKey)}catch{}return;}
   setStatus('failed');setError(response.status===429?'Too many requests. Please wait before trying again.':'The request was not confirmed. Please try again later.');
  }catch{setStatus('failed');setError('Delivery could not be confirmed. Check your connection. Retrying unchanged text keeps the same request identifier.');}
  finally{sending.current=false;}
 }
 return <div className="source-support"><button ref={trigger} type="button" className="wfdt-button wfdt-button-secondary" onClick={()=>dialog.current?.showModal()}>{buttonLabel||`Contact ${creatorName||'creator'}`}</button>
 <dialog ref={dialog} className="source-support-dialog" aria-labelledby={`${id}-title`} onCancel={event=>{if(sending.current)event.preventDefault()}} onClose={()=>trigger.current?.focus()}>
  <h2 id={`${id}-title`}>Contact {creatorName||'the creator'}</h2><p>About {templateName}</p>
  {status==='sent'?<><p role="status">Your support request was sent.</p><button type="button" onClick={close}>Close</button></>:<form onSubmit={submit}>
   <fieldset disabled={status==='sending'}>
    <label htmlFor={`${id}-topic`}>Topic</label><select id={`${id}-topic`} required value={topic} onChange={event=>setTopic(event.target.value)}><option value="">Choose a topic</option>{Object.entries(topics).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    <label htmlFor={`${id}-name`}>Your name</label><input id={`${id}-name`} autoComplete="name" maxLength={160} value={name} onChange={event=>setName(event.target.value)}/>
    <label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/>
    <label htmlFor={`${id}-message`}>Message</label><textarea id={`${id}-message`} required minLength={10} maxLength={4000} value={message} onChange={event=>setMessage(event.target.value)}/>
    <div className="source-support-honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>Website</label><input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></div>
   </fieldset>
   <p>Webflow sends your message and email address to {creatorName||'the creator'} so they can respond.</p>
   {!canSend&&<p>Development mode: form validation is available; delivery is disabled.</p>}
   {error&&<p role="alert">{error}</p>}
   <div className="source-support-actions"><button type="button" disabled={status==='sending'} onClick={close}>Cancel</button><button type="submit" disabled={status==='sending'}>{status==='sending'?'Sending…':'Send request'}</button></div>
  </form>}
 </dialog></div>;
}
