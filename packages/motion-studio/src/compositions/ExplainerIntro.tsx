/**
 * ExplainerIntro - Opening scene composition
 * 
 * The hook: a question or statement that draws viewers in.
 * Vox signature: bold text, clean background, purposeful reveal.
 * 
 * @example
 * <ExplainerIntro
 *   hook="What if the best code is the code you don't write?"
 *   subtitle="The Subtractive Triad"
 *   theme="ltd"
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  interpolate,
} from 'remotion';
import { KineticText } from '../primitives/KineticText.js';
import { FadeIn } from '../primitives/FadeIn.js';
import { FilmGrain, Vignette } from '../primitives/FilmGrain.js';
import { colors, typography, animation, voxPresets, spacing } from '../styles/index.js';

interface ExplainerIntroProps {
  /** The hook - opening question or statement */
  hook: string;
  
  /** Subtitle or topic name */
  subtitle?: string;
  
  /** Property theme */
  theme?: keyof typeof voxPresets;
  
  /** Show film grain texture */
  showGrain?: boolean;
  
  /** Show vignette effect */
  showVignette?: boolean;
  
  /** Words to highlight in the hook */
  highlightWords?: string[];
}

export const ExplainerIntro: React.FC<ExplainerIntroProps> = ({
  hook,
  subtitle,
  theme = 'dark',
  showGrain = true,
  showVignette = true,
  highlightWords = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  const palette = voxPresets[theme];
  
  // Timing
  const hookStart = 15;
  const subtitleStart = hookStart + 45;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[16],
      }}
    >
      {/* Main hook text */}
      <div style={{ maxWidth: '80%', textAlign: 'center' }}>
        <KineticText
          text={hook}
          reveal="word-by-word"
          startFrame={hookStart}
          duration={30}
          style="display"
          color={palette.foreground}
          accentColor={palette.accent}
          highlightWords={highlightWords}
          align="center"
        />
      </div>
      
      {/* Subtitle */}
      {subtitle && (
        <FadeIn startFrame={subtitleStart} duration={animation.frames.standard}>
          <div
            style={{
              marginTop: spacing[8],
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.medium,
              color: palette.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {subtitle}
          </div>
        </FadeIn>
      )}
      
      {/* Texture overlays */}
      {showGrain && <FilmGrain intensity={0.08} animated />}
      {showVignette && <Vignette intensity={0.25} size={40} />}
    </AbsoluteFill>
  );
};
