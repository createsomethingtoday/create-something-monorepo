/**
 * Remotion Root Component
 * 
 * Entry point for Remotion Studio and rendering.
 * Defines all available compositions.
 */
import React from 'react';
import { Composition } from 'remotion';

// Compositions
import { ExplainerIntro } from './compositions/ExplainerIntro.js';
import { DataVisualization } from './compositions/DataVisualization.js';
import { ConceptBreakdown } from './compositions/ConceptBreakdown.js';
import { ComparisonScene } from './compositions/ComparisonScene.js';
import { TimelineScene } from './compositions/TimelineScene.js';
import { ExplainerVideo, calculateTotalDuration } from './compositions/ExplainerVideo.js';

// Example data
const sampleChartData = [
  { label: 'Implementation (DRY)', value: 85 },
  { label: 'Artifact (Rams)', value: 90 },
  { label: 'System (Heidegger)', value: 75 },
];

const sampleConcepts = [
  { name: 'DRY', description: 'Eliminate duplication', icon: '🔄' },
  { name: 'Rams', description: 'Eliminate excess', icon: '✂️' },
  { name: 'Heidegger', description: 'Eliminate disconnection', icon: '🔗' },
];

const sampleTimeline = [
  { year: '1976', title: 'Dieter Rams', description: '10 Principles of Good Design' },
  { year: '1999', title: 'DRY Principle', description: 'The Pragmatic Programmer' },
  { year: '2024', title: 'Subtractive Triad', description: 'Unified framework' },
];

const sampleScenes = [
  {
    type: 'intro' as const,
    durationInFrames: 120,
    props: {
      hook: 'What if the best code is the code you don\'t write?',
      subtitle: 'The Subtractive Triad',
      highlightWords: ['best', 'code'],
    },
  },
  {
    type: 'breakdown' as const,
    durationInFrames: 180,
    props: {
      title: 'Three Levels of Discipline',
      concepts: sampleConcepts,
      layout: 'horizontal' as const,
      showConnections: true,
    },
  },
  {
    type: 'data' as const,
    durationInFrames: 150,
    props: {
      title: 'Effectiveness by Level',
      chartType: 'bar' as const,
      data: sampleChartData,
      insight: 'Rams\' principle shows highest adoption',
    },
  },
  {
    type: 'timeline' as const,
    durationInFrames: 150,
    props: {
      title: 'The Evolution of Subtractive Design',
      events: sampleTimeline,
      orientation: 'horizontal' as const,
    },
  },
  {
    type: 'intro' as const,
    durationInFrames: 90,
    props: {
      hook: 'Creation is the discipline of removing what obscures.',
      subtitle: 'The Meta-Principle',
      highlightWords: ['discipline', 'removing'],
    },
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Individual scene compositions for testing */}
      <Composition
        id="ExplainerIntro"
        component={ExplainerIntro}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          hook: 'What if the best code is the code you don\'t write?',
          subtitle: 'The Subtractive Triad',
          theme: 'ltd',
          highlightWords: ['best', 'code'],
        }}
      />
      
      <Composition
        id="DataVisualization"
        component={DataVisualization}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Effectiveness by Level',
          chartType: 'horizontal-bar',
          data: sampleChartData,
          theme: 'dark',
          insight: 'Rams\' principle shows highest adoption',
        }}
      />
      
      <Composition
        id="ConceptBreakdown"
        component={ConceptBreakdown}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'The Subtractive Triad',
          concepts: sampleConcepts,
          theme: 'ltd',
          layout: 'horizontal',
          showConnections: true,
        }}
      />
      
      <Composition
        id="ComparisonScene"
        component={ComparisonScene}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Framework Imprisonment vs Freedom',
          left: {
            label: 'Before',
            content: 'Default patterns chosen without examination',
            points: ['Framework assumptions', 'Inherited constraints', 'Tools determine architecture'],
          },
          right: {
            label: 'After',
            content: 'Each pattern independently defensible',
            points: ['Domain logic selects tools', 'Assumptions examined', 'Architecture selects tools'],
          },
          theme: 'dark',
        }}
      />
      
      <Composition
        id="TimelineScene"
        component={TimelineScene}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'The Evolution of Subtractive Design',
          events: sampleTimeline,
          theme: 'ltd',
          orientation: 'horizontal',
        }}
      />
      
      {/* Full explainer video composition */}
      <Composition
        id="SubtractivTriad"
        component={ExplainerVideo}
        durationInFrames={calculateTotalDuration(sampleScenes)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: sampleScenes,
          theme: 'ltd',
        }}
      />
      
      {/* Alternate themes */}
      <Composition
        id="SubtractivTriad-Dark"
        component={ExplainerVideo}
        durationInFrames={calculateTotalDuration(sampleScenes)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: sampleScenes,
          theme: 'dark',
        }}
      />
      
      <Composition
        id="SubtractivTriad-Space"
        component={ExplainerVideo}
        durationInFrames={calculateTotalDuration(sampleScenes)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: sampleScenes,
          theme: 'space',
        }}
      />
    </>
  );
};
