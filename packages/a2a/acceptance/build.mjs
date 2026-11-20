import {realpathSync} from 'node:fs';
import {createRequire,builtinModules} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(realpathSync(new URL('../node_modules/wrangler/package.json',import.meta.url)));
const {build}=require('esbuild');
const base=process.env.A2A_LAB_URL;
if(!base||!/^https:\/\/cs-a2a-lab-[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(base))throw new Error('A2A_LAB_URL must name a dedicated cs-a2a-lab-* workers.dev service');
const root=fileURLToPath(new URL('../../../',import.meta.url));
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('./worker.ts',import.meta.url))],outfile:fileURLToPath(new URL('./dist/worker.mjs',import.meta.url)),bundle:true,format:'esm',banner:{js:"import {createRequire as labCreateRequire} from 'node:module';const require=labCreateRequire('/worker.mjs');"},platform:'neutral',mainFields:['module','main'],target:'es2022',conditions:['workerd','worker','browser'],external:['node:*','cloudflare:*'],plugins:[{name:'isolated-resource-and-transport',setup(b){b.onResolve({filter:/.*/},args=>builtinModules.includes(args.path)&&!args.path.startsWith('node:')?{path:'node:'+args.path,external:true}:undefined);b.onLoad({filter:/\/(identity-worker\/src\/index|a2a\/src\/auth)\.ts$/},async args=>{
 let contents=await readFile(args.path,'utf8');
 if(args.path.endsWith('/identity-worker/src/index.ts'))contents=contents.replaceAll('https://a2a.createsomething.agency/mcp',base+'/mcp');
 else {contents="import { labFetch } from "+JSON.stringify(fileURLToPath(new URL('./transport.ts',import.meta.url)))+";\n"+contents.replaceAll('https://id.createsomething.space',base).replaceAll('await fetch(', 'await labFetch(');contents=contents.replace("if(env.ENVIRONMENT==='test'&&env.LOCAL_TEST_JWKS){",'if(false){');}
 return {contents,loader:'ts',resolveDir:args.path.slice(0,args.path.lastIndexOf('/'))};
 });}}]});
await writeFile(new URL('./dist/build.json',import.meta.url),JSON.stringify({resource:base+'/mcp',issuer:base,sourceRoot:root,transform:'Identity A2A resource constant; A2A issuer and network transport only. Production artifacts unchanged.'},null,2));
