const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const copy = x => x === undefined ? undefined : structuredClone(x);
function value(base, local, incoming, path) {
 if (same(local,base)) return copy(incoming);
 if (same(incoming,base) || same(local,incoming)) return copy(local);
 throw new Error(`Working-copy conflict at ${path}; reconcile before publishing`);
}
function keyed(base, local, incoming, key, merge, path) {
 const index = rows => {
  if (!Array.isArray(rows)) throw new Error(`Missing merge baseline at ${path}`);
  const map=new Map();
  for(const row of rows) { if(!row || typeof row[key]!=='string' || map.has(row[key])) throw new Error(`Invalid merge identity at ${path}`); map.set(row[key],row); }
  return map;
 };
 const b=index(base),l=index(local),n=index(incoming),result=[];
 for(const id of [...n.keys(),...l.keys()].filter((id,i,a)=>a.indexOf(id)===i)) {
  const old=b.get(id), edited=l.get(id), next=n.get(id);
  const merged=old && edited && next ? merge(old,edited,next,`${path}/${id}`) : value(old,edited,next,`${path}/${id}`);
  if(merged!==undefined) result.push(merged);
 }
 return result;
}
function fields(base,local,incoming,path) {
 return Object.fromEntries([...new Set([...Object.keys(base),...Object.keys(local),...Object.keys(incoming)])].map(k=>[k,value(base[k],local[k],incoming[k],`${path}/${k}`)]).filter(([,v])=>v!==undefined));
}
export function mergeWorking(previous,pages,registry) {
 if(!previous) return {pages:copy(pages),registry:copy(registry),changelog:[]};
 if(!previous.baseline?.pages || !previous.working?.pages) throw new Error('Previous baseline and working pages required; refusing ungrounded carry-forward');
 const mergedPages=keyed(previous.baseline.pages,previous.working.pages,pages,'slug',(b,l,n,p)=>{
  const {sections:bs,...bf}=b,{sections:ls,...lf}=l,{sections:ns,...nf}=n;
  return {...fields(bf,lf,nf,p),sections:keyed(bs,ls,ns,'id',fields,p)};
 },'pages');
 const presentIds=new Set(mergedPages.flatMap(page=>page.sections.map(section=>section.id)));
 for(const [id,row] of Object.entries(previous.working.registry || {})) {
  if(!presentIds.has(id) && (!previous.baseline.registry || !same(row,previous.baseline.registry[id]))) throw new Error(`Working-copy conflict at removed registry/${id}; reconcile before publishing`);
 }
 const mergedRegistry={};
 for(const page of mergedPages) for(const section of page.sections) {
  const id=section.id;
  // Older v1 pages did not retain seed registry baselines. Preserve their
  // accepted metadata; new rows still receive current seed defaults.
  mergedRegistry[id]=previous.baseline.registry
   ? fields(previous.baseline.registry[id]||{},previous.working.registry[id]||{},registry[id]||{},`registry/${id}`)
   : copy(previous.working.registry[id] ?? registry[id] ?? {});
 }
 return {pages:mergedPages,registry:mergedRegistry,changelog:copy(previous.working.changelog||[])};
}
