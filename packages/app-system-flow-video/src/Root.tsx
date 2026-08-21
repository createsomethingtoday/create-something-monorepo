import React from 'react';
import { Composition } from 'remotion';
import { AppSystemFlow } from './AppSystemFlow';
import { FPS, TOTAL_SECONDS } from './flow';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AppSystemFlow"
    component={AppSystemFlow}
    durationInFrames={TOTAL_SECONDS * FPS}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
