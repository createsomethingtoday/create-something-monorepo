import {useState} from 'react';
import {TemplateDetailConversionTracker} from '@marketplace/marketplace/TemplateDetailConversionTracker';
import {useAnalyticsConsent} from './Consent';
import {TemplateDetailHero} from '@marketplace/marketplace/TemplateDetailHero';
import {TemplateDetailStickyBar} from '@marketplace/marketplace/TemplateDetailStickyBar';
import type {Template} from '../lib/api';
import type {CreatorCustomization} from '../lib/creator-storefront.mjs';
import type {IncludedPage} from '../lib/detail-content.mjs';
import {localLink} from '../lib/routes.mjs';
import {readBrief,briefParams,evidenceFor,cmsLabel,priceLabel} from '../lib/discovery.mjs';
import PreviewFallback from './PreviewFallback';
export default function Detail({item:t,heroProps={},allowEmbed=false,devPreview=false,inventory=[],published,search='',section='hero'}:{section?:'hero'|'inventory'|'creator';item:Template;heroProps?:Record<string,unknown>;allowEmbed?:boolean;devPreview?:boolean;inventory?:IncludedPage[];published?:CreatorCustomization;search?:string}){
 const [shareStatus,setShareStatus]=useState('');
 async function share(){try{await navigator.clipboard.writeText(location.origin+location.pathname);setShareStatus('Link copied')}catch{setShareStatus('Copy this page’s address to share it.')}}
 const enableAnalytics=useAnalyticsConsent();
 const serviceUrl='/templates/services/service-type?'+new URLSearchParams({templateName:t.name,templateLink:t.url});
 const common={templateName:t.name,templateSlug:t.template_slug,creatorName:t.creator_name,price:priceLabel(t),isFree:t.is_free,browserPreviewUrl:{href:t.website_url,target:'_blank'},designerPreviewUrl:{href:t.preview_url,target:'_blank'},checkoutUrl:{href:t.purchase_url,target:'_blank'},enableAnalytics};
 const pages=inventory.length?inventory:(t.included_pages||[]).map(name=>({name,href:undefined}));
 const brief=readBrief(search),fromSearch=new URLSearchParams(search).get('from')==='search',evidence=evidenceFor(t,brief);
 if(section==='inventory')return <section className="rd-detail-summary rd-detail-inventory" aria-label="Included pages">{pages.length>0&&<h2>What’s included</h2>}<p className="rd-detail-caption">{cmsLabel(t)}</p>{pages.length?<><ul className="rd-included-pages">{pages.map((page,i)=><li key={i}>{page.href?<a href={page.href} target="_blank" rel="noopener noreferrer">{page.name} ↗</a>:page.name}</li>)}</ul><p className="rd-detail-caption">Page inventory supplied by the creator. Linked pages open the live demo.</p></>:<p><a href={t.website_url} target="_blank" rel="noopener noreferrer">See the demo for included pages ↗</a></p>}
    {fromSearch&&<details className="rd-detail-fit"><summary>Fit for your brief</summary><ul>{evidence.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul><p>{evidence.limit}</p>{brief.cms==='false'&&<p>{t.has_cms===false?'Matches your preference for a template without CMS.':t.has_cms===true?'Includes CMS, which differs from your selected preference.':'CMS capability is not confirmed.'}</p>}{brief.free&&!t.is_free&&<p>This template is paid and does not meet your free-only preference.</p>}<p>Category, style, and written project requirements need your review; these notes are not a quality rating.</p></details>}
</section>;
 if(section==='creator')return <section className="rd-detail-summary rd-detail-creator" aria-label="Creator and support"><h2>Created by {t.creator_name}</h2><a href={localLink(t.creator_profile_url)}>View creator profile →</a>{published?.support&&published.contactUrl?<><p>{published.support}</p><a href={published.contactUrl} target="_blank" rel="noopener noreferrer">Contact creator for support ↗</a><p className="rd-detail-caption">Support information provided by the creator.</p></>:null}<p><a href={serviceUrl}>Get customization help →</a></p><div className="rd-detail-share"><button type="button" onClick={share}>Copy template link</button><span role="status">{shareStatus}</span></div></section>;
 return <div className="rd-detail">
  <TemplateDetailConversionTracker templateSlug={t.template_slug} price={common.price} enableAnalytics={enableAnalytics}/>
  {fromSearch&&<a className="rd-back-results" href={'/templates/search?'+briefParams(brief)}>← Back to your search</a>}
  {devPreview&&<details className="source-dev-preview-note"><summary>Preview environment</summary><p>Desktop/Mobile demonstrates createsomething.agency. Open the live demo to inspect this template. Production uses the template’s own site.</p></details>}
  <TemplateDetailHero {...heroProps} {...common} compactLayout categoryNames={t.category_groups?.map(x=>x.name).join(',')} categoryLinks={t.category_groups?.map(x=>localLink(x.url)).join(',')} creatorLink={{href:localLink(t.creator_profile_url)}} creatorAvatar={t.creator_avatar_url?{src:t.creator_avatar_url,alt:t.creator_name}:undefined} summary={t.description_short} previewIframeUrl={{href:devPreview?'https://createsomething.agency/':t.website_url,target:'_blank'}} showPreviewIframe={allowEmbed||devPreview} showPreviewDeviceControls/>
  {!allowEmbed&&!devPreview&&<PreviewFallback name={t.name} url={t.website_url} designerUrl={t.preview_url} thumbnail={t.thumbnail_image_url} slug={t.template_slug}/>}
  <TemplateDetailStickyBar {...heroProps} {...common} thumbnail={{src:t.thumbnail_image_url,alt:t.name}}/>
 </div>;
}
