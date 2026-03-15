import React from 'react';
import { Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { HUB_ONBOARDING_SPEC } from '../spec';
import { SoundCues, SOUND_LIBRARY, type SoundCue } from '../../shared/audio/SoundCues';

const { scenes } = HUB_ONBOARDING_SPEC;

const HUB_ONBOARDING_CUES: SoundCue[] = [
  { frame: scenes.intro.start, sound: 'whoosh-soft', volume: 0.12 },
  { frame: scenes.intro.start + 78, sound: 'focus', volume: 0.07 },
  { frame: scenes.laneAssignment.start, sound: 'select', volume: 0.08 },
  { frame: scenes.tokenSetup.start, sound: 'tick-soft', volume: 0.08 },
  { frame: scenes.hostConfig.start, sound: 'click-mechanical', volume: 0.08 },
  { frame: scenes.hostConfig.start + 84, sound: 'resolve', volume: 0.09 },
  { frame: scenes.firstAction.start, sound: 'focus', volume: 0.08 },
  { frame: scenes.firstAction.start + 112, sound: 'select', volume: 0.08 },
  { frame: scenes.firstAction.start + 208, sound: 'success-soft', volume: 0.1 },
  { frame: scenes.governance.start, sound: 'whoosh-soft', volume: 0.1 },
  { frame: scenes.governance.start + 110, sound: 'warning-tone', volume: 0.08 },
  { frame: scenes.governance.start + 240, sound: 'dismiss-soft', volume: 0.07 },
  { frame: scenes.reconnect.start, sound: 'warning-tone', volume: 0.1 },
  { frame: scenes.reconnect.start + 120, sound: 'select', volume: 0.08 },
  { frame: scenes.reconnect.start + 248, sound: 'resolve', volume: 0.1 },
  { frame: scenes.reconnect.start + 330, sound: 'success-soft', volume: 0.11 },
  { frame: scenes.close.start, sound: 'whoosh-soft', volume: 0.1 },
  { frame: scenes.close.start + 90, sound: 'success-chime', volume: 0.12 },
];

export const HubOnboardingSoundscape: React.FC<{ masterVolume?: number }> = ({
  masterVolume = 1,
}) => {
  return <SoundCues cues={HUB_ONBOARDING_CUES} masterVolume={masterVolume} />;
};

export const HubOnboardingAmbientBed: React.FC<{ volume?: number }> = ({ volume = 0.026 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeVolume = interpolate(
    frame,
    [0, 90, durationInFrames - 120, durationInFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <Audio src={staticFile(SOUND_LIBRARY['ambient-drone'])} volume={fadeVolume} loop />;
};

export const FullHubOnboardingSoundscape: React.FC<{ masterVolume?: number }> = ({
  masterVolume = 1,
}) => {
  return (
    <>
      <HubOnboardingAmbientBed />
      <HubOnboardingSoundscape masterVolume={masterVolume} />
    </>
  );
};

export default HubOnboardingSoundscape;
