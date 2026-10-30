import {TemplateDetailConversionTracker} from '@marketplace/marketplace/TemplateDetailConversionTracker';
import {useAnalyticsConsent} from './Consent';
import {TemplateDetailHero} from '@marketplace/marketplace/TemplateDetailHero';
import {TemplateDetailStickyBar} from '@marketplace/marketplace/TemplateDetailStickyBar';
import type {Template} from '../lib/api';
import {localLink} from '../lib/routes.mjs';
import PreviewFallback from './PreviewFallback';
export default function Detail({item:t,heroProps={},allowEmbed=false,devPreview=false}:{item:Template;heroProps?:Record<string,unknown>;allowEmbed?:boolean;devPreview?:boolean}){
 const enableAnalytics=useAnalyticsConsent();
 const previewUrl=devPreview?'https://createsomething.agency/':t.website_url;
 const serviceUrl='/templates/services/service-type?'+new URLSearchParams({templateName:t.name,templateLink:t.url});
 const showEmbeddedPreview=allowEmbed||devPreview;
 const common={templateName:t.name,templateSlug:t.template_slug,creatorName:t.creator_name,price:t.is_free?'Free':`${t.price} USD`,isFree:t.is_free,browserPreviewUrl:{href:t.website_url,target:'_blank'},designerPreviewUrl:{href:t.preview_url,target:'_blank'},checkoutUrl:{href:t.purchase_url,target:'_blank'},enableAnalytics};
 return <><TemplateDetailConversionTracker templateSlug={t.template_slug} price={common.price} enableAnalytics={enableAnalytics}/>{devPreview&&<p className="source-dev-preview-note">Development preview: CREATE SOMETHING sample site. Production uses this template’s live demo.</p>}<TemplateDetailHero {...heroProps} {...common} categoryNames={t.category_groups?.map(x=>x.name).join(',')} categoryLinks={t.category_groups?.map(x=>localLink(x.url)).join(',')} creatorLink={{href:localLink(t.creator_profile_url)}} creatorAvatar={t.creator_avatar_url?{src:t.creator_avatar_url,alt:t.creator_name}:undefined} summary={typeof heroProps.summary==='string'?heroProps.summary:undefined} previewIframeUrl={{href:previewUrl,target:'_blank'}} showPreviewIframe={showEmbeddedPreview} showPreviewDeviceControls={true}/>{!showEmbeddedPreview&&<PreviewFallback name={t.name} url={t.website_url} thumbnail={t.thumbnail_image_url} slug={t.template_slug}/>}<div className="rd-detail-facts" aria-label="Template at a glance"><span><strong>Price</strong> {common.price}</span>{t.styles?.length? <span><strong>Style</strong> {t.styles.map(x=>x.name).join(', ')}</span>:null}{t.included_pages?.length?<span><strong>Includes</strong> {t.included_pages.length} pages</span>:null}<a href={serviceUrl}>Get customization help →</a></div><TemplateDetailStickyBar {...common} thumbnail={{src:t.thumbnail_image_url,alt:t.name}}/></>;
}
