import {TemplateCard,TEMPLATE_CARD_STYLES} from '@marketplace/cards/TemplateCard';
import type {Template} from '../lib/api';
import {localLink} from '../lib/routes.mjs';
export default function Cards({items}:{items:Template[]}){
 return <><style dangerouslySetInnerHTML={{ __html: TEMPLATE_CARD_STYLES }} /><div className="source-home-cards">{items.map((t,i)=><TemplateCard key={t.id} templateName={t.name} templateLink={{href:localLink(t.url)}} creatorName={t.creator_name} creatorLink={{href:localLink(t.creator_profile_url)}} price={t.is_free?'Free':`$${t.price} USD`} priceNumeric={String(t.price)} isFree={t.is_free} primaryImage={{src:t.thumbnail_image_url,alt:t.name}} secondaryImage={t.thumbnail_image_secondary_url?{src:t.thumbnail_image_secondary_url,alt:t.name}:undefined} creatorIcon={t.creator_avatar_url?{src:t.creator_avatar_url,alt:t.creator_name}:undefined} showCategoryMeta={false} showTemplateType={false} showPreviewLink={false} priorityIndex={i} stylesProvided={true}/>)}</div></>;
}
