import {TemplateCard} from '@marketplace/cards/TemplateCard';
import type {Template} from '../lib/api';
import {localLink} from '../lib/routes.mjs';
import {evidenceFor,priceLabel,briefParams,firstSentence,type Brief} from '../lib/discovery.mjs';

// Without onToggle the card is a plain recommendation: no comparison and no match evidence.
export default function DiscoveryCard({item,brief,index,picked=false,atLimit=false,onToggle}:{item:Template;brief:Brief;index:number;picked?:boolean;atLimit?:boolean;onToggle?:()=>void}){
 const detailUrl=localLink(item.url)+'?'+briefParams(brief).toString()+'&from=search';
 const evidence=evidenceFor(item,brief,true);
 const pickNote=item.is_featured&&typeof item.reviewer_pick_reason==='string'?item.reviewer_pick_reason.trim():'';
 const stagger={['--tmcard-stagger' as string]:`${Math.min(index,8)*60}ms`};
 return <article className={`rd-search-card${picked?' is-picked':''}`} data-template-slug={item.template_slug}>
  {item.is_featured&&<span className="rd-search-badge" style={stagger}><span aria-hidden="true">★</span> Featured</span>}
  {onToggle&&<label className="rd-search-compare"><input type="checkbox" checked={picked} disabled={!picked&&atLimit} onChange={onToggle} aria-label={`Compare ${item.name}`}/><span className="rd-search-compare-text">Compare</span></label>}
  <TemplateCard templateName={item.name} templateLink={{href:detailUrl}}
   creatorName={item.creator_name} creatorLink={{href:localLink(item.creator_profile_url)}}
   creatorIcon={item.creator_avatar_url?{src:item.creator_avatar_url,alt:item.creator_name}:undefined}
   primaryImage={{src:item.thumbnail_image_url,alt:`${item.name} template preview`}}
   secondaryImage={item.thumbnail_image_secondary_url?{src:item.thumbnail_image_secondary_url,alt:`${item.name} additional preview`}:undefined}
   price={priceLabel(item)} priceNumeric={typeof item.price==='number'?String(item.price):undefined} isFree={item.is_free}
   categoryName={(item.category_groups?.find(group=>group.slug===brief.category)||item.category_groups?.[0])?.name}
   showCategoryMeta={true} showTemplateType={false} showPreviewLink={false} priorityIndex={index} stylesProvided={true}/>
  {onToggle&&pickNote&&<p className="rd-search-why"><b>Marketplace pick:</b> {firstSentence(pickNote)}</p>}
  {onToggle&&<details className="rd-search-evidence"><summary>Why this template</summary>
   <div className="rd-search-evidence-body">
    {pickNote&&<><h3>Marketplace pick note</h3><p>{pickNote}</p></>}
    <h3>Matching facts</h3><ul>{evidence.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
    <h3>Before you choose</h3><p>{evidence.limit}</p>
    <dl>{evidence.facts.filter(fact=>fact.label!=='Template price'&&fact.label!=='Catalog category').map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    <p>Confirm price at checkout. Accessibility, support response time and customization effort are not confirmed.</p>
    <a href={detailUrl}>View template details →</a>
   </div>
  </details>}
 </article>;
}
