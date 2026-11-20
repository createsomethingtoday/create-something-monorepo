import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('./wrangler.lab.json',import.meta.url),'utf8'));
const {LAB_KEY}=JSON.parse(await readFile(new URL('./dist/secrets.json',import.meta.url),'utf8'));
const url=config.vars.LAB_URL;
if(!/^https:\/\/cs-a2a-lab-[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url)||config.vars.LAB_SCOPE!=='disposable-cre2431')throw new Error('Disposable target required');
// One request only. An uncertain lab run is never automatically repeated.
try{const response=await fetch(url+'/run',{method:'POST',headers:{authorization:'Bearer '+LAB_KEY},signal:AbortSignal.timeout(120000)});const result=await response.json();console.log(JSON.stringify({target:url,status:response.status,result},null,2));if(!response.ok)process.exitCode=1;}catch{console.error('Lab result unavailable. Inspect disposable resources; do not retry this seeded run.');process.exitCode=1;}
