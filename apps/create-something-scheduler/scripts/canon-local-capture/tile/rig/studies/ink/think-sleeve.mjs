import {thinkSleeveKeys,thinkSleeveCreases} from './think-sleeve-keys.mjs';
const sleeveClamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const sleeveRound=n=>Number(n.toFixed(4));
export function thinkSleeve(think,wx,wy){
  const t=sleeveClamp(think),first=t<=.5,u=first?t*2:t*2-1;
  // Share a tangent across the passing drawing. Clamp it at reversals so the
  // elbow keeps its padding while the wrist travels through the half bend.
  function through(a,b,c){
    const incoming=b-a,outgoing=c-b;
    const middle=incoming*outgoing>0?2*incoming*outgoing/(incoming+outgoing):0;
    const start=first?a:b,end=first?b:c;
    const startSlope=first?incoming:middle,endSlope=first?middle:outgoing;
    return start+(end-start)*u*u*(3-2*u)+u*(1-u)*((1-u)*startSlope-u*endSlope);
  }
  const bx=through(42,42.5,34),by=through(56,30.5,8);
  const dx=Number.isFinite(wx)?wx-bx:0,dy=Number.isFinite(wy)?wy-by:0;
  // Local material weights preserve the sewn shoulder while carrying cuff,
  // forearm and elbow along clearance or interrupted-contact corrections.
  const weights=[0,.03,.12,.55,1,1,.62,.2,.06,0];
  const interpolate=(keys,crease=false)=>keys[0].map((segment,i)=>{
    const weight=crease?.32:weights[i];
    return segment.map((value,j)=>{
      const v=through(value,keys[1][i][j],keys[2][i][j]);
      return v+(j===0?dx*weight:j===1?dy*weight:0);
    });
  });
  const render=(segments,closed)=>{
    const point=(s,offset=0)=>`${sleeveRound(s[0]+(offset?s[offset]:0))} ${sleeveRound(s[1]+(offset?s[offset+1]:0))}`;
    let d='M '+point(segments[0]);
    const count=closed?segments.length:segments.length-1;
    for(let i=0;i<count;i++){
      const a=segments[i],b=segments[(i+1)%segments.length];
      d+=' C '+point(a,4)+' '+point(b,2)+' '+point(b);
    }
    return d+(closed?' Z':'');
  };
  return {path:render(interpolate(thinkSleeveKeys),true),crease:render(interpolate(thinkSleeveCreases,true),false)};
}
