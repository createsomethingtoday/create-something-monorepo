import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';

import { SoundCues } from '../shared/audio/SoundCues';
import { WorkflowFilm } from '../workflow-film/WorkflowFilm';
import { WORKFLOW_REEL_SPEC } from '../workflow-reel/spec';
import { WORKFLOW_DAY_REEL_SPEC } from './spec';

export const WorkflowDayReel: React.FC = () => (
  <AbsoluteFill>
    <Audio src={staticFile(WORKFLOW_REEL_SPEC.music.asset)} volume={0.78} />
    <SoundCues
      masterVolume={0.16}
      cues={[
        { frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.signal + 15, sound: 'focus', volume: 0.18 },
        {
          frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.autonomous,
          sound: 'resolve',
          volume: 0.15
        },
        { frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.wait, sound: 'select', volume: 0.16 },
        {
          frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.continue,
          sound: 'success-soft',
          volume: 0.18
        },
        {
          frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.overnight,
          sound: 'whoosh-soft',
          volume: 0.13
        },
        {
          frame: WORKFLOW_DAY_REEL_SPEC.music.hitFrames.proof,
          sound: 'success-chime',
          volume: 0.13
        }
      ]}
    />
    <WorkflowFilm spec={WORKFLOW_DAY_REEL_SPEC} />
  </AbsoluteFill>
);
