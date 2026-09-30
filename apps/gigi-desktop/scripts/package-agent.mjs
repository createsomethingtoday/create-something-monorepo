import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'../agent/gigi');
export async function packageAgent({bundle,output}) {
 const binary=join(resolve(bundle),'Contents','Resources','gigi-mcp');
 try {await access(binary,constants.X_OK);} catch {throw new Error('Installed GiGi MCP companion is missing or not executable. Build and install GiGi before packaging the connector.');}
 await mkdir(dirname(resolve(output)),{recursive:true});
 await cp(source,output,{recursive:true,errorOnExist:true,force:false});
 const manifest=JSON.parse(await readFile(join(output,'.codex-plugin','plugin.json'),'utf8'));
 manifest.mcpServers='./.mcp.json';
 await writeFile(join(output,'.codex-plugin','plugin.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(join(output,'.mcp.json'),JSON.stringify({mcpServers:{gigi:{command:binary,args:[]}}},null,2)+'\n');
 return {output:resolve(output),binary};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [bundle,output]=process.argv.slice(2);
 if(!bundle || !output) throw new Error('Usage: node scripts/package-agent.mjs <installed GiGi.app> <new output directory>');
 console.log(JSON.stringify(await packageAgent({bundle,output})));
}
