import {lazy,Suspense,useEffect,useState} from 'react';
import type {Template} from '../lib/api';
import {buildStorefront,type CreatorSource,type CreatorCustomization} from '../lib/creator-storefront.mjs';
import Cards from './Cards';
import CmsWidget from './CmsWidget';
const ProfileEditor=lazy(()=>import('./CreatorProfileEditor'));

export default function CreatorStorefront({profile,items,total,published={},devPreview=false}:{profile:CreatorSource;items:Template[];total:number;published?:CreatorCustomization;devPreview?:boolean}){
 const [custom,setCustom]=useState<CreatorCustomization>(published);
 const [editing,setEditing]=useState(false);
 const [status,setStatus]=useState('');
 const [localDraft,setLocalDraft]=useState(false);
 const [shareUrl,setShareUrl]=useState('');
 const key=`marketplace-creator-preview:v1:${profile.slug}`;
 useEffect(()=>{if(!devPreview)return;try{const saved=sessionStorage.getItem(key);if(saved){const value=JSON.parse(saved);if(value&&typeof value==='object'&&!Array.isArray(value)){setCustom(value);setLocalDraft(true)}}}catch{/* Storage is optional; the current profile still renders. */}},[devPreview,key]);
 const model=buildStorefront(profile,items,total,custom);
 async function share(section=''){
  const url=new URL(`/templates/designers/${profile.slug}${section}`,location.origin).href;
  try{await navigator.clipboard.writeText(url);setShareUrl('');setStatus(localDraft?'Link copied. Local draft changes are visible only in this browser tab.':'Profile link copied.')}catch{setShareUrl(url);setStatus('Copy this profile link:')}
 }
 function preview(value:CreatorCustomization){
  setCustom(value);setLocalDraft(true);setEditing(false);
  try{sessionStorage.setItem(key,JSON.stringify(value));setStatus('Preview saved in this tab. Nothing has been published.')}catch{setStatus('Preview applied. Browser storage is unavailable; refreshing will discard these changes.')}
 }
 function reset(){setCustom(published);setLocalDraft(false);try{sessionStorage.removeItem(key)}catch{}setStatus('Published profile restored.');}
 return <main id="main" className="rd-storefront">
  <nav className="rd-storefront-breadcrumb" aria-label="Breadcrumb"><a href="/templates">Templates</a><span aria-hidden="true">/</span><a href="/templates/designers">Creators</a><span aria-hidden="true">/</span><span>{model.name}</span></nav>
  {devPreview&&<div className="rd-profile-preview-bar"><span>{localDraft?'Local profile draft':'Creator profile preview'} · Changes stay in this tab</span><button type="button" onClick={()=>setEditing(true)}>Customize profile</button>{localDraft&&<button type="button" onClick={reset}>Reset draft</button>}</div>}
  <header className="rd-storefront-header">
   <div className="rd-storefront-identity">
    <div className="rd-storefront-avatar-row">{model.avatar?<img src={model.avatar} alt="" width="64" height="64"/>:<span className="rd-storefront-initial" aria-hidden="true">{model.name.slice(0,1)}</span>}<span>Webflow template creator</span></div>
    <h1>{model.name}</h1>
    {model.headline&&<p className="rd-storefront-positioning">{model.headline}</p>}
    {model.bio&&<p className="rd-storefront-bio">{model.bio}</p>}
    <p className="rd-storefront-count">{model.total.toLocaleString('en-US')} {model.total===1?'template':'templates'} in the marketplace</p>
    <div className="rd-storefront-actions"><a className="rd-storefront-primary" href="#all-templates">Browse templates</a>{model.links[0]&&<a className="rd-storefront-secondary" href={model.links[0].href} target="_blank" rel="noopener noreferrer">{model.links[0].label} <span aria-hidden="true">↗</span></a>}<button type="button" className="rd-storefront-share" onClick={()=>void share()}>Copy profile link</button></div>
    {model.links.length>1&&<nav className="rd-storefront-links" aria-label="Creator links">{model.links.slice(1).map(link=><a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}</nav>}
   </div>
   {model.coverUrl?<div className="rd-storefront-cover"><img src={model.coverUrl} alt={model.coverAlt} onError={e=>{e.currentTarget.style.visibility='hidden'}}/></div>:model.selected.length>0&&<div className="rd-storefront-cover rd-storefront-composition" aria-hidden="true">{model.selected.map(({template})=><img key={template.template_slug} src={template.thumbnail_image_url} alt=""/>)}</div>}
  </header>
  <div className="rd-storefront-status" role="status">{status}{shareUrl&&<input aria-label="Profile link" value={shareUrl} readOnly onFocus={e=>e.currentTarget.select()}/>}</div>
  {model.selected.length>0&&<section className="rd-storefront-selection" id="selected-work" aria-labelledby="selected-work-heading">
   <div className="rd-storefront-section-head"><div><p>{model.selectionTitle==='Selected work'?'A closer look':'Explore the collection'}</p><h2 id="selected-work-heading">{model.selectionTitle}</h2></div><button className="rd-storefront-share" type="button" onClick={()=>void share('#selected-work')}>Copy collection link</button></div>
   <div className="rd-storefront-picks">{model.selected.map(({template,note})=><article key={template.template_slug}><Cards items={[template]}/>{note?<p className="rd-storefront-note"><span>From {model.name}</span>{note}</p>:template.description_short&&<p className="rd-storefront-template-description">{template.description_short}</p>}</article>)}</div>
  </section>}
  {model.support&&<section className="rd-storefront-support" aria-labelledby="creator-support-heading"><div><p>From the creator</p><h2 id="creator-support-heading">Support & customization</h2><p>{model.support.text}</p></div><a className="rd-storefront-secondary" href={model.support.href} target="_blank" rel="noopener noreferrer">Contact {model.name} <span aria-hidden="true">↗</span></a></section>}
  <section id="all-templates" className="rd-storefront-catalog" aria-labelledby="all-templates-heading"><div className="rd-storefront-section-head"><div><p>The full collection</p><h2 id="all-templates-heading">Templates by {model.name}</h2></div></div><CmsWidget widget="TemplateFilterBar" props={{creatorSlug:profile.slug,showSubcategoryPills:false,showSearch:false,showFreeOnly:true,defaultSort:'popular'}}/><CmsWidget widget="TemplateGrid" props={{creatorSlug:profile.slug,initialSort:'popular',showEmptyState:true,showEmptyRecommendations:false,showFeaturedBadge:true,showMarketplaceSignals:true}}/></section>
  {devPreview&&editing&&<Suspense fallback={<p role="status">Opening profile editor…</p>}><ProfileEditor profile={profile} items={items} total={total} value={custom} onPreview={preview} onClose={()=>setEditing(false)}/></Suspense>}
 </main>;
}
