import {useAnalyticsConsent} from './Consent';
import {TemplateCard} from '@marketplace/cards/TemplateCard';
import {TemplateGrid} from '@marketplace/grid/TemplateGrid';
import {TemplateFilterBar} from '@marketplace/filter/TemplateFilterBar';
import type {ComponentProps} from 'react';
import {localLink} from '../lib/routes.mjs';
import SupportRequest from './SupportRequest';
function links(value:unknown):unknown{
 if(Array.isArray(value))return value.map(links);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='href'&&typeof v==='string'?localLink(v):links(v)]));
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
 if(widget==='TemplateGrid')return <TemplateGrid {...safe as ComponentProps<typeof TemplateGrid>}/>;
 if(widget==='TemplateFilterBar')return <TemplateFilterBar {...safe as ComponentProps<typeof TemplateFilterBar>}/>;
 return null;
}
