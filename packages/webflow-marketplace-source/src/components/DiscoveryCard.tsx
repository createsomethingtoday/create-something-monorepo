import {TemplateCard} from '@marketplace/cards/TemplateCard';
import type {Template} from '../lib/api';
import {localLink} from '../lib/routes.mjs';
import {evidenceFor,priceLabel,briefParams,type Brief} from '../lib/discovery.mjs';

export default function DiscoveryCard({item,brief,index,picked,atLimit,onToggle}:{item:Template;brief:Brief;index:number;picked:boolean;atLimit:boolean;onToggle:()=>void}){
 const detailUrl=localLink(item.url)+'?'+briefParams(brief).toString()+'&from=search';
 const evidence=evidenceFor(item,brief,true);
 const pickNote=item.is_featured&&typeof item.reviewer_pick_reason==='string'?item.reviewer_pick_reason.trim():'';
 return <article className="rd-search-card" data-template-slug={item.template_slug}>
  {item.is_featured&&<span className="rd-search-badge" style={{['--tmcard-stagger' as string]:`${Math.min(index,8)*60}ms`}}><span aria-hidden="true">★</span> Featured</span>}
  <TemplateCard templateName={item.name} templateLink={{href:detailUrl}}
   creatorName={item.creator_name} creatorLink={{href:localLink(item.creator_profile_url)}}
   creatorIcon={item.creator_avatar_url?{src:item.creator_avatar_url,alt:item.creator_name}:undefined}
   primaryImage={{src:item.thumbnail_image_url,alt:`${item.name} template preview`}}
   secondaryImage={item.thumbnail_image_secondary_url?{src:item.thumbnail_image_secondary_url,alt:`${item.name} additional preview`}:undefined}
   price={priceLabel(item)} priceNumeric={typeof item.price==='number'?String(item.price):undefined} isFree={item.is_free}
   categoryName={item.category_groups?.[0]?.name}
   showCategoryMeta={true} showTemplateType={false} showPreviewLink={false} priorityIndex={index} stylesProvided={true}/>
  <div className="rd-search-card-actions">
   <details className="rd-search-evidence"><summary>Why this template</summary>
    <div className="rd-search-evidence-body">
     {pickNote&&<><h3>Marketplace pick note</h3><p>{pickNote}</p></>}
     <h3>Matching facts</h3><ul>{evidence.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
     <h3>Before you choose</h3><p>{evidence.limit}</p>
     <dl>{evidence.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
     <p>Catalog facts for this search. Confirm price at checkout. Accessibility conformance, support response time, and customization effort are not confirmed.</p>
     {item.thumbnail_image_secondary_url&&<details className="rd-secondary-preview"><summary>Additional preview</summary><img src={item.thumbnail_image_secondary_url} alt={`${item.name} additional template preview`} loading="lazy"/></details>}
     <a href={detailUrl}>View template details →</a>
    </div>
   </details>
   <label className="rd-search-compare"><input type="checkbox" checked={picked} disabled={!picked&&atLimit} onChange={onToggle} aria-label={`Compare ${item.name}`}/> Compare</label>
  </div>
 </article>;
}
