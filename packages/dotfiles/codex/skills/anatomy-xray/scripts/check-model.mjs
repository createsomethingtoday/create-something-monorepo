import assert from 'node:assert/strict';
import {assemblies,edges,views,geometry,project,svg,initialState} from '../assets/workflow-demo/model.mjs';
const ids=assemblies.map(a=>a.id);assert.equal(new Set(ids).size,7);assert.equal(edges.length,6);
for(const e of edges){assert(ids.includes(e.from));assert(ids.includes(e.to));assert.notEqual(e.from,e.to)}
for(const mode of ['exterior','transparent','cutaway','exploded'])for(const view of views){
 const text=svg(view,{...initialState,mode});assert.equal((text.match(/data-edge=/g)||[]).length,6);assert(!/NaN|undefined/.test(text));
 for(const a of assemblies){const g=geometry(a,mode);assert.equal(g.id,a.id);for(const x of [g.x,g.x+g.w])for(const y of [g.y,g.y+g.d])for(const z of [g.z,g.z+g.h]){const [sx,sy]=project([x,y,z],view);assert(sx>=0&&sx<=500&&sy>=0&&sy<=400)}}
}
// Every segment begins on its source side and ends on its destination side, including exploded poses.
for(const mode of ['transparent','exploded'])for(const view of views){const text=svg(view,{...initialState,mode});for(const e of edges){const a=geometry(assemblies.find(a=>a.id===e.from),mode),b=geometry(assemblies.find(a=>a.id===e.to),mode);const p=pt=>project(pt,view).map(n=>n.toFixed(2)).join(',');assert(text.includes(`d="M${p([a.x+a.w,a.y+a.d/2,a.z+a.h/2])} L${p([b.x,b.y+b.d/2,b.z+b.h/2])}"`))}}
console.log('PASS: unique IDs, 16 mode/view combinations, topology, finite in-frame geometry, attached connector endpoints.');
