import {spawnSync} from 'node:child_process';
import {realpathSync,statSync,readFileSync} from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2), json=args.includes('--json'), targets=args.filter(x=>x!=='--json');
const out={requested:targets[0]??process.cwd(),unknowns:[],validationCandidates:[]};
const maxBuffer=1024*1024;
function git(...args){
 const result=spawnSync('git',['-C',out.directory,...args],{encoding:'utf8',maxBuffer,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
 if(result.error){
  const cause=result.error.code==='ENOBUFS'?`output exceeded the ${maxBuffer}-byte capture limit (ENOBUFS)`:`${result.error.code}: ${result.error.message}`;
  throw new Error(`Git ${stage.label} failed (${args.join(' ')}): ${cause}`);
 }
 return result;
}
let exit=0, inventoryRead=false;
const quote=value=>"'"+value.replaceAll("'", "'\\''")+"'";
let stage;
function observe(label,args){
 stage={label,args};
 return git(...args);
}
function failed(result){
 const cause=result.signal?`signal ${result.signal}`:`exit ${result.status}`;
 const diagnostic=result.stderr.trim();
 return new Error(`Git ${stage.label} failed (${stage.args.join(' ')}): ${cause}${diagnostic?`: ${diagnostic}`:''}`);
}
function required(label,args){
 const result=observe(label,args);
 if(result.status!==0||result.signal)throw failed(result);
 return result.stdout;
}
try{
 if(targets.length>1)throw new Error('Usage: workspace-check.mjs [directory] [--json]');
 out.directory=realpathSync(out.requested);if(!statSync(out.directory).isDirectory())throw new Error('Target is not a directory');
 out.root=required('root lookup',['rev-parse','--show-toplevel']).replace(/\n$/,'');out.directory=out.root;
 out.head=required('HEAD lookup',['rev-parse','HEAD']).trim();
 const branch=observe('branch lookup',['symbolic-ref','--quiet','--short','HEAD']);
 if(branch.status===0&&!branch.signal)out.branch=branch.stdout.trim();
 else if(branch.status===1&&!branch.signal&&!branch.stderr.trim())out.branch=null;
 else throw failed(branch);
 const status=required('status',['status','--porcelain=v1','--untracked-files=normal','-z']);
 const records=status.split('\0');out.changes=[];
 for(let i=0;i<records.length;i++){const s=records[i];if(!s)continue;const entry={status:s.slice(0,2),path:s.slice(3)};if(/[RC]/.test(entry.status))entry.from=records[++i];out.changes.push(entry);}
 out.trackedChanges=out.changes.filter(x=>x.status!=='??').length;out.untracked=out.changes.filter(x=>x.status==='??').length;
 const up=observe('upstream lookup',['rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}']);out.upstream=up.status===0?up.stdout.trim():null;
 if(out.upstream){const counts=observe('upstream divergence',['rev-list','--left-right','--count','HEAD...@{upstream}']);if(counts.status===0){const [ahead,behind]=counts.stdout.trim().split(/\s+/).map(Number);out.divergence={ahead,behind};}else out.unknowns.push('Upstream divergence unavailable');}else out.unknowns.push('No resolvable upstream; relative age unavailable');
 stage=undefined;
 out.unknowns.push('Local upstream refs may be stale; no fetch performed');
 try{
  const pkg=JSON.parse(readFileSync(path.join(out.root,'package.json'),'utf8'));
  const scripts=Object.hasOwn(pkg,'scripts')?pkg.scripts:{};
  if(scripts===null||typeof scripts!=='object'||Array.isArray(scripts))throw new Error('Invalid scripts inventory');
  out.validationCandidates=Object.entries(scripts).filter(([k,v])=>/^(test|check|lint|typecheck|build)(:|$)/.test(k)&&typeof v==='string').map(([name])=>name);
  inventoryRead=true;
 }catch(e){out.unknowns.push(e.code==='ENOENT'?'No root package.json':'Root package.json unavailable or malformed');}
 const flags=[!out.branch?'detached HEAD':null,out.divergence?.behind?'behind local upstream':null,out.divergence?.ahead&&out.divergence?.behind?'diverged':null,out.changes.length?'dirty checkout':null].filter(Boolean);
 out.finding=flags.join('; ')||'Clean checkout';
 const cwd=realpathSync(process.cwd()), atRoot=cwd===out.root;
 const prefix=atRoot?'git':`git -C ${quote(out.root)}`;
 const nextArgs=out.changes.length?'status --short --untracked-files=normal':!out.branch?'log -1 --decorate --oneline':out.divergence?.ahead||out.divergence?.behind?'log --oneline --left-right HEAD...@{upstream}':'log -1 --oneline';
 const reason=out.changes.length?'Inspect changed paths before choosing owned edits.':!out.branch?'Inspect the detached commit before choosing owned edits.':out.divergence?.ahead||out.divergence?.behind?'Inspect differences against the local upstream ref.':'Inspect the latest commit for task context.';
 out.nextCommand=`${prefix} ${nextArgs}`;
 out.nextStep=reason;
 const relativeHelper=path.relative(cwd,path.resolve(process.argv[1]));
 const helper=relativeHelper.startsWith('..')?path.resolve(process.argv[1]):relativeHelper;
 out.detailsCommand=`node ${quote(helper)}${atRoot?'':` ${quote(out.root)}`} --json`;
}catch(e){exit=1;out.finding=e.message;out.nextStep='Supply an existing Git directory and ensure Git is available; no recovery mutation was attempted.';
 if(stage){
  if(out.head&&!out.changes){out.trackedChanges=null;out.untracked=null;}
  out.unknowns.push(`Git ${stage.label} unavailable`);
  out.nextStep=`Git ${stage.label} failed. Retry the read-only diagnostic and inspect its output; no recovery mutation was attempted.`;
  const diagnostic=stage.label==='status'?['status','--short','--untracked-files=normal']:stage.args;
  out.nextCommand=`git -C ${quote(out.root??out.directory)} ${diagnostic.join(' ')}`;
 }}

function humanSummary() {
 const lines=[out.finding];
 if(out.nextCommand)lines.push(exit&&stage?'Retry the read-only command to inspect its diagnostic.':out.nextStep, `Next (read-only): ${out.nextCommand}`);
 lines.push(out.root??out.requested);
 if(out.head){
  lines.push(`${'branch' in out?(out.branch??'Detached HEAD'):'Branch unavailable'} | ${out.head.slice(0,7)}`);
  lines.push(`Tracked changes: ${out.trackedChanges??'unavailable'}; untracked entries: ${out.untracked??'unavailable'} (entries, not total files)`);
  const divergence=out.divergence?` (${out.divergence.ahead} ahead, ${out.divergence.behind} behind)`:'';
  lines.push(`Upstream: ${'upstream' in out?(out.upstream??'unavailable'):'not checked'}${divergence}; local refs only, no fetch`);
  lines.push(inventoryRead?`Checks: not run; ${out.validationCandidates.length} candidate${out.validationCandidates.length===1?'':'s'} (inventory available as JSON)`:'Checks: not run; candidate inventory unavailable');
 }
 const otherUnknowns=out.unknowns.filter(value=>value!=='Local upstream refs may be stale; no fetch performed'&&value!=='No resolvable upstream; relative age unavailable'&&value!==`Git ${stage?.label} unavailable`);
 if(otherUnknowns.length)lines.push(...otherUnknowns);
 if(out.detailsCommand)lines.push(`Details: ${out.detailsCommand}`);
 if(!out.nextCommand)lines.push(`Next (read-only): ${out.nextStep}`);
 return lines.join('\n');
}
console.log(json?JSON.stringify(out,null,2):humanSummary());
process.exitCode=exit;
