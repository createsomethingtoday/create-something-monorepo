import {WEEKLY,sha} from './pending.mjs';
export function makeFixture() {
  const paragraph=text=>({type:'paragraph',paragraph:{rich_text:[{text:{content:text}}]}});
  const text=b=>(b[b.type]?.rich_text??[]).map(r=>r.text.content).join('');
  const fp=b=>sha(JSON.stringify({type:b.type,text:text(b)}));
  const desired=Array.from({length:880},(_,i)=>paragraph(`part ${i}`));
  const block=(id,b)=>({id,...b,has_children:false,archived:false,in_trash:false});
  const manifest={heading:'heading',archive:'archive',readerIndexes:['reader'],slots:desired.slice(0,800).map((b,i)=>({id:`b${i}`,hash:fp(b)}))};
  manifest.pending={key:WEEKLY.oldKey,after:'b799',known:['heading',...manifest.slots.map(s=>s.id),'archive'],hashes:desired.slice(800).map(fp)};
  const properties={'Transcript Version':{rich_text:[{text:{content:`${WEEKLY.version}:1`}}]},'Transcript Ready Version':{rich_text:[]},'Categorized Transcript Version':{rich_text:[]},'Transcript Retrieval Index':{url:null},Reviewed:{checkbox:false},Categorized:{checkbox:false},'Agent Tag':{multi_select:[]}};
  const evidence={oldKey:WEEKLY.oldKey,reservedAt:WEEKLY.oldReservedAt,provider:{status:409,code:'conflict_error',requestId:WEEKLY.requestId,path:`/v1/blocks/${WEEKLY.pageId}/children`,query:''},methodInference:true,historicalBodyFingerprintRecorded:false,coverage:{complete:true,abr:1,total:1,returned:1},matches:1,event:{selectedKeyMatches:true,scriptVersion:'historical-version',at:Date.parse('2026-11-09T19:05:38.819Z'),id:'event',invocation:'invocation'}};
  const raw='immutable fixture';
  const profile={...WEEKLY,archiveId:'archive',sourceBytes:Buffer.byteLength(raw),sourceSha256:sha(raw),manifest:JSON.stringify(manifest),properties:JSON.stringify(properties),owner:'owner',meetingKey:'meeting',selectedKey:'selected',deadline:Date.now()+300000,archiveMetadata:[],readerMetadata:[],historicalScriptVersion:'historical-version',evidenceSha256:sha(JSON.stringify(evidence))};
  profile.manifestSha256=sha(profile.manifest);
  const root=[block('heading',{type:'heading_3',heading_3:{rich_text:[{text:{content:'📝 FULL TRANSCRIPT (updating)'}}]}}),...desired.slice(0,800).map((b,i)=>block(`b${i}`,b)),block('archive',{type:'toggle',toggle:{rich_text:[{text:{content:'Source archive'}}]}}),block('reader',{type:'child_page',child_page:{title:`Transcript Retrieval Index | indexed-transcript-pages-v2 | ${WEEKLY.version}`}})];
  let attempt=null;
  const f={profile,evidence,raw,sends:0,planner:{parseTranscript:r=>r,planTranscript:async()=>({version:WEEKLY.version,artifacts:[]}),inlineBlocks:()=>desired,fingerprint:fp,blockText:text,artifactMarker:()=>''}};
  f.adapter={guard:async()=>({exclusive:true,owner:profile.owner,oldReservation:profile.oldReservedAt,projection:{version:profile.version,generation:1,phase:'writing',manifest:profile.manifest}}),getPage:async()=>({id:profile.pageId,properties}),listBlockChildren:async id=>({results:id===profile.pageId?root:[],has_more:false,next_cursor:null}),getAttempt:async()=>attempt,reserveAttempt:async row=>{if(attempt)return false; attempt={...row,status:'reserved'};return true;},markInFlight:async()=>{if(attempt.status!=='reserved')return false;attempt.status='in-flight';return true;},recordReceipt:async(key,status,receipt)=>{attempt.status=status;attempt.receipt=receipt;},append:async(id,body)=>{f.sends++;root.splice(801,0,...body.children.map((b,i)=>block(`new${i}`,b)));}};
  return f;
}
