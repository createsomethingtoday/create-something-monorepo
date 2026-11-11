import { z } from 'zod';
import type { PdlStore } from './pdl.js';

export const skipIdentity = z.object({ npi: z.string().regex(/^\d{10}$/), first: z.string().regex(/^[A-Za-z '-]{1,60}$/), last: z.string().regex(/^[A-Za-z '-]{1,60}$/), practice_city: z.string().regex(/^[A-Za-z .'-]{1,80}$/), practice_state: z.string().regex(/^[A-Z]{2}$/), confirm_paid_enrichment: z.literal(true) }).strict();
export type SkipIdentity = z.infer<typeof skipIdentity>;
export type SkipResult = { id: string; npi: string; status: string; run_id?: string; dataset_id?: string; charge_usd?: number; charge_reconciled?: boolean; contacts?: { emails: string[]; phones: string[]; home_city: string | null; home_state: string | null }; provenance: { source: string; actor: string; build: string; retrieved_at: string; ownership: 'unverified'; consent: 'unverified'; geography: 'registry_practice_not_home'; readiness: 'blocked' }; reason?: string };
const ACTOR = 'vmf6h5lxPAkB1W2gT';
const fields = ['Search Option','Input Given','First Name','Last Name','Address Locality','Address Region', ...Array.from({length:5},(_,i)=>`Email-${i+1}`), ...Array.from({length:5},(_,i)=>`Phone-${i+1}`)];
const word = (v: unknown) => typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g,' ') : '';
const safeText = (v: unknown) => typeof v === 'string' && /^[A-Za-z .'-]{1,80}$/.test(v) ? v : null;
export async function skipTrace(input: SkipIdentity, options: { token?: string; store: PdlStore; fetchFn?: typeof fetch; now?: number; dailyBudgetUsd?: number }): Promise<SkipResult> {
  const p = skipIdentity.parse(input);
  if (!options.token?.trim()) throw new Error('Skip Trace is not configured.');
  const now = options.now ?? Date.now();
  const query = `${p.first} ${p.last}; ${p.practice_city}, ${p.practice_state}`;
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(p))))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const key = `skip:${digest}`;
  const base: SkipResult = {id:digest,npi:p.npi,status:'delivery_unknown',provenance:{source:'Apify one-api/skip-trace',actor:ACTOR,build:'0.0.192',retrieved_at:new Date(now).toISOString(),ownership:'unverified',consent:'unverified',geography:'registry_practice_not_home',readiness:'blocked'}};
  let existing = await options.store.transaction(async s => {
    const cached = await s.get<SkipResult>(key);
    if(cached) return cached;
    const reservations = (await s.get<{at:number;cents:number}[]>('skip:budget') ?? []).filter(r=>r.at>now-86400000);
    const budget = options.dailyBudgetUsd ?? 1;
    if(!Number.isFinite(budget) || budget<=0 || reservations.reduce((n,r)=>n+r.cents,0)+10>Math.floor(budget*100)) throw new Error('Skip Trace daily budget exhausted.');
    await s.put('skip:budget',[...reservations,{at:now,cents:10}]);
    await s.put(key,base);
    return undefined;
  });
  if(existing && existing.status !== 'pending') return existing;
  const api = async (path:string, method='GET', body?:unknown) => {
    const response = await (options.fetchFn ?? fetch)(`https://api.apify.com/v2/${path}`,{method,redirect:'manual',headers:{Authorization:`Bearer ${options.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('Provider unavailable');
    return response.json() as Promise<any>;
  };
  let result = existing ?? base;
  try {
    if(!existing) {
      const {data} = await api(`acts/${ACTOR}/runs?build=0.0.192&maxTotalChargeUsd=0.1&timeout=120&restartOnError=false&forcePermissionLevel=LIMITED&generalAccess=RESTRICTED`,'POST',{name:[query],max_results:1});
      if(!/^[A-Za-z0-9]+$/.test(data.id) || !/^[A-Za-z0-9]+$/.test(data.defaultDatasetId)) throw new Error('Invalid receipt');
      result={...base,status:'pending',run_id:data.id,dataset_id:data.defaultDatasetId};
      await options.store.put(key,result);
    }
    const {data:run} = await api(`actor-runs/${result.run_id}`);
    if(run.id!==result.run_id || run.actId!==ACTOR || run.defaultDatasetId!==result.dataset_id || run.buildNumber!=='0.0.192') throw new Error('Association failure');
    await api(`actor-runs/${result.run_id}`,'PUT',{generalAccess:'RESTRICTED'});
    await api(`datasets/${result.dataset_id}`,'PUT',{generalAccess:'RESTRICTED'});
    if(!['SUCCEEDED','FAILED','TIMED-OUT','ABORTED'].includes(run.status)) return result;
    result={...result,status:'blocked_review',charge_reconciled:false,...(typeof run.usageTotalUsd==='number' && Number.isFinite(run.usageTotalUsd) && run.usageTotalUsd>=0?{charge_usd:run.usageTotalUsd}:{}),reason:'Provider terminal receipt; charges may settle later. Full cap remains reserved.'};
    if(run.status==='SUCCEEDED') {
      const rows = await api(`datasets/${result.dataset_id}/items?format=json&limit=2&fields=${encodeURIComponent(fields.join(','))}`);
      if(!Array.isArray(rows) || rows.length>1) result.reason='Ambiguous response';
      else if(!rows.length) result.status='no_contact';
      else {
        const row=rows[0];
        if(word(row['Input Given'])!==word(query) || word(row['First Name'])!==word(p.first) || word(row['Last Name'])!==word(p.last) || (row['Search Option'] && word(row['Search Option'])!=='name')) result.reason='Identity, fallback or response association requires review';
        else if(word(row['Address Region'])!==word(p.practice_state)) result.reason='Different or missing home region requires review; practice geography is not residence';
        else {
          const emails=Array.from({length:5},(_,i)=>row[`Email-${i+1}`]).filter((v):v is string=>typeof v==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length<=254);
          const phones=Array.from({length:5},(_,i)=>row[`Phone-${i+1}`]).filter((v):v is string=>typeof v==='string' && /^[+()\d .-]+$/.test(v)).map(v=>v.replace(/\D/g,'')).map(v=>v.length===10?'1'+v:v).filter(v=>/^1[2-9]\d{2}[2-9]\d{6}$/.test(v)).map(v=>'+'+v);
          result={...result,status:emails.length||phones.length?'review_required':'no_contact',contacts:{emails:[...new Set(emails)],phones:[...new Set(phones)],home_city:safeText(row['Address Locality']),home_state:safeText(row['Address Region'])},reason:'Preliminary first/last and geography triage only. Contacts and consent unverified; never recruiter-ready. Phone metadata and freshness not inferred.'};
        }
      }
    }
  } catch { result={...result,reason:'Provider response uncertain; reconcile known run only. Never dispatch again automatically.'}; }
  await options.store.put(key,result);
  return result;
}
