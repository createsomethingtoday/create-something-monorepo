import {pencilPath} from '../../src/pencil.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Half-plane constraints for a 64-sided polygon inscribed in the .98 eye rim.
// Symmetry lets one positive-x half handle either direction of travel.
const pupilRimApothem=.98*Math.cos(Math.PI/64);
const pupilTravelPlanes=Array.from({length:32},(_,i)=>{
  const a=-Math.PI/2+(i+.5)*Math.PI/32,x=Math.cos(a),y=Math.sin(a);
  return {x,y,support:Math.hypot((3.1/8.5)*x,.51*y)};
});
function increasedPupilX(baseX,baseY,scale,gain){
  if(!baseX||!(gain>1))return baseX;
  let limit=Infinity;
  for(const n of pupilTravelPlanes)limit=Math.min(limit,(pupilRimApothem-n.support*scale-n.y*baseY)/n.x);
  return Math.sign(baseX)*Math.min(Math.abs(baseX)*Math.min(gain,2),Math.max(0,limit));
}
const f=n=>{
  const magnitude=Math.abs(n),scaled=magnitude*1000;
  // Inside this bound multiplication error is far smaller than the guard.
  // Decimal half ties retain native toFixed's exact binary-value rounding.
  if(magnitude<1e6&&Math.abs(scaled%1-.5)>1e-6)
    return (n<0?-1:1)*Math.round(scaled)/1000;
  return Number(n.toFixed(3));
};
// Fixed material coordinates: fibers belong to the cloth, never to the screen.
const noise=i=>{const x=Math.sin(i*127.1+31.7)*43758.5453;return x-Math.floor(x);};
const rim=(t,w=63,h=47)=>[w*Math.sign(Math.cos(t))*Math.abs(Math.cos(t))**.59,h*Math.sign(Math.sin(t))*Math.abs(Math.sin(t))**.65];

// Adjacent patches share projected corners. Keep the cloth coordinates and
// their diffuse values fixed as the head turns and the cheek takes weight.
const shellPoint=(t,d)=>[...rim(t,65-6*d,49-6*d),-12+30*d];
const shellSectors=64,shellBands=8;
const shellRings=Array.from({length:shellBands+1},(_,band)=>
  Array.from({length:shellSectors},(_,sector)=>shellPoint(2*Math.PI*sector/shellSectors,band/shellBands)));
const shellValues=Array.from({length:shellBands},(_,band)=>{
  const d=(band+.5)/shellBands;
  return Array.from({length:shellSectors},(_,sector)=>{
    const t=(sector+.5)*2*Math.PI/shellSectors;
    const light=Math.max(0,-Math.sin(t+.52));
    return 123+39*light+15*Math.sin(Math.PI*d)-27*d**3;
  });
});

// Short, oblique fleece marks run over the crown toward the piping.
const crownNap=Array.from({length:94},(_,i)=>{
  const t=3.5+2.65*noise(i+6101),d=.06+.75*noise(i+6201);
  const span=.035+.065*noise(i+6301);
  return [shellPoint(t,d),shellPoint(t+span*.45,d+.045),shellPoint(t+span,d+.072)];
});

// Store each wool curl once on a unit sphere. Only visibility and projection
// change during playback, so fibers cannot jump to another patch while turning.
const tuftFibers=(()=>{
  const fibers=[];
  for(let i=0;i<225;i++){
    const z=1-2*noise(i+1911),theta=2*Math.PI*noise(i+2011),rr=Math.sqrt(1-z*z);
    const normal=[rr*Math.cos(theta),rr*Math.sin(theta),z];
    const shade=clamp(.45+.48*normal[1]+.22*normal[0]-.12*z,.08,1);
    if(noise(i+2111)>shade*.72+.24)continue;
    const tangent=[-Math.sin(theta),Math.cos(theta),0];
    const cross=[-z*tangent[1],z*tangent[0],rr];
    const point=(u,v)=>{
      const q=normal.map((n,k)=>n+tangent[k]*u+cross[k]*v);
      const length=Math.hypot(...q);
      return q.map(value=>value/length);
    };
    const span=.14+.13*noise(i+2311),curl=.09+.14*noise(i+2411);
    const points=[point(-span,0),point(-span*.8,-curl),point(span*.65,-curl*1.3),point(span*.35,.025)];
    if(i%3===0)points.push(point(-span*.15,curl*.5),point(span*.7,curl*.9),point(span*1.05,-curl*.25));
    fibers.push({normal,points,width:.45+.2*noise(i+2511),opacity:.19+.39*shade});
  }
  return fibers;
})();

// Immutable cloth geometry is authored once; only projection and strength vary.
const rimMarks=Array.from({length:220},(_,i)=>{
  const t=noise(i+301)*Math.PI*2;
  const depth=noise(i+501),z=-12+depth*29;
  const w=64.7-5.6*depth,h=48.7-5.6*depth;
  const span=.032+noise(i+701)*.12;
  const a=rim(t,w,h),b=rim(t+span*.5,w+.2,h+.2),c=rim(t+span,w,h);
  return {points:[[...a,z],[...b,z+.5],[...c,z+1]],width:.45+noise(i+901)*.35,shade:.5+.5*Math.sin(t-.5)};
});
const shadowMarks=Array.from({length:33},(_,cluster)=>{
  const t=.5+noise(cluster+2010)*3.6,depth=noise(cluster+2070)*.7;
  return Array.from({length:5},(_,j)=>{
    const k=t+j*.019,z=-11+depth*21,w=65-depth*5,h=49-depth*5;
    const reach=.36+.64*Math.sin((j+.5)*Math.PI/5);
    const start=rim(k,w,h),end=rim(k+(.038+noise(cluster+j)*.026)*reach,w-2.1*reach,h-2*reach);
    return {points:[[...start,z],[...end,z+10*reach]],opacity:.23+noise(cluster+3010)*.22};
  });
}).flat();
const faceNap=Array.from({length:470},(_,i)=>{
  const x=-53+106*noise(i*3),y=-37+74*noise(i*3+1);
  if((Math.abs(x)/51)**3.4+(Math.abs(y)/35)**3.1>.94)return null;
  const length=1.6+noise(i*3+2)*4.2;
  return {points:[[x,y,21.15],[x+length*.62,y-length*.76,21.15]],color:i%4?'#a2a2a2':'#141414',width:.38+noise(i+900)*.34,light:(x+53)/106*.13+(y+37)/74*.11};
}).filter(Boolean);
const pipingStitches=Array.from({length:61},(_,i)=>{
  const t=i*Math.PI*2/61,a=rim(t,56.9,40.7),b=rim(t+.019,54.7,38.7);
  return [[...a,21.4],[...b,21.5]];
});

// These cloth-space outlines never change; the pose only projects them.
const headContours=[[65,49,-12],[59,43,18],[53,37,21]].map(([w,h,z])=>
  Array.from({length:64},(_,i)=>[...rim(i*Math.PI/32,w,h),z]));
const crownSeam=Array.from({length:25},(_,i)=>{
  const d=i/24,t=4.64+.055*Math.sin(d*Math.PI);
  return shellPoint(t,d);
});
const crownStitches=Array.from({length:8},(_,j)=>{
  const d=(1+j*3)/24,t=4.64+.055*Math.sin(d*Math.PI);
  return [shellPoint(t-.014,d),shellPoint(t+.014,d+.025)];
});

// A curved 18-unit stem acts at half-length plus its 8-unit tuft offset.
const lateralBendGain=26/(18/2+8);

// Constant-curvature stem: both controls bend from the same upright crown
// tangent. Past the stem, the pompom centre follows its terminal tangent.
export function portraitAntennaPoint(x,distance,lateral=0,pitch=0) {
  if(distance===0)return [x,-44,0];
  // A curved stem distributes lateral lean over its length. Compensate its
  // small-angle lever (18/2 + 8 = 17) to retain the approved 26-unit excursion.
  const a=lateral*Math.PI/180*lateralBendGain,b=pitch*Math.PI/180;
  const magnitude=Math.hypot(a,b),length=18,t=Math.min(distance,length);
  if(magnitude<1e-9)return [x,-44-distance,0];
  const angle=magnitude*t/length,k=magnitude/length;
  const nx=a/magnitude,nz=b/magnitude,extra=Math.max(0,distance-length);
  const side=(1-Math.cos(angle))/k+extra*Math.sin(angle);
  // Parallel-transport the stem's width with the same 3D bend.
  const width=[1+nx*nx*(Math.cos(angle)-1),nx*Math.sin(angle),nx*nz*(Math.cos(angle)-1)];
  return [nx*side+x*width[0],-44-Math.sin(angle)/k-extra*Math.cos(angle)+x*width[1],nz*side+x*width[2]];
}

// Rotate material vectors with the stem tip, preserving curl shape and normals.
// The axis is shared by lateral and depth bending; no Euler-order twist occurs.
function portraitAntennaRotation(lateral=0,pitch=0) {
  const a=lateral*Math.PI/180*lateralBendGain,b=pitch*Math.PI/180,angle=Math.hypot(a,b);
  if(angle<1e-9)return vector=>vector;
  const axis=[-b/angle,0,a/angle],c=Math.cos(angle),s=Math.sin(angle);
  return vector=>{
    const dot=axis.reduce((sum,v,k)=>sum+v*vector[k],0);
    const cross=[axis[1]*vector[2]-axis[2]*vector[1],axis[2]*vector[0]-axis[0]*vector[2],axis[0]*vector[1]-axis[1]*vector[0]];
    return vector.map((v,k)=>v*c+cross[k]*s+axis[k]*dot*(1-c));
  };
}
export function portraitAntennaVector(vector,lateral=0,pitch=0) {
  return portraitAntennaRotation(lateral,pitch)(vector);
}

/** Felt Canon head. Local origin is the head centre; the actor owns placement. */
export function feltHead(p={}) {
  const portraitStudy=p.feltPortraitStudy===true;
  const yaw=(9+(p.yaw??(p.turn??0)*28))*Math.PI/180;
  const pitch=(5+(p.pitch??0))*Math.PI/180;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const chinLoad=clamp(p.chinLoad??0,0,1);
  const project=(x,y,z=18)=>{
    // The mitten seats under the lower-right padded corner. Compress a small
    // patch in material space so piping, stitches and nap keep their attachment.
    // Compact support leaves eyes, mouth, crown and the opposite cheek exact.
    const radius=((x-43)/26)**2+((y-35)/22)**2;
    const seat=Math.max(0,1-radius);
    const pressure=chinLoad*seat*seat*(.72+.28*clamp((z+12)/33,0,1));
    x-=.7*pressure;
    y-=2.6*pressure;
    y*=1-(p.squash??0)*.045;
    const xx=x*cy+z*sy,zz=-x*sy+z*cy;
    const yy=y*cp+zz*sp,depth=zz*cp-y*sp,k=600/(600-depth);
    // Serialize here: all callers need SVG coordinates, avoiding a short-lived
    // pair array and join for every projected cloth point.
    return f(xx*k)+' '+f(yy*k);
  };
  const path=(points,close=false)=>{
    let d='M ';
    for(let i=0;i<points.length;i++){
      if(i)d+=' L ';
      const q=points[i];
      d+=project(q[0],q[1],q[2]);
    }
    return d+(close?' Z':'');
  };
  const curve=(pts,z=19)=>'M '+project(...pts[0],z)+' C '+pts.slice(1).map(q=>project(...q,z)).join(' ');
  const stroke=(d,color,width,opacity=1)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let buckets=new Map();
  const material=(d,color,width,opacity)=>{
    const alpha=Math.round(opacity*12)/12,w=Math.round(width*4)/4;
    const key=[color,w,alpha].join('|');
    buckets.set(key,(buckets.get(key)??'')+' '+d);
  };
  const flush=()=>{let result='';for(const [key,d] of buckets){const [color,width,alpha]=key.split('|');result+=stroke(d,color,width,alpha);}buckets=new Map();return result;};
  const graphite=(d,key,width=1.1,fill='none')=>pencilPath(d,{key:'felt-head/'+key,width,fill,strength:clamp(p.sketchStrength??.72,0,1)*(portraitStudy?.3:1),phase:(p.sketchPhase??0)/(Math.PI*2)});
  const studyShellPoint=(t,d)=>{
    // Rounded padding: a shallow rear shoulder rolls into the sewn face.
    const roll=1-Math.cos(Math.PI*d/2);
    return [...rim(t,65-6*roll,49-6*roll),-12+30*d];
  };
  const back=path(portraitStudy?Array.from({length:64},(_,i)=>studyShellPoint(i*Math.PI/32,0)):headContours[0],true),front=path(headContours[1],true),face=path(headContours[2],true);
  const strength=clamp(p.sketchStrength??.72,0,1);
  const grey=(from,to)=>{const value=Math.round(from+(to-from)*strength);return 'rgb('+[value,value,value].join(',')+')';};
  let out=graphite(back,'shell',portraitStudy?.7:1.7,portraitStudy?'#535351':grey(145,169));
  // Diffuse graphite value follows the padded shell in material space. Broad
  // bands retain a quiet crown light without a glossy screen-space highlight.
  const rings=portraitStudy
    ? Array.from({length:shellBands+1},(_,b)=>Array.from({length:shellSectors},(_,i)=>project(...studyShellPoint(i*2*Math.PI/shellSectors,b/shellBands))))
    : shellRings.map(ring=>ring.map(point=>project(...point)));
  const tones=new Map();
  for(let band=0;band<shellBands;band++){
    for(let sector=0;sector<shellSectors;sector++){
      const next=(sector+1)%shellSectors;
      const value=portraitStudy
        ? Math.round(65+(.52+.48*Math.max(0,-Math.sin((sector+.5)*2*Math.PI/shellSectors+.52)))*24+12*Math.sin(Math.PI*(band+.5)/shellBands))
        : Math.round(shellValues[band][sector]+(1-strength)*10);
      const quad=`M${rings[band][sector]} L${rings[band][next]} ${rings[band+1][next]} ${rings[band+1][sector]} Z`;
      tones.set(value,(tones.get(value)??'')+quad);
    }
  }
  for(const [value,d] of tones)out+=`<path d="${d}" fill="rgb(${value},${value},${value})"/>`;
  // A fine construction seam bows from rear crown to the antenna seat and
  // continues to the front piping. Its projected depth makes pitch legible.
  out+=stroke(path(portraitStudy?Array.from({length:25},(_,i)=>{const d=i/24;return studyShellPoint(4.64+.055*Math.sin(d*Math.PI),d);}):crownSeam),'#555555',.72,.75);
  if(!portraitStudy)for(const points of crownStitches)out+=stroke(path(points),'#c1c1c1',.5,.64);
  // Graphite sits on short sections of the rolled rim. Pressure builds on
  // the trailing edge of a turn; the two ends stay seated as the mark flexes.
  if(strength>0&&!portraitStudy){
    const dx=clamp(p.pencilDragX??0,-2.4,2.4),dy=clamp(p.pencilDragY??0,-2,2);
    const exposure=p.redrawPhase??0;
    let accents='';
    for(const [start,end,depth] of [[2.0,2.53,.10],[2.66,3.44,.08],[3.53,4.11,.16],[4.20,4.69,.12],[4.91,5.48,.11],[.28,.89,.10]]){
      const outer=[],inner=[];
      for(let i=0;i<=14;i++){
        const u=i/14,t=start+(end-start)*u,taper=Math.sin(Math.PI*u);
        const trailing=clamp((dx*Math.cos(t)+dy*Math.sin(t))*.45,0,1);
        const grain=.88+.12*Math.sin(19*t+exposure);
        const lowerShade=Math.max(0,-Math.cos(t)*Math.sin(t));
        const pressure=taper*(.55+1.15*trailing)*grain*(1-.52*lowerShade);
        const drift=taper*(.23+1.05*trailing)*Math.sin(5*t+exposure*.33);
        const w=65-depth*6+drift,h=49-depth*6+drift,z=-12+30*depth;
        outer.push([...rim(t,w+pressure,h+pressure),z]);
        inner.push([...rim(t,w-pressure,h-pressure),z]);
      }
      accents+=path(outer.concat(inner.reverse()),true);
    }
    out+=`<g data-felt-pencil="contour"><path d="${accents}" fill="#404040" opacity="${f(.78*strength)}"/></g>`;
  }
  // Project fixed cloth marks into this pose; material coordinates are shared.
  for(const mark of rimMarks){
    const shade=.12+(.22+.31*strength)*mark.shade;
    if(!portraitStudy)material(path(mark.points),'#333333',mark.width,shade);
  }
  if(strength>0){
    for(const [i,mark] of crownNap.entries()){
      material(portraitStudy?path(mark.map(([x,y,z])=>{const d=(z+12)/30,t=Math.atan2(Math.sign(y)*Math.abs(y/(49-6*d))**(1/.65),Math.sign(x)*Math.abs(x/(65-6*d))**(1/.59));return studyShellPoint(t,d);})):path(mark),portraitStudy?'#b0afaa':'#454545',portraitStudy?.35:.55,(.17+.19*noise(i+6501))*strength*(portraitStudy?.42:1));
    }
  }
  // Group pencil strokes along the form in the shadow. Leave paper showing
  // between groups, with the broadest untouched patch on the lit crown.
  if(strength>0&&!portraitStudy){
    for(const mark of shadowMarks)material(path(mark.points),'#393939',.63,mark.opacity*strength);
  }
  out+=flush();
  out+=graphite(front,'piping-outer',portraitStudy?.85:1.7,portraitStudy?'#545451':grey(117,144));
  out+=graphite(face,'cloth-edge',1.25,'#343434');
  // Low contrast, broken diagonal nap: asymmetric density leaves an upper-left light.
  for(const mark of faceNap){
    material(path(mark.points),mark.color,mark.width,(.08+mark.light*(.6+strength))*(portraitStudy?.25:1));
  }
  out+=flush();
  // Hand-sewn piping has individual bites, not a screen-space patterned border.
  for(const points of pipingStitches)material(path(points),portraitStudy?'#aaa79e':'#cdcdcd',portraitStudy?.48:.73,portraitStudy?.28:.68);
  out+=flush();
  const gaze=clamp(p.gaze??.5,-1,1),blink=clamp(p.blink??0,0,1);
  const eye=(cx,closed,brow=0,cheek=0)=>{
    const ey=-5+(p.faceY??0)*.4,open=1-closed,ry=13.8*open,rx=8.5;
    // A shallow cushion, sampled in cloth coordinates: the near embroidery
    // opens toward the camera while the far eye wraps around the padded face.
    // Share the surface for white, pupil, thread and closed lid so gaze never
    // slides independently of its embroidered socket.
    // In a three-quarter squint, reveal more of the patch toward the nose.
    // The white, pupil and stitches share the warp. It fades with closure.
    const side=Math.sign(cx);
    const reveal=clamp(p.farEyeReveal??0,0,1)*clamp(side*sy/.65,0,1)*Math.min(1,open*3);
    const cloth=(x,y,lift=0,lidWarp=true)=>{
      // Fold the entire sewn patch onto the same cubic as the shut lid.
      // White, satin rows and pupil share this cloth-space deformation; a
      // shrinking flat ellipse would otherwise jump three units at closure.
      if(lidWarp&&closed>0){
        const u=clamp((x-cx)/rx,-1,1),target=8*u;
        // The seam spans x = -8 + 15t + 3t² - 2t³. Its near-linear
        // spacing gives a close initial estimate for two Newton steps.
        let t=(u+1)/2;
        for(let i=0;i<2;i++){
          const error=t*(15+t*(3-2*t))-8-target;
          t-=error/(15+6*t*(1-t));
        }
        x=cx+(x-cx)*(1-closed*(1-8/rx));
        y-=12*t*(1-t)*closed;
      }
      // Expressions deform the embroidered patch in cloth space, including its pupil.
      // Cheek lift affects the lower half; brow tilt is shared by the whole eye.
      if(cheek)y-=cheek*3.8*Math.max(0,(y-ey)/13.8);
      if(brow)y+=brow*(x-cx)*Math.sign(cx)*.18;
      const z=22-(x*x-cx*cx)/150-((y-ey)**2)/650+lift;
      if(!reveal)return [x,y,z];
      const u=(x-cx)/rx;
      return [x+reveal*(3.7*u-1.5*side),ey+(y-ey)*(1+.24*reveal),z];
    };
    const eyePath=(points,close=false,lift=0,lidWarp=true)=>path(points.map(([x,y])=>cloth(x,y,lift,lidWarp)),close);
    const eyeCurve=points=>eyePath(Array.from({length:25},(_,i)=>{
      const t=i/24,u=1-t;
      return [0,1].map(axis=>u*u*u*points[0][axis]+3*u*u*t*points[1][axis]+3*u*t*t*points[2][axis]+t*t*t*points[3][axis]);
    }),false,.3,false);
    const crease=eyeCurve([[cx-8,ey],[cx-3,ey-4],[cx+3,ey-4],[cx+8,ey]]);
    // A second short pencil crease bunches against the stitched lid on a squint.
    const fold=closed>.45 && strength>0
      ? stroke(eyeCurve([[cx-7,ey-2],[cx-5,ey-5.8],[cx-1,ey-6.7],[cx+2,ey-5.8]]),'#aeaeae',.85,strength*(closed-.45))
      : '';
    if(open===0)return stroke(crease,'#dddddd',1.7)+fold;
    const loop=Array.from({length:40},(_,i)=>{const t=i*Math.PI/20;const selvage=portraitStudy?1+.018*Math.sin(i*2.7)+.011*Math.cos(i*4.1):1;return [cx+rx*Math.cos(t)*selvage,ey+ry*Math.sin(t)*selvage];});
    let s=`<path d="${eyePath(loop,true)}" fill="${portraitStudy?'#d8cbb0':'#e5e5e5'}"/>`;
    // Fine alternating thread values remain visible against the pale fill.
    // Sample the long rows so they bend with the cloth instead of bridging it.
    let stitches='',threadShadow='';
    if(portraitStudy){
      // Satin stitch rows are sewn across the patch, with tiny uneven bites
      // at the selvage. Row positions compress with the existing lid geometry.
      for(let i=-13;i<=13;i++){
        const v=i/13.8,y=ry*v,half=rx*Math.sqrt(Math.max(0,1-v*v));
        const left=-half+.10+.13*noise(i+903),right=half-.08-.15*noise(i+1003);
        const row=Array.from({length:6},(_,j)=>{
          const t=j/5;
          return [cx+left+(right-left)*t,ey+y+(.10*Math.sin(t*Math.PI*3+i*1.7)+.035*Math.sin(t*29+i))*open];
        });
        threadShadow+=eyePath(row.map(([x,y])=>[x,y+.24*open]),false,.12);
        stitches+=eyePath(row,false,.15);
      }
    }else for(let i=-7;i<=7;i++){
      const x=i*1.05,h=Math.max(0,ry*Math.sqrt(1-(x/rx)**2)-.35);
      const row=Array.from({length:9},(_,j)=>{
        const t=j/8;
        return [cx+x+.24*t,ey-h+2*h*t];
      });
      stitches+=eyePath(row,false,.15);
      if(i%2===0)threadShadow+=eyePath(row.map(([x,y])=>[x+.32,y]),false,.12);
    }
    s+=stroke(threadShadow,portraitStudy?'#9b8868':'#8f8f8f',portraitStudy?.24:.38,(portraitStudy?.4:.27)*open);
    s+=stroke(stitches,portraitStudy?'#f2e6ce':'#fafafa',portraitStudy?.65:.48,(portraitStudy?.9:.72)*open);
    // At a diagonal gaze extreme, keep a rim of thread around the pupil.
    const gx=clamp((gaze-.5)*5,-3.8,3.8)/rx,gy=-.13+.23*clamp(p.gazeY??0,-1,1);
    const travel=Math.min(1,.47/(Math.hypot(gx,gy)||1));
    // Default arithmetic preserves the established pupil geometry exactly.
    const pupilX=cx+rx*gx*travel,pupilY=ey+ry*gy*travel;
    const pupilSize=clamp(p.pupilSize??0,-1,1);
    const pupilScale=pupilSize<0?1+pupilSize*.55:1+pupilSize*.22;
    const dilatedTravel=pupilSize>0?Math.min(travel,(.98-.51*pupilScale)/(Math.hypot(gx,gy)||1)):travel;
    const originalPx=pupilSize>0?cx+rx*gx*dilatedTravel:pupilX;
    const py=pupilSize>0?ey+ry*gy*dilatedTravel:pupilY;
    const baseX=(originalPx-cx)/rx,baseY=(py-ey)/ry;
    const enhancedX=increasedPupilX(baseX,baseY,pupilScale,p.pupilTravelX??1);
    const px=(p.pupilTravelX??1)>1?cx+rx*enhancedX:originalPx;
    p.onPupilGeometry?.({cx,rx,ry,baseX,baseY,x:(px-cx)/rx,y:baseY,pupilScale,maxRadius:Math.max(...Array.from({length:280},(_,i)=>{const a=i*Math.PI/140;return Math.hypot((px-cx)/rx+(3.1/rx)*pupilScale*Math.cos(a),baseY+.51*pupilScale*Math.sin(a));}))});
    const pupil=Array.from({length:28},(_,i)=>{const t=i*Math.PI/14;return [px+3.1*pupilScale*Math.cos(t),py+ry*.51*pupilScale*Math.sin(t)];});
    s+=`<path d="${eyePath(pupil,true,.18*open)}" fill="#292929" opacity="${Math.min(1,open*5)}"/>`;
    if(closed>.7)s+=stroke(crease,'#dddddd',1.4+.3*((closed-.7)/.3),(closed-.7)/.3);
    return s+fold;
  };
  // Searching adds a small uneven lid, with enough eye left to read as thought.
  const eyeAsymmetry=clamp(p.eyeAsymmetry??0,0,1);
  const lidLeft=clamp(p.lidLeft??0,0,1),lidRight=clamp(p.lidRight??0,0,1);
  const browLeft=clamp(p.browLeft??0,-1,1),browRight=clamp(p.browRight??0,-1,1);
  const cheekLeft=clamp(p.cheekLeft??0,0,1),cheekRight=clamp(p.cheekRight??0,0,1);
  const rightClosed=Math.max(blink+(1-blink)*eyeAsymmetry*.4,clamp(p.wink??0,0,1));
  out+=eye(-23,p.lidLeft==null?blink:lidLeft,browLeft,cheekLeft)
    +eye(23,p.lidRight==null?rightClosed:lidRight,browRight,cheekRight);
  // Short broken embroidery, introduced only when an expression asks for it.
  // Positive brow raises the inner stitch; positive cheek bunches below the eye.
  for(const [cx,brow,cheek] of [[-23,browLeft,cheekLeft],[23,browRight,cheekRight]]){
    const side=Math.sign(cx),ey=-5+(p.faceY??0)*.4;
    if(brow){
      const amount=Math.abs(brow);
      const inner=cx-side*(3+5*amount),outer=cx+side*(3+5*amount);
      const baseline=ey-19;
      // The inner knot leads; the arch rolls through the padded middle before
      // settling at the outer knot. Curvature changes independently of span.
      const innerY=baseline-brow*5,outerY=baseline+brow*2;
      const line=curve([[inner,innerY],[cx-side*(2+amount),baseline-amount*(3+2*brow)],
        [cx+side*3,baseline-amount*(4-brow)],[outer-side*2,outerY]],22.4);
      out+=`<g data-felt-brow="${side<0?'left':'right'}">`;
      out+=stroke(line,'#d1d1d1',1.35*Math.sqrt(amount),.94);
      out+=stroke(curve([[outer-side,outerY+.3],[outer,outerY+.5],[outer,outerY+.6],[outer+side,outerY+.8]],22.4),'#bcbcbc',.9*Math.sqrt(amount),.75);
      out+='</g>';
    }
    if(cheek){
      // Gather a widening crescent of cloth, with a small rolled underside.
      // Fixed material values let geometry, rather than fading, carry the lift.
      const span=7*Math.sqrt(cheek),base=ey+18-cheek*3;
      const gather=[[cx-span,base],[cx-span*.55,base-4*cheek],
        [cx+span*.55,base-4*cheek],[cx+span,base]];
      out+=`<g data-felt-cheek="${side<0?'left':'right'}">`;
      out+=stroke(curve(gather,22.3),'#bcbcbc',1.1*Math.sqrt(cheek),.8);
      out+=stroke(curve(gather.map(([x,y],i)=>[x,y+(i===0||i===3?.15:.8)*cheek]),22.25),'#777777',.65*Math.sqrt(cheek),.55);
      out+='</g>';
    }
  }
  const smile=clamp(p.smile??.5,0,1);
  const round=clamp(p.mouthRound??0,0,1);
  // Lift the screen-right embroidery away from the supporting mitten. Taper
  // this gesture out for a round mouth so its closing seam stays attached.
  const corner=clamp(p.smileCorner??0,0,1)*(1-round);
  const press=clamp(p.mouthPress??0,0,1)*(1-round);
  const left=-9+6*round+press*2,right=12-9*round-press*3;
  const mouthOpen=clamp(p.mouthOpen??0,0,1),mouthWidth=clamp(p.mouthWidth??0,-1,1);
  const cornerLeft=clamp(p.cornerLeft??0,-1,1),cornerRight=clamp(p.cornerRight??0,-1,1);
  // Both lips start on the same embroidered seam. Roundness and opening
  // separate that contour geometrically, exposing a fixed dark cloth material.
  const widthScale=1+mouthWidth*.45,mouthCentre=(left+right)/2;
  const mx=x=>mouthCentre+(x-mouthCentre)*widthScale;
  const mouthA=[mx(left),20-cornerLeft*6];
  const mouthB=[mx(right+corner*4),18+round*2-corner*4.5+2*press-cornerRight*6];
  const arch=5*Math.min(0,cornerLeft,cornerRight)*(1-mouthOpen);
  const lower=[mouthA,[mx(-3),23+smile*5-3*press+mouthOpen*7-cornerLeft*2+arch],
    [mx(right*.75+corner*2),24+smile*4-corner*1.5-4*press+mouthOpen*7-cornerRight*2+arch],mouthB];
  // Compression flattens the sewn lips between their pinned corners. Pucker
  // brings both control points inside the narrow oval instead of folding them.
  for(let i=1;i<3;i++){
    const t=i/3,flat=mouthA[1]+(mouthB[1]-mouthA[1])*t;
    lower[i][1]+=(flat-lower[i][1])*press*.82;
    lower[i][0]+=(mouthA[0]+(mouthB[0]-mouthA[0])*t-lower[i][0])*round;
    lower[i][0]=clamp(lower[i][0],mouthA[0],mouthB[0]);
  }
  // A corner pulls the adjacent face cloth into a short curved gathering.
  for(const [point,tug,side] of [[mouthA,cornerLeft,-1],[mouthB,cornerRight,1]]){
    const load=Math.min(1,Math.abs(tug));
    if(!load)continue;
    out+=`<g data-felt-corner="${side<0?'left':'right'}">`;
    out+=stroke(curve([[point[0]+side*.8,point[1]+.5],
      [point[0]+side*2*load,point[1]+1.6*load],
      [point[0]+side*3.5*load,point[1]+3.8*load],
      [point[0]+side*4*load,point[1]+5*load]],22.2),'#bcbcbc',.9*Math.sqrt(load),.7);
    out+='</g>';
  }
  const reveal=1-(1-round)*(1-mouthOpen);
  if(reveal>0){
    const seam=[...lower].reverse();
    const target=[mouthB,[mx(right*.85),20-5*round-mouthOpen*6-cornerRight*2],
      [mx(left*.85),20-5*round-mouthOpen*6-cornerLeft*2],mouthA];
    // Keep matching control points above the lower seam even when opposite
    // corners pull in different directions. Matching x coordinates make the
    // no-crossing condition hold throughout the two cubic contours.
    const upper=target.map((point,i)=>i===0||i===3?point:[
      seam[i][0],seam[i][1]+(Math.min(seam[i][1],point[1])-seam[i][1])*reveal
    ]);
    const d=curve(lower,22.5)+' C '+upper.slice(1).map(q=>project(...q,22.5)).join(' ')+' Z';
    out+=`<path data-felt-mouth="aperture" d="${d}" fill="#202020" fill-opacity=".9" stroke="${portraitStudy?'none':'#dedede'}" stroke-width="1.65" stroke-opacity=".94" stroke-linecap="round" stroke-linejoin="round"/>`;
  }else if(!portraitStudy){
    out+=stroke(curve(lower,22.5),'#dedede',1.65,.94);
  }
  if(portraitStudy){
    // Separate cream thread bites stay at fixed seam parameters as it flexes.
    // The same lower lip controls preserve the distinction between press and smile.
    const sample=t=>{const u=1-t;return [0,1].map(k=>u*u*u*lower[0][k]+3*u*u*t*lower[1][k]+3*u*t*t*lower[2][k]+t*t*t*lower[3][k]);};
    out+='<g data-felt-mouth="cream-stitches">';
    for(let i=0;i<7;i++){
      const t=(i+.5)/7,point=sample(t),a=sample(Math.max(0,t-.009)),b=sample(Math.min(1,t+.009));
      const length=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
      const dx=(b[0]-a[0])/length*(.3-.15*press),dy=(b[1]-a[1])/length*(.3-.15*press);
      const points=[[point[0]-dx,point[1]-dy,22.65],[point[0]+dx,point[1]+dy,22.65]];
      out+=stroke(path(points),'#6a6253',1.9-.4*press,.55);
      out+=stroke(path(points),'#f1e6ce',1.65-.4*press,1);
      out+=stroke(path(points.map(([x,y,z])=>[x,y-.27,z+.04])),'#fff0d3',.36,.8);
    }
    out+='</g>';
  }
  // Stalk and an irregular wool pompom, sharing the same 3D camera as the shell.
  const a=(p.antenna??0)*Math.PI/180;
  const antennaPitch=(p.antennaPitch??0)*Math.PI/180;
  // Bend the stem in depth around its crown attachment. The wool ball rides
  // the tip as a full, round tuft; pitching its flat contour would squash it.
  const bend=distance=>{
    const stemLength=18,travel=Math.min(distance,stemLength);
    const angle=antennaPitch*travel/stemLength,k=antennaPitch/stemLength;
    return [-44-Math.sin(angle)/k-Math.max(0,distance-stemLength)*Math.cos(angle),
      (1-Math.cos(angle))/k+Math.max(0,distance-stemLength)*Math.sin(angle)];
  };
  const wool=(x,y,pom=false)=>{
    if(p.portraitAntenna)return portraitAntennaPoint(x,pom?26:Math.max(0,-y-44),p.antenna??0,p.antennaPitch??0);
    if(antennaPitch===0)return [x*Math.cos(a)-(y+44)*Math.sin(a),-44+x*Math.sin(a)+(y+44)*Math.cos(a),0];
    const [by,z]=bend(pom?26:Math.max(0,-y-44));
    const yy=pom?by+y+70:by;
    return [x*Math.cos(a)-(yy+44)*Math.sin(a),-44+x*Math.sin(a)+(yy+44)*Math.cos(a),z];
  };
  const stalkPoints=p.portraitAntenna
    ? [...Array.from({length:17},(_,i)=>portraitAntennaPoint(-3-i/16,18*i/16,p.antenna??0,p.antennaPitch??0)),
      ...Array.from({length:17},(_,i)=>portraitAntennaPoint(4-i/16,18*(1-i/16),p.antenna??0,p.antennaPitch??0))]
    : antennaPitch===0
    ? [wool(-3,-46),wool(-4,-61),wool(3,-62),wool(4,-46)]
    : [...Array.from({length:9},(_,i)=>wool(-3-i/8,-46-15*i/8)),
      ...Array.from({length:9},(_,i)=>wool(3+i/8,-62+16*i/8))];
  const stalk=path(stalkPoints,true);
  out+=graphite(stalk,'stalk',1,'#767676');
  // A spherical tuft, rather than a flat disk: its silhouette is the sphere's
  // camera-facing tangent ring; surface fibers remain in fixed wool coordinates.
  const centre=wool(0,-70,true),radius=14;
  const pomRight=[cy,0,sy],up=[-sy*sp,cp,cy*sp],toward=[-sy*cp,-sp,cy*cp];
  const sphere=(u,v,w)=>centre.map((c,k)=>c+radius*(pomRight[k]*u+up[k]*v+toward[k]*w));
  const tuftCurve=points=>'M '+project(...points[0])+' C '+points.slice(1).map(q=>project(...q)).join(' ');
  // Small overlapping lobes give a soft fleece edge without a sawtooth outline.
  let outline='';
  for(let i=0;i<26;i++){
    const t=i*2*Math.PI/26,next=(i+1)*2*Math.PI/26;
    const point=(angle,r)=>sphere(Math.cos(angle)*r,Math.sin(angle)*r,0);
    const q=[point(t,1+.018*Math.sin(i*2.7)),point(t+.065,1.065+.025*noise(i+870)),point(next-.065,1.055),point(next,1+.018*Math.sin((i+1)*2.7))];
    outline+=(i?' C ':'M '+project(...q[0])+' C ')+q.slice(1).map(v=>project(...v)).join(' ');
  }
  outline+=' Z';
  out+=graphite(outline,'pompom',.8,'#e1e1e1');
  // Broad, quiet graphite layers build the lower hemisphere and leave the
  // upper-left paper open. Curved bands stay within the round tangent contour.
  for(let band=0;band<14;band++){
    const y=-.25+band*.077,edge=Math.sqrt(1-y*y),bottom=.97;
    const points=[sphere(-edge,y,0),sphere(-edge*.58,y+.27,.55),sphere(edge*.58,y+.27,.55),sphere(edge,y,0)];
    const d=tuftCurve(points)+' Q '+project(...sphere(.6,bottom,0))+' '+project(...sphere(0,1,0))+' Q '+project(...sphere(-.6,bottom,0))+' '+project(...points[0])+' Z';
    out+=`<path d="${d}" fill="#666666" opacity=".042"/>`;
  }
  // Connected, unequal pencil curls; fewer in the lit crown, denser beneath.
  // Their spherical normals are fixed to the antenna and clipped by visibility.
  const tuftVector=p.portraitAntenna?portraitAntennaRotation(p.antenna??0,p.antennaPitch??0):n=>n;
  for(const fiber of tuftFibers){
    const facing=tuftVector(fiber.normal).reduce((sum,v,k)=>sum+v*toward[k],0);
    if(facing<=0)continue;
    const points=fiber.points.map(n=>{const rotated=tuftVector(n);return project(...centre.map((c,k)=>c+radius*rotated[k]));});
    const d='M '+points[0]+' C '+points.slice(1,4).join(' ')+(points.length>4?' C '+points.slice(4).join(' '):'');
    material(d,'#484848',fiber.width,fiber.opacity*clamp(facing/.3,0,1));
  }
  out+=flush();
  return `<g data-felt-head="projected" transform="rotate(${f(p.tilt??0)})">${out}</g>`;
}
export default feltHead;
