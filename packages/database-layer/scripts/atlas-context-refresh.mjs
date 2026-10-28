// Bounded single-flight local projection refresh. No network, credentials, daemon,
// tracked writes, or full topology regeneration. The generator's --json path is pure.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
const schema = 'atlas-context-projection/v1';
const names = ['README','operating-loop','business-recommendations','topology-inventory','management-surface','operating-slices','agent-routes'];
const prefix = 'packages/database-layer/docs/agent-wiki/';
const readJson = file => { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; } };
const atomic = (file,value) => {
  const temporary=`${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary,JSON.stringify(value),{mode:0o600}); fs.renameSync(temporary,file); }
  finally { if(fs.existsSync(temporary)) fs.unlinkSync(temporary); }
};

function fingerprint(root, previous) {
  const digest=createHash('sha256');
  const data=path.join(root,'packages/database-layer/data');
  const files=fs.existsSync(data)?fs.readdirSync(data).filter(n=>n.endsWith('.json')).sort().map(n=>`packages/database-layer/data/${n}`):[];
  files.push(...['generate-agent-wiki.mjs','agent-wiki-support.mjs','agent-wiki-passages.mjs','atlas-context.mjs','atlas-context-refresh.mjs'].map(n=>`packages/database-layer/scripts/${n}`));
  files.push(...names.map(n=>`${prefix}${n}.md`));
  for(const file of files) {
    digest.update(file);
    try {digest.update(fs.readFileSync(path.join(root,file)));} catch(e) {if(e.code!=='ENOENT') throw e; digest.update('missing');}
  }
  // Link existence is a dependency too: deleting a referenced local file must
  // invalidate a previously checked projection, even if JSON bytes are unchanged.
  const linkTargets=new Set(previous?.linkTargets ?? []);
  for(const name of names) {
    let text=''; try {text=fs.readFileSync(path.join(root,prefix,`${name}.md`),'utf8');} catch {}
    for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      if(/^(?:[a-z][a-z\d+.-]*:|#)/i.test(match[1])) continue;
      try {linkTargets.add(path.relative(root,path.resolve(root,prefix,decodeURIComponent(match[1].split('#')[0]))));} catch {}
    }
  }
  for(const target of [...linkTargets].sort()) digest.update(target).update(String(fs.existsSync(path.resolve(root,target))));
  return digest.digest('hex');
}

function readSnapshot(root, file) {
  const value=readJson(file);
  if(value?.schema!==schema || value.payloadHash!==hash(JSON.stringify(value.payload))) return null;
  const p=value.payload;
  if(!Array.isArray(p?.sources) || p.sources.length!==names.length || !Array.isArray(p.passages)) return null;
  try {
    for(const s of p.sources) {
      if(!s.path.startsWith('.cache/atlas-context/snapshots/') || s.path.includes('..') || hash(fs.readFileSync(path.join(root,s.path),'utf8'))!==s.contentHash) return null;
    }
    return p;
  } catch {return null;}
}

export function refreshProjection(root, buildIndex, { force=false, enabled=true, timeoutMs=2000 }={}) {
  const directory=path.join(root,'.cache/atlas-context');
  const index=path.join(directory,'projection.json');
  let previous=readSnapshot(root,index);
  const info=(status,extra={})=>({status,scope:'local_artifacts_to_cached_wiki',...extra});
  const fallback=(status,extra={})=>({snapshot:previous,refresh:info(status,{serving:previous?'last_good':'tracked_wiki',...extra}),current:false});
  if(!enabled) return fallback('off');
  let inputHash;
  try {inputHash=fingerprint(root,previous);} catch {return fallback('failed',{reason:'input_unreadable'});}
  if(!force && previous?.inputHash===inputHash) return {snapshot:previous,refresh:info('current'),current:true};
  const attemptFile=path.join(directory,'attempt.json');
  const attempt=readJson(attemptFile);
  const now=Date.now();
  // A successful refresh coalesces a burst of edits; failed identical inputs back
  // off longer. There is no timer/daemon: a later search retries after this window.
  const delay=attempt?.ok ? 200 : 2000;
  if(!force && attempt && now-attempt.at<delay && (attempt.ok || attempt.inputHash===inputHash))
    return fallback('debounced',{retryAfterMs:delay-(now-attempt.at),reason:attempt.reason ?? 'input_change_burst'});
  const lock=path.join(directory,'refresh.lock');
  const token=randomUUID();
  let owned=false;
  try {
    fs.mkdirSync(directory,{recursive:true});
    // Recover only a dead owner (or an old incomplete lock), never steal a live
    // process's refresh. PID reuse errs toward serving stale, not double publishing.
    if(fs.existsSync(lock)) {
      const recovery=path.join(directory,'recovery.lock');
      let recoveryFd;
      try {
        recoveryFd=fs.openSync(recovery,'wx',0o600);
        const owner=readJson(lock);
        let dead=false;
        if(Number.isInteger(owner?.pid)) {try {process.kill(owner.pid,0);} catch(e) {dead=e.code==='ESRCH';}}
        else if(fs.existsSync(lock)) dead=Date.now()-fs.statSync(lock).mtimeMs>10000;
        if(dead) {try {fs.unlinkSync(lock);} catch {}}
      } catch(e) {if(e.code!=='EEXIST') throw e;}
      finally {if(recoveryFd!==undefined) {fs.closeSync(recoveryFd); fs.unlinkSync(recovery);}}
    }
    try {
      const fd=fs.openSync(lock,'wx',0o600);
      try {fs.writeFileSync(fd,JSON.stringify({pid:process.pid,token}));} finally {fs.closeSync(fd);}
      owned=true;
    } catch(e) {if(e.code==='EEXIST') return fallback('refresh_in_progress'); throw e;}
    // Another process might have published while we were acquiring the lock.
    previous=readSnapshot(root,index) ?? previous;
    inputHash=fingerprint(root,previous);
    if(!force && previous?.inputHash===inputHash) return {snapshot:previous,refresh:info('current'),current:true};
    const output=spawnSync(process.execPath,['packages/database-layer/scripts/generate-agent-wiki.mjs','--json'],{
      cwd:root,encoding:'utf8',timeout:timeoutMs,killSignal:'SIGKILL',maxBuffer:4*1024*1024,
    });
    if(output.error || output.status!==0) throw new Error(output.error?.code==='ETIMEDOUT'?'refresh_timeout':'generator_failed');
    let files;
    try {files=JSON.parse(output.stdout).files;} catch {throw new Error('invalid_projection');}
    if(!files || Object.keys(files).length!==names.length || names.some(n=>typeof files[`${n}.md`]!=='string')) throw new Error('invalid_projection');
    if(fingerprint(root,previous)!==inputHash) throw new Error('inputs_changed_during_refresh');
    const generation=randomUUID();
    const relative=`.cache/atlas-context/snapshots/${generation}`;
    const sourceDir=path.join(root,relative);
    fs.mkdirSync(sourceDir,{recursive:true});
    const linkTargets=new Set();
    const sources=names.map(name=>{
      const text=files[`${name}.md`];
      fs.writeFileSync(path.join(sourceDir,`${name}.md`),text,{mode:0o600});
      for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        if(/^(?:[a-z][a-z\d+.-]*:|#)/i.test(match[1])) continue;
        try {linkTargets.add(path.relative(root,path.resolve(root,prefix,decodeURIComponent(match[1].split('#')[0]))));} catch {}
      }
      return {sourceId:`atlas-context:${name}`,path:`${relative}/${name}.md`,canonicalPath:`${prefix}${name}.md`,text,contentHash:hash(text)};
    });
    const payload={sources,passages:buildIndex(sources),linkTargets:[...linkTargets].sort(),generatedAt:new Date().toISOString()};
    // Include the newly discovered link set, so the next lookup remains a hit.
    payload.inputHash=fingerprint(root,payload);
    // Do not publish a mixed snapshot if inputs changed while serializing files.
    if(fingerprint(root,previous)!==inputHash) throw new Error('inputs_changed_during_refresh');
    atomic(index,{schema,payload,payloadHash:hash(JSON.stringify(payload))});
    atomic(attemptFile,{at:Date.now(),inputHash:payload.inputHash,ok:true});
    return {snapshot:payload,refresh:info('refreshed'),current:true};
  } catch(error) {
    const reason=['refresh_timeout','generator_failed','invalid_projection','inputs_changed_during_refresh'].includes(error.message)?error.message:'cache_unavailable';
    try {atomic(attemptFile,{at:Date.now(),inputHash,ok:false,reason});} catch {}
    return fallback('failed',{reason});
  } finally {
    if(owned && readJson(lock)?.token===token) {try {fs.unlinkSync(lock);} catch {}}
  }
}
