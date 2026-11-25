import {flattenPencilPath} from './pencil-path.mjs';
import {pencilStroke} from './pencil-stroke.mjs';

/** Draw one SVG centerline in graphite. Keep the key stable across poses.
 * The fill remains separate so faces can occlude strokes on farther planes.
 * Phase is measured in turns. The path is trusted author-supplied SVG data.
 */
export function pencilPath(d,{key='line',width=1.5,phase=0,strength=1,fill='none'}={}) {
  const attr=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  if(!Number.isFinite(strength)||!Number.isFinite(width)||!Number.isFinite(phase))throw new TypeError('Pencil settings must be finite');
  const native=opacity=>`<path d="${attr(d)}" fill="${attr(fill)}" stroke="#171717" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(strength<=0)return native(1);
  const paths=flattenPencilPath(d);
  if(!paths)return native(1);
  const amount=Math.min(1,strength);
  const strokes=paths.map(({points,closed},i)=>pencilStroke(points,{
    seed:key+'/'+i,width,phase,strength:amount,closed
  })).join('');
  return native(1-amount)+`<g data-pencil-stroke="${attr(key)}" fill="none" stroke="none" opacity="${amount}">${strokes}</g>`;
}
