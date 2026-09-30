import { access, cp, lstat, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'../agent/gigi');
export async function packageAgent({bundle,output,dataRoot}) {
 if(typeof dataRoot!=='string' || !isAbsolute(dataRoot)) throw new Error('GiGi data root must be an explicit absolute directory.');
 const profile=resolve(dataRoot);
 let profileInfo;
 try {profileInfo=await lstat(profile);} catch {throw new Error('GiGi data root does not exist. Create and review the intended profile first.');}
 if(!profileInfo.isDirectory() || profileInfo.isSymbolicLink()) throw new Error('GiGi data root must be a real directory, not a symlink.');
 const database=join(profile,'gigi.sqlite');
 let databaseInfo;
 try {databaseInfo=await lstat(database);} catch {throw new Error('GiGi database is missing from the data root. Create the intended workspace first.');}
 if(!databaseInfo.isFile() || databaseInfo.isSymbolicLink()) throw new Error('GiGi database must be a regular file, not a symlink.');
 const handle=await open(database,'r');
 let header;
 try {const bytes=Buffer.alloc(16);const result=await handle.read(bytes,0,16,0);header=result.bytesRead===16?bytes.toString('utf8'):'';}
 finally {await handle.close();}
 if(header!=='SQLite format 3\0') throw new Error('GiGi database has an invalid SQLite header.');
 const binary=join(resolve(bundle),'Contents','Resources','gigi-mcp');
 try {await access(binary,constants.X_OK);} catch {throw new Error('Installed GiGi MCP companion is missing or not executable. Build and install GiGi before packaging the connector.');}
 await mkdir(dirname(resolve(output)),{recursive:true});
 await cp(source,output,{recursive:true,errorOnExist:true,force:false});
 const manifest=JSON.parse(await readFile(join(output,'.codex-plugin','plugin.json'),'utf8'));
 manifest.mcpServers='./.mcp.json';
 await writeFile(join(output,'.codex-plugin','plugin.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(join(output,'.mcp.json'),JSON.stringify({mcpServers:{gigi:{command:binary,args:[],env:{GIGI_DATA_DIR:profile}}}},null,2)+'\n');
 return {output:resolve(output),binary,dataRoot:profile};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [bundle,output,dataRoot,...extra]=process.argv.slice(2);
 if(!bundle || !output || !dataRoot || extra.length) throw new Error('Usage: node scripts/package-agent.mjs <installed GiGi.app> <new output directory> <absolute GiGi data root>');
 console.log(JSON.stringify(await packageAgent({bundle,output,dataRoot})));
}
