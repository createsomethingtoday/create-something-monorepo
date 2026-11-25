import {feltBody,feltArm} from './felt-body.mjs';
import {feltHead} from './felt-head.mjs';
import {pencilPath} from '../../src/pencil.mjs';
// All poses are sampled by time, so a director can scrub or change one channel.
import {body,projectedBody} from './body.mjs';
import {hand} from './hand.mjs';

export const duration = 3.8;
const ramp = (time, start, end) => {
  const x = Math.max(0, Math.min(1, (time-start)/(end-start)));
  return x*x*x*(10+x*(6*x-15));
};
const beat = (t,a,b,c,d) => ramp(t,a,b)*(1-ramp(t,c,d));
export function pose(t) {
  const ready = beat(t,.18,.48,.50,.83);
  const elbow = beat(t,.43,.88,2.43,3.08);
  const wrist = beat(t,.53,1.07,2.48,3.18);
  const swing = beat(t,.91,1.25,2.16,2.58);
  const phase = (t-1.02)*Math.PI*2*1.63;
  const turn = -.22+.99*beat(t,.15,.86,2.49,3.24);
  return {
    ready, elbow, wrist, turn, open:beat(t,.65,1.15,2.34,2.94),
    roll:swing*Math.sin(phase-.27)*.87,
    swing:swing*Math.sin(phase),
    wink:beat(t,1.49,1.61,1.72,1.99), smile:.18+.76*beat(t,.66,1.42,2.55,3.25),
    gaze:beat(t,.10,.32,2.70,3.17), tilt:5*ready-7*wrist+2*swing*Math.sin(phase-.5),
    squash:.58*ready-.23*wrist+.19*beat(t,2.74,2.94,2.96,3.22),
    antenna:-8*ready+7*wrist+3*swing*Math.sin(phase-.8)
  };
}
function sleeve(x,y,cx,cy,wx,wy,pencil,key) {
  if(pencil?.sketchStrength){
    // Offset the quadratic's two edges along its normal. Taper towards the cuff.
    const edge=(sign)=>Array.from({length:11},(_,i)=>{
      const t=i/10, u=1-t;
      const dx=u*(cx-x)+t*(wx-cx),dy=u*(cy-y)+t*(wy-cy);
      const scale=sign*(4.6-.8*t)/(Math.hypot(dx,dy)||1);
      return [(u*u*x+2*u*t*cx+t*t*wx-dy*scale).toFixed(2),
              (u*u*y+2*u*t*cy+t*t*wy+dx*scale).toFixed(2)].join(' ');
    });
    const contour='M '+edge(1).concat(edge(-1).reverse()).join(' L ')+' Z';
    return pencilPath(contour,{key,fill:'white',width:1.65,phase:pencil.sketchPhase/(2*Math.PI),strength:pencil.sketchStrength});
  }
  const curve='M '+x+' '+y+' Q '+cx+' '+cy+' '+wx+' '+wy;
  return '<g fill="none" stroke-linecap="round"><path d="'+curve+'" stroke="#191919" stroke-width="10"/><path d="'+curve+'" stroke="white" stroke-width="6.5"/></g>';
}
// Ground graphite is anchored to the stage, independently of trunk weight shift.
// All diffusion and projection derive from the sampled pose, never frame history.
function feltGround(p,pencil) {
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  const lift=clamp(p.stepLift),roll=clamp((p.toeRoll??0)/25),load=clamp(p.supportLoad);
  const strength=pencil.sketchStrength;
  const base=Array.from({length:19},(_,i)=>{
    const x=158+(i*29%98),y=250.9+(i*7%11)*.43;
    const length=5+(i*7%12);
    return `<path d="M ${x} ${y} q ${length*.5} ${-.5-(i%3)*.18} ${length} ${-.2+(i%3)*.18}" stroke-width="${.35+(i%3)*.12}"/>`;
  }).join('');
  const sole=(side)=>{
    const left=side==='left',height=left?lift:0;
    // The free shadow trails the foot's outward travel; wider sparse strokes
    // replace the tight sole contact as it rises. Heel release leaves the toe.
    const cx=left?188-6*lift-17*roll*(1-lift):227;
    const half=left?(22-14*roll)*(1-lift)+27*lift:23+load*.5;
    const opacity=left?(.38-.29*lift)*(1-.32*roll):.39+.12*load;
    const spread=.55+height*2.3;
    const strokes=Array.from({length:7},(_,i)=>{
      const inset=(i%3)*2.1,yy=251.2+(i-3)*spread*.36;
      return `<path d="M ${cx-half+inset} ${yy} q ${half*.84} ${.65+(i%2)*.2} ${half*2-inset*2} ${-.15+(i%3)*.14}" stroke-width="${.45+(i%3)*.18}"/>`;
    }).join('');
    return `<g data-felt-ground="${side}" opacity="${opacity}" stroke="#434343">${strokes}</g>`;
  };
  return `<g data-felt-ground="graphite" fill="none" stroke-linecap="round"><g stroke="#727272" opacity="${.08+.15*strength}">${base}</g>${sole('left')}${sole('right')}<g stroke="#4d4d4d" opacity="${.11*strength}"><path d="M 166 253.7 l 19 -1.3 m 13 1.1 l 15 -.7 m 13 1.2 l 27 -1.4" stroke-width=".5"/></g></g>`;
}
export function draw(time, edits={}) {
  const p={...pose(time),...edits};
  const x=212+4*p.ready-7*p.wrist+(p.tx??0), y=162+5*p.ready-3*p.wrist+(p.ty??0);
  const angle=-1.94+.38*p.swing;
  const ex=72+33*p.elbow-3*p.ready, ey=45-35*p.elbow;
  const wx=ex+10*(1-p.wrist)+43*Math.cos(angle)*p.wrist+17*p.wrist+(p.handX??0);
  const wy=ey+7*(1-p.wrist)+43*Math.sin(angle)*p.wrist+(p.handY??0);
  const wyRest=48-5*p.wrist;
  const solid=p.yaw!==undefined || p.pitch!==undefined;
  // Tie exposure to the pose so a paused or held gesture keeps its exact drawing.
  // Each pencil key lingers briefly then eases into the next over the same turn.
  const exposure=(p.yaw??0)*.115+(p.pitch??0)*.12+p.wrist*2+p.roll*.6+p.tilt*.08;
  const key=Math.floor(exposure), u=exposure-key;
  const phase=(key+u*u*(3-2*u))*1.47;
  const pencil={
    sketchPhase:p.sketchPhase??phase,
    sketchStrength:Math.min(1,Math.max(0,p.sketchStrength??(solid?1:0)))
  };
  if(solid && p.skin!=='ink'){
    // The trunk crosses toward the stance ankle before the free foot rises.
    const load=Math.min(1,Math.max(0,p.supportLoad??0));
    const weightX=13*load,weightY=6*load;
    const acting={...p,...pencil,weightX,weightY};
    // Foot placement is in world space. Only the shoulders and head lean into the turn.
    const lean=2*p.ready+4*(p.stepLift??0)-2*(p.indexPoint??0);
    const neckDip=(p.armsBack??0)*Math.max(0,p.pitch??0)/21;
    const headX=lean+.06*(p.yaw??0)-5*(p.indexPoint??0)+2*neckDip;
    // After the mitten arrives, the padded cheek rolls onto its support.
    const chinLoad=p.chinLoad??0;
    const headY=-36+3*p.squash+5*neckDip+2.1*chinLoad;
    const headPose={...acting,tilt:p.tilt-8*(p.indexPoint??0)+3.5*chinLoad+10*(p.stepLift??0)+1.5*neckDip,pitch:p.pitch+5*neckDip};
    const stage='<rect width="460" height="300" fill="white"/>';
    const shadow=feltGround(p,pencil);
    const back=Math.max(0,Math.min(1,p.armsBack??0));
    const offset=p.tuckOffset??0;
    const depthFor=sign=>Math.min(1,Math.max(0,back-sign*offset));
    const layered=back>0 || offset!==0;
    const arms=!layered?feltArm(acting,'left')+feltArm(acting,'right'):'';
    // One drawing per arm, shared across the torso's depth plane. A curved
    // fabric edge sweeps outwards in pose space; neither layer dissolves or
    // moves when it changes depth. Complementary clips keep one visible copy.
    const armLayers=layered?['left','right'].map(side=>{
      const sign=side==='left'?-1:1;
      // An interrupted Think can have a mitten across the body's midline.
      // Begin the sweep beyond that reach before entering the torso.
      const depth=depthFor(sign);
      const entry=Math.max(0,1-depth/.22);
      const edge=6+65*depth-96*entry**3;
      const x=n=>sign*n;
      const clip=`M ${x(edge)} -100 L ${x(180)} -100 L ${x(180)} 160 L ${x(edge)} 160 L ${x(edge)} 90 C ${x(edge-11)} 65 ${x(edge-13)} 15 ${x(edge)} -10 Z`;
      return {side,depth,id:'felt-depth-arm-'+side,clipId:'felt-depth-clip-'+side,rearClipId:'felt-depth-rear-clip-'+side,clip};
    }):[];
    const armDefs=layered?'<defs>'+armLayers.map(a=>`<g id="${a.id}">${feltArm({...acting,armsBack:a.depth},a.side)}</g><clipPath id="${a.clipId}" clipPathUnits="userSpaceOnUse"><path d="${a.clip}"/></clipPath><clipPath id="${a.rearClipId}" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="M -200 -100 H 200 V 160 H -200 Z ${a.clip}"/></clipPath>`).join('')+'</defs>':'';
    const rearArms=armLayers.map(a=>`<use href="#${a.id}" clip-path="url(#${a.rearClipId})"/>`).join('');
    const frontArms=layered?armLayers.map(a=>`<use href="#${a.id}" clip-path="url(#${a.clipId})"/>`).join(''):`<g opacity="${1-(p.armsBack??0)}">${arms}</g>`;
    return stage+shadow+`<g data-cast="felt-canon" transform="translate(${212+weightX} ${162+weightY})">`+
      armDefs+rearArms+feltBody(acting)+frontArms+
      `<g transform="translate(${headX} ${headY}) scale(.97 1.04)">${feltHead(headPose)}</g>`+
      feltArm(offset?{...acting,armsBack:depthFor(1)}:acting,'right','overlay')+'</g>';
  }
  const depthTurn=Math.sin((p.yaw??0)*Math.PI/180);
  const farHandScale=solid ? .91*(1-depthTurn*.12) : '.91';
  const nearHandScale=solid ? .67*(1+depthTurn*.12) : '.67';
  const reach=Math.max(0,Math.min(1,p.indexPoint??0));
  // The elbow stays outside the cabinet. As the hand approaches the chin,
  // the lower sleeve travels in front of the casing with it.
  const rightCurve='M '+wx+' '+wy+' Q '+(ex+12+34*reach)+' '+(ey+22+17*reach)+' 60 22';
  const rightSleeve=sleeve(wx,wy,ex+12+34*reach,ey+22+17*reach,60,22,pencil,'bent-sleeve');
  const chinSleeve=reach>0 ? '<g fill="none" stroke-linecap="round" stroke-dasharray="'+(reach*.56)+' 2">'+
    ['#191919','white'].map((color,i)=>'<path pathLength="1" d="'+rightCurve+'" stroke="'+color+'" stroke-width="'+(i?6.5:10)+'"/>').join('')+'</g>' : '';
  // The ground mark remains anchored while an airborne character rises.
  const lift=Math.max(0,-(p.ty??0));
  const shadow=lift ? '<g transform="translate(207 253) scale('+(1/(1+lift*.018))+ ' 1) translate(-207 -253)" opacity="'+(1/(1+lift*.012))+'">' : '';
  const shadowEnd=lift ? '</g>' : '';
  const contact=pencil.sketchStrength ? '<g fill="none" stroke="#555" opacity="'+(.45*pencil.sketchStrength)+'">'+
    Array.from({length:14},(_,i)=>{
      const x=157+(i%7)*4+84*Math.floor(i/7),y=250.1+(i*3%7)*.26;
      return '<path d="M '+x+' '+y+' q 6 -1 13 -.2" stroke-width="'+(.25+.12*(i%4))+'"/>';
    }).join('')+'</g>' : '';
  return '<rect width="460" height="300" fill="white"/>'+shadow+'<path d="M139 252 Q205 255 275 251 M154 255 Q201 257 247 255" fill="none" stroke="#bbb" stroke-width="1"/>'+contact+shadowEnd+'<g transform="translate('+x+' '+y+')">'+
    sleeve(-58,24,-80,32,-78,wyRest,pencil,'relaxed-sleeve')+(reach>0?rightSleeve:sleeve(60,22,ex+12,ey+22,wx,wy,pencil,'acting-sleeve'))+(solid ? projectedBody({...p,...pencil}) : body(p))+chinSleeve+
    '<g transform="translate(-79 '+wyRest+') rotate(151) scale('+nearHandScale+')">'+hand({...pencil,open:.19,spread:.1,roll:-.46})+'</g>'+
    '<g transform="translate('+wx+' '+wy+') rotate('+(143*(1-p.wrist)+8*p.wrist+26*p.swing+(p.handAngle??0))+') scale('+farHandScale+')">'+hand({...pencil,open:p.open,roll:p.roll,spread:.18+.82*p.open,indexPoint:p.indexPoint})+'</g></g>';
}
