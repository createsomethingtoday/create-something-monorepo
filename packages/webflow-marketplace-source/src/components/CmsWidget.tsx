import {useAnalyticsConsent} from './Consent';
import {TemplateCard} from '@marketplace/cards/TemplateCard';
import {TemplateGrid} from '@marketplace/grid/TemplateGrid';
import {CatalogFilters as TemplateFilterBar,CatalogSidebar as TemplateSearchSidebar} from './CatalogControls';
import {TemplateMarketplaceHeading} from '@marketplace/marketplace/TemplateMarketplaceHeading';
import {TemplateChat} from '@marketplace/chat/TemplateChat';
import {MarketplaceAgentTools} from '@marketplace/marketplace/MarketplaceAgentTools';
import type {ComponentProps} from 'react';
import {localLink} from '../lib/routes.mjs';
import SupportRequest from './SupportRequest';
const LINK_KEYS=new Set(['href','searchAction','templatesUrl']);
function links(value:unknown):unknown{
 if(Array.isArray(value))return value.map(links);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,LINK_KEYS.has(k)&&typeof v==='string'?localLink(v):links(v)]));
 return value;
}
/** Render published CMS component data using the repository-owned implementation. */
export default function CmsWidget({widget,props}:{widget:string;props:Record<string,unknown>}){
 const enableAnalytics=useAnalyticsConsent();
 const safe={...links(props) as Record<string,unknown>,apiBase:'/templates-api',enableAnalytics};
 if(widget==='TemplateSupportRequest'){
  if(typeof props.templateSlug!=='string'||typeof props.templateName!=='string'||typeof props.creatorName!=='string')return <p role="alert">Creator support is temporarily unavailable.</p>;
  return <SupportRequest templateSlug={props.templateSlug} templateName={props.templateName} creatorName={props.creatorName} buttonLabel={typeof props.buttonLabel==='string'?props.buttonLabel:undefined}/>;
 }
 if(widget==='TemplateCard')return <TemplateCard {...safe as ComponentProps<typeof TemplateCard>}/>;
 if(widget==='TemplateGrid')return <TemplateGrid {...safe as ComponentProps<typeof TemplateGrid>} showMcpCampaign={false}/>;
 if(widget==='TemplateFilterBar')return <TemplateFilterBar {...safe as ComponentProps<typeof TemplateFilterBar>}/>;
 if(widget==='TemplateSearchSidebar')return <TemplateSearchSidebar {...safe as ComponentProps<typeof TemplateSearchSidebar>}/>;
 if(widget==='TemplateMarketplaceHeading'){const description=typeof props.fallbackDescription==='string'?props.fallbackDescription:'';return <><TemplateMarketplaceHeading {...safe as ComponentProps<typeof TemplateMarketplaceHeading>} showDescription={false}/>{description&&<details className="rd-category-description"><summary>About these templates</summary><p>{description}</p></details>}</>;}
 // Chat and agent tools keep the published apiBase: this app serves no chat routes. Dev disables Turnstile like the chat page.
 if(widget==='TemplateChat')return <TemplateChat {...links(props) as ComponentProps<typeof TemplateChat>} turnstileSiteKey={import.meta.env.DEV?'':typeof props.turnstileSiteKey==='string'?props.turnstileSiteKey:undefined} enableAnalytics={enableAnalytics}/>;
 if(widget==='MarketplaceAgentTools')return <MarketplaceAgentTools {...props as ComponentProps<typeof MarketplaceAgentTools>} enableAnalytics={enableAnalytics}/>;
 return null;
}
