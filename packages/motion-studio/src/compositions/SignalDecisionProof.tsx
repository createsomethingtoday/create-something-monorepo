import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

type SignalPhase =
  | 'establish'
  | 'signal'
  | 'decision'
  | 'action'
  | 'proof'
  | 'terminal-hold';

export const SIGNAL_DECISION_PROOF_CONFIG = {
  fps: 24,
  width: 1280,
  height: 720,
  durationInFrames: 480,
  gateX: 735,
} as const;

export interface SignalDecisionProofState {
  phase: SignalPhase;
  signalX: number;
  signalY: number;
  signalScale: number;
  gateOpen: boolean;
  gateTick: boolean;
  receiptProgress: number;
}

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export function getSignalDecisionProofState(frame: number): SignalDecisionProofState {
  // Sample every two delivery frames so the authored motion remains 12 fps.
  const poseFrame = Math.floor(Math.max(0, frame) / 2) * 2;
  const signalX = interpolate(
    poseFrame,
    [48, 144, 240, 360],
    [70, 650, 650, 1050],
    clamp
  );
  const signalY = interpolate(
    poseFrame,
    [48, 144, 240, 360],
    [565, 455, 455, 365],
    clamp
  );
  const signalScale = interpolate(
    poseFrame,
    [48, 144, 240, 360],
    [1, 0.78, 0.78, 0.6],
    clamp
  );
  const receiptProgress = interpolate(poseFrame, [360, 432], [0, 1], clamp);
  const tickFrames = [168, 192, 216];
  const gateTick = tickFrames.some((tick) => poseFrame >= tick && poseFrame < tick + 6);

  let phase: SignalPhase = 'establish';
  if (poseFrame >= 432) phase = 'terminal-hold';
  else if (poseFrame >= 360) phase = 'proof';
  else if (poseFrame >= 240) phase = 'action';
  else if (poseFrame >= 144) phase = 'decision';
  else if (poseFrame >= 48) phase = 'signal';

  return {
    phase,
    signalX,
    signalY,
    signalScale,
    gateOpen: poseFrame >= 240,
    gateTick,
    receiptProgress,
  };
}

const SignalCube: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => {
  const width = 78 * scale;
  const height = 68 * scale;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 78 68"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        overflow: 'visible',
        filter: 'drop-shadow(0 12px 10px rgba(0,0,0,0.42))',
      }}
    >
      <polygon points="8,20 39,4 70,20 39,36" fill="#135cff" />
      <polygon points="8,20 39,36 39,66 8,50" fill="#003ccf" />
      <polygon points="39,36 70,20 70,50 39,66" fill="#002a9f" />
    </svg>
  );
};

const ProofReceipt: React.FC<{ progress: number }> = ({ progress }) => {
  const eased = interpolate(progress, [0, 0.75, 1], [0, 1.03, 1], clamp);
  const y = interpolate(eased, [0, 1], [475, 342], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 1090,
        top: y,
        width: 58,
        height: 86,
        background: 'linear-gradient(145deg, #ffffff 0%, #e8edf0 100%)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.36)',
        opacity: progress === 0 ? 0 : 1,
      }}
    >
      <svg width="58" height="86" viewBox="0 0 58 86">
        <path
          d="M21 36 L29 31 L37 36 L29 41 Z M21 36 L21 45 L29 50 L29 41 M37 36 L37 45 L29 50"
          fill="none"
          stroke="#c3c9ce"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

const OpenGatePatch: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 585,
      top: 205,
      width: 410,
      height: 420,
      overflow: 'hidden',
    }}
  >
    <Img
      src={staticFile('signal-decision-proof/open-gate.png')}
      style={{ position: 'absolute', left: -585, top: -205, width: 1280, height: 720 }}
    />
  </div>
);

export const SignalDecisionProof: React.FC = () => {
  const frame = useCurrentFrame();
  const state = getSignalDecisionProofState(frame);
  const cubePassesBehindGate = frame >= 240 && frame < 318;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020306' }}>
      <Img
        src={staticFile('signal-decision-proof/closed-gate.png')}
        style={{ width: 1280, height: 720 }}
      />

      {cubePassesBehindGate ? (
        <>
          <SignalCube x={state.signalX} y={state.signalY} scale={state.signalScale} />
          {state.gateOpen ? <OpenGatePatch /> : null}
        </>
      ) : (
        <>
          {state.gateOpen ? <OpenGatePatch /> : null}
          <SignalCube x={state.signalX} y={state.signalY} scale={state.signalScale} />
        </>
      )}

      {state.gateTick ? (
        <div
          style={{
            position: 'absolute',
            left: 789,
            top: 280,
            width: 7,
            height: 36,
            background: '#f9f9f9',
            boxShadow: '0 0 12px rgba(249,249,249,0.55)',
          }}
        />
      ) : null}

      <ProofReceipt progress={state.receiptProgress} />
      <Audio src={staticFile('signal-decision-proof/narration.m4a')} />
    </AbsoluteFill>
  );
};
