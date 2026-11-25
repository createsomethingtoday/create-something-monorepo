import {thinkSleeve} from './think-sleeve.mjs';
import {pencilPath} from '../../src/pencil.mjs';

const clamp=n=>Math.max(0,Math.min(1,n||0));
const mix=(a,b,t)=>a+(b-a)*t;
const num=n=>Number(n.toFixed(3));
// Graphite lives in normalized object space: marks follow the padded form and
// remain identical while a pose is held. Cross hatching supplies the volume;
// there is no animated grain or screen-space noise on the clothing.
const graphiteTile=(()=>{
  const marks=['',''];
  for(let i=0;i<170;i++){
    const x=num((i*37.13+Math.sin(i*4.3)*3+103)%104-2);
    const y=num((i*23.77+Math.cos(i*8.7)*3+103)%104-2);
    const length=3+(i%7)*1.1;
    marks[0]+=`M ${x} ${y} l ${num(length*.62)} ${num(-length)} `;
    if(i%2===0)marks[1]+=`M ${x} ${y} q ${num(length*.3)} ${num(length*.35)} ${num(length*.8)} ${num(length*.46)} `;
  }
  return marks.map((d,i)=>`<path d="${d}" fill="none" stroke="${i?'#303030':'#272727'}" stroke-opacity="${i?.22:.32}" stroke-width="${i?.28:.38}" stroke-linecap="round"/>`).join('');
})();
function padded(d,key,p,light,dark,exteriorOnly=false) {
  const id='felt-'+key,strength=clamp(p.sketchStrength??1);
  // Paint the joined sleeve over both segment outlines. Only their external
  // pencil edges survive, so the elbow flexes inside one piece of cloth.
  const outline=pencilPath(d,{key:id,width:exteriorOnly?2.8:1.6,fill:'none',strength,phase:(p.sketchPhase??0)/(Math.PI*2)});
  return `<defs><radialGradient id="${id}-shade" cx="32%" cy="20%" r="88%"><stop stop-color="${light}"/><stop offset=".68" stop-color="${dark}"/><stop offset="1" stop-color="#393939"/></radialGradient><radialGradient id="${id}-paper" cx="30%" cy="22%" r="88%"><stop stop-color="#bdbdbd"/><stop offset=".64" stop-color="#999999"/><stop offset="1" stop-color="#555555"/></radialGradient><pattern id="${id}-graphite" width="1" height="1" viewBox="0 0 100 100" preserveAspectRatio="none">${graphiteTile}</pattern></defs>${exteriorOnly?outline:''}<path d="${d}" fill="url(#${id}-shade)"/><g opacity="${strength}"><path d="${d}" fill="url(#${id}-paper)"/><path d="${d}" fill="url(#${id}-graphite)"/></g>${exteriorOnly?'':outline}`;
}

// Each pencil follows a tangent around the stuffed belly. The shadow side
// has a second pass, while the light-facing shoulder has bare paper between marks.
const bellyHatching=(()=>{
  const strokes=['',''];
  const random=i=>{const n=Math.sin(i*129.43+3.14)*17473.93;return n-Math.floor(n);};
  for(let i=0;i<290;i++){
    const x=-38+76*random(i*4),y=-4+78*random(i*4+1);
    const shade=Math.min(1,Math.hypot((x+13)/53,(y-21)/66));
    if(random(i*4+2)>.035+.78*shade**2)continue;
    const length=2+3.6*random(i*4+3);
    const slope=-.78+.019*x-.004*y;
    strokes[0]+=`M ${num(x)} ${num(y)} q ${num(length*.36)} ${num(length*slope*.63)} ${num(length)} ${num(length*slope)} `;
    if(shade>.73 && i%3===0)strokes[1]+=`M ${num(x-1)} ${num(y+1)} q 1.4 1.9 4.1 2.7 `;
  }
  return strokes.map((d,i)=>`<path d="${d}" fill="none" stroke="#363636" stroke-width="${i?.65:.82}" stroke-opacity="${i?.3:.42}" stroke-linecap="round"/>`).join('');
})();
export function feltBody(p={}) {
  const lift=clamp(p.stepLift),s=clamp(p.squash);
  const weightX=Number(p.weightX)||0,weightY=Number(p.weightY)||0;
  const boot=(side)=>{
    const left=side==='left',x=left?-21-10*lift:18,y=left?-lift*22:0;
    const toeRoll=left?Math.max(0,Math.min(25,Number(p.toeRoll)||0)):0;
    const articulation=toeRoll?` rotate(${-toeRoll} -22 89)`:'';
    const transform=`translate(${x} ${y}) rotate(${left?-lift*27:0} 0 87)${articulation}`;
    // The shoe owns only the ankle and foot. Its sole and toe pivot keep the
    // existing contact contract; the trouser is solved in pelvis coordinates.
    const d='M -10 61 Q -3 59 7 61 L 6 66 C 12 66 20 71 20 79 C 20 85 16 89 7 89 L -8 89 C -19 89 -26 87 -26 79 C -26 73 -21 68 -13 66 Z';
    const id='felt-boot-'+side+'-nap';
    const hatches='M -22 76 q 1 -5 5 -6 M -21 81 q 1 -6 6 -8 M -18 85 q 1 -6 6 -9 M -13 87 q 1 -6 6 -10 M -7 87 q 1 -6 6 -9 M 0 87 q 2 -6 6 -8 M 7 86 q 3 -5 7 -6';
    const shoe=`<g data-felt-boot="${side}" transform="${transform}">${padded(d,'boot-'+side,p,'#999999','#484848')}<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${hatches}" clip-path="url(#${id})" fill="none" stroke="#dedede" stroke-width=".6" opacity=".43"/><path d="M -22 85 Q -7 91 15 85" fill="none" stroke="#292929" stroke-width="1.1" opacity=".75"/><path d="M -13 71 C -9 67 1 66 9 70" fill="none" stroke="#282828" stroke-width=".8" opacity=".65"/><path d="M -20 82 Q -6 88 14 82" fill="none" stroke="#d7d7d7" stroke-width=".55" stroke-dasharray="2.2 2" opacity=".65"/></g>`;
    // Apply the identical shoe transforms to its ankle socket, then remove
    // body travel. The hip stays seated in the belly while a planted ankle
    // remains fixed on the stage, including interrupted support transitions.
    const rotate=(point,degrees,cx,cy)=>{
      const a=degrees*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
      return [cx+(point[0]-cx)*c-(point[1]-cy)*sn,cy+(point[0]-cx)*sn+(point[1]-cy)*c];
    };
    let ankle=rotate([-2,64],-toeRoll,-22,89);
    ankle=rotate(ankle,left?-lift*27:0,0,87);
    const ax=ankle[0]+x-weightX,ay=ankle[1]+y-weightY;
    const hx=left?-18:18,hy=40+s*2;
    const load=left?0:clamp(p.supportLoad);
    const kx=mix(hx,ax,.53)+(left?-11*lift:-9*load);
    const ky=mix(hy,ay,.56)+(left?-4*lift:3*load);
    const at=t=>{
      const u=1-t,tx=u*(kx-hx)+t*(ax-kx),ty=u*(ky-hy)+t*(ay-ky),length=Math.hypot(tx,ty)||1;
      return {x:u*u*hx+2*u*t*kx+t*t*ax,y:u*u*hy+2*u*t*ky+t*t*ay,nx:-ty/length,ny:tx/length,r:mix(12,8.6,t)};
    };
    const edge=sign=>Array.from({length:17},(_,i)=>{const q=at(i/16);return `${num(q.x+sign*q.nx*q.r)} ${num(q.y+sign*q.ny*q.r)}`;});
    const leg='M '+edge(1).concat(edge(-1).reverse()).join(' L ')+' Z';
    const fold=at(.65),crease=load+lift;
    const folds=`<g data-stance-folds="${num(load)}" opacity="${num(clamp(p.sketchStrength??1)*(.2+.5*crease))}"><path d="M ${num(fold.x-fold.nx*6)} ${num(fold.y-fold.ny*6)} Q ${num(fold.x+2)} ${num(fold.y+3)} ${num(fold.x+fold.nx*6)} ${num(fold.y+fold.ny*6)}" fill="none" stroke="#303030" stroke-width=".85" stroke-linecap="round"/></g>`;
    return `<g data-felt-leg="${side}" data-hip="${hx},${hy}" data-knee="${num(kx)},${num(ky)}" data-ankle="${num(ax)},${num(ay)}">${padded(leg,'trouser-'+side,p,'#8e8e8e','#464646')}${folds}<g transform="translate(${-weightX} ${-weightY})">${shoe}</g></g>`;
  };
  const torso='M -24 3 C -37 14 -37 36 -34 46 C -32 58 -15 65 8 62 C 29 61 36 55 35 43 L 31 15 C 29 1 13 -4 -2 -3 C -13 -4 -19 -1 -24 3 Z';
  const boots=boot('right')+boot('left');
  return `<g data-felt-body="padded">${boots}<g transform="translate(0 ${-4+s*3}) scale(${.91+s*.035} ${.88-s*.045})">${padded(torso,'torso',p,'#919191','#444444')}<defs><clipPath id="felt-belly-clip"><path d="${torso}"/></clipPath></defs><g clip-path="url(#felt-belly-clip)" opacity="${clamp(p.sketchStrength??1)}">${bellyHatching}</g><path d="M -28 51 Q -6 63 28 52" fill="none" stroke="#dadada" stroke-width=".7" stroke-dasharray="2.8 2.5" opacity=".7"/><path d="M 5 6 Q 9 29 8 56" fill="none" stroke="#242424" stroke-width=".75" opacity=".55"/></g></g>`;
}

export function feltArm(p={},side='right',layer='front') {
  if(layer==='back')return '';
  const right=side==='right',think=clamp(p.indexPoint),wave=clamp(p.wrist)*(1-think),back=clamp(p.armsBack);
  if(layer==='overlay' && (!right||think+wave<.02))return '';
  // Lift clear of the rim first; the last third rolls the padded palm under it.
  // These are pose-space corrections, so seeking and interrupted blends stay stable.
  const seat=clamp((think-.66)/.34),contact=seat*seat*(3-2*seat);
  const sx=right?23:-23,sy=11;
  // The upper sleeve opens at the shoulder as weight transfers. The wrist
  // follows its own counter-swing and can finish settling after the knee.
  const shoulderSwing=(right?-1:1)*(.09*clamp(p.supportLoad)+.28*clamp(p.stepLift));
  const upperX=(right?mix(44,60,think)-9*contact+wave*12:mix(-42,-29,think))-sx;
  const upperY=(right?mix(43,47,think)-2*contact-wave*29:mix(43,49,think))-sy;
  const ex=sx+upperX*Math.cos(shoulderSwing)-upperY*Math.sin(shoulderSwing);
  const ey=sy+upperX*Math.sin(shoulderSwing)+upperY*Math.cos(shoulderSwing);
  let wx=right?mix(42,43,think)-9*contact+wave*(25+(p.swing??0)*10):mix(-38,19,think)+2*contact;
  let wy=right?mix(56,5,think)+3*contact-wave*79:mix(57,42,think)+1.5*contact;
  // Lead out around the fabric before tucking inward; no layer-dependent offset.
  const tuckArc=Math.sin(Math.PI*back)*5;
  const counterSwing=clamp(p.counterSwing??p.stepLift);
  wx=mix(wx,right?21:-21,back)+(right?1:-1)*tuckArc+(right?19:-28)*counterSwing;
  wy=mix(wy,46,back)-(right?16:25)*counterSwing;
  // The balancing mitten leads the swinging boot out of their shared outline.
  if(!right){
    const clearance=clamp(p.supportLoad);
    wx-=12*clearance;
    wy-=12*clearance;
  }
  // Carry the wrist around the cheek after the pad unloads. The sleeve is
  // rebuilt from this wrist so the cuff stays joined through the arc.
  if(right && p.wristClearance){
    wx+=16*clamp(p.wristClearance);
    wy+=5*clamp(p.wristClearance);
  }
  // Carry the pad past the outer hip before sinking it behind the belly.
  // A raised wrist keeps the mitten from grazing the thigh along a flat cut.
  wy-=.6*tuckArc;
  const dx=wx-ex,dy=wy-ey;
  // Two stuffed segments meet at an actual elbow. Start the shoulder inside
  // the coat so its broad cap emerges from the torso instead of sitting on it.
  // Only a short region rounds the joint; a single shoulder-to-wrist spline
  // loses the elbow and makes the whole sleeve look like a bent rubber tube.
  const upperLength=Math.hypot(ex-sx,ey-sy)||1,lowerLength=Math.hypot(dx,dy)||1;
  const ux=(ex-sx)/upperLength,uy=(ey-sy)/upperLength;
  const vx=dx/lowerLength,vy=dy/lowerLength;
  // Each padded segment has its own rounded envelope. Their overlap is
  // intentional: the forearm sits over the upper sleeve at the elbow, so a
  // deep fold never exposes the crossing edges of an offset centerline.
  const segment=(x0,y0,x1,y1,r0,r1,startCap,endCap)=>{
    const length=Math.hypot(x1-x0,y1-y0)||1;
    const tx=(x1-x0)/length,ty=(y1-y0)/length,nx=-ty,ny=tx;
    const point=(x,y,n,t)=>`${num(x+nx*n+tx*t)} ${num(y+ny*n+ty*t)}`;
    return `M ${point(x0,y0,r0,0)} C ${point(x0,y0,r0,length*.35)} ${point(x1,y1,r1,-length*.3)} ${point(x1,y1,r1,0)} C ${point(x1,y1,r1,r1*endCap)} ${point(x1,y1,-r1,r1*endCap)} ${point(x1,y1,-r1,0)} C ${point(x1,y1,-r1,-length*.3)} ${point(x0,y0,-r0,length*.35)} ${point(x0,y0,-r0,0)} C ${point(x0,y0,-r0,-r0*startCap)} ${point(x0,y0,r0,-r0*startCap)} ${point(x0,y0,r0,0)} Z`;
  };
  const upperSleeve=segment(sx,sy,ex,ey,10.8,8.2,.65,1.22);
  const sleeve=segment(ex,ey,wx,wy,8.2,6.8,1.22,.7);
  const foldLoad=clamp(think*.8+contact*.2+wave*.65),foldStrength=clamp(p.sketchStrength??1);
  // Compression gathers inside the bend. The outside edge stays taut.
  const inside=ux*vy-uy*vx;
  const folds=[0,3.5].map((advance,i)=>{
    const x=ex+vx*advance,y=ey+vy*advance;
    const edge=inside*(6.8-i),tip=inside*(1.8-i);
    return `M ${num(x-vy*edge)} ${num(y+vx*edge)} Q ${num(x-vy*tip+vx*2)} ${num(y+vx*tip+vy*2)} ${num(x+vy*tip)} ${num(y-vx*tip)}`;
  }).join(' ');
  const sleeveFolds=`<g data-sleeve-folds="${side}" opacity="${num(foldStrength*(.18+foldLoad*.47))}"><path d="${folds}" fill="none" stroke="#303030" stroke-width=".75" stroke-linecap="round"/></g>`;
  const forearmAngle=Math.atan2(dy,dx)*180/Math.PI+90;
  let angle=right?mix(forearmAngle,-39,contact):forearmAngle;
  if(right && think>0 && think<.66){
    // Near the folded elbow, wrist and elbow almost coincide. Guide the palm
    // through its drawn breakdown rather than deriving its angle from that
    // nearly zero-length tangent. Blend back to the live tangent at both ends.
    const progress=clamp(think/.58);
    const guide=-171+150*progress*progress*(3-2*progress);
    const blend=clamp(Math.min(think/.12,(.66-think)/.12));
    const offset=((guide-angle+540)%360)-180;
    angle+=offset*blend*blend*(3-2*blend);
  }
  const opening=clamp(p.open),fan=opening*3,reach=opening*3.5;
  const palm=right?contact:0;
  const mitten=`M -7 2 C -10 -3 ${-11-fan} -10 ${-7-fan} ${-15-reach} C ${-4-2*palm} ${-20-reach+2*palm} ${4+fan+3*palm} ${-21-reach+3*palm} ${8+fan+2*palm} ${-16-reach} C ${12+fan} -12 ${12+fan} -6 10 -1 C ${15+fan*1.3} ${-5-opening*6} ${17+fan*1.5} ${-1-opening*4} ${15+fan} 3 C 12 8 7 11 1 10 C -4 9 -6 6 -7 2 Z`;
  // Turn the stuffed pad around the wrist, not the whole sleeve/cuff assembly.
  // The far edge opens more than the thumb edge: this is a palm reveal rather
  // than a uniform scale. Keep the original strings at zero for old studies.
  const palmTurn=right?Math.max(-1,Math.min(1,Number(p.palmTurn)||0)):0;
  const release=palmTurn<0;
  const amount=Math.abs(palmTurn),turn=amount*amount*(3-2*amount);
  const v=(a,b)=>num(mix(a,b,turn));
  const pt=(x,y,toX,toY)=>v(x,toX)+' '+v(y,toY);
  // The release is a separate drawn side view: the near knuckle keeps its
  // padded crown while the thumb curls into the narrow far edge. Both wrist
  // attachment points stay put; this never scales the cuff or sleeve.
  const releasedMitten=release?[
    'M -7 2',
    'C '+pt(-10,-3,-8,-3)+' '+pt(-11-fan,-10,-7,-12)+' '+pt(-7-fan,-15-reach,-4,-17-reach*.35),
    'C '+pt(-4-2*palm,-20-reach+2*palm,-2,-21-reach*.35)+' '+pt(4+fan+3*palm,-21-reach+3*palm,4,-22-reach*.35)+' '+pt(8+fan+2*palm,-16-reach,6,-17-reach*.35),
    'C '+pt(12+fan,-12,8,-13)+' '+pt(12+fan,-6,7,-8)+' '+pt(10,-1,5,-5),
    'C '+pt(15+fan*1.3,-5-opening*6,9,-9)+' '+pt(17+fan*1.5,-1-opening*4,11,-5)+' '+pt(15+fan,3,8,0),
    'C '+pt(12,8,7,5)+' '+pt(7,11,5,10)+' 1 10 C -4 9 -6 6 -7 2 Z'
  ].join(' '):null;
  const turnedMitten=release?releasedMitten:turn?[
    'M -7 2',
    'C '+pt(-10,-3,-13,-2)+' '+pt(-11-fan,-10,-16,-13)+' '+pt(-7-fan,-15-reach,-11,-20-reach),
    'C '+pt(-4-2*palm,-20-reach+2*palm,-7,-25-reach)+' '+pt(4+fan+3*palm,-21-reach+3*palm,4+fan,-25-reach)+' '+pt(8+fan+2*palm,-16-reach,9+fan,-19-reach),
    'C '+pt(12+fan,-12,12+fan,-15)+' '+pt(12+fan,-6,12+fan,-9)+' '+pt(10,-1,10,-5),
    'C '+pt(15+fan*1.3,-5-opening*6,15+fan,-17-opening*3)+' '+pt(17+fan*1.5,-1-opening*4,23+fan,-14-opening*2)+' '+pt(15+fan,3,21+fan,-7),
    'C '+pt(12,8,18,2)+' '+pt(7,11,8,11)+' 1 10 C -4 9 -6 6 -7 2 Z'
  ].join(' '):mitten;
  const crease=release?'M '+pt(7,-10,6,-10)+' C '+pt(13/3,-26/3,3,-9)+' '+pt(11/3,-19/3,3,-5)+' '+pt(5,-3,5,-2):turn?'M '+pt(7,-10,10,-13)+' C '+pt(13/3,-26/3,5,-15)+' '+pt(11/3,-19/3,-4,-11)+' '+pt(5,-3,-6,-5):'M 7 -10 Q 3 -8 5 -3';
  const mittShape=padded(turnedMitten,'mitt-'+side+(layer==='overlay'?'-over':''),p,'#a0a0a0','#505050');
  const mittCrease=`<path d="${crease}" fill="none" stroke="#222" stroke-width=".65"/>`;
  // Only the mitten rolls; the cuff seam remains attached to the same wrist.
  const sideSeam=release?`<path data-mitten-side-seam="release" d="M -2 -17 C -5 -10 -3 -3 1 5" fill="none" stroke="#303030" stroke-width=".75" stroke-linecap="round" opacity="${num(turn*.8)}"/><path d="M -.8 -16 C -3.8 -9 -1.8 -3 2 4" fill="none" stroke="#d0d0d0" stroke-width=".45" opacity="${num(turn*.55)}"/>`:'';
  const mitt=turn?`<g data-palm-turn="${num(palmTurn)}" transform="rotate(${num((release?12:-18)*turn)})">${mittShape}${mittCrease}${sideSeam}</g>`:mittShape;
  // Roll into depth around the wrist during the tuck. The cuff is drawn as
  // a rounded, foreshortened stuffed band so its outer corner cannot become
  // a pointed pale wedge while the belly occludes the trailing hand.
  const tuck=back*back*(3-2*back);
  const half=num(10-3*tuck),sideBulge=num(10-tuck);
  const top=num(-1+tuck),bottom=num(6+tuck);
  // Convert the resting quadratic edges to their equivalent cubic controls.
  // Their endpoints and tangents then agree as an interrupted tuck starts.
  const inner=num(mix(10/3,3,tuck));
  const topControl=num(mix(5/3,-1,tuck)),bottomControl=num(mix(28/3,9,tuck));
  const cuff=back?[
    `M ${-half} ${top} C ${-inner} ${topControl} ${inner} ${topControl} ${half} ${top}`,
    `C ${sideBulge} 1 ${sideBulge} ${num(4+tuck)} ${half} ${bottom}`,
    `C ${inner} ${bottomControl} ${-inner} ${bottomControl} ${-half} ${bottom}`,
    `C ${-sideBulge} ${num(4+tuck)} ${-sideBulge} 1 ${-half} ${top} Z`
  ].join(' '):'M -10 -1 Q 0 3 10 -1 L 10 6 Q 0 11 -10 6 Z';
  const seamHalf=num(8-2*tuck);
  const cuffSeam=back?`M ${-seamHalf} 3 Q 0 ${num(7-tuck)} ${seamHalf} 3`:'M -8 3 Q 0 7 8 3';
  const depthMitt=back?`<g data-tuck-roll="${num(tuck)}" transform="scale(${num(1-.38*tuck)} ${num(1-.12*tuck)})">${mitt}${turn?'':mittCrease}</g>`:mitt;
  const hand=`<g transform="translate(${num(wx)} ${num(wy)}) rotate(${num(angle)})">${depthMitt}${padded(cuff,'cuff-'+side+(layer==='overlay'?'-over':''),p,'#adadad','#646464')}<path d="${cuffSeam}" fill="none" stroke="#d9d9d9" stroke-width=".6" stroke-dasharray="1.7 1.8"/>${back||turn?'':mittCrease}</g>`;
  // The same hand can be repeated over the head to establish chin contact.
  let cloth='';
  if(layer!=='overlay'){
    const entry=right?clamp(think/.12):0;
    const blend=entry*entry*(3-2*entry);
    if(blend<1){
      const standard=padded(upperSleeve+' '+sleeve,'sleeve-'+side,p,'#979797','#434343',true)+sleeveFolds;
      cloth=blend?`<g opacity="${num(1-blend)}">${standard}</g>`:standard;
    }
    if(blend>0){
      const {path,crease}=thinkSleeve(think,wx,wy);
      const drawing=padded(path,'think-sleeve',p,'#979797','#434343');
      const fold=`<path d="${crease}" fill="none" stroke="#303030" stroke-width=".85" stroke-linecap="round" opacity="${num(foldStrength*think*.7)}"/>`;
      // Add premultiplied layers in isolation so the coat stays opaque
      // where the common resting sleeve gives way to the first drawing.
      cloth=blend===1?drawing+fold:`<g style="isolation:isolate">${cloth}<g style="mix-blend-mode:plus-lighter" opacity="${num(blend)}">${drawing}${fold}</g></g>`;
    }
  }
  return `<g data-felt-arm="${side}" opacity="1">${cloth}${hand}</g>`;
}
