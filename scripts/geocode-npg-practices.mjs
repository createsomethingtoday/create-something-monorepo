#!/usr/bin/env node
// Bounded service-only geocode warmup. Never logs practitioner/contact payloads.
const args=process.argv.slice(2);
const value=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1];};
const state=value('--state','');
const maxBatches=Number(value('--max-batches','100'));
if(!/^[A-Z]{2}$/.test(state)||!Number.isInteger(maxBatches)||maxBatches<1||maxBatches>1000)throw new Error('Use --state XX and --max-batches 1..1000.');
const key=process.env.AGENCY_INTERNAL_API_KEY?.trim();
if(!key)throw new Error('AGENCY_INTERNAL_API_KEY is required.');
const base=process.env.AGENCY_BASE_URL||'https://createsomething.agency';
let processed=0,matched=0,unmatched=0;
for(let batch=1;batch<=maxBatches;batch++){
 const response=await fetch(new URL('/api/abundance/healthcare-providers/sourcing',base),{
  method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({action:'geocode_batch',state}),signal:AbortSignal.timeout(180000)
 });
 if(!response.ok)throw new Error(`Geocode service HTTP ${response.status}; completed rows remain cached. Rerun to continue.`);
 const result=await response.json();
 if(!result.success||!Number.isInteger(result.data?.processed))throw new Error('Malformed geocode response.');
 processed+=result.data.processed;matched+=result.data.matched;unmatched+=result.data.unmatched;
 console.log(JSON.stringify({state,batch,processed,matched,unmatched,complete:result.data.processed===0}));
 if(result.data.processed===0)break;
}
