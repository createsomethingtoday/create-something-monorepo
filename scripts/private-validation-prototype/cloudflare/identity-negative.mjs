// Read-only checks against the owning PRIVATE export boundary; no credentials.
import {writeFile} from 'node:fs/promises';
const url='https://private.createsomething.agency/api/networks/create-something/export';
const checks=[];
for(const [name,headers] of [['anonymous',{}],['spoofed-authority',{'X-User-Id':'owned-negative-fixture','X-Tenant-Id':'default','X-Role':'owner'}],['invalid-session',{Cookie:'__Host-pcn_access=owned.invalid.fixture'}]]){
 const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
 checks.push({name,status:response.status,denied:[401,403].includes(response.status)});
 await response.body?.cancel();
}
const report={checkedAt:new Date().toISOString(),url,checks,passed:checks.every(c=>c.denied),positiveIdentityVerified:false,crossTenantVerified:false};
await writeFile('../evidence/private-identity-negative.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(!report.passed)process.exitCode=1;
