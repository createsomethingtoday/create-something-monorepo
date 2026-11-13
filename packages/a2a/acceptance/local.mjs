import {realpathSync} from 'node:fs';
// Actual workerd + D1 runtime qualification; this is NOT deployed/live proof.
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
const require=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const base='https://cs-a2a-lab-cre2431.example.workers.dev',key=crypto.randomUUID()+crypto.randomUUID();
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'lab',modules:true,scriptPath:new URL('./dist/worker.mjs',import.meta.url).pathname,compatibilityDate:'2026-11-13',compatibilityFlags:['nodejs_compat'],d1Databases:['IDENTITY_DB','INBOX_DB'],bindings:{LAB_URL:base,LAB_KEY:key,LAB_SCOPE:'disposable-cre2431'}}]}));
try{
 for(const [binding,path] of [['IDENTITY_DB','../../identity-worker/migrations/'],['INBOX_DB','../migrations/']]){
  const db=await mf.getD1Database(binding);
  for(const name of (await readdir(new URL(path,import.meta.url))).filter(x=>x.endsWith('.sql')).sort()){
   const sql=await readFile(new URL(path+name,import.meta.url),'utf8');
   // D1 exec requires one statement per line; migrations contain multiline SQL.
   for(const statement of sql.replace(/--[^\n]*/g,'').split(';').filter(x=>x.trim()))await db.prepare(statement).run();
  }
 }
 const denied=await mf.dispatchFetch(base+'/run',{method:'POST'});if(denied.status!==404)throw new Error('Lab authentication guard failed');
 const response=await mf.dispatchFetch(base+'/run',{method:'POST',headers:{authorization:'Bearer '+key}});
 const result=await response.json();console.log(JSON.stringify({runtime:'local_workerd',...result}));if(!response.ok)process.exitCode=1;
}finally{await mf.dispose();}
