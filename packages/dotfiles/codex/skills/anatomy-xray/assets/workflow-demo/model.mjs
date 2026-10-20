export const assemblies = [
 ['intent','Intent','Name the outcome','A person defines the desired result, scope, and constraints. Unclear intent needs clarification before consequential work.','task'],
 ['contract','Contract','Declare the limits','A prose.md file can declare inputs, outputs, acceptance criteria, and policy. Text alone does not enforce those limits.','task'],
 ['orchestration','Orchestration','Coordinate the work','A coordinator chooses steps, passes context, and handles failures. This illustrative sequence is not a universal runtime architecture.','framework'],
 ['host','Host gate','Enforce authority','The host applies permissions and approval rules. A required approval may be denied or pending; either stops the gated action. Tool servers may enforce additional limits.','task'],
 ['tools','Tools','Perform scoped actions','Authorized calls read or change resources. A successful response must still be checked against the intended result. No tools run in this demo.','framework'],
 ['verification','Verification','Check the outcome','Compare resulting state with acceptance criteria and authoritative evidence. Failed or unknown checks require repair or escalation, not a success claim.','charter'],
 ['receipt','Receipt','Record the evidence','Record intent, authority, source, action, verification, and recovery. A receipt is not automatic proof; evidence can be incomplete or wrong.','charter']
].map(([id,name,verb,description,source],i)=>({id,name,verb,description,source,index:i,x:48*i,y:14*i,z:26*i,w:42,d:60,h:14}));
export const edges=assemblies.slice(0,-1).map((a,i)=>({from:a.id,to:assemblies[i+1].id,type:'illustrative handoff'}));
export const views=['Isometric','Anterior','Lateral','Superior'];
export const initialState={mode:'transparent',selected:'host',trace:false};
export function geometry(a,mode){return {...a,x:a.x+(mode==='exploded'?a.index*25:0),z:a.z+(mode==='exploded'?a.index*5:0)};}
export function project([x,y,z],view){
 const raw=([x,y,z])=>view==='Anterior'?[x,-z]:view==='Lateral'?[y,-z]:view==='Superior'?[x,y]:[.866*(x-y),.5*(x+y)-z];
 const corners=[];
 const bounds=[{x:-12,y:-12,z:-12,w:366,d:174,h:198},...assemblies.map(a=>geometry(a,'exploded'))];
 for(const a of bounds)for(const x of [a.x,a.x+a.w])for(const y of [a.y,a.y+a.d])for(const z of [a.z,a.z+a.h])corners.push(raw([x,y,z]));
 const center=[0,1].map(i=>(Math.min(...corners.map(p=>p[i]))+Math.max(...corners.map(p=>p[i])))/2);
 const q=raw([x,y,z]);return [250+.75*(q[0]-center[0]),200+.75*(q[1]-center[1])];
}
export function svg(view,state){
 const P=p=>project(p,view).map(n=>n.toFixed(2)).join(',');
 const poly=(pts,cls)=>`<polygon class="${cls}" points="${pts.map(P).join(' ')}"/>`;
 function box(a,cls){const {x,y,z,w,d,h}=a;return `<g class="${cls}">`+poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'top')+poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],'front')+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'side')+'</g>';}
 const parts=assemblies.map(a=>geometry(a,state.mode));
 const paths=edges.map(e=>{const a=parts.find(a=>a.id===e.from),b=parts.find(a=>a.id===e.to);const active=state.trace||e.from===state.selected||e.to===state.selected;return `<path data-edge="${e.from}:${e.to}" class="wire ${active?'active':''}" d="M${P([a.x+a.w,a.y+a.d/2,a.z+a.h/2])} L${P([b.x,b.y+b.d/2,b.z+b.h/2])}"/>`;}).join('');
 const body=parts.map(a=>box(a,`part ${a.id===state.selected?'selected':''}`)).join('');
 const shell={x:-12,y:-12,z:-12,w:366,d:174,h:198};
 const cover=state.mode==='exploded'?'':box({...shell,w:state.mode==='cutaway'?183:shell.w},`shell ${state.mode}`);
 const labels=state.mode==='exterior'?'':parts.map(a=>{const [x,y]=project([a.x+a.w/2,a.y+a.d/2,a.z+a.h],view);return `<g class="badge ${a.id===state.selected?'selected':''}"><circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y+4}">${a.index+1}</text></g>`;}).join('');
 return `<svg viewBox="0 0 500 400" role="img" aria-label="${view}, ${state.mode} schematic. Seven numbered assemblies; full descriptions follow."><title>${view} workflow console</title><desc>Shared illustrative geometry. Numbered assemblies correspond to the text below. Dashed paths show handoffs, not measured signals.</desc>${paths}${body}${cover}${labels}</svg>`;
}
