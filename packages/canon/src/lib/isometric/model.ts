/** Original Canon geometry. One 30° projection; no mesh, image or runtime dependency. */
export const isometricKinds = ['map', 'diagnose', 'build', 'approve', 'verify', 'handoff', 'learn', 'operate'] as const;
export type IsometricKind = typeof isometricKinds[number];
type Point = [number, number, number];
export type IsoShape = { points: string; tone: 'top' | 'side' | 'edge' | 'mark'; closed: boolean };
export const isometricDescriptions: Record<IsometricKind, string> = {
  map: 'Three workflow steps joined on a shared map.',
  diagnose: 'A magnifier isolates a break between workflow steps.',
  build: 'A foundation, interface and implementation align into one system.',
  approve: 'An action waits at a raised decision boundary.',
  verify: 'A test record pairs a result with its check.',
  handoff: 'A documented system passes from one owner to the next.',
  learn: 'An open guide keeps instructions beside the worked example.',
  operate: 'A work queue, decision boundary and retained record share one operating surface.'
};
export function project([x,y,z]: Point): [number,number] { return [120+(x-y)*.866, 142+(x+y)*.5-z]; }
export function isometricModel(kind: IsometricKind): IsoShape[] {
  const shapes: IsoShape[]=[];
  const path=(p:Point[],tone:IsoShape['tone']='mark',closed=false)=>shapes.push({points:p.map(v=>project(v).map(n=>+n.toFixed(3)).join(',')).join(' '),tone,closed});
  const slab=(x:number,y:number,w:number,d:number,z:number,h:number)=>{
    path([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],'side',true);
    path([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'edge',true);
    path([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],'top',true);
  };
  const line=(x:number,y:number,z:number,w:number)=>path([[x,y,z],[x+w,y,z]]);
  slab(-55,-45,110,90,0,7);
  switch(kind) {
    case 'map':
      path([[-35,-23,8],[-4,-23,8],[-4,22,8],[31,22,8]]);
      for(const [x,y] of [[-43,-32],[-13,-9],[22,13]]) slab(x,y,20,18,8,9);
      break;
    case 'diagnose': {
      slab(-42,-22,27,24,8,8); slab(16,3,27,24,8,8);
      path([[-15,-10,9],[-5,-10,9]]); path([[5,15,9],[16,15,9]]);
      const ring:Point[]=Array.from({length:33},(_,i)=>[Math.cos(i*Math.PI/16)*22,Math.sin(i*Math.PI/16)*22,42]);
      path(ring); path([[15,16,42],[38,39,42]]); line(-5,0,9,10); break;
    }
    case 'build':
      slab(-38,-30,76,60,18,7); slab(-28,-22,56,44,43,8);
      for(const x of [-23,23]) path([[x,17,8],[x,17,43]],'edge');
      line(-18,-12,52,36); line(-18,0,52,22); break;
    case 'approve':
      slab(-42,-15,24,30,8,7); path([[-18,0,9],[-2,0,9]]);
      slab(-1,-30,5,60,8,37); slab(22,-15,20,30,8,7);
      path([[30,-7,16],[35,0,16],[30,7,16]]); break;
    case 'verify':
      slab(-33,-30,66,60,8,5);
      for(const y of [-18,0,18]) { path([[-24,y-4,14],[-16,y-4,14],[-16,y+4,14],[-24,y+4,14]],'mark',true); line(0,y,14,22); }
      break;
    case 'handoff':
      slab(-43,-24,30,45,8,5); slab(15,-24,30,45,8,5);
      path([[-6,0,22],[10,0,22],[4,-6,22],[10,0,22],[4,6,22]]);
      for(const x of [-36,22]) {line(x,-14,14,15);line(x,-3,14,15);line(x,8,14,10);} break;
    case 'learn':
      path([[-42,-27,16],[0,-27,30],[0,28,30],[-42,28,16]],'top',true);
      path([[0,-27,30],[42,-27,16],[42,28,16],[0,28,30]],'top',true);
      for(const y of [-14,0,14]) {path([[-32,y,20],[-10,y,27]]);path([[10,y,27],[32,y,20]]);} break;
    case 'operate':
      for(const y of [-29,-9,11]) slab(-43,y,25,13,8,7);
      slab(-4,-31,5,62,8,31); slab(19,-24,27,48,8,5);
      for(const y of [-12,0,12]) line(25,y,14,15);
      path([[-18,0,9],[-5,0,9]]); path([[2,0,9],[19,0,9]]); break;
  }
  return shapes;
}
