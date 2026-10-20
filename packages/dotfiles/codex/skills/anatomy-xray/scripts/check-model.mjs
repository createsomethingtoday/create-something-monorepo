import assert from 'node:assert/strict';
import {assemblies,edges,views,geometry,project,route,camera,clampNavigation,svg,initialState,shell} from '../assets/workflow-demo/model.mjs';
const ids=assemblies.map(a=>a.id);assert.equal(new Set(ids).size,7);assert.equal(edges.length,6);
const corners=a=>[a.x,a.x+a.w].flatMap(x=>[a.y,a.y+a.d].flatMap(y=>[a.z,a.z+a.h].map(z=>[x,y,z])));
for(const a of assemblies){assert(a.h>0);assert(a.w>0);assert(a.d>0);assert(a.zone);assert(a.source);for(const p of corners(a)){assert(p[0]>=shell.x&&p[0]<=shell.x+shell.w);assert(p[1]>=shell.y&&p[1]<=shell.y+shell.d);assert(p[2]>=shell.z&&p[2]<=shell.z+shell.h)}}
// A real XRay arrangement occupies depth and overlaps in projection, rather than a flat row of layers.
assert(new Set(assemblies.map(a=>a.y)).size>=4);assert(new Set(assemblies.map(a=>a.z)).size>=4);
const bounds=assemblies.map(a=>{const ps=corners(a).map(p=>project(p,'Isometric'));return [Math.min(...ps.map(p=>p[0])),Math.min(...ps.map(p=>p[1])),Math.max(...ps.map(p=>p[0])),Math.max(...ps.map(p=>p[1]))]});let overlaps=0;
for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];if(a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1])overlaps++}assert(overlaps>=2);
for(const e of edges){assert(ids.includes(e.from));assert(ids.includes(e.to));assert.notEqual(e.from,e.to)}
for(const mode of ['exterior','transparent','cutaway','exploded'])for(const view of views){const text=svg(view,{...initialState,mode});assert.equal((text.match(/data-edge=/g)||[]).length,6);assert(!/NaN|undefined/.test(text));for(const a of assemblies){const g=geometry(a,mode);assert.equal(g.id,a.id);for(const p of corners(g)){const [sx,sy]=project(p,view);assert(sx>=0&&sx<=700&&sy>=0&&sy<=590)}}}
for(const mode of ['transparent','exploded'])for(const e of edges){const r=route(e,mode),a=geometry(assemblies.find(a=>a.id===e.from),mode),b=geometry(assemblies.find(a=>a.id===e.to),mode);assert.equal(r.length,4);assert.deepEqual(r[0],[a.x+a.w/2,a.y,a.z+a.h/2]);assert.deepEqual(r.at(-1),[b.x+b.w/2,b.y,b.z+b.h/2]);assert(r[1][1]<=-65);assert(r[2][1]<=-65)}
assert.deepEqual(camera([350,300],initialState),[350,300]);assert.deepEqual(camera([400,350],{...initialState,zoom:2,panX:10,panY:-20}),[460,380]);assert.equal(clampNavigation({...initialState,zoom:100}).zoom,4);assert.equal(clampNavigation({...initialState,zoom:.1}).zoom,1);assert(clampNavigation({...initialState,panX:1e6}).panX<=100);
console.log(`PASS: volumetric enclosure containment, ${overlaps} projected overlaps, depth distribution, 16 mode/view combinations, attached routed ports, bounded zoom/pan and shared camera projection.`);
