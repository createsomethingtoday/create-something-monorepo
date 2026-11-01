// Embedded after model.mjs by the local builder. No runtime imports or network.
let state={...initialState},inspection=false,pendingFrame=0,suppressClick=false;
const sourceNames={task:'Authoring brief · declared boundary, not observed runtime',framework:'Three-Tier Framework · conceptual roles, repository base a45054436',charter:'Agent-Run Receipt Charter · evidence requirements, repository base a45054436'};
const render=()=>{
 clampNavigation(state);
 views.forEach((v,i)=>document.getElementById('view-'+i).innerHTML=svg(v,state));
 const a=assemblies.find(a=>a.id===state.selected),incoming=edges.filter(e=>e.to===a.id).map(e=>assemblies.find(p=>p.id===e.from).name),outgoing=edges.filter(e=>e.from===a.id).map(e=>assemblies.find(p=>p.id===e.to).name);
 document.getElementById('selected-index').textContent='ASSEMBLY 0'+(a.index+1)+' / SCHEMATIC';
 document.getElementById('selected-title').textContent=a.name;
 document.getElementById('selected-description').textContent=a.description;
 document.getElementById('selected-detail').textContent=a.zone+'. Input: '+(incoming.join(', ')||'person / request')+'. Output: '+(outgoing.join(', ')||'evidence record')+'. Spatial placement is an authored explanatory choice.';
 const g=geometry(a,state.mode),point=camera(project([g.x+g.w/2,g.y+g.d/2,g.z+g.h/2],'Isometric'),state);if(point[0]<0||point[0]>700||point[1]<0||point[1]>590)document.getElementById('selected-detail').textContent+=' Selected part is outside the primary view; choose Fit to locate it.';
 document.getElementById('selected-source').textContent='Source: '+sourceNames[a.source]+'.';
 document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.part===a.id));
 document.getElementById('trace').setAttribute('aria-pressed',state.trace);
 document.getElementById('mode').value=state.mode;
 document.getElementById('zoom-level').textContent=Math.round(state.zoom*100)+'%';
 document.getElementById('zoom-in').disabled=state.zoom>=4;
 document.getElementById('zoom-out').disabled=state.zoom<=1;
 document.getElementById('status').textContent=({exterior:'Opaque enclosure; choose XRay to inspect the system.',transparent:'XRay: ghosted enclosure, overlapping assemblies and rear-routed paths.',cutaway:'Cutaway: front-right enclosure panels removed.',exploded:'Exploded assemblies; illustrative spacing, same attached routes.'}[state.mode])+' '+(state.trace?'All handoffs emphasized.':'Selected assembly and adjacent handoffs emphasized.');
};
const scheduleRender=()=>{if(!pendingFrame)pendingFrame=requestAnimationFrame(()=>{pendingFrame=0;render()})};
const zoomBy=(factor)=>{state.zoom*=factor;render()};
const fit=()=>{state.zoom=1;state.panX=0;state.panY=0;render()};
const setInspection=value=>{inspection=value;document.getElementById('inspect').setAttribute('aria-pressed',value);document.querySelectorAll('.viewport').forEach(v=>v.classList.toggle('inspect',value));document.getElementById('gesture-status').textContent=value?'Inspection enabled: drag or pinch inside a view. Escape or the button restores page gestures.':'Page scrolling enabled. Use buttons, focused-view keys, or Alt + wheel to zoom.'};
document.getElementById('mode').onchange=e=>{state.mode=e.target.value;render()};
document.getElementById('trace').onclick=()=>{state.trace=!state.trace;render()};
document.getElementById('reset').onclick=()=>{state={...initialState};setInspection(false);render()};
document.getElementById('fit').onclick=fit;
document.getElementById('zoom-in').onclick=()=>zoomBy(1.25);
document.getElementById('zoom-out').onclick=()=>zoomBy(.8);
document.getElementById('inspect').onclick=()=>setInspection(!inspection);
document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.pan.split(',').map(Number);state.panX+=x;state.panY+=y;render()});
document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.part;render()});
document.querySelectorAll('.viewport').forEach(v=>{
 v.tabIndex=0;v.setAttribute('aria-label','Inspect '+v.dataset.view+'. Plus or minus zooms, arrow keys pan, zero fits, Escape restores page gestures.');
 v.onclick=e=>{if(suppressClick){suppressClick=false;return}const p=e.target.closest('[data-part-hit]');if(p){state.selected=p.dataset.partHit;render()}};
 v.onkeydown=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const keys=['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='Escape'){setInspection(false);return}if(e.key==='0'){fit();return}if(e.key==='+'||e.key==='=')state.zoom*=1.25;else if(e.key==='-')state.zoom*=.8;else {const delta={ArrowLeft:[-35,0],ArrowRight:[35,0],ArrowUp:[0,-35],ArrowDown:[0,35]}[e.key];state.panX+=delta[0];state.panY+=delta[1]}render()};
 v.addEventListener('wheel',e=>{if(!e.altKey)return;e.preventDefault();state.zoom*=e.deltaY<0?1.12:1/1.12;scheduleRender()},{passive:false});
 const pointers=new Map();let last=null,start=null;
 const measure=()=>{const ps=[...pointers.values()];return {x:ps.reduce((a,p)=>a+p.x,0)/ps.length,y:ps.reduce((a,p)=>a+p.y,0)/ps.length,d:ps.length===2?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0}};
 v.onpointerdown=e=>{if(!inspection||e.button!==0)return;v.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last=measure();start={x:e.clientX,y:e.clientY};suppressClick=false};
 v.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=measure();const rect=v.querySelector('svg').getBoundingClientRect();const scale=Math.min(rect.width/700,rect.height/590);if(last){state.panX+=(next.x-last.x)/scale;state.panY+=(next.y-last.y)/scale;if(next.d&&last.d)state.zoom*=next.d/last.d}if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)suppressClick=true;last=next;scheduleRender()};
 const end=e=>{pointers.delete(e.pointerId);last=pointers.size?measure():null;start=null};v.onpointerup=end;v.onpointercancel=end;v.onlostpointercapture=end;
});
// Print a fitted transparent system even if the current inspection is zoomed/cropped.
let beforePrint=null;window.addEventListener('beforeprint',()=>{beforePrint={...state};state={...state,mode:'transparent',zoom:1,panX:0,panY:0};render()});window.addEventListener('afterprint',()=>{if(beforePrint){state=beforePrint;beforePrint=null;render()}});
document.documentElement.classList.add('js');render();
