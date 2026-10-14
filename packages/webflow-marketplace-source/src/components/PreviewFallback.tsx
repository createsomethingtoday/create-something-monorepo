import {useState} from 'react';
import {safePreviewUrl} from '@marketplace/marketplace/templateUrlSafety';

export default function PreviewFallback({name,url,thumbnail,slug}:{name:string;url:string;thumbnail:string;slug:string}) {
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
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
    {(['desktop','mobile'] as const).map(value=><button key={value} type="button" aria-pressed={device===value} onClick={()=>setDevice(value)}>{value==='desktop'?'Desktop':'Mobile'}</button>)}
   </div>
   <button type="button" onClick={openPreview}>Open {device} preview ↗</button>
  </div>
  <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open live ${name} preview`}><img src={thumbnail} alt={`${name} template preview`}/></a>
  <p>This host cannot embed the live demo. Open it in a separate window to test the selected viewport. Your browser may open a tab or limit the window size. For an embedded Desktop/Mobile viewer, <a href={`https://webflow.com/templates/html/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer">use the Webflow detail page</a>.</p>
 </section>;
}
