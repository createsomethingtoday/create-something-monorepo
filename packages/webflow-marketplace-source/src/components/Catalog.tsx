import {TemplateGrid} from '@marketplace/grid/TemplateGrid';
import {TemplateFilterBar} from '@marketplace/filter/TemplateFilterBar';
import {TemplateSearchSidebar} from '@marketplace/marketplace/TemplateSearchSidebar';
import {TemplateMarketplaceHeading} from '@marketplace/marketplace/TemplateMarketplaceHeading';
export default function Catalog({title,description='',path,creatorSlug}:{title:string;description?:string;path:string;creatorSlug?:string}){
 const common={apiBase:'/templates-api',enableAnalytics:false};
 return <div className="source-catalog"><aside><TemplateSearchSidebar {...common} searchAction="/templates/search" showCounts={true}/></aside><div className="source-results">
 {creatorSlug?<h1>{title}</h1>:<TemplateMarketplaceHeading apiBase="/templates-api" staticRoutePath={path} fallbackTitle={title} fallbackDescription={description} descriptionMode="preserve_static"/>}
 <TemplateFilterBar {...common} creatorSlug={creatorSlug} defaultSort="newest" showSearch={path.includes('search')} showFreeOnly={false}/>
 <div className="source-template-grid"><TemplateGrid {...common} showEmptyState={true} creatorSlug={creatorSlug} initialSort="newest" showCategoryMeta={false} showTemplateType={false} showPreviewLink={false} showMcpCampaign={true} showFeaturedBadge={true} showMarketplaceSignals={true}/></div>
 </div></div>
}
