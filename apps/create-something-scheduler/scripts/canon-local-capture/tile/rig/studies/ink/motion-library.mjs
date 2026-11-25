// Deterministic, continuous performances. Times are seconds, never accumulated frames.
import {pose, duration} from './performance.mjs';

export const motions = Object.freeze({
  wave: {label: 'Wave', duration},
  think: {label: 'Think', duration: 4.4},
  agree: {label: 'Agree', duration: 3.2},
  notice: {label: 'Notice', duration: 3.4}
});
const extras = {farEyeReveal: 0, tuckOffset: 0, wristClearance: 0, palmTurn: 0, mouthPress: 0, eyeAsymmetry: 0, smileCorner: 0, supportLoad: 0, toeRoll: 0, antennaPitch: 0, chinLoad: 0, tx: 0, ty: 0, handX: 0, handY: 0, handAngle: 0, blink: 0, indexPoint: 0, feet: 0, faceY: 0, yaw: 0, pitch: 0, stepLift: 0, counterSwing: 0, armsBack: 0, gazeY: 0, mouthRound: 0};
const rest = {...pose(0), ...extras};
const ramp = (t, a, b) => {
  const x = Math.max(0, Math.min(1, (t-a)/(b-a)));
  return x*x*x*(10+x*(6*x-15));
};
const beat = (t, a, b, c, d) => ramp(t,a,b)*(1-ramp(t,c,d));

function sampleActing(id, time) {
  if (!Object.hasOwn(motions,id)) throw new RangeError(`Unknown motion: ${id}`);
  if (!Number.isFinite(time)) throw new TypeError('Motion time must be finite');
  const t = Math.max(0, Math.min(motions[id].duration,time));
  if (id === 'wave') {
    const acting=pose(t);
    return {...acting, ...extras, yaw:19*(acting.turn-rest.turn)};
  }
  const p = {...rest};
  if (id === 'think') {
    const think = beat(t,.25,1.05,2.9,3.8);
    const handSupport = beat(t,.25,1.05,2.9,4.01);
    // Eyes find an off-up target first. The head follows on a shallow arc;
    // finding the audience reverses that horizontal intent before the smile.
    const search = beat(t,1.29,1.43,2.15,2.32);
    const refocus = beat(t,2.19,2.36,3.03,3.55);
    const headSearch = beat(t,1.43,1.64,2.30,2.70);
    const headRefocus = beat(t,2.30,2.70,3.03,3.65);
    const passing = beat(t,2.31,2.42,2.44,2.63);
    const wristClearance = beat(t,2.82,3.12,3.16,3.57);
    const palmRelease = beat(t,2.72,3.04,3.15,3.66);
    const straighten = beat(t,2.32,2.82,3.0,3.65);
    const idea = beat(t,2.64,2.87,3.0,3.65);
    Object.assign(p, {
      elbow:.63*handSupport, wrist:.48*handSupport, open:.08*think, wristClearance, palmTurn:palmRelease ? -.83*palmRelease : 0,
      handX:-50*think, handY:46*think, handAngle:-105*think,
      yaw:12*think+7*headSearch-15*headRefocus,
      pitch:-4.5*headSearch+1.5*headRefocus+2*passing,
      chinLoad:beat(t,.94,1.38,2.42,2.74), indexPoint:handSupport*(1-.28*ramp(t,2.6,2.97)), gazeY:-.78*beat(t,.13,.45,2.9,3.8)+.87*refocus,
      gaze:-.5*think+1.47*search+.6*refocus,
      mouthPress:.94*beat(t,.74,1.1,2.38,2.65),
      eyeAsymmetry:.62*beat(t,.83,1.18,2.21,2.47),smileCorner:.95*beat(t,2.64,2.87,3.1,3.65),
      tilt:-8*think+12*straighten, smile:.18-.1*think+.55*idea,
      blink:.27*think-.16*idea, antenna:-7*think+18*idea,
      squash:.12*think-.16*idea, ty:-2*idea
    });
  } else if (id === 'agree') {
    const firstNod=time=>beat(time,.31,.62,.7,1.06);
    const secondNod=time=>beat(time,1.01,1.27,1.32,1.68);
    const first=firstNod(t),second=secondNod(t);
    const nod=21*first+13*second;
    const delayedNod=21*firstNod(t-.105)+13*secondNod(t-.105);
    const gather=beat(t,.12,.27,.31,.46);
    const rebound=beat(t,.79,.99,1.01,1.18);
    const eyelids=.58*beat(t,.21,.49,.60,.87)+.24*beat(t,1.00,1.22,1.3,1.50);
    const settle = beat(t,2.05,2.24,2.4,2.85);
    const engagement = beat(t,.15,.4,2.3,2.95);
    // The far wrist leads the tuck, then comes back into view a little earlier.
    const leftTuck = beat(t,.11,.49,2.30,2.91);
    const rightTuck = beat(t,.19,.60,2.39,3.00);
    // Acquire the other speaker before yielding into the nod. The lids reveal
    // the same target on recovery and keep it through the smaller assent.
    const attention = beat(t,.08,.22,2.3,2.95);
    const acknowledgement = beat(t,.66,1.02,2.3,2.95);
    const secondAssent = beat(t,1.32,1.64,2.3,2.95);
    const listeningMouth = beat(t,.08,.24,.66,.99);
    const cheekLift = beat(t,.74,1.09,2.25,2.88);
    Object.assign(p, {
      armsBack:(leftTuck+rightTuck)/2, tuckOffset:(leftTuck-rightTuck)/2, tilt:2.6*first-1.3*second, yaw:6*engagement+2*first, pitch:nod-4.5*rebound-3.2*gather-2*settle, faceY:2*first+second-.5*settle,
      squash:.2*first+.12*second-.04*settle,
      blink:eyelids, gaze:.86*attention, gazeY:-.12*attention+.10*first+.05*second,
      mouthPress:.94*listeningMouth, smileCorner:.78*cheekLift,
      smile:.18+.28*acknowledgement+.06*secondAssent, antenna:-4*first-2*second+2*settle, antennaPitch:1.25*(delayedNod-nod),
      handAngle:3*first+5*second, handY:2*first+3*second
    });
  } else {
    const eyes = beat(t,.18,.38,1.9,2.8);
    const head = beat(t,.42,.78,1.02,1.30);
    // A low passing pose gives the turn an arc. The shell arrives before
    // the flexible tip, which bends back, catches up and gently recoils.
    const passing = beat(t,.40,.55,.58,.76);
    const arrival = beat(t,.60,.73,.76,.97);
    const tipDrag = beat(t,.43,.57,.61,.78);
    const tipCatch = beat(t,.62,.82,.88,1.07);
    const tipReturn = beat(t,1.05,1.22,1.28,1.55);
    // The eyes travel while the shell is still facing the first target.
    // Remove that first fixation as the second arrives so it cannot rebound.
    const squint=beat(t,.82,.9,.96,1.06);
    const firstFixation=eyes*(1-ramp(t,.96,1.065));
    const check=beat(t,.96,1.065,1.66,2.19);
    const second = beat(t,1.05,1.25,1.4,1.75);
    // Let the stance knee straighten slightly at the crest, then yield again
    // as the returning foot approaches the floor.
    const stance = beat(t,.24,.56,1.17,1.52);
    const rebound = beat(t,.56,.84,.91,1.17);
    Object.assign(p, {
      mouthRound:.94*head, gazeY:-.8*firstFixation+.35*check, supportLoad:stance*(1-.20*rebound),
      toeRoll:8*beat(t,.31,.47,.54,.72)+5*beat(t,.90,1.045,1.09,1.34),
      // Interrupt the step low. The boot meets the floor as the eyes find the second target.
      stepLift:.53*beat(t,.43,.68,.8,1.065),
      counterSwing:.44*beat(t,.46,.79,.87,1.28),
      gaze:(.8+.18*squint)*firstFixation-.23*check, tilt:3*head-4*second+4*passing-2*arrival, yaw:28*head+5*arrival-12*second,
      pitch:9*passing-3*arrival, squash:.39*passing-.19*arrival,
      handX:4*head-6*second+3*arrival, handAngle:-6*head+8*second+11*passing,
      // The mitten opens into the look after the head has begun to turn.
      palmTurn:.95*beat(t,.51,.81,.96,1.35),
      open:.22*arrival, roll:.28*arrival,
      turn:-.22+.2*head-.28*second,
      faceY:-2*head, blink:.29*squint, eyeAsymmetry:.86*squint, farEyeReveal:squint,
      antenna:-21*tipDrag+19*tipCatch+10*tipReturn-4*beat(t,1.32,1.48,1.51,1.72),
      smile:.18+.22*beat(t,1.6,1.95,2.2,2.95)
    });
  }
  return p;
}

// The light pencil pass follows the solid by two exposure samples. Relative
// travel naturally vanishes once the drawing settles. No playback history is kept.
export function sampleMotion(id,time) {
  const p=sampleActing(id,time);
  const prior=sampleActing(id,time-1/16);
  // Expose the secondary pencil drawing on twos at a 24 fps film cadence.
  // Its shape follows the held pose, so a still character keeps a still line.
  const drawing=sampleActing(id,Math.floor(Math.max(0,time)*12)/12);
  p.redrawPhase=(drawing.yaw*.07+drawing.pitch*.09+drawing.wrist*1.2+drawing.swing*.5);
  p.pencilDragX=2.4*Math.tanh((prior.yaw-p.yaw)*.13+(prior.swing-p.swing)*1.1);
  p.pencilDragY=2*Math.tanh((prior.pitch-p.pitch)*.12+(prior.wrist-p.wrist)*2);
  return p;
}
