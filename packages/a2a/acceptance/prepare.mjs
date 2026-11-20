// Local preparation only. Resource creation and deployment remain explicit commands.
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const [account,subdomain,identityId,inboxId,suffix='cre2431']=process.argv.slice(2);
if(!/^[a-f0-9]{32}$/.test(account??'')||!/^[-a-z0-9]+$/.test(subdomain??'')||!/^[-a-z0-9]+$/.test(suffix))throw new Error('Usage: prepare.mjs ACCOUNT_ID WORKERS_SUBDOMAIN NEW_IDENTITY_DB_UUID NEW_INBOX_DB_UUID [suffix]');
for(const id of [identityId,inboxId])if(!/^[a-f0-9-]{36}$/.test(id??''))throw new Error('Fresh disposable database UUIDs required');
if(identityId===inboxId||[identityId,inboxId].some(id=>['8724401c-8526-4a3a-a799-c721ad468aaf','f3c1ec56-0ca1-4f8c-89ef-881682ef391a','2ec4ea2e-c25f-4832-b78f-a608ff9f8ad7','4305a4b7-c13b-4085-b800-bb6395fa502a'].includes(id)))throw new Error('Databases must be distinct and disposable');
const name='cs-a2a-lab-'+suffix;
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
const config={name,main:'dist/worker.mjs',account_id:account,compatibility_date:'2026-11-13',compatibility_flags:['nodejs_compat'],workers_dev:true,limits:{cpu_ms:30000},vars:{LAB_SCOPE:'disposable-cre2431',LAB_URL:`https://${name}.${subdomain}.workers.dev`},d1_databases:[{binding:'IDENTITY_DB',database_name:name+'-identity',database_id:identityId,migrations_dir:'../../identity-worker/migrations'},{binding:'INBOX_DB',database_name:name+'-inbox',database_id:inboxId,migrations_dir:'../migrations'}],observability:{enabled:true,traces:{enabled:true,head_sampling_rate:0.1}}};
await writeFile(new URL('./wrangler.lab.json',import.meta.url),JSON.stringify(config,null,2));
// wx refuses to overwrite a previously prepared secret.
await writeFile(new URL('./dist/secrets.json',import.meta.url),JSON.stringify({LAB_KEY:randomBytes(32).toString('base64url')}),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({name,url:config.vars.LAB_URL,config:'packages/a2a/acceptance/wrangler.lab.json',secretFile:'packages/a2a/acceptance/dist/secrets.json'}));
