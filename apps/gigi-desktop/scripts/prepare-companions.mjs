import {prepareCtx} from './ctx-companion.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync, cpSync, chmodSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const profile=process.env.GIGI_BUILD_PROFILE==='debug'?'debug':'release';
const resources=join(app,'src-tauri','resources');
mkdirSync(resources,{recursive:true});
function run(command,args,cwd=app) {
 const result=spawnSync(command,args,{cwd,stdio:'inherit'});
 if(result.status!==0) throw new Error(`${command} failed while preparing GiGi companions`);
}
run('cargo',['build','--manifest-path','src-tauri/Cargo.toml','--bin','gigi-mcp',...(profile==='release'?['--release']:[])]);
copyFileSync(join(app,'src-tauri','target',profile,'gigi-mcp'),join(resources,'gigi-mcp'));
run('bun',['build','--compile','src/runner-main.ts','--outfile',join(resources,'gigi-integrations')],resolve(app,'../../packages/gigi-integrations'));
chmodSync(join(resources,'gigi-mcp'),0o755);
chmodSync(join(resources,'gigi-integrations'),0o755);
cpSync(join(app,'agent'),join(resources,'agent'),{recursive:true});

await prepareCtx(resources);
cpSync(join(app,'third-party'),join(resources,'third-party'),{recursive:true});
