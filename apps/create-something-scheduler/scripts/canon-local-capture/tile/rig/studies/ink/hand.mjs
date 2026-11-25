import {pencilPath} from '../../src/pencil.mjs';
/** Continuous ink glove. Local coordinates: wrist (0, 0), fingertips upward. */
export function hand({ open = 1, roll = 0, spread = 0.5, indexPoint = 0, sketchPhase = 0, sketchStrength = 0 } = {}) {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : 0));
  const o = clamp(open, 0, 1);
  const point = clamp(indexPoint, 0, 1);
  const r = clamp(roll, -1, 1);
  const s = clamp(spread, 0, 1);
  // Phase is continuous (radians), never sampled noise. Zero strength keeps
  // the original SVG byte-for-byte, including its silhouette and contacts.
  const pencil = clamp(sketchStrength, 0, 1);
  const phase = Number.isFinite(sketchPhase) ? sketchPhase : 0;
  const f = n => Number(n.toFixed(3));
  const ink = 'fill="white" stroke="#171717" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"';
  const fingers = [
    { x: -8.2, length: 16.5, fan: -0.26, width: 5.7 },
    { x: -2.9, length: 21, fan: -0.075, width: 6 },
    { x: 3, length: 19, fan: 0.10, width: 5.8 },
    { x: 8.2, length: 14, fan: 0.32, width: 5.1 },
  ];
  const parts = fingers.map(({ x, length, fan, width }, i) => {
    // Flexion shortens the projected phalanges while the tip folds back toward
    // the palm. All control points move continuously; no replacement pose.
    // Index extension is independent of the other three curled fingers.
    const extension = i === 0 ? o + (1-o)*point : o;
    const flex = 1 - extension;
    const reach = 5 + (length - 5) * extension;
    const angle = fan * (0.28 + s * 0.95) * (0.35 + extension * 0.65);
    const dx = Math.sin(angle) * reach + r * flex * 1.6;
    const top = -18 - Math.cos(angle) * reach;
    const tipX = x + dx;
    const w = width / 2;
    const fold = flex * (3.6 + i * 0.15);
    const pressure = 1.55 + pencil * (0.13 * Math.sin(phase * 0.7 + i * 1.6 + flex) + 0.06 * flex);
    const fingerInk = pencil ? ink.replace('stroke-width="1.55"', `stroke-width="${f(pressure)}"`) : ink;
    const contour = `<path ${fingerInk} d="M ${f(x-w)} -15 C ${f(x-w-0.5)} -21 ${f(tipX-w-0.6)} ${f(top+4)} ${f(tipX-w)} ${f(top+2)} C ${f(tipX-w+0.7)} ${f(top-1.8)} ${f(tipX+w-0.7)} ${f(top-2)} ${f(tipX+w)} ${f(top+1.8)} C ${f(tipX+w+0.8)} ${f(top+5+fold)} ${f(x+w+0.4)} ${f(-19+fold)} ${f(x+w)} -14 Z"/>`;
    if (!pencil) return contour;
    return pencilPath(contour.match(/ d="([^"]+)"/)[1],{
      key:'finger-'+i, width:pressure, phase:phase/(Math.PI*2), strength:pencil, fill:'white'
    });
  }).join('');
  const thumbX = -10 - 2.6 * o - s * o * 0.8;
  const thumbY = -12 - 7 * o;
  const thumb = `<path ${ink} d="M -7 -5 C -11 -6 -14 -8 ${f(thumbX-1.7)} ${f(thumbY+4)} C ${f(thumbX-5)} ${f(thumbY-0.8)} ${f(thumbX-0.8)} ${f(thumbY-4.3)} ${f(thumbX+1.6)} ${f(thumbY-0.8)} C ${f(thumbX+4.2)} ${f(thumbY+2.8)} -10 -12 -7 -13 Z"/>`;
  const palm = `<path ${ink} d="M -6 0 C -6.4 -3 -10.7 -4.4 -11.2 -10 C -11.5 -13 -10.6 -16 -10.4 -17.5 C -5 -18.8 5 -18.6 10.4 -17 C 11.8 -12.4 11.3 -7.2 8.4 -4 C 6.4 -1.8 5.9 -1.4 6 0 Z"/>`;
  const edge=(name,base)=>pencil ? pencilPath(base.match(/ d="([^"]+)"/)[1],{
    key:name,width:1.55,phase:phase/(Math.PI*2),strength:pencil,fill:'white'
  }) : base;
  const creases = `<g fill="none" stroke="#171717" stroke-width="0.9" stroke-linecap="round" opacity="${f(0.25+0.65*(1-o))}"><path d="M -7 -14 Q -5 -15 -3.5 -14"/><path d="M -1.5 -14.6 Q 0 -15.4 1.6 -14.4"/><path d="M 4 -14 Q 6 -14.8 7.7 -13.5"/></g><path d="M -8.5 -9.5 Q -4.5 -9 -4.4 -5.8 M -5.8 -1.4 Q 0 -0.2 5.9 -1.3" fill="none" stroke="#171717" stroke-width="0.9" stroke-linecap="round"/>`;
  return `<g data-ink-hand="continuous" transform="matrix(${f(1-Math.abs(r)*0.32)} ${f(r*0.065)} ${f(r*0.1)} 1 0 0)">${parts}${edge('thumb',thumb)}${edge('palm',palm)}${creases}</g>`;
}

export default hand;
