/** Deterministic graphite geometry. Phase is measured in turns (one full loop = 1).
 * Samples use arc length, never frame-indexed randomness. Cost is O(points + samples),
 * with at most 2049 samples. The caller owns SVG grouping, transforms and compositing.
 */
export function pencilStroke(points,{seed=0,width=1.5,phase=0,strength=1,closed=false}={}) {
 if(!Array.isArray(points)||points.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))
  throw new TypeError('pencilStroke expects finite [x,y] points');
 if(![width,phase,strength].every(Number.isFinite))throw new TypeError('Stroke options must be finite');
 if(width<=0||points.length<2)return '';
 const p=points.filter((v,i)=>!i||v[0]!==points[i-1][0]||v[1]!==points[i-1][1]).map(v=>v.slice(0,2));
 if(closed&&p.length>1&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])p.pop();
 if(p.length<2)return '';
 if(closed)p.push(p[0]);
 // Screen-space winding determines which normal points down/out of the form.
 const winding=closed ? Math.sign(p.slice(1).reduce((a,v,i)=>a+p[i][0]*v[1]-v[0]*p[i][1],0)) : 0;
 const lengths=[0];
 for(let i=1;i<p.length;i++)lengths.push(lengths.at(-1)+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));
 const total=lengths.at(-1);if(!total)return '';
 let hash=2166136261;for(const c of String(seed)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const random=i=>{let n=hash^Math.imul(i+1,374761393);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 // Rounded phase removes floating-point modulo differences at equivalent turns.
 const angle=2*Math.PI*(Math.round(((phase%1+1)%1)*1e10)/1e10);
 const amount=Math.max(0,Math.min(2,strength));
 const count=Math.min(2048,Math.max(closed?24:8,Math.ceil(total/Math.max(1.35,width*.95))));
 const sample=[];let segment=0;
 for(let i=0;i<=count;i++){
  const s=total*i/count;
  while(segment< p.length-2&&lengths[segment+1]<s)segment++;
  const t=(s-lengths[segment])/(lengths[segment+1]-lengths[segment]);
  sample.push({x:p[segment][0]+(p[segment+1][0]-p[segment][0])*t,y:p[segment][1]+(p[segment+1][1]-p[segment][1])*t,s});
 }
 const field=(s,channel)=>{
  let result=0;
  for(let j=0;j<3;j++){
   const wavelength=[29,11,4.7][j];
   const frequency=closed?Math.max(1,Math.round(total/wavelength))/total:1/wavelength;
   result+=Math.sin(s*frequency*2*Math.PI+random(channel*7+j)*Math.PI*2)/(2**j);
  }
  return result/1.75;
 };
 for(let i=0;i<=count;i++){
  const a=sample[closed?(i+count-1)%count:Math.max(0,i-1)];
  const b=sample[closed?(i+1)%count:Math.min(count,i+1)];
  const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
  const q=sample[i];q.nx=-dy/l;q.ny=dx/l;
  const pin=closed?1:Math.sin(Math.PI*i/count)**.65;
  const bend=Math.abs((q.x-a.x)*(b.y-q.y)-(q.y-a.y)*(b.x-q.x))/(Math.hypot(q.x-a.x,q.y-a.y)*Math.hypot(b.x-q.x,b.y-q.y)||1);
  const drift=width*amount*pin*(.24*field(q.s,1)+.105*field(q.s,2)*Math.sin(angle)+.075*field(q.s,3)*(Math.cos(angle)-1));
  q.cx=q.x+q.nx*drift;q.cy=q.y+q.ny*drift;
  const underside=closed?Math.max(0,-winding*q.ny):0;
  const pressure=.89+.24*field(q.s,4)+amount*.42*underside+.12*bend+.045*amount*field(q.s,5)*Math.sin(angle);
  q.radius=width*.5*Math.max(.25,pressure)*(closed?1:Math.min(1,pin*3.2));
 }
 const f=n=>(Math.abs(n)<.0005?0:n).toFixed(3);
 const point=(q,side,scale=1)=>`${f(q.cx+q.nx*q.radius*side*scale)} ${f(q.cy+q.ny*q.radius*side*scale)}`;
 const ribbon=(sideA,sideB)=>`M${sample.map(q=>point(q,sideA)).join(' L')} L${[...sample].reverse().map(q=>point(q,sideB)).join(' L')} Z`;
 let svg=`<path d="${ribbon(1,-1)}" fill="#202020" fill-opacity="0.92"/>`;
 // A light, unfinished searching stroke precedes the committed edge on long
 // curves. Keep its arc-length interval stable as the pose changes.
 if(total>45 && amount>0){
  for(let pass=0;pass<2;pass++){
   const start=Math.floor(count*(pass*.45+.08+.12*random(pass+25)));
   const n=Math.min(count-start,Math.ceil(count*(.17+.11*random(pass+21))));
   const trace=[];
   for(let j=0;j<n;j++){
    const q=sample[start+j], envelope=Math.sin(Math.PI*j/(n-1));
    const gap=amount*width*envelope*(1.2+.56*field(q.s,12)+.22*Math.sin(angle));
    trace.push(`${f(q.cx+q.nx*gap)} ${f(q.cy+q.ny*gap)}`);
   }
   svg+=`<path d="M${trace.join(' L')}" fill="none" stroke="#545454" stroke-width="${f(width*.37)}" stroke-opacity="${f(.31*amount)}" stroke-linecap="round"/>`;
  }
 }
 // Sparse spatial clusters follow the same pressure path: parallel scratches,
 // occasional pale dry channels. Their membership does not flicker with phase.
 if(total>16){
  for(let band=0;band<3;band++){
   let run=[];
   const flush=()=>{if(run.length>2)svg+=`<path d="M${run.join(' L')}" fill="none" stroke="${band===2?'#d0d0d0':'#434343'}" stroke-width="${f(width*(band===2?.105:.12))}" stroke-opacity="${band===2?'.28':'.32'}" stroke-linecap="round"/>`;run=[];};
   for(let i=1;i<count;i++){
    const q=sample[i],cluster=Math.floor(q.s/13);
    if(random(cluster+100+band*701)>.57&&field(q.s,8+band)>-.25)run.push(point(q,band===0?1.32:band===1?-1.25:.27));else flush();
   }
   flush();
  }
 }
 return svg;
}
