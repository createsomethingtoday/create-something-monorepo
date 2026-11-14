import { recordSpend, finiteAmount, type BudgetGrant } from '../src/enrichment-budget.js';
import { skipTrace, skipTraceReadiness, skipIdentity, type SkipResult } from '../src/skip-trace.js';
import { DurableObject } from 'cloudflare:workers';
import { enrichPdlProfile, type PdlResult } from '../src/pdl.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import {
  DEFAULT_AGENCY_BASE_URL,
  isAcceptedHealthcareBearer,
  registerAbundanceHealthcareTools,
  SERVER_NAME,
  SERVER_VERSION,
} from '../src/index.js';

interface Env {
  APIFY_PRIVACY_DATASET_ID?: string;
  APIFY_API_TOKEN?: string;
  SKIP_TRACE: DurableObjectNamespace;
  PDL_API_KEY?: string;
  PDL_PROFILES: DurableObjectNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  MCP_ACCOUNT_ID?: string;
  ABUNDANCE_MCP_BEARER_TOKEN?: string;
  ABUNDANCE_HEALTHCARE_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  AGENCY_INTERNAL_API_KEY?: string;
  AGENCY_BASE_URL?: string;
  EXA_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, X-MCP-Account-ID, X-Account-ID',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export class AbundanceHealthcareMCP extends McpAgent<Env> {
  server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  private currentAccountId = 'abundance-healthcare-agent';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = request.headers.get('X-MCP-Account-ID')?.trim()
      || request.headers.get('X-Account-ID')?.trim()
      || this.env.MCP_ACCOUNT_ID?.trim()
      || 'abundance-healthcare-agent';
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, {
      publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
      projectName: this.env.LANGFUSE_PROJECT_NAME?.trim() || 'CREATE SOMETHING',
      // Langfuse captures full tool inputs and outputs. Keep D1 invocation
      // metering only; healthcare errors are identifier-free so NPIs and public
      // contact fields are not copied into a secondary trace store.
      enabled: false,
    });
    registerAbundanceHealthcareTools(this.server, {
      agencyApiKey: this.env.AGENCY_INTERNAL_API_KEY,
      agencyBaseUrl: this.env.AGENCY_BASE_URL?.trim() || DEFAULT_AGENCY_BASE_URL,
      exaApiKey: this.env.EXA_API_KEY,
      skipTraceReadiness: async()=>{
        const stub=this.env.SKIP_TRACE.get(this.env.SKIP_TRACE.idFromName('npg-skip-trace-v1'));
        const response=await stub.fetch('https://skip.internal/readiness');
        return await response.json() as {ready:boolean;reason:string};
      },
      skipTrace: async (input,trackingGrant) => {
        const stub = this.env.SKIP_TRACE.get(this.env.SKIP_TRACE.idFromName('npg-skip-trace-v1'));
        const response = await stub.fetch('https://skip.internal/enrich', {method:'POST',body:JSON.stringify({input,tracking_grant:trackingGrant})});
        if (!response.ok) throw new Error('Skip Trace unavailable. No automatic retry.');
        return await response.json() as SkipResult;
      },
      pdlEnrich: async input => {
        const stub = this.env.PDL_PROFILES.get(this.env.PDL_PROFILES.idFromName('npg-candidate-profiles-v1'));
        const response = await stub.fetch('https://pdl.internal/enrich', { method: 'POST', body: JSON.stringify(input) });
        if (!response.ok) {
          throw new Error('PDL integration is unavailable. Check configuration; no automatic retry.');
        }
        return await response.json() as PdlResult;
      },
    });
  }
}

export class PdlProfiles extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/enrich') return new Response(null, { status: 404 });
    try {
      const result = await enrichPdlProfile(await request.json(), { apiKey: this.env.PDL_API_KEY, store: this.ctx.storage });
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: 'Unavailable' }, { status: 503 });
    }
  }
}

export class SkipTraceProfiles extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if(request.method==='GET' && new URL(request.url).pathname==='/readiness') return Response.json(await skipTraceReadiness({token:this.env.APIFY_API_TOKEN,privacyDatasetId:this.env.APIFY_PRIVACY_DATASET_ID,store:this.ctx.storage}));
    if(request.method !== 'POST' || new URL(request.url).pathname !== '/enrich') return new Response(null,{status:404});
    try {
      const body=await request.json() as any;
      const input=skipIdentity.parse(body.input??body);
      const {reconcile_receipt,...identity}=input;
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(identity)))),n=>n.toString(16).padStart(2,'0')).join('');
      const receiptKey=`skip:spend:${digest}`;
      let tracked=(await this.ctx.storage.get<Array<{grant:BudgetGrant;cached:boolean}>>(receiptKey))??[];
      if(body.tracking_grant&&!tracked.some(item=>item.grant.id===body.tracking_grant.id)){
        const prior=await this.ctx.storage.get<SkipResult>(`skip:${digest}`);
        const cached=Boolean(prior&&prior.status!=='privacy_blocked');
        tracked=[...tracked,{grant:body.tracking_grant,cached}];
        await this.ctx.storage.put(receiptKey,tracked);
      }
      const result=await skipTrace(input,{token:this.env.APIFY_API_TOKEN,privacyDatasetId:this.env.APIFY_PRIVACY_DATASET_ID,store:this.ctx.storage});
      for(const item of tracked){
        try{await recordSpend({agencyApiKey:this.env.AGENCY_INTERNAL_API_KEY,agencyBaseUrl:this.env.AGENCY_BASE_URL},item.grant,{event_id:`${item.grant.id}:apify:${result.revision??0}`,status:result.status==='pending'?'pending':result.run_id?'complete':'failed',actual_usd:item.cached?0:finiteAmount(result.charge_usd),estimated_usd:null,credits:null,credit_unit:null,receipt_ref:result.run_id??null});}catch{/* Dispatch remains durably pending; preserve provider receipt for later refresh. */}
      }
      return Response.json(result);
    } catch { return Response.json({error:'Unavailable'},{status:503}); }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (url.pathname === '/health') return jsonResponse({ ok: true, service: SERVER_NAME, version: SERVER_VERSION });
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return AbundanceHealthcareMCP.serve(url.pathname.startsWith('/sse') ? '/sse' : '/mcp').fetch(request, env, ctx);
    }
    return jsonResponse({ error: 'NotFound', endpoints: ['/health', '/mcp'] }, 404);
  },
};

export async function validateApiKey(
  request: Request,
  env: Pick<Env, 'ABUNDANCE_MCP_BEARER_TOKEN' | 'ABUNDANCE_HEALTHCARE_MCP_API_KEY' | 'MCP_API_KEY'>,
): Promise<Response | null> {
  const configured = [
    env.ABUNDANCE_MCP_BEARER_TOKEN,
    env.ABUNDANCE_HEALTHCARE_MCP_API_KEY,
    env.MCP_API_KEY,
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (configured.length === 0) return jsonResponse({ error: 'ServerMisconfigured', message: 'Healthcare MCP bearer token is not configured.' }, 500);
  const auth = request.headers.get('Authorization');
  const provided = auth?.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : request.headers.get('X-API-Key')?.trim();
  if (!(await isAcceptedHealthcareBearer(provided, configured))) {
    return jsonResponse({ error: 'Unauthorized', message: 'Valid API key required.' }, 401);
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
