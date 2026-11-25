import { sampleMotion } from './rig/studies/ink/motion-library.mjs';
import { attentionExpressions } from './rig/studies/ink/expression-attention.mjs';

const listen = attentionExpressions.find(entry => entry[0] === 'listenClosely');
const labels = {
  waiting: ['Waiting to take notes', 'Start only after everyone agrees.'],
  taking: ['Taking notes', 'Meeting audio is being saved on this device.'],
  stopped: ['Notes stopped', 'Meeting audio is no longer being captured.'],
  saving: ['Saving audio', 'Finishing the local audio file.'],
  failed: ['Capture interrupted', 'Check the audio controls before continuing.'],
  disconnected: ['Controls disconnected', 'Capture status is unknown. Check the audio controls.']
};
const aliases = { idle: 'waiting', preparing: 'waiting', recording: 'taking' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const character = document.querySelector('#character');
let state = null;
let started = performance.now();
let previousPose = {};
let lastPose = {};

export function setTileState(next) {
  const mapped = aliases[next] ?? next;
  if (!Object.hasOwn(labels, mapped)) return false;
  if (state === mapped) return true;
  previousPose = { ...lastPose };
  state = mapped;
  started = performance.now();
  document.body.dataset.state = state;
  document.querySelector('#status').textContent = labels[state][0];
  document.querySelector('#detail').textContent = labels[state][1];
  character.setAttribute('aria-label', state === 'taking' ? 'Canon, listening closely' : 'Canon, at rest');
  renderAt(0);
  return true;
}

function renderAt(seconds) {
  const time = reduced.matches ? (state === 'taking' ? listen[3] : 0) : Math.max(0, Number(seconds) || 0);
  // Notice runs once. Listening acquires and holds the approved expression;
  // it does not imply speech or agreement with the people in the meeting.
  const pose = sampleMotion('notice', state === 'waiting' ? Math.min(time, 3.4) : 0);
  if (state === 'taking') {
    const progress = Math.min(1, time / listen[3]);
    const weight = progress * progress * (3 - 2 * progress);
    for (const [key, value] of Object.entries(listen[6])) {
      pose[key] = (pose[key] ?? 0) + (value - (pose[key] ?? 0)) * weight;
    }
    // A small preparatory dip leads the held listening tilt.
    const glance = Math.sin(Math.PI * Math.min(1, time / .8));
    pose.pitch = (3 + 3 * glance) * weight;
    pose.gazeY = (.55 + .45 * glance) * weight;
    pose.mouthOpen = 0;
  }
  if (!reduced.matches) {
    pose.neckPitch = (pose.neckPitch ?? 0) + .35 * Math.sin(time * Math.PI / 5);
    pose.blink = time % 9 > 8.7 ? .8 * Math.sin((time % 9 - 8.7) / .3 * Math.PI) : 0;
  }
  const arrival = reduced.matches ? 1 : Math.min(1, time / .85);
  const ease = arrival * arrival * arrival * (10 + arrival * (-15 + 6 * arrival));
  for (const key of ['yaw', 'pitch', 'tilt', 'neckPitch', 'gaze', 'gazeY']) {
    pose[key] = (previousPose[key] ?? 0) + ((pose[key] ?? 0) - (previousPose[key] ?? 0)) * ease;
  }
  lastPose = { ...pose };
  renderPortrait(pose);
}

function renderPortrait(pose) {
  // The approved prior meeting avatar is the material itself, unchanged.
  // Small affine changes approximate its rig's 2D pose; no invented side view.
  const yaw = pose.yaw ?? 0;
  const pitch = (pose.pitch ?? 0) + (pose.neckPitch ?? 0);
  const tilt = pose.tilt ?? 0;
  const scaleX = 1 - Math.abs(yaw) * .0016;
  const scaleY = 1 - Math.abs(pitch) * .001;
  const blink = Math.max(0, Math.min(1, (pose.blink ?? 0) / .8));
  const cover = blink * 67;
  const portrait = 'art/canon-meeting-portrait.png';
  const gazeX = Math.max(-2, Math.min(2, (pose.gaze ?? 0) * 2));
  const gazeY = Math.max(-2.5, Math.min(2.5, (pose.gazeY ?? 0) * 2.5));
  character.innerHTML = `
    <defs>
      <pattern id="cloth" width="24" height="24" patternUnits="userSpaceOnUse" viewBox="180 270 24 24">
        <image href="${portrait}" width="512" height="512"/>
      </pattern>
      <pattern id="cream" width="8" height="8" patternUnits="userSpaceOnUse" viewBox="121 300 8 8">
        <image href="${portrait}" width="512" height="512"/>
      </pattern>
      <clipPath id="pupils"><rect x="132" y="297" width="20" height="42"/><rect x="262" y="299" width="21" height="43"/></clipPath>
      <clipPath id="eyes"><rect x="106" y="249" width="65" height="132" rx="32"/><rect x="237" y="249" width="70" height="132" rx="35"/></clipPath>
    </defs>
    <g transform="translate(256 ${300 + pitch * .65}) rotate(${tilt}) skewY(${yaw * .025}) scale(${scaleX} ${scaleY}) translate(-256 -300)">
      <image href="${portrait}" width="512" height="512"/>
      <g fill="url(#cream)"><rect x="132" y="297" width="20" height="42"/><rect x="262" y="299" width="21" height="43"/></g>
      <g transform="translate(${gazeX} ${gazeY})"><g clip-path="url(#pupils)"><image href="${portrait}" width="512" height="512"/></g></g>
      <g clip-path="url(#eyes)" fill="url(#cloth)">
        <rect x="104" y="248" width="205" height="${cover}"/>
        <rect x="104" y="${382 - cover}" width="205" height="${cover}"/>
      </g>
      <path d="M 119 313 Q 139 320 157 313 M 250 314 Q 270 321 291 314" fill="none" stroke="url(#cream)" stroke-width="2.2" stroke-linecap="round" opacity="${blink}"/>
    </g>`;
}

setTileState('waiting');
let previous = -1;
function tick(now) {
  if (now - previous > 83) {
    renderAt(reduced.matches ? 0 : (now - started) / 1000);
    previous = now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
