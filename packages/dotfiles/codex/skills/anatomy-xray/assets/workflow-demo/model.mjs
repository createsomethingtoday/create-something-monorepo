export const assemblies = [
 ['intent','Intent','Name the outcome','A person defines the desired result, scope, and constraints. Unclear intent needs clarification before consequential work.','task'],
 ['contract','Contract','Declare the limits','A prose.md file can declare inputs, outputs, acceptance criteria, and policy. Text alone does not enforce those limits.','task'],
 ['orchestration','Orchestration','Coordinate the work','A coordinator chooses steps, passes context, and handles failures. This illustrative sequence is not a universal runtime architecture.','framework'],
 ['host','Host gate','Enforce authority','The host applies permissions and approval rules. A required approval may be denied or pending; either stops the gated action. Tool servers may enforce additional limits.','task'],
 ['tools','Tools','Perform scoped actions','Authorized calls read or change resources. A successful response must still be checked against the intended result. No tools run in this demo.','framework'],
 ['verification','Verification','Check the outcome','Compare resulting state with acceptance criteria and authoritative evidence. Failed or unknown checks require repair or escalation, not a success claim.','charter'],
 ['receipt','Receipt','Record the evidence','Record intent, authority, source, action, verification, and recovery. A receipt is not automatic proof; evidence can be incomplete or wrong.','charter']
].map(([id,name,verb,description,source],i)=>({id,name,verb,description,source,index:i,...[
 {x:-42,y:-34,z:251,w:84,d:56,h:38,kind:'capsule',zone:'Upper chamber · intent intake'},
 {x:-91,y:8,z:196,w:72,d:54,h:23,kind:'board',zone:'Upper left · declared constraints'},
 {x:16,y:-47,z:173,w:75,d:63,h:55,kind:'core',zone:'Middle rear · coordination core'},
 {x:-68,y:8,z:105,w:130,d:66,h:40,kind:'gate',zone:'Middle front · authority boundary'},
 {x:-91,y:-55,z:45,w:77,d:66,h:45,kind:'tools',zone:'Lower rear · tool adapters'},
 {x:23,y:1,z:48,w:69,d:62,h:34,kind:'core',zone:'Lower right · evidence inspection'},
 {x:-57,y:18,z:8,w:111,d:48,h:17,kind:'board',zone:'Base · retained record'}
][i]}));
export const edges=assemblies.slice(0,-1).map((a,i)=>({from:a.id,to:assemblies[i+1].id,type:'illustrative handoff'}));
export const views=['Isometric','Anterior','Lateral','Superior'];
export const initialState={mode:'transparent',selected:'host',trace:false,zoom:1,panX:0,panY:0};
export const shell={x:-112,y:-78,z:-6,w:224,d:156,h:316};
export function geometry(a,mode){return {...a,x:a.x+(mode==='exploded'?(a.index%2? -55:55):0),z:a.z+(mode==='exploded'?(3-a.index)*10:0)};}
export function project([x,y,z],view){
 const q=view==='Anterior'?[x,-z]:view==='Lateral'?[y,-z]:view==='Superior'?[x,y]:[.866*(x-y),.5*(x+y)-z];
 return [350+1.12*q[0],view==='Superior'?290+1.12*q[1]:462+1.12*q[1]];
}
export function camera(point,state){return [350+(point[0]-350)*state.zoom+state.panX,300+(point[1]-300)*state.zoom+state.panY]}
export function clampNavigation(state){state.zoom=Math.max(1,Math.min(4,state.zoom));const limit=280*(state.zoom-1)+100;state.panX=Math.max(-limit,Math.min(limit,state.panX));state.panY=Math.max(-limit,Math.min(limit,state.panY));return state;}
export function route(e,mode){const a=geometry(assemblies.find(a=>a.id===e.from),mode),b=geometry(assemblies.find(a=>a.id===e.to),mode);const start=[a.x+a.w/2,a.y,a.z+a.h/2],end=[b.x+b.w/2,b.y,b.z+b.h/2];const bus=-65-(assemblies.findIndex(a=>a.id===e.from)%2)*7;return [start,[start[0],bus,start[2]],[end[0],bus,end[2]],end]}
export function svg(view,state){
 const P=p=>project(p,view).map(n=>n.toFixed(2)).join(',');
 const line=(points,cls)=>`<path class="${cls}" d="M${points.map(P).join(' L')}"/>`;
 const poly=(points,cls)=>`<polygon class="${cls}" points="${points.map(P).join(' ')}"/>`;
 const ring=(a,z)=>{const r=18;return [[a.x+r,a.y,z],[a.x+a.w-r,a.y,z],[a.x+a.w,a.y+r,z],[a.x+a.w,a.y+a.d-r,z],[a.x+a.w-r,a.y+a.d,z],[a.x+r,a.y+a.d,z],[a.x,a.y+a.d-r,z],[a.x,a.y+r,z]]};
 function box(a,cls){const {x,y,z,w,d,h}=a;return `<g class="${cls}">`+poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'top')+poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],'front')+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'side')+'</g>';}
 function chamber(a){const bottom=ring(a,a.z),top=ring(a,a.z+a.h);return poly(top,'top')+top.map((p,i)=>poly([bottom[i],bottom[(i+1)%8],top[(i+1)%8],p],i<3?'back':'front')).join('')}
 function core(a){const cx=a.x+a.w/2,cy=a.y+a.d/2;const circ=z=>Array.from({length:24},(_,i)=>[cx+Math.cos(i*Math.PI/12)*a.w/2,cy+Math.sin(i*Math.PI/12)*a.d/2,z]);const lower=circ(a.z),upper=circ(a.z+a.h);return poly(lower,'core-bottom')+lower.slice(0,12).map((p,i)=>poly([p,lower[(i+1)%24],upper[(i+1)%24],upper[i]],'back')).join('')+poly(upper,'top')+lower.slice(12).map((p,j)=>{const i=j+12;return poly([p,lower[(i+1)%24],upper[(i+1)%24],upper[i]],'front')}).join('')+line([[cx,cy,a.z],[cx,cy,a.z+a.h]],'axis')+poly(circ(a.z+a.h/2),'core-ring');}
 const parts=assemblies.map(a=>geometry(a,state.mode));
 const paths=edges.map(e=>{const points=route(e,state.mode),active=state.trace||e.from===state.selected||e.to===state.selected;return `<g data-edge="${e.from}:${e.to}" class="connection ${active?'active':''}">${line(points,'wire-shadow')}${line(points,'wire')}${[points[0],points.at(-1)].map(p=>{const [x,y]=project(p,view);return `<circle class="terminal" cx="${x}" cy="${y}" r="3"/>`}).join('')}</g>`}).join('');
 const drawPart=a=>{let detail='';if(a.kind==='core')detail=core(a);else if(a.kind==='capsule')detail=chamber(a);else if(a.kind==='gate'){detail=box(a,'')+box({...a,x:a.x+12,y:a.y+12,z:a.z+a.h,w:a.w-24,d:a.d-24,h:5},'gate-plane');for(let i=0;i<4;i++)detail+=line([[a.x+22+i*26,a.y,a.z],[a.x+22+i*26,a.y,a.z+a.h]],'gate-bar');}else if(a.kind==='tools'){for(let i=0;i<3;i++)detail+=box({...a,x:a.x+i*27,w:22,h:a.h-4*i},'tool-adapter')}else {detail=box(a,'');for(let i=0;i<3;i++)detail+=line([[a.x+10,a.y+12+i*11,a.z+a.h+.2],[a.x+a.w-10,a.y+12+i*11,a.z+a.h+.2]],'board-trace')}
 // Mounted ports are the route's explicit terminal points.
 const port=project([a.x+a.w/2,a.y,a.z+a.h/2],view);
 return `<g data-part-hit="${a.id}" class="part ${a.id===state.selected?'selected':''}" data-depth="${a.z}" style="--depth-alpha:${(.45+a.z/600).toFixed(2)}">${detail}<circle class="port" cx="${port[0]}" cy="${port[1]}" r="4"/></g>`;};
 const depth=a=>view==='Anterior'?a.y:view==='Lateral'?a.x:view==='Superior'?a.z:a.x+a.y+a.z;
 const body=parts.slice().sort((a,b)=>depth(a)-depth(b)).map(drawPart).join('');
 const lo=ring(shell,shell.z),hi=ring(shell,shell.z+shell.h);
 const rear=`<g class="enclosure-back">${poly(lo,'floor')}${poly(hi,'roof')}${lo.map((p,i)=>line([p,hi[i]],i<3?'rear-edge':'frame-edge')).join('')}${[75,160,240].map(z=>poly(ring(shell,z),'registration')).join('')}</g>`;
 const front=state.mode==='exploded'?'':`<g class="enclosure-front ${state.mode}">${[3,4,5,6,7].filter(i=>state.mode!=='cutaway'||i>5).map(i=>poly([lo[i],lo[(i+1)%8],hi[(i+1)%8],hi[i]],'glass')).join('')}${poly(hi,'glass-cap')}${poly(lo,'rim')}${poly(hi,'rim')}</g>`;
 const cover=state.mode==='exterior'?`<g class="opaque-shell">${chamber(shell)}</g>`:'';
 const labels=state.mode==='exterior'?'':parts.filter(a=>state.zoom<=1.15||a.id===state.selected).map(a=>{const selected=a.id===state.selected;const [px,py]=camera(project([a.x+a.w/2,a.y+a.d/2,a.z+a.h/2],view),state);const left=a.index%2===0;const x=left?20:534;const y=state.zoom>1.15?90:108+a.index*57;return `<g class="annotation ${selected?'selected':''}" data-part-hit="${a.id}"><path d="M${left?x+142:x-6},${y+9} L${left?x+162:x-20},${y+9} L${px},${py}"/><rect x="${x-5}" y="${y-13}" width="151" height="36" rx="3"/><text x="${x}" y="${y+7}">0${a.index+1} ${a.name}</text></g>`}).join('');
 const focus=parts.find(a=>a.id===state.selected),[fx,fy]=camera(project([focus.x+focus.w/2,focus.y+focus.d/2,focus.z+focus.h/2],view),state);
 const mobileLabel=state.mode==='exterior'?'':`<g class="mobile-annotation" data-part-hit="${focus.id}"><path d="M170,58 L${fx},${fy}"/><rect x="18" y="18" width="320" height="44" rx="3"/><text x="30" y="48">0${focus.index+1} ${focus.name}</text></g>`;
 return `<svg viewBox="0 0 700 590" role="img" aria-label="${view}, ${state.mode} schematic. Shared 3D geometry. Selected ${state.selected}; ${Math.round(state.zoom*100)} percent zoom."><title>${view}: inside delegated work</title><desc>Ghosted enclosure reveals overlapping solid assemblies and rear-routed handoffs. Height and opacity are illustrative spatial cues, not measured quantities. Full descriptions and source mapping follow.</desc><defs><radialGradient id="field-${view}"><stop stop-color="#a2b8c5" stop-opacity=".09"/><stop offset="1" stop-color="#a2b8c5" stop-opacity="0"/></radialGradient></defs><ellipse cx="350" cy="290" rx="230" ry="260" fill="url(#field-${view})"/><g class="world" transform="translate(${350+state.panX} ${300+state.panY}) scale(${state.zoom}) translate(-350 -300)">${rear}${paths}${body}${front}${cover}</g>${labels}${mobileLabel}<text class="axis-label" x="20" y="567">${view==='Superior'?'PLAN · X / Y':'DEPTH · X / Y / Z'} · SCHEMATIC SPACE</text></svg>`;
}
