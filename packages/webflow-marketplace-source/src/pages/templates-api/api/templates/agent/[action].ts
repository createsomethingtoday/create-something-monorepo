import type {APIRoute} from 'astro';
import {getSecret} from 'astro:env/server';
import {proxyDiscoveryAgent} from '../../../../../lib/discovery-agent-proxy.mjs';
export const POST:APIRoute=({request,params})=>proxyDiscoveryAgent(request,params.action||'',{expectedOrigin:'https://webflow-marketplace-source.webflow.io',secret:getSecret('TEMPLATE_AGENT_PROXY_SECRET'),disabled:import.meta.env.DEV});
