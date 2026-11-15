import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function initialize(){return {version:1,issue:'CRE-2467',owner:'',scope:'',acceptance:[],policy:[],allowedActions:[],sourceRevision:'',stage:'local',gates:Object.fromEntries(['functional','product','release'].map(k=>[k,{status:'untested',evidence:[],limits:'Pending'}])),independentReview:{status:'pending',reviewer:'',evidence:[]},release:{authorization:'',artifact:'',liveVerification:[],rollback:''},followUp:[],metrics:[]};}
export function validate(r){
 const errors=[];const need=(ok,s)=>{if(!ok)errors.push(s)};const str=x=>typeof x==='string'&&x.trim().length>0;const list=x=>Array.isArray(x)&&x.every(str);
 need(r&&typeof r==='object'&&!Array.isArray(r),'record must be an object');if(errors.length)return errors;
 need(r.version===1,'unsupported version');for(const k of ['issue','owner','scope','sourceRevision'])need(str(r[k]),`${k} required`);
 need(/^CRE-\d+$/.test(r.issue),'Linear issue required');need(/^[a-f0-9]{40}$/.test(r.sourceRevision),'sourceRevision must be full Git SHA');
 for(const k of ['acceptance','policy','allowedActions','followUp'])need(list(r[k])&&r[k].length>0,`${k} must contain text`);
 need(['prototype','local','merged','released','business-accepted'].includes(r.stage),'invalid stage');
 for(const k of ['functional','product','release']){const g=r.gates?.[k];need(g&&['passed','failed','untested','not-applicable'].includes(g.status),`${k} status invalid`);need(list(g?.evidence),`${k} evidence invalid`);need(str(g?.limits),`${k} limits required`);if(g?.status==='passed')need(g.evidence?.length>0,`${k} passed requires evidence`);}
 const review=r.independentReview;need(review&&['pending','passed','failed'].includes(review.status)&&typeof review.reviewer==='string'&&list(review.evidence),'review invalid');if(review?.status==='passed')need(str(review.reviewer)&&review.evidence.length>0,'review proof required');
 need(r.release&&typeof r.release==='object','release required');
 if(['released','business-accepted'].includes(r.stage)){for(const k of ['authorization','artifact','rollback'])need(str(r.release?.[k]),`release ${k} required`);need(list(r.release?.liveVerification)&&r.release.liveVerification.length>0,'live verification required');need(review?.status==='passed','independent review required');for(const k of ['functional','release'])need(r.gates?.[k]?.status==='passed',`${k} must pass before release`);}
 if(r.stage==='business-accepted')need(str(r.businessAcceptance),'business acceptance receipt required');
 need(Array.isArray(r.metrics),'metrics required');for(const m of r.metrics??[]){need(m&&str(m.name)&&str(m.unit)&&['baseline','observation'].includes(m.period)&&Number.isInteger(m.sampleSize)&&m.sampleSize>=0&&(m.value===null||typeof m.value==='number'&&Number.isFinite(m.value)&&m.value>=0)&&str(m.source),'invalid metric');if(m?.value===null)need(str(m.reason),'unavailable metric needs reason');}
 return errors;
}
export function main(args){const [command,file,...extra]=args;if(extra.length||!file||!['init','validate','report'].includes(command))throw Error('Usage: init|validate|report FILE');if(command==='init'){writeFileSync(file,JSON.stringify(initialize(),null,2)+'\n',{flag:'wx'});return;}const r=JSON.parse(readFileSync(file,'utf8'));const errors=validate(r);if(errors.length)throw Error(errors.join('\n'));console.log(command==='report'?JSON.stringify({issue:r.issue,stage:r.stage,gates:r.gates,metrics:r.metrics,followUp:r.followUp},null,2):'Valid change evidence v1');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
