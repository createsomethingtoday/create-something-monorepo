/**
 * DataVisualization - Chart-focused scene
 * 
 * Data that tells a story. Charts build incrementally
 * to support the narration rhythm.
 * 
 * @example
 * <DataVisualization
 *   title="AI Adoption Across Industries"
 *   chartType="horizontal-bar"
 *   data={adoptionData}
 *   insight="Healthcare leads with 78% adoption"
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
} from 'remotion';
import { KineticText } from '../primitives/KineticText';
import { AnimatedChart } from '../primitives/AnimatedChart';
import { FadeIn } from '../primitives/FadeIn';
import { SlideIn } from '../primitives/SlideIn';
import { FilmGrain, Vignette } from '../primitives/FilmGrain';
import { colors, typography, animation, voxPresets, spacing } from '../styles';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DataVisualizationProps {
  /** Scene title */
  title: string;
  
  /** Chart type */
  chartType: 'bar' | 'horizontal-bar' | 'pie' | 'line';
  
  /** Chart data */
  data: DataPoint[];
  
  /** Key insight text (appears after chart) */
  insight?: string;
  
  /** Property theme */
  theme?: keyof typeof voxPresets;
  
  /** Chart build style */
  buildStyle?: 'bar-by-bar' | 'all-at-once' | 'draw' | 'reveal' | 'grow';
  
  /** Show texture effects */
  showEffects?: boolean;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  title,
  chartType,
  data,
  insight,
  theme = 'dark',
  buildStyle = 'bar-by-bar',
  showEffects = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  
  const palette = voxPresets[theme];
  
  // Timing
  const titleStart = 5;
  const chartStart = 30;
  const insightStart = chartStart + (data.length * animation.frames.standard) + 20;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing[12],
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: spacing[8] }}>
        <KineticText
          text={title}
          reveal="word-by-word"
          startFrame={titleStart}
          duration={20}
          style="subhead"
          color={palette.foreground}
          align="center"
        />
      </div>
      
      {/* Chart */}
      <SlideIn startFrame={chartStart - 10} direction="bottom" distance={30}>
        <AnimatedChart
          type={chartType}
          data={data}
          buildStyle={buildStyle}
          startFrame={chartStart}
          durationPerItem={animation.frames.standard}
          width={Math.min(width * 0.8, 1000)}
          height={Math.min(height * 0.5, 500)}
          accentColor={palette.accent}
          showLabels
          showValues
        />
      </SlideIn>
      
      {/* Key insight */}
      {insight && (
        <FadeIn startFrame={insightStart} duration={animation.frames.standard}>
          <div
            style={{
              marginTop: spacing[10],
              padding: `${spacing[4]}px ${spacing[8]}px`,
              backgroundColor: `${palette.accent}20`,
              borderLeft: `4px solid ${palette.accent}`,
              borderRadius: 4,
            }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.medium,
                color: palette.foreground,
              }}
            >
              {insight}
            </span>
          </div>
        </FadeIn>
      )}
      
      {/* Effects */}
      {showEffects && (
        <>
          <FilmGrain intensity={0.06} animated />
          <Vignette intensity={0.2} size={50} />
        </>
      )}
    </AbsoluteFill>
  );
};
