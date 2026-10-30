import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {Template} from '../lib/api';
import {safeProfileUrl,type CreatorCustomization,type CreatorSource} from '../lib/creator-storefront.mjs';

export default function CreatorProfileEditor({profile,items,total,value,onPreview,onClose}:{profile:CreatorSource;items:Template[];total:number;value:CreatorCustomization;onPreview:(value:CreatorCustomization)=>void;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [draft,setDraft]=useState<CreatorCustomization>({...value,bio:value.bio??profile.bio,picks:Array.from({length:3},(_,i)=>value.picks?.[i]??{slug:'',note:''})});
 const [error,setError]=useState('');
 const own=items.filter(t=>t.creator_slug===profile.slug);
 useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();return()=>{ref.current?.close();if(previous instanceof HTMLElement)previous.focus()}},[]);
 const field=(key:keyof CreatorCustomization,value:string)=>setDraft(d=>({...d,[key]:value}));
 function pin(index:number,key:'slug'|'note',value:string){setDraft(d=>({...d,picks:d.picks?.map((p,i)=>i===index?{...p,[key]:value}:p)}));}
 function submit(event:FormEvent){
  event.preventDefault();
  for(const key of ['coverUrl','websiteUrl','portfolioUrl','contactUrl'] as const){if(draft[key]?.trim()&&!safeProfileUrl(draft[key])){setError('Use complete HTTPS links without a username or password.');return}}
  if(Boolean(draft.support?.trim())!==Boolean(draft.contactUrl?.trim())){setError('Add both support details and a contact link, or leave both blank.');return}
  onPreview(draft);
 }
 return <dialog ref={ref} className="rd-profile-editor" aria-labelledby="profile-editor-heading" onCancel={onClose}>
  <form onSubmit={submit}>
   <header><div><p>Local preview only</p><h2 id="profile-editor-heading">Customize your profile</h2></div><button type="button" onClick={onClose} aria-label="Close profile editor">×</button></header>
   <p className="rd-profile-editor-intro">Try your storefront before publishing. Changes are saved only in this browser tab; your live Marketplace profile stays unchanged.</p>
   <fieldset><legend>Introduce your studio</legend>
    <label>Positioning statement <span>Optional · 120 characters</span><input name="headline" value={draft.headline||''} maxLength={120} onChange={e=>field('headline',e.target.value)} placeholder="Who you design for and what makes your work distinctive"/></label>
    <label>About your studio <span>500 characters</span><textarea name="bio" value={draft.bio||''} maxLength={500} onChange={e=>field('bio',e.target.value)}/></label>
    <label>Cover image <span>Optional · HTTPS image URL</span><input name="coverUrl" type="url" value={draft.coverUrl||''} onChange={e=>field('coverUrl',e.target.value)} placeholder="Leave blank to show a composition of your work"/></label>
   </fieldset>
   <fieldset><legend>Your links</legend><p>Your published profile links are retained.</p>
    <label>Website <input name="websiteUrl" type="url" value={draft.websiteUrl||''} onChange={e=>field('websiteUrl',e.target.value)} placeholder="https://"/></label>
    <label>Portfolio <input name="portfolioUrl" type="url" value={draft.portfolioUrl||''} onChange={e=>field('portfolioUrl',e.target.value)} placeholder="https://"/></label>
   </fieldset>
   <fieldset><legend>Choose up to three templates</legend><p>Put your strongest work first. Explain who each template suits or why you selected it. Leave all three blank to show popular templates.</p>{total>own.length&&<p>Showing {own.length} of your {total} published templates in this preview.</p>}
    {draft.picks?.map((pick,index)=><div className="rd-profile-pin" key={index}>
     <label>Template {index+1}<select name={`template-${index+1}`} value={pick.slug} onChange={e=>pin(index,'slug',e.target.value)}><option value="">No selection</option>{own.map(t=><option key={t.template_slug} value={t.template_slug} disabled={draft.picks?.some((p,i)=>i!==index&&p.slug===t.template_slug)}>{t.name}</option>)}</select></label>
     <label>Your note <span>Optional · 240 characters</span><textarea name={`note-${index+1}`} value={pick.note||''} maxLength={240} disabled={!pick.slug} onChange={e=>pin(index,'note',e.target.value)} placeholder="What should a buyer know about this template?"/></label>
    </div>)}
   </fieldset>
   <fieldset><legend>Support & customization</legend><p>Optional. Describe what you offer and link to where buyers can contact you. This section appears only when both fields are filled.</p>
    <label>What you offer <textarea name="support" maxLength={400} value={draft.support||''} onChange={e=>field('support',e.target.value)}/></label>
    <label>Contact destination <input name="contactUrl" type="url" value={draft.contactUrl||''} onChange={e=>field('contactUrl',e.target.value)} placeholder="https://"/></label>
   </fieldset>
   {error&&<p role="alert">{error}</p>}
   <footer><button type="button" className="rd-storefront-secondary" onClick={onClose}>Cancel</button><button type="submit" className="rd-storefront-primary">Preview changes</button></footer>
  </form>
 </dialog>;
}
