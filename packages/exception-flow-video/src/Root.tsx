import React from 'react';
import { Composition } from 'remotion';
import { ExceptionFlow } from './ExceptionFlow';
import { FPS, TOTAL_SECONDS } from './flow';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ExceptionFlow"
    component={ExceptionFlow}
    durationInFrames={TOTAL_SECONDS * FPS}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
