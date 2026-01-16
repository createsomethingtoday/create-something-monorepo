/**
 * ComparisonScene - Side-by-side comparison
 * 
 * Before/after, A/B, old/new - the visual argument.
 * Vox signature: clean split, clear contrast.
 * 
 * @example
 * <ComparisonScene
 *   title="Framework Imprisonment vs Freedom"
 *   left={{ label: "Before", content: <OldWay /> }}
 *   right={{ label: "After", content: <NewWay /> }}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
} from 'remotion';
import { KineticText } from '../primitives/KineticText';
import { SplitReveal } from '../primitives/SplitReveal';
import { FadeIn } from '../primitives/FadeIn';
import { FilmGrain, Vignette } from '../primitives/FilmGrain';
import { colors, typography, animation, voxPresets, spacing } from '../styles';

interface ComparisonSide {
  /** Label for this side */
  label: string;
  
  /** Content to display */
  content: React.ReactNode;
  
  /** Optional bullet points */
  points?: string[];
  
  /** Accent color override */
  color?: string;
}

interface ComparisonSceneProps {
  /** Scene title */
  title: string;
  
  /** Left side content */
  left: ComparisonSide;
  
  /** Right side content */
  right: ComparisonSide;
  
  /** Property theme */
  theme?: keyof typeof voxPresets;
  
  /** Split direction */
  direction?: 'horizontal' | 'vertical';
  
  /** Show texture effects */
  showEffects?: boolean;
}

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({
  title,
  left,
  right,
  theme = 'dark',
  direction = 'horizontal',
  showEffects = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const palette = voxPresets[theme];
  
  // Timing
  const titleStart = 5;
  const splitStart = 30;
  const pointsStart = splitStart + 30;
  
  const renderSide = (side: ComparisonSide, isLeft: boolean) => {
    const sideColor = side.color || (isLeft ? colors.semantic.error : colors.semantic.success);
    
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: palette.background,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[8],
          borderLeft: !isLeft ? `2px solid ${palette.foreground}15` : undefined,
          borderTop: direction === 'vertical' && !isLeft ? `2px solid ${palette.foreground}15` : undefined,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: sideColor,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: spacing[4],
          }}
        >
          {side.label}
        </div>
        
        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {side.content}
        </div>
        
        {/* Bullet points */}
        {side.points && side.points.length > 0 && (
          <div
            style={{
              marginTop: spacing[4],
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[2],
            }}
          >
            {side.points.map((point, i) => (
              <FadeIn
                key={i}
                startFrame={pointsStart + (i * animation.frames.micro)}
                duration={animation.frames.micro}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.fontSize.sm,
                    color: palette.muted,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  <span style={{ color: sideColor }}>•</span>
                  {point}
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: spacing[6],
          display: 'flex',
          justifyContent: 'center',
        }}
      >
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
      
      {/* Split comparison */}
      <div style={{ flex: 1 }}>
        <SplitReveal
          direction={direction}
          startFrame={splitStart}
          duration={animation.frames.complex}
          width={width}
          height={height - 100}
          revealStyle="slide"
        >
          {renderSide(left, true)}
          {renderSide(right, false)}
        </SplitReveal>
      </div>
      
      {/* Effects */}
      {showEffects && (
        <>
          <FilmGrain intensity={0.05} animated />
          <Vignette intensity={0.15} size={60} />
        </>
      )}
    </AbsoluteFill>
  );
};
