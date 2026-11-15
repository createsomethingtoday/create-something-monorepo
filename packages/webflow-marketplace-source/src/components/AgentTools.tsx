import {useMemo} from 'react';
import {MarketplaceAgentTools} from '@marketplace/marketplace/MarketplaceAgentTools';
import {surfaceTools,type AgentSurface} from '../lib/agent-surface.mjs';
import {useAnalyticsConsent} from './Consent';
/** The page's single WebMCP registrar: catalog tools plus the tools for this surface. */
export default function AgentTools({surface}:{surface:AgentSurface}){
 const enableAnalytics=useAnalyticsConsent();
 const origin=location.origin;
 const additionalTools=useMemo(()=>surfaceTools(surface,{origin}),[surface,origin]);
 return <MarketplaceAgentTools apiBase={origin+'/templates-api'} marketplaceOrigin={origin} additionalTools={additionalTools} enableAnalytics={enableAnalytics}/>;
}
