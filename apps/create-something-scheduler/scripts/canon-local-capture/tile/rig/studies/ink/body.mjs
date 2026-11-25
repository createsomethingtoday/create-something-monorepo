import {pencilPath} from '../../src/pencil.mjs';
const boots = `  <path d="M -49 48 C -65 54 -65 76 -55 82 C -44 90 -22 88 -18 80 L -16 58 M 24 57 C 21 69 25 84 37 86 C 48 90 67 86 69 79 C 70 69 61 55 52 52" stroke-width="1.8"/>
  <path d="M -57 78 Q -40 84 -23 79 M 30 80 Q 47 85 64 79 M -53 58 Q -46 62 -46 72 M 54 59 Q 58 67 59 72" fill="none" stroke-width=".7"/>`;
/** Original ink Canon. All marks are deterministic and move with the shell. */
export function body({turn=0,tilt=0,wink=0,smile=.5,gaze=.5,squash=0,antenna=0,blink=0,faceY=0}={}) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  turn=clamp(turn,-1,1); wink=clamp(wink,0,1); smile=clamp(smile,0,1); blink=clamp(blink,0,1);
  const fx=turn*18, fw=65-Math.abs(turn)*12, side=turn>=0?-1:1;
  const left=fx-fw,right=fx+fw;
  const shell='M -74 -27 C -75 -51 -59 -63 -34 -65 C -3 -69 40 -64 61 -53 C 77 -44 80 -24 79 4 L 75 34 C 72 55 53 63 26 65 L -37 63 C -63 61 -75 48 -77 25 Z';
  const face=`M ${left+17} -44 C ${left+30} -51 ${right-21} -49 ${right-8} -37 C ${right+1} -24 ${right} 17 ${right-9} 34 C ${right-21} 48 ${left+18} 47 ${left+5} 34 C ${left-4} 18 ${left-4} -25 ${left+17} -44 Z`;
  const hatches=Array.from({length:23},(_,i)=>{const y=-42+i*4.25;const x=side<0?-72:69;return `<path d="M ${x} ${y} l ${side<0?12:-10} -9"/>`;}).join('');
  const fibers=Array.from({length:34},(_,i)=>{const x=-57+(i*29%122),y=-54+(i*17%112);return `<path d="M ${x} ${y} q -3 -3 -1 -5 m 1 5 q 3 2 5 -1"/>`;}).join('');
  const eye=(x,y,close=0)=>{const h=12*(1-close)+1;return `<path d="M ${x-8} ${y} C ${x-8} ${y-h} ${x+7} ${y-h-2} ${x+8} ${y-1} C ${x+9} ${y+h} ${x-7} ${y+h+1} ${x-8} ${y} Z" fill="white" stroke-width="1.5"/>${`<g transform="translate(0 ${y}) scale(1 ${1-close*.99}) translate(0 ${-y})" opacity="${1-close**4}"><path d="M ${x+(gaze-.5)*5-2} ${y-h*.35} q -3 5 0 ${h*.85} q 5 2 5 -3 l 0 -5 q -1 -3 -5 -2 Z" fill="black" stroke-width=".7"/><path d="M ${x-6} ${y-h*.45} Q ${x} ${y-h*.9} ${x+6} ${y-h*.5}" stroke-width=".8"/></g>`}`;};
  return `<g fill="white" stroke="black" stroke-linecap="round" stroke-linejoin="round">
${boots}
  <g transform="rotate(${tilt} 0 43) scale(${1+squash*.055} ${1-squash*.07})"><path d="${shell}" stroke-width="2.1"/>
  <g opacity="${Math.min(1,Math.abs(turn)*3)}"><path d="M ${side<0?-50:52} -61 C ${side<0?-68:73} -36 ${side<0?-65:70} 35 ${side<0?-49:52} 60" fill="none" stroke-width="1.1"/>
  <g fill="none" stroke-width=".65">${hatches}</g></g><g fill="none" stroke-width=".65">${fibers}</g>
  <path d="M -67 -33 C -66 -53 -45 -60 -25 -59 M -75 24 C -72 46 -57 58 -35 58 M 23 61 Q 55 60 68 45" fill="none" stroke-width=".65"/>
  <g transform="translate(${turn*5} -59) rotate(${antenna})"><path d="M -4 1 Q -3 -15 0 -27 L 7 -27 Q 8 -13 6 2" stroke-width="1.5"/><path d="M -1 -8 l 5 -4 m -5 -2 l 6 -4 m -5 -2 l 5 -3" fill="none" stroke-width=".7"/><path d="M -9 -34 C -8 -47 13 -49 17 -36 C 21 -23 1 -19 -7 -27 Z" stroke-width="1.6"/><path d="M -5 -35 Q -1 -42 6 -42 M 9 -39 q 7 6 1 10 M -4 -28 l 4 -5" fill="none" stroke-width=".65"/></g>
  ${faceY ? `<g transform="translate(0 ${faceY})">` : ''}<path d="${face}" stroke-width="2"/>
  <path d="M ${left+15} 36 Q ${fx} 51 ${right-10} 33" fill="none" stroke-width=".65"/>
  <g transform="translate(${fx} -1) scale(${1-Math.abs(turn)*.13} 1)">
  <path d="M -39 -23 Q -29 -29 -18 -24 M 18 -25 Q 30 ${-29-smile*3} 39 -21" fill="none" stroke-width="2.7"/>
  ${eye(-28,-8,blink)}${eye(28,-8,Math.max(wink,blink))}
  <path d="M -10 20 Q 1 ${23+smile*15} 15 ${18-smile*3}" fill="none" stroke-width="1.9"/>
  <path d="M -43 13 q 5 -4 10 -1 M 31 ${14-4*wink} q 5 ${-4-wink*2} 10 0 M 35 ${18-3*wink} l 3 -2 M -39 18 l 3 -2" fill="none" stroke-width=".8"/>
  </g>${faceY ? '</g>' : ''}<path d="M -24 58 l 1 4 m 8 -4 l 0 5 m 8 -4 l 0 5 m 9 -4 l -1 5 m 10 -5 l -1 5" fill="none" stroke-width=".8"/>
  </g></g>`;
}
export default body;

/** Rounded extruded shell. All contour, face and hatch marks share one camera. */
export function projectedBody(p={}) {
  const rad=Math.PI/180, yaw=(8+(p.yaw??0))*rad, pitch=(7+(p.pitch??0))*rad;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=-Math.sin(pitch);
  const fmt=n=>Number(n.toFixed(3));
  const project=(x,y,z=22)=>{
    y*=1-(p.squash??0)*.045;
    const rx=x*cy+z*sy, rz=-x*sy+z*cy;
    const ry=y*cp-rz*sp, depth=y*sp+rz*cp;
    const perspective=540/(540-depth);
    return [fmt(rx*perspective),fmt(ry*perspective)];
  };
  const line=(points,close=true)=>'M '+points.map(q=>q.join(' ')).join(' L ')+(close?' Z':'');
  // Project each Bézier control point as well as endpoints onto its plane.
  const path=(d,z=24)=>{
    const tokens=d.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);
    let i=0,out='',x=0,y=0,sx=0,sy0=0,cmd='';
    while(i<tokens.length){
      if(/[a-z]/i.test(tokens[i]))cmd=tokens[i++];
      const up=cmd.toUpperCase(),relative=cmd!==up;
      if(up==='Z'){out+=' Z';x=sx;y=sy0;cmd='';continue;}
      const count={M:2,L:2,C:6,Q:4}[up];
      if(!count)throw Error('Unsupported projected path '+cmd);
      const values=tokens.slice(i,i+count).map(Number);i+=count;
      const coords=[];for(let j=0;j<count;j+=2)coords.push(project(values[j]+(relative?x:0),values[j+1]+(relative?y:0),z).join(' '));
      x=values[count-2]+(relative?x:0);y=values[count-1]+(relative?y:0);
      if(up==='M'){sx=x;sy0=y;}
      out+=' '+up+' '+coords.join(' ');if(up==='M')cmd=relative?'l':'L';
    }
    return out;
  };
  // An asymmetric rounded rectangle retains Canon's soft, handmade silhouette.
  const ring=[];
  for(const [cx,yy,start] of [[50,-38,-90],[50,36,0],[-48,36,90],[-48,-38,180]]){
    for(let k=0;k<=10;k++){const a=(start+k*9)*rad;ring.push([cx+27*Math.cos(a),yy+27*Math.sin(a)]);}
  }
  const sketch=Math.max(0,Math.min(1,p.sketchStrength??0));
  const phase=p.sketchPhase??0;
  // Low-frequency, periodic drawing interpolation: no frame noise or changing
  // feature anchors. Each stroke has its own pressure and redrawn curvature.
  const redraw=(i,pass=0)=>Math.sin(phase+i*1.73+pass*2.1)*.72+
    Math.cos(phase*2-i*.83+pass)*.28;
  const pencilPoint=(q,i,pass=0)=>{
    const normal=Math.hypot(q[0],q[1]);
    const drift=sketch*(redraw(i,pass)*1.25+(pass-1)*.8);
    const [x,y]=project(q[0]+q[0]/normal*drift,q[1]+q[1]/normal*drift,20.4);
    const follow=pass*.5*sketch;
    return [fmt(x+follow*(p.pencilDragX??0)),fmt(y+follow*(p.pencilDragY??0))];
  };
  const front=ring.map(([x,y])=>project(x,y,20));
  const back=ring.map(([x,y])=>project(x*.98,y*.98,-32));
  const sides=ring.map((_,i)=>{const n=(i+1)%ring.length;return {i,n,z:(-ring[i][0]*sy+ring[i][1]*sp)};}).sort((a,b)=>a.z-b.z).map(({i,n})=>{
    const shade=ring[i][1]<-38?'#fafafa':'#e4e4e4';
    return `<path d="${line([back[i],back[n],front[n],front[i]])}" fill="${shade}" stroke="${shade}" stroke-width=".65"/>`;
  }).join('');
  const edgeHatch=ring.filter((_,i)=>i%2===0).map(([x,y])=>{const a=project(x*.992,y*.992,-25),b=project(x*.992,y*.992,12);return `<path d="${line([a,b],false)}"/>`;}).join('');
  // Lay each pencil stroke on its own side plane; the front cap hides
  // portions that turn out of view.
  const sideMarks=[];
  for(const x of [-75,77]){
    for(let i=0;i<15;i++){
      const y=-35+i*4.8;
      sideMarks.push(line([project(x,y,-29+i%3),project(x,y+5+i%4,16-i%5)],false));
    }
  }
  const sideInk='<path d="'+sideMarks.join(' ')+'" fill="none" stroke="#696969" stroke-width=".61"/>';
  // Side marks are rendered behind the opaque front cap, giving real occlusion.
  const faceY=p.faceY??0;
  const d=(s,extra='',z=24)=>`<path d="${path(s,z)}" ${extra}/>`;
  const graphite=(key,curve,width,fill='none',z=24)=>pencilPath(path(curve,z),{
    key,width,fill,strength:sketch,phase:phase/(Math.PI*2)
  });
  const eye=(x,close)=>{
    const y=-9+faceY,h=12*(1-close)+.8,g=(p.gaze??.5)-.5;
    return graphite(x<0?'far-lid':'near-lid',`M ${x-8} ${y} C ${x-8} ${y-h} ${x+7} ${y-h} ${x+8} ${y} C ${x+8} ${y+h} ${x-8} ${y+h} ${x-8} ${y} Z`,1.5,'white')+
    (close<.98?d(`M ${x+g*5-2} ${y-h*.45} Q ${x+g*5-5} ${y} ${x+g*5-2} ${y+h*.55} Q ${x+g*5+4} ${y+h*.75} ${x+g*5+3} ${y-h*.4} Z`,'fill="black" stroke-width=".7"',26):'');
  };
  const blink=Math.max(0,Math.min(1,p.blink??0)),smile=p.smile??.5;
  const panel=graphite('bezel',`M -45 ${-44+faceY} C -21 ${-52+faceY} 28 ${-50+faceY} 48 ${-36+faceY} C 59 ${-15+faceY} 57 ${21+faceY} 44 ${35+faceY} C 24 ${49+faceY} -29 ${47+faceY} -47 ${33+faceY} C -59 ${14+faceY} -59 ${-23+faceY} -45 ${-44+faceY} Z`,1.8,'white');
  const features=graphite('brows',`M -39 ${-25+faceY} Q -28 ${-30+faceY} -18 ${-25+faceY} M 18 ${-25+faceY} Q 29 ${-30-smile*2+faceY} 39 ${-23+faceY}`,2.5)+
    eye(-28,blink)+eye(28,Math.max(blink,p.wink??0))+
    graphite('smile',`M -10 ${20+faceY} Q 1 ${23+smile*15+faceY} 15 ${18-smile*3+faceY}`,1.8,'none',26)+
    d(`M -43 ${13+faceY} Q -38 ${9+faceY} -33 ${12+faceY} M 32 ${13+faceY} Q 37 ${9+faceY} 43 ${12+faceY} M -39 ${18+faceY} L -36 ${16+faceY} M 35 ${18+faceY} L 38 ${16+faceY}`,'fill="none" stroke-width=".8"',26);
  // A light corrective stroke follows the eyebrow and bezel through fast turns.
  // At the held pose the final dark line is the only facial contour in this pass.
  const dragX=p.pencilDragX??0, dragY=p.pencilDragY??0;
  const sweep=sketch*Math.min(1,Math.hypot(dragX,dragY)*.55);
  const searchLines=sweep>0 ? d(
    `M ${17+dragX*2} ${-24+faceY+dragY} Q ${29+dragX} ${-32+faceY+dragY} 40 ${-24+faceY}
     M ${-46+dragX*1.8} ${32+faceY+dragY*1.4} Q ${-30+dragX*2} ${48+faceY+dragY*1.5} -9 ${46+faceY}`,
    `fill="none" stroke="#606060" stroke-width=".85" opacity="${fmt(.55*sweep)}"`,25) : '';
  const texture=Array.from({length:22},(_,i)=>{const x=-59+(i*31%116),y=-54+(i*19%110);return d(`M ${x} ${y} q -3 -3 -1 -5 m 1 5 q 3 2 5 -1`,'fill="none" stroke-width=".6"',21);}).join('');
  // Several short, overlapping pencil passes retain gaps and pressure changes.
  // These share the projected shell plane while the face stays precisely fixed.
  const pencil=sketch ? Array.from({length:3},(_,pass)=>
    Array.from({length:8},(_,stroke)=>{
      const start=stroke*5+pass, count=4+(stroke+pass)%3;
      const pts=Array.from({length:count},(_,k)=>{
        const i=(start+k)%ring.length;return pencilPoint(ring[i],i,pass);
      });
      const pressure=.44+((stroke*3+pass)%5)*.16+.12*redraw(stroke,pass);
      return `<path d="${line(pts,false)}" stroke-width="${fmt(pressure)}" opacity="${fmt(sketch*(.32+pressure*.28))}"/>`;
    }).join('')).join('') : '';
  // A pencil pressed into the lower rim leaves a tapered graphite accent.
  // Its heel trails the turn and releases into the held drawing.
  const load=Math.min(1,Math.abs(p.pencilDragX??0)*.32+Math.abs(p.pencilDragY??0)*.34);
  const heel=62.8+.52*redraw(4);
  const lowerRim=sketch ? d(
    `M -53 62 Q -29 ${heel+.2} 24 ${heel-.1}
     Q 35 ${heel-.25} 45 62.5 Q 31 ${heel+.7+load*1.3} -5 ${heel+1.25+load*1.2}
     Q -33 ${heel+.7} -53 62 Z`,
    `fill="#202020" stroke="none" opacity="${fmt(sketch*(.76+.2*load))}"`,20.5) : '';
  const construction=sketch ? d(`M ${-69+redraw(1)*sketch} -26 Q -5 ${-83+redraw(2)*sketch*3} 69 -25 M -72 21 Q -6 ${78+redraw(3)*sketch*3} 71 20`,'fill="none" stroke="#707070" stroke-width=".5" opacity="'+fmt(sketch*.32)+'"',21) : '';
  const waistGuide=sketch ? d(`M -71 ${24+redraw(8)*sketch} Q -5 ${31+redraw(9)*sketch*2} 70 ${22+redraw(10)*sketch} M -28 -60 Q ${-33+redraw(11)*sketch*2} -4 -25 61`,
    `fill="none" stroke="#707070" stroke-width=".46" opacity="${fmt(sketch*.2)}"`,26) : '';
  const pencilHatch=sketch ? Array.from({length:18},(_,i)=>{
    const side=i<9?-1:1,j=i%9;
    const x=side*(64+(j%3)*2), y=-35+j*9;
    const shift=redraw(i)*sketch*1.7;
    return d(`M ${x+shift} ${y} Q ${x-side*3+shift} ${y+2+redraw(i+2)*sketch} ${x-side*(6+(i%3))+shift} ${y+7+redraw(i+4)*sketch*2}`,
      `fill="none" stroke="#555" stroke-width="${fmt(.45+(i%4)*.13)}" opacity="${fmt(sketch*(.38+(i%3)*.12))}"`,21);
  }).join('') : '';
  const antenna=graphite('stem','M -4 -61 Q -3 -77 0 -87 L 7 -87 Q 8 -73 6 -60',1.5,'white',0)+graphite('antenna-tip','M -9 -94 C -8 -107 13 -109 17 -96 C 21 -83 1 -79 -7 -87 Z',1.6,'white',0)+d('M -5 -95 Q -1 -102 6 -102 M 9 -99 Q 16 -93 10 -89','fill="none" stroke-width=".65"',1);
  const graphiteBoots=sketch ? boots.replace(/<path d="([^"]+)" stroke-width="1.8"\/>/,(_,curve)=>
    pencilPath(curve,{key:'boots',width:2,fill:'white',strength:sketch,phase:0})) : boots;
  // Grounded feet intentionally keep their contact points through a head nod.
  return `<g data-ink-solid="projected" fill="white" stroke="black" stroke-linecap="round" stroke-linejoin="round">${graphiteBoots}<g transform="rotate(${p.tilt??0} 0 43)"><g transform="rotate(${p.antenna??0} ${project(0,-61,0).join(' ')})">${antenna}</g><path d="${line(back)}" fill="#e4e4e4" stroke-width="1.6"/>${sides}${sideInk}<g fill="none" stroke-width=".55" stroke="#888">${edgeHatch}</g>${pencilPath(line(front),{key:'cabinet',width:1.9,phase:phase/(Math.PI*2),strength:sketch,fill:'white'})}<g fill="none" stroke="#292929">${construction}${pencil}${pencilHatch}</g>${lowerRim}${texture}${panel}${waistGuide}${searchLines}${features}</g></g>`;
}
