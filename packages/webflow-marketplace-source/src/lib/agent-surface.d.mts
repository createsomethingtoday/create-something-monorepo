import type {MarketplaceAgentTool} from '../vendor/marketplace/marketplace/agentTools';
import type {Island} from './pages';
export type AgentSurface=
 |{kind:'detail';template:Record<string,unknown>&{slug:string;name:string;creator_slug:string}}
 |{kind:'creator';creator:{slug:string;name:string;bio:string;links:string[];total_templates:number;picks:Array<{slug:string;note?:string}>}}
 |{kind:'search'}
 |{kind:'page'};
export const REFERENCE_TOPICS:Record<string,string>;
export function surfaceFor(islands:Island[]):AgentSurface;
export function surfaceTools(surface:AgentSurface,options:{origin:string;win?:Window;fetchImpl?:typeof fetch}):MarketplaceAgentTool[];
