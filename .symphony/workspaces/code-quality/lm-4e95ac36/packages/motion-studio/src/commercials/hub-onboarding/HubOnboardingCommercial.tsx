import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';

import { VoxTreatment } from '../shared/primitives';
import { HUB_ONBOARDING_SPEC } from './spec';
import {
  CloseScene,
  FirstActionScene,
  GovernanceScene,
  HostConfigScene,
  IntroScene,
  LaneAssignmentScene,
  ReconnectScene,
  TokenSetupScene,
} from './scenes';
import { FullHubOnboardingSoundscape } from './audio/HubOnboardingSoundscape';

interface HubOnboardingCommercialProps {
  enableVoiceover?: boolean;
  enableSound?: boolean;
  voiceoverVolume?: number;
  soundVolume?: number;
}

export const HubOnboardingCommercial: React.FC<HubOnboardingCommercialProps> = ({
  enableVoiceover = true,
  enableSound = true,
  voiceoverVolume = 0.92,
  soundVolume = 0.58,
}) => {
  const { colors, scenes, voxTreatment } = HUB_ONBOARDING_SPEC;

  return (
    <VoxTreatment
      posterizeFrameRate={voxTreatment.posterizeFrameRate}
      grainIntensity={voxTreatment.grainIntensity}
      vignetteIntensity={voxTreatment.vignetteIntensity}
      chromaticAberration={voxTreatment.chromaticAberration}
      backgroundTint={voxTreatment.backgroundTint}
    >
      {enableVoiceover ? (
        <Audio src={staticFile('audio/hub-onboarding/voiceover.mp3')} volume={voiceoverVolume} />
      ) : null}

      {enableSound ? <FullHubOnboardingSoundscape masterVolume={soundVolume} /> : null}

      <AbsoluteFill style={{ backgroundColor: colors.bgBase }} />

      <Sequence from={scenes.intro.start} durationInFrames={scenes.intro.duration} name="Intro">
        <IntroScene />
      </Sequence>

      <Sequence
        from={scenes.laneAssignment.start}
        durationInFrames={scenes.laneAssignment.duration}
        name="LaneAssignment"
      >
        <LaneAssignmentScene />
      </Sequence>

      <Sequence
        from={scenes.tokenSetup.start}
        durationInFrames={scenes.tokenSetup.duration}
        name="TokenSetup"
      >
        <TokenSetupScene />
      </Sequence>

      <Sequence
        from={scenes.hostConfig.start}
        durationInFrames={scenes.hostConfig.duration}
        name="HostConfig"
      >
        <HostConfigScene />
      </Sequence>

      <Sequence
        from={scenes.firstAction.start}
        durationInFrames={scenes.firstAction.duration}
        name="FirstAction"
      >
        <FirstActionScene />
      </Sequence>

      <Sequence
        from={scenes.governance.start}
        durationInFrames={scenes.governance.duration}
        name="Governance"
      >
        <GovernanceScene />
      </Sequence>

      <Sequence
        from={scenes.reconnect.start}
        durationInFrames={scenes.reconnect.duration}
        name="Reconnect"
      >
        <ReconnectScene />
      </Sequence>

      <Sequence from={scenes.close.start} durationInFrames={scenes.close.duration} name="Close">
        <CloseScene />
      </Sequence>
    </VoxTreatment>
  );
};

export const HUB_ONBOARDING_CONFIG = {
  id: 'HubOnboardingCommercial',
  component: HubOnboardingCommercial,
  durationInFrames: HUB_ONBOARDING_SPEC.durationInFrames,
  fps: HUB_ONBOARDING_SPEC.fps,
  width: HUB_ONBOARDING_SPEC.width,
  height: HUB_ONBOARDING_SPEC.height,
  defaultProps: {
    enableVoiceover: true,
    enableSound: true,
    voiceoverVolume: 0.92,
    soundVolume: 0.58,
  },
};

export default HubOnboardingCommercial;
