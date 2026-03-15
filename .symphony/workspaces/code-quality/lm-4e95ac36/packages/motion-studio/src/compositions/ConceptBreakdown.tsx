/**
 * ConceptBreakdown - Multi-part concept explanation
 * 
 * The heart of an explainer: breaking down complex ideas
 * into digestible parts that reveal sequentially.
 * 
 * Uses Lucide icons for iconography (monochrome, no emojis)
 * 
 * @example
 * <ConceptBreakdown
 *   title="The Subtractive Triad"
 *   concepts={[
 *     { name: "DRY", description: "Eliminate duplication", iconName: "RefreshCw" },
 *     { name: "Rams", description: "Eliminate excess", iconName: "Scissors" },
 *     { name: "Heidegger", description: "Eliminate disconnection", iconName: "Link" },
 *   ]}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  interpolate,
  spring,
} from 'remotion';
import * as LucideIcons from 'lucide-react';
import { KineticText } from '../primitives/KineticText';
import { FadeIn } from '../primitives/FadeIn';
import { ScaleIn } from '../primitives/ScaleIn';
import { FilmGrain, Vignette } from '../primitives/FilmGrain';
import { colors, typography, animation, voxPresets, spacing } from '../styles';

interface Concept {
  /** Concept name/title */
  name: string;
  
  /** Brief description */
  description: string;
  
  /** Lucide icon name (e.g., "RefreshCw", "Scissors", "Link") */
  iconName?: string;
}

interface ConceptBreakdownProps {
  /** Section title */
  title?: string;

  /** Concepts to explain */
  concepts?: Concept[];
  
  /** Layout style */
  layout?: 'horizontal' | 'vertical' | 'grid';
  
  /** Property theme */
  theme?: keyof typeof voxPresets;
  
  /** Show connecting lines between concepts */
  showConnections?: boolean;
  
  /** Show texture effects */
  showEffects?: boolean;
}

export const ConceptBreakdown: React.FC<ConceptBreakdownProps> = ({
  title = 'Untitled',
  concepts = [],
  layout = 'horizontal',
  theme = 'dark',
  showConnections = false,
  showEffects = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const palette = voxPresets[theme];
  
  // Timing
  const titleStart = 5;
  const conceptsStart = 35;
  const conceptDelay = 25; // Frames between each concept reveal
  
  // Calculate card dimensions based on layout
  const getCardStyle = (index: number): React.CSSProperties => {
    const cardWidth = layout === 'vertical' 
      ? Math.min(600, width * 0.7)
      : Math.min(300, (width - spacing[16] * 2) / concepts.length - spacing[4]);
    
    return {
      width: cardWidth,
      padding: spacing[6],
      backgroundColor: `${palette.foreground}08`,
      border: `1px solid ${palette.foreground}15`,
      borderRadius: 8,
    };
  };
  
  const renderConcept = (concept: Concept, index: number) => {
    const conceptStart = conceptsStart + (index * conceptDelay);
    const localFrame = frame - conceptStart;
    
    const progress = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 20,
        mass: 0.6,
        stiffness: 100,
      },
    });
    
    const opacity = Math.max(0, progress);
    const translateY = interpolate(progress, [0, 1], [30, 0]);
    
    return (
      <div
        key={index}
        style={{
          ...getCardStyle(index),
          opacity,
          transform: `translateY(${translateY}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: spacing[3],
        }}
      >
        {/* Icon - Lucide */}
        {concept.iconName && (() => {
          const IconComponent = (LucideIcons as any)[concept.iconName];
          return IconComponent ? (
            <div
              style={{
                marginBottom: spacing[2],
              }}
            >
              <IconComponent 
                size={48} 
                strokeWidth={1.5}
                color={palette.foreground}
              />
            </div>
          ) : null;
        })()}
        
        {/* Name */}
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.h3,
            fontWeight: typography.fontWeight.semibold,
            color: palette.foreground,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          {concept.name}
        </div>
        
        {/* Description */}
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.normal,
            color: palette.muted,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          {concept.description}
        </div>
      </div>
    );
  };
  
  // Connection lines between concepts (for horizontal layout)
  const renderConnections = () => {
    if (!showConnections || layout !== 'horizontal' || concepts.length < 2) {
      return null;
    }
    
    const connectionStart = conceptsStart + (concepts.length * conceptDelay);
    const localFrame = frame - connectionStart;
    
    if (localFrame < 0) return null;
    
    const progress = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 25,
        mass: 1,
        stiffness: 60,
      },
    });
    
    return (
      <svg
        style={{
          position: 'absolute',
          top: '50%',
          left: spacing[16],
          right: spacing[16],
          height: 4,
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
        width="100%"
        height="4"
      >
        <line
          x1="10%"
          y1="2"
          x2={`${10 + 80 * progress}%`}
          y2="2"
          stroke={palette.muted}
          strokeWidth={1}
          strokeDasharray="8 4"
          opacity={0.4}
        />
      </svg>
    );
  };
  
  const layoutStyles: Record<string, React.CSSProperties> = {
    horizontal: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing[6],
    },
    vertical: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing[4],
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(concepts.length, 3)}, 1fr)`,
      gap: spacing[4],
      maxWidth: '90%',
    },
  };
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[12],
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: spacing[10] }}>
        <KineticText
          text={title}
          reveal="word-by-word"
          startFrame={titleStart}
          duration={20}
          style="headline"
          color={palette.foreground}
          align="center"
        />
      </div>
      
      {/* Concepts container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          ...layoutStyles[layout],
        }}
      >
        {concepts.map(renderConcept)}
        {renderConnections()}
      </div>
      
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
