// Read-only provider metering. Never infer zero usage from missing samples.
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const key=execFileSync('infisical',['secrets','get','CLOUDFLARE_WORKERS_API_TOKEN','--env=prod','--plain','--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}).trim();
const query=`query {viewer {accounts(filter:{accountTag:"9645bd52e640b8a4f40a3a55ff1dd75a"}) {containersUsageAdaptiveGroups(limit:100,filter:{date_geq:"2026-09-24",date_leq:"2026-09-24",applicationId:"a03a0de4-bc04-4f6b-a183-32287814648f"}) {dimensions {date instanceId applicationId} sum {cpuTimeSec allocatedMemory allocatedDisk txBytes}}}}}`;
const r=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(15000)});
const data=await r.json();const receipt={checkedAt:new Date().toISOString(),status:r.status,scope:'PRIVATE preview application only; provider usage estimate, not invoice',data};
const inventoryResponse=await fetch('https://api.cloudflare.com/client/v4/accounts/9645bd52e640b8a4f40a3a55ff1dd75a/containers/dash/applications/a03a0de4-bc04-4f6b-a183-32287814648f/instances?per_page=100',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
const inventory=await inventoryResponse.json();
receipt.inventory=inventory;
const samples=data.data?.viewer?.accounts?.[0]?.containersUsageAdaptiveGroups;
const objects=inventory.result?.durable_objects;
receipt.missingInstanceIds=Array.isArray(samples)&&Array.isArray(objects)?objects.filter(o=>!samples.some(s=>s.dimensions.instanceId===o.id)).map(o=>({id:o.id,name:o.name})):null;
receipt.reconciled=r.ok&&!data.errors&&inventoryResponse.ok&&inventory.success&&Array.isArray(samples)&&samples.length<100&&Array.isArray(objects)&&objects.length>0&&objects.length<100&&inventory.result.instances?.length===0&&!inventory.result_info?.next_page_token&&receipt.missingInstanceIds?.length===0;
receipt.note='Missing samples are unknown, never zero. Reconciled means every known instance has a sample, not invoice finality or complete ingestion.';
await writeFile('../evidence/cloudflare-usage-readback.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({reconciled:receipt.reconciled,missing:receipt.missingInstanceIds,samples:samples?.length,liveInstances:inventory.result?.instances?.length}));
