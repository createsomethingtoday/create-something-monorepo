import {useEffect,useRef,useState} from 'react';
const storageKey='source-marketplace-consent-v1';const changed='source-marketplace-consent-changed';
function preference(){try{return localStorage.getItem(storageKey)}catch{return null}}
export function analyticsAllowed(){return !import.meta.env.DEV&&(location.hostname==='webflow.com'||location.hostname.endsWith('.webflow.com'))&&preference()==='analytics'}
export function useAnalyticsConsent(){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{const sync=()=>setEnabled(analyticsAllowed());sync();window.addEventListener(changed,sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener(changed,sync);window.removeEventListener('storage',sync)}},[]);return enabled;
}
export default function Consent(){
 const [visible,setVisible]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  if(!import.meta.env.DEV&&!preference())setVisible(true);
  const buttons=document.querySelectorAll('#show-cookie-preferences');
  const show=(event:Event)=>{event.preventDefault();dialog.current?.showModal()};buttons.forEach(button=>button.addEventListener('click',show));
  return()=>buttons.forEach(button=>button.removeEventListener('click',show));
 },[]);
 function save(value:string){try{localStorage.setItem(storageKey,value)}catch{}window.dispatchEvent(new Event(changed));setVisible(false);dialog.current?.close()}
 const choices=<><p>Allow optional Marketplace analytics to help improve template browsing? Essential storage supports your choices and current workflow. <a href="https://webflow.com/legal/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie policy</a></p><button type="button" onClick={()=>save('essential')}>Essential only</button> <button type="button" onClick={()=>save('analytics')}>Allow analytics</button></>;
 return <>{visible&&<aside className="source-consent" aria-label="Cookie preferences">{choices}</aside>}<dialog ref={dialog} className="source-support-dialog" aria-label="Cookie preferences"><h2>Cookie preferences</h2>{choices}<p><button type="button" onClick={()=>dialog.current?.close()}>Cancel</button></p></dialog></>;
}
