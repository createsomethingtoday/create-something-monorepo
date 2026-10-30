import {useState,useEffect} from 'react';
import {safePreviewUrl,safeMarketplaceUrl} from '@marketplace/marketplace/templateUrlSafety';

export default function PreviewFallback({name,url,thumbnail,slug,designerUrl}:{name:string;url:string;thumbnail:string;slug:string;designerUrl?:string}) {
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 useEffect(()=>{let saved;try{saved=sessionStorage.getItem('wfdt-template-detail-preview-device')}catch{};setDevice(saved==='desktop'||saved==='mobile'?saved:window.matchMedia('(max-width:767px)').matches?'mobile':'desktop')},[]);
 const previewUrl=safePreviewUrl(url);
 if(!previewUrl)return null;
 function openPreview(){
  const width=device==='mobile'?390:1280;
  const preview=window.open('about:blank','_blank',`popup,width=${width},height=800`);
  if(!preview){window.open(previewUrl!,'_blank','noopener,noreferrer');return;}
  preview.opener=null;
  preview.location.replace(previewUrl!);
 }
 return <section className="source-preview-fallback" aria-label={`${name} preview`}>
  <div className="source-preview-toolbar">
   <div role="group" aria-label="Preview viewport">
    {(['desktop','mobile'] as const).map(value=><button key={value} type="button" aria-pressed={device===value} onClick={()=>{setDevice(value);try{sessionStorage.setItem('wfdt-template-detail-preview-device',value)}catch{}}}>{value==='desktop'?'Desktop':'Mobile'}</button>)}
   </div>
   <div className="rd-preview-links"><button type="button" onClick={openPreview}>Open live demo ↗</button>{safeMarketplaceUrl(designerUrl||'')&&<a href={safeMarketplaceUrl(designerUrl||'')!} target="_blank" rel="noopener noreferrer" title="Inspect the template in Webflow before buying">Inspect in Webflow ↗</a>}</div>
  </div>
  <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open live ${name} preview`}><img src={thumbnail} alt={`${name} template preview`}/></a>
  <p>Explore the live demo in a new window. The selected viewport requests a window size; your browser may open a tab instead. For an embedded preview, <a href={`https://webflow.com/templates/html/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer">use the Webflow detail page</a>.</p>
 </section>;
}
