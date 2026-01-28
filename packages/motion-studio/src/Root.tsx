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
import { ToolReceding } from './compositions/lessons/ToolReceding';
import { IDEvsTerminal } from './compositions/lessons/IDEvsTerminal';
import { TufteMorph, TUFTE_MORPH_CONFIG } from './compositions/TufteMorph';

// Commercials (v1 - slide deck style)
import { SeeingCommercial as SeeingCommercialV1, SEEING_COMMERCIAL_DURATION } from './compositions/commercials/SeeingCommercial';

// Commercials (v2 - Vox kinetic typography)
import { 
  SeeingCommercial, 
  SEEING_COMMERCIAL_CONFIG, 
  GroundCommercial, 
  GROUND_COMMERCIAL_CONFIG,
  GitHubHistoryCommercial,
  GITHUB_HISTORY_COMMERCIAL_CONFIG,
  OuterfieldsCommercial,
  OUTERFIELDS_COMMERCIAL_CONFIG,
  TendCommercial,
  TEND_COMMERCIAL_CONFIG,
  TendWalkthroughCommercial,
  TEND_WALKTHROUGH_CONFIG,
  TufteMobileCommercial,
  TUFTE_MOBILE_CONFIG,
} from './commercials';

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
 * 
 * One reveal at a time, centered. Focus and clarity.
 * Each reveal demonstrates a different philosophical approach.
 */
const CanonTextReveals: React.FC = () => {
  const palette = voxPresets.ltd;
  const sceneDuration = 90; // 3 seconds each at 30fps
  const holdDuration = 30; // 1 second hold after reveal
  const totalPerScene = sceneDuration + holdDuration;
  
  // Centered container style
  const centeredContainer: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
  };
  
  // Label style
  const labelStyle: React.CSSProperties = {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.caption,
    color: palette.muted,
    marginBottom: 24,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: palette.background }}>
      
      {/* 1. UNCONCEALMENT - Heidegger */}
      <Sequence from={0} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            01 — UNCONCEALMENT
          </div>
          <KineticText
            text="Truth emerges from what conceals it."
            reveal="unconcealment"
            startFrame={0}
            duration={sceneDuration}
            style="headline"
            color={palette.foreground}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            Heidegger — The meaning was always there
          </div>
        </div>
      </Sequence>
      
      {/* 2. TYPEWRITER - Terminal-first */}
      <Sequence from={totalPerScene} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            02 — TYPEWRITER
          </div>
          <KineticText
            text="$ echo 'less, but better'"
            reveal="typewriter"
            startFrame={0}
            duration={sceneDuration}
            style="headline"
            color={palette.foreground}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            Terminal-first — Meditative, deliberate
          </div>
        </div>
      </Sequence>
      
      {/* 3. THRESHOLD - Rams */}
      <Sequence from={totalPerScene * 2} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            03 — THRESHOLD
          </div>
          <KineticText
            text="Present or absent."
            reveal="threshold"
            startFrame={0}
            duration={sceneDuration / 2}
            style="headline"
            color={palette.foreground}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            Rams — Binary. No animation. Just presence.
          </div>
        </div>
      </Sequence>
      
      {/* 4. DECODE - Cipher */}
      <Sequence from={totalPerScene * 3} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            04 — DECODE
          </div>
          <KineticText
            text="CREATION IS SUBTRACTION"
            reveal="decode"
            startFrame={0}
            duration={sceneDuration}
            style="headline"
            color={palette.foreground}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            Cipher resolves — The signal emerges from noise
          </div>
        </div>
      </Sequence>
      
      {/* 5. MASK - Wipe reveal (faster - 45 frames / 1.5s) */}
      <Sequence from={totalPerScene * 4} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            05 — MASK
          </div>
          <KineticText
            text="Weniger, aber besser."
            reveal="mask"
            startFrame={0}
            duration={45}
            style="display"
            color={palette.foreground}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            The text was always there — We just unveiled it
          </div>
        </div>
      </Sequence>
      
      {/* 6. VOX STYLE - For comparison */}
      <Sequence from={totalPerScene * 5} durationInFrames={totalPerScene}>
        <div style={centeredContainer}>
          <div style={labelStyle}>
            COMPARISON — VOX STYLE
          </div>
          <KineticText
            text="Words pop in with spring physics."
            reveal="word-by-word"
            startFrame={0}
            duration={60}
            style="headline"
            color={palette.muted}
            align="center"
          />
          <div style={{
            ...labelStyle,
            marginTop: 40,
            marginBottom: 0,
            fontSize: '0.7rem',
          }}>
            Motion-forward — Each word earns its entrance
          </div>
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
          COMMERCIALS (V2 - Vox Kinetic Typography)
          Motion transitions, cutting on twos, analog texture
          ======================================== */}
      <Composition
        id="SeeingCommercial"
        component={SeeingCommercial}
        durationInFrames={SEEING_COMMERCIAL_CONFIG.durationInFrames}
        fps={SEEING_COMMERCIAL_CONFIG.fps}
        width={SEEING_COMMERCIAL_CONFIG.width}
        height={SEEING_COMMERCIAL_CONFIG.height}
      />
      
      {/* Ground MCP Commercial - "No hallucination. Just evidence." */}
      <Composition
        id="GroundCommercial"
        component={GroundCommercial}
        durationInFrames={GROUND_COMMERCIAL_CONFIG.durationInFrames}
        fps={GROUND_COMMERCIAL_CONFIG.fps}
        width={GROUND_COMMERCIAL_CONFIG.width}
        height={GROUND_COMMERCIAL_CONFIG.height}
        defaultProps={GROUND_COMMERCIAL_CONFIG.defaultProps}
      />
      
      {/* GitHub History Commercial - Contribution heatmap visualization */}
      <Composition
        id="GitHubHistoryCommercial"
        component={GitHubHistoryCommercial}
        durationInFrames={GITHUB_HISTORY_COMMERCIAL_CONFIG.durationInFrames}
        fps={GITHUB_HISTORY_COMMERCIAL_CONFIG.fps}
        width={GITHUB_HISTORY_COMMERCIAL_CONFIG.width}
        height={GITHUB_HISTORY_COMMERCIAL_CONFIG.height}
        defaultProps={{
          ...GITHUB_HISTORY_COMMERCIAL_CONFIG.defaultProps,
          username: 'createsomethingtoday',
          githubToken: '', // Set via Remotion input props if needed
        }}
      />
      
      {/* Outerfields Commercial - "Show Don't Tell" PCN platform showcase */}
      <Composition
        id="OuterfieldsCommercial"
        component={OuterfieldsCommercial}
        durationInFrames={OUTERFIELDS_COMMERCIAL_CONFIG.durationInFrames}
        fps={OUTERFIELDS_COMMERCIAL_CONFIG.fps}
        width={OUTERFIELDS_COMMERCIAL_CONFIG.width}
        height={OUTERFIELDS_COMMERCIAL_CONFIG.height}
      />
      
      {/* TEND Commercial - "Tend to what matters." Database for dental practices */}
      <Composition
        id="TendCommercial"
        component={TendCommercial}
        durationInFrames={TEND_COMMERCIAL_CONFIG.durationInFrames}
        fps={TEND_COMMERCIAL_CONFIG.fps}
        width={TEND_COMMERCIAL_CONFIG.width}
        height={TEND_COMMERCIAL_CONFIG.height}
        defaultProps={TEND_COMMERCIAL_CONFIG.defaultProps}
      />
      
      {/* TEND Walkthrough - Component-by-component explainer with voiceover */}
      <Composition
        id="TendWalkthrough"
        component={TendWalkthroughCommercial}
        durationInFrames={TEND_WALKTHROUGH_CONFIG.durationInFrames}
        fps={TEND_WALKTHROUGH_CONFIG.fps}
        width={TEND_WALKTHROUGH_CONFIG.width}
        height={TEND_WALKTHROUGH_CONFIG.height}
        defaultProps={TEND_WALKTHROUGH_CONFIG.defaultProps}
      />
      
      {/* Tufte Mobile - Wireframe → Desktop → Mobile transformation */}
      <Composition
        id="TufteMobileCommercial"
        component={TufteMobileCommercial}
        durationInFrames={TUFTE_MOBILE_CONFIG.durationInFrames}
        fps={TUFTE_MOBILE_CONFIG.fps}
        width={TUFTE_MOBILE_CONFIG.width}
        height={TUFTE_MOBILE_CONFIG.height}
      />
      
      {/* ========================================
          COMMERCIALS (V1 - Legacy slide deck style)
          Kept for comparison
          ======================================== */}
      <Composition
        id="SeeingCommercial-V1"
        component={SeeingCommercialV1}
        durationInFrames={SEEING_COMMERCIAL_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          theme: 'ltd',
        }}
      />
      
      {/* ========================================
          CANON-STYLE TEXT REVEALS
          Subtractive philosophy animations
          One at a time, centered, focused.
          ======================================== */}
      <Composition
        id="CanonTextReveals"
        component={CanonTextReveals}
        durationInFrames={720} // 6 scenes × 120 frames (90 reveal + 30 hold)
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
      
      {/* ========================================
          LESSON COMPOSITIONS
          Teaching animations for interactive lessons
          ======================================== */}
      <Composition
        id="ToolReceding"
        component={ToolReceding}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          theme: 'ltd',
        }}
      />
      
      <Composition
        id="IDEvsTerminal"
        component={IDEvsTerminal}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          theme: 'ltd',
        }}
      />
      
      {/* Tufte Morph - Single card desktop→mobile transformation */}
      <Composition
        id="TufteMorph"
        component={TufteMorph}
        durationInFrames={TUFTE_MORPH_CONFIG.durationInFrames}
        fps={TUFTE_MORPH_CONFIG.fps}
        width={TUFTE_MORPH_CONFIG.width}
        height={TUFTE_MORPH_CONFIG.height}
      />
    </>
  );
};

// Register the root component with Remotion
registerRoot(RemotionRoot);
