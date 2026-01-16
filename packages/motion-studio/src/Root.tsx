/**
 * Remotion Root Component
 * 
 * Entry point for Remotion Studio and rendering.
 * Defines all available compositions.
 * 
 * Uses Lucide icons for iconography (no emojis)
 * Monochrome palette - typography and motion only
 */
import React from 'react';
import { Composition, registerRoot, AbsoluteFill, Sequence } from 'remotion';
import { RefreshCw, Scissors, Link } from 'lucide-react';

// Compositions
import { ExplainerIntro } from './compositions/ExplainerIntro';
import { DataVisualization } from './compositions/DataVisualization';
import { ConceptBreakdown } from './compositions/ConceptBreakdown';
import { ComparisonScene } from './compositions/ComparisonScene';
import { TimelineScene } from './compositions/TimelineScene';
import { ExplainerVideo, calculateTotalDuration } from './compositions/ExplainerVideo';

// Primitives
import { KineticText } from './primitives/KineticText';
import { voxPresets, typography, colors } from './styles';

// Example data
const sampleChartData = [
  { label: 'Implementation (DRY)', value: 85 },
  { label: 'Artifact (Rams)', value: 90 },
  { label: 'System (Heidegger)', value: 75 },
];

const sampleConcepts = [
  { name: 'DRY', description: 'Eliminate duplication', iconName: 'RefreshCw' },
  { name: 'Rams', description: 'Eliminate excess', iconName: 'Scissors' },
  { name: 'Heidegger', description: 'Eliminate disconnection', iconName: 'Link' },
];

const sampleTimeline = [
  { year: '1976', title: 'Dieter Rams', description: '10 Principles of Good Design' },
  { year: '1999', title: 'DRY Principle', description: 'The Pragmatic Programmer' },
  { year: '2024', title: 'Subtractive Triad', description: 'Unified framework' },
];

/**
 * Canon-Style Text Reveal Demo
 * Showcases the subtractive philosophy text reveals
 */
const CanonTextReveals: React.FC = () => {
  const palette = voxPresets.ltd;
  const revealDuration = 90; // 3 seconds each at 30fps
  
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      {/* Title */}
      <Sequence from={0} durationInFrames={30}>
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.caption,
          color: palette.muted,
          letterSpacing: typography.letterSpacing.wider,
          textTransform: 'uppercase',
        }}>
          Canon-Style Text Reveals
        </div>
      </Sequence>
      
      {/* 1. UNCONCEALMENT - Heidegger */}
      <Sequence from={30} durationInFrames={revealDuration}>
        <div style={{
          position: 'absolute',
          top: 150,
          left: 100,
          width: 800,
        }}>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.caption,
            color: palette.muted,
            marginBottom: 16,
            letterSpacing: typography.letterSpacing.wide,
          }}>
            UNCONCEALMENT (Heidegger)
          </div>
          <KineticText
            text="Truth emerges from what conceals it."
            reveal="unconcealment"
            startFrame={0}
            duration={revealDuration - 20}
            style="subhead"
            color={palette.foreground}
          />
        </div>
      </Sequence>
      
      {/* 2. TYPEWRITER - Terminal-first */}
      <Sequence from={30} durationInFrames={revealDuration}>
        <div style={{
          position: 'absolute',
          top: 150,
          right: 100,
          width: 800,
          textAlign: 'right',
        }}>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.caption,
            color: palette.muted,
            marginBottom: 16,
            letterSpacing: typography.letterSpacing.wide,
          }}>
            TYPEWRITER (Terminal-first)
          </div>
          <KineticText
            text="$ echo 'less, but better'"
            reveal="typewriter"
            startFrame={0}
            duration={revealDuration - 20}
            style="subhead"
            color={palette.foreground}
            align="right"
          />
        </div>
      </Sequence>
      
      {/* 3. THRESHOLD - Rams */}
      <Sequence from={120} durationInFrames={revealDuration}>
        <div style={{
          position: 'absolute',
          top: 400,
          left: 100,
          width: 800,
        }}>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.caption,
            color: palette.muted,
            marginBottom: 16,
            letterSpacing: typography.letterSpacing.wide,
          }}>
            THRESHOLD (Rams - Binary)
          </div>
          <KineticText
            text="Present or absent. Nothing between."
            reveal="threshold"
            startFrame={0}
            duration={60}
            style="subhead"
            color={palette.foreground}
          />
        </div>
      </Sequence>
      
      {/* 4. DECODE - Cipher */}
      <Sequence from={120} durationInFrames={revealDuration}>
        <div style={{
          position: 'absolute',
          top: 400,
          right: 100,
          width: 800,
          textAlign: 'right',
        }}>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.caption,
            color: palette.muted,
            marginBottom: 16,
            letterSpacing: typography.letterSpacing.wide,
          }}>
            DECODE (Meaning was always there)
          </div>
          <KineticText
            text="CREATION IS SUBTRACTION"
            reveal="decode"
            startFrame={0}
            duration={revealDuration - 10}
            style="subhead"
            color={palette.foreground}
            align="right"
          />
        </div>
      </Sequence>
      
      {/* 5. MASK - Wipe reveal */}
      <Sequence from={210} durationInFrames={revealDuration}>
        <div style={{
          position: 'absolute',
          top: 650,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{ width: 1200 }}>
            <div style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.fontSize.caption,
              color: palette.muted,
              marginBottom: 16,
              letterSpacing: typography.letterSpacing.wide,
              textAlign: 'center',
            }}>
              MASK (The text was always there)
            </div>
            <KineticText
              text="Weniger, aber besser."
              reveal="mask"
              startFrame={0}
              duration={revealDuration - 20}
              style="headline"
              color={palette.foreground}
              align="center"
            />
          </div>
        </div>
      </Sequence>
      
      {/* Vs Vox comparison label */}
      <Sequence from={300} durationInFrames={90}>
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.caption,
            color: palette.muted,
            marginBottom: 16,
            letterSpacing: typography.letterSpacing.wide,
          }}>
            VOX STYLE (For comparison)
          </div>
          <KineticText
            text="Words pop in with spring physics."
            reveal="word-by-word"
            startFrame={0}
            duration={60}
            style="body"
            color={palette.muted}
            align="center"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

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
      {/* ========================================
          CANON-STYLE TEXT REVEALS
          Subtractive philosophy animations
          ======================================== */}
      <Composition
        id="CanonTextReveals"
        component={CanonTextReveals}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
      />
      
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

// Register the root component with Remotion
registerRoot(RemotionRoot);
