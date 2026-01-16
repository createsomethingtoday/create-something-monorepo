/**
 * ExplainerVideo - Full video composition
 * 
 * The complete Vox-style explainer: sequences of scenes
 * orchestrated into a cohesive narrative.
 * 
 * @example
 * <ExplainerVideo
 *   scenes={[
 *     { type: 'intro', props: { hook: "What if...?" } },
 *     { type: 'breakdown', props: { concepts: [...] } },
 *     { type: 'data', props: { data: [...] } },
 *   ]}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { ExplainerIntro } from './ExplainerIntro';
import { DataVisualization } from './DataVisualization';
import { ConceptBreakdown } from './ConceptBreakdown';
import { ComparisonScene } from './ComparisonScene';
import { TimelineScene } from './TimelineScene';
import { voxPresets } from '../styles';

// Scene type definitions
type IntroScene = {
  type: 'intro';
  props: React.ComponentProps<typeof ExplainerIntro>;
  durationInFrames: number;
};

type DataScene = {
  type: 'data';
  props: React.ComponentProps<typeof DataVisualization>;
  durationInFrames: number;
};

type BreakdownScene = {
  type: 'breakdown';
  props: React.ComponentProps<typeof ConceptBreakdown>;
  durationInFrames: number;
};

type ComparisonSceneType = {
  type: 'comparison';
  props: React.ComponentProps<typeof ComparisonScene>;
  durationInFrames: number;
};

type TimelineSceneType = {
  type: 'timeline';
  props: React.ComponentProps<typeof TimelineScene>;
  durationInFrames: number;
};

type Scene = IntroScene | DataScene | BreakdownScene | ComparisonSceneType | TimelineSceneType;

interface ExplainerVideoProps {
  /** Sequence of scenes */
  scenes: Scene[];
  
  /** Global theme override */
  theme?: keyof typeof voxPresets;
}

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({
  scenes,
  theme,
}) => {
  let currentFrame = 0;
  
  const renderScene = (scene: Scene, index: number) => {
    const startFrame = currentFrame;
    currentFrame += scene.durationInFrames;
    
    const sceneProps = {
      ...scene.props,
      theme: theme || scene.props.theme,
    };
    
    let SceneComponent: React.ReactNode;
    
    switch (scene.type) {
      case 'intro':
        SceneComponent = <ExplainerIntro {...(sceneProps as React.ComponentProps<typeof ExplainerIntro>)} />;
        break;
      case 'data':
        SceneComponent = <DataVisualization {...(sceneProps as React.ComponentProps<typeof DataVisualization>)} />;
        break;
      case 'breakdown':
        SceneComponent = <ConceptBreakdown {...(sceneProps as React.ComponentProps<typeof ConceptBreakdown>)} />;
        break;
      case 'comparison':
        SceneComponent = <ComparisonScene {...(sceneProps as React.ComponentProps<typeof ComparisonScene>)} />;
        break;
      case 'timeline':
        SceneComponent = <TimelineScene {...(sceneProps as React.ComponentProps<typeof TimelineScene>)} />;
        break;
      default:
        SceneComponent = null;
    }
    
    return (
      <Sequence
        key={index}
        from={startFrame}
        durationInFrames={scene.durationInFrames}
        name={`Scene ${index + 1}: ${scene.type}`}
      >
        {SceneComponent}
      </Sequence>
    );
  };
  
  return <>{scenes.map(renderScene)}</>;
};

/**
 * Calculate total duration from scenes
 */
export function calculateTotalDuration(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
}

/**
 * Create a scene configuration helper
 */
export function createScene<T extends Scene['type']>(
  type: T,
  props: Extract<Scene, { type: T }>['props'],
  durationInFrames: number
): Extract<Scene, { type: T }> {
  return { type, props, durationInFrames } as Extract<Scene, { type: T }>;
}
