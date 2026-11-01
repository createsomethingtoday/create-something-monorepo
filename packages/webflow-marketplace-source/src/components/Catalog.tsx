import {useAnalyticsConsent} from './Consent';
import {TemplateGrid} from '@marketplace/grid/TemplateGrid';
import {CatalogFilters as TemplateFilterBar,CatalogSidebar as TemplateSearchSidebar} from './CatalogControls';
import {TemplateMarketplaceHeading} from '@marketplace/marketplace/TemplateMarketplaceHeading';
export default function Catalog({title,description='',path,creatorSlug}:{title:string;description?:string;path:string;creatorSlug?:string}){
 const enableAnalytics=useAnalyticsConsent();
 const common={apiBase:'/templates-api',enableAnalytics};
 return <div className="source-catalog"><aside><TemplateSearchSidebar {...common} searchAction="/templates/search" showCounts={true}/></aside><div className="source-results">
 {path.includes('search')?<TemplateMarketplaceHeading apiBase="/templates-api" staticRoutePath={path} fallbackTitle={title} fallbackDescription={description} descriptionMode="preserve_static"/>:<header className="tmheading"><nav className="tmheading-breadcrumbs" aria-label="Breadcrumb"><a href="/templates">Templates</a><span aria-hidden="true">›</span><span>{title.replace(' Website Templates','')}</span></nav><h1 className="tmheading-title">{title}</h1></header>}
 <TemplateFilterBar {...common} creatorSlug={creatorSlug} defaultSort="newest" showSearch={false} showFreeOnly={true} showSubcategoryPills={false}/>
 <div className="source-template-grid"><TemplateGrid {...common} showEmptyState={true} creatorSlug={creatorSlug} initialSort="newest" showCategoryMeta={false} showTemplateType={false} showPreviewLink={false} showMcpCampaign={false} showFeaturedBadge={true} showMarketplaceSignals={true}/></div>
 </div></div>
}
