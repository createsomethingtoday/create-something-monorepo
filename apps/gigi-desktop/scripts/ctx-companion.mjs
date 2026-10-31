import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,chmod} from 'node:fs/promises';
import {join} from 'node:path';
const checksums={arm64:'90807a133453ed6a2a70b6fdfb70a1ce7da9b6d4eb2cf33248020c664d330d99',x64:'397b058a522fe27bbc28fcfc7519ecd7d40d768344403bf6a7d50cd90bc84dff'};
export function ctxAsset(platform=process.platform,arch=process.arch) {
 if(platform!=='darwin'||!checksums[arch])throw new Error(`Unsupported GiGi CTX build target: ${platform}/${arch}`);
 return {version:'1.3.1',sha256:checksums[arch],url:`https://github.com/ctxrs/ctx/releases/download/v1.3.1/ctx-macos-${arch}`};
}
export function verifyCtxAsset(bytes,asset) {
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('CTX release checksum mismatch; refusing to bundle');
 return bytes;
}
export async function prepareCtx(resources) {
 const asset=ctxAsset();const target=join(resources,'ctx');
 try {verifyCtxAsset(await readFile(target),asset);await chmod(target,0o755);return;}catch{}
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error(`CTX pinned release download failed (${response.status})`);
 const bytes=verifyCtxAsset(Buffer.from(await response.arrayBuffer()),asset);
 const temporary=join(resources,`.ctx-${process.pid}.tmp`);
 await writeFile(temporary,bytes,{mode:0o755});await rename(temporary,target);
}
