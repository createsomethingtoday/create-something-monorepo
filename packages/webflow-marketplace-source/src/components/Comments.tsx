import {useRef,useState} from 'react';
declare global {interface Window {disqus_config?: (this:{page:{url:string;identifier:string}})=>void}}
/** Keep the export's Disqus community and canonical thread; load only on request. */
export default function Comments({slug}:{slug:string}){
 const [state,setState]=useState<'idle'|'loading'|'ready'|'failed'>('idle');const loading=useRef(false);
 function load(){
  if(loading.current)return;loading.current=true;setState('loading');
  window.disqus_config=function(){this.page.url=`https://webflow.com/templates/html/${slug}`;this.page.identifier=slug};
  const script=document.createElement('script');script.src='https://templatemarketplace.disqus.com/embed.js';script.async=true;
  script.onload=()=>{setState('ready')};script.onerror=()=>{loading.current=false;setState('failed');script.remove()};document.head.append(script);
 }
 return <div><p>Comments are hosted by Disqus. Loading comments connects to Disqus and its privacy policies apply.</p>{(state==='idle'||state==='failed')&&<button type="button" onClick={load}>{state==='failed'?'Retry loading comments':'Load comments'}</button>}{state==='loading'&&<p role="status">Loading comments…</p>}{state==='failed'&&<p role="alert">Comments could not load. Check your connection and try again.</p>}<div id="disqus_thread"/></div>;
}
