/** Projection adapted from Anatomy iso-kit.mjs (MIT, Copyright (c) 2026 Ryan).
 * Pinned source: e6600ffc4e8e6620eeb45bf49bcdbd5e4b84163f.
 * Full notice: /licenses/anatomy-MIT.txt. Scene geometry is original CREATE SOMETHING work.
 */
type Point = [number, number, number];
export type Face = { path: string; tone: 'top' | 'side' | 'front' | 'edge' | 'ink' | 'paper' | 'signal' };
const angle = Math.PI / 4;
const elevation = 35 * Math.PI / 180;
const scale = 1.45 * Math.sqrt(1.6);
export function project([x, y, z]: Point): [number, number] {
  return [325 + (x * Math.sin(angle) - y * Math.cos(angle)) * scale,
    205 + ((x * Math.cos(angle) + y * Math.sin(angle)) * Math.sin(elevation) - z * Math.cos(elevation)) * scale];
}
export function path(points: Point[], closed = true): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(2)).join(' ')}`).join(' ') + (closed ? ' Z' : '');
}
export function box(x: number, y: number, z: number, w: number, d: number, h: number, tone: Face['tone'] = 'top'): Face[] {
  return [
    {tone:'side',path:path([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]])},
    {tone:'front',path:path([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]])},
    {tone,path:path([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]])}
  ];
}
export function line(points: Point[], tone: Face['tone'] = 'ink'): Face { return {tone,path:path(points,false)}; }
export const drawerTravel = 'translate(103.75px, 59.51px)';
export const base: Face[] = [
  ...[-112,104].flatMap(x=>[-70,66].flatMap(y=>box(x,y,-14,14,14,14,'side'))),
  ...box(-130,-90,0,260,180,10),
  ...box(-122,-82,10,244,164,2,'edge'),
  ...box(55,-62,13,145,5,3,'side'), ...box(55,56,13,145,5,3,'side'),
  ...[-110,90].flatMap(x=>[-72,54].flatMap(y=>box(x,y,12,10,10,13,'front'))),
];
export const board: Face[] = [
  ...box(-118,-70,25,226,130,8), ...box(-111,-63,33,212,116,1,'paper'),
  ...box(-106,-58,34,202,11,1,'edge'),
  ...[0,1,2].flatMap(i=>box(-101+i*7,-54,35,3,3,0.3,'ink')),
  ...box(-101,-38,34.5,85,39,0.3,'top'),
  ...box(-10,-38,34.5,99,6,0.3,'ink'),
  ...[0,1,2,3].map(i=>line([[-10,-24+i*8,35],[i===3?52:87,-24+i*8,35]],'ink')),
  ...[0,1,2].flatMap(i=>[...box(-101+i*66,12,34.5,58,17,0.3,'edge'),
    line([[-101+i*66,36,35],[-49+i*66,36,35]]),line([[-101+i*66,43,35],[-66+i*66,43,35]])]),
];
export const drawer: Face[] = [
  ...box(55,-56,16,110,108,5,'side'),
  ...box(58,-53,21,104,102,1,'edge'),
  ...box(59,-51,22,4,96,7),...box(157,-51,22,4,96,7),...box(59,-55,22,102,4,7),
  ...box(65,-42,23,86,80,1,'paper'),
  ...box(71,-35,24,54,4,0.3,'ink'),
  ...[0,1,2,3,4].map(i=>line([[71,-22+i*9,25],[i===4?119:144,-22+i*9,25]])),
  ...box(93,47,16,35,6,6,'front'),
];
export const control: Face[] = [
  ...box(-112,66,12,210,13,3,'side'),
  ...box(-105,68,15,100,9,1,'edge'),
  ...Array.from({length:20},(_,i)=>line([[-102+i*4.8,68,16],[-102+i*4.8,i%5===0?75:72,16]],'ink')),
  ...box(23,66,15,65,13,2,'edge'), ...box(29,68,17,22,9,3,'signal'),
  ...box(60,68,17,19,9,3,'front'),
];
export const screws = [-121,119].flatMap(x=>[-81,80].map(y=>project([x,y,12])));
