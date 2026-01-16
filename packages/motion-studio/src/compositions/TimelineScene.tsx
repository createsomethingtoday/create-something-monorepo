/**
 * TimelineScene - Sequential progression visualization
 * 
 * History, process, journey - events unfolding in order.
 * Markers appear, connections draw, story progresses.
 * 
 * @example
 * <TimelineScene
 *   title="The Journey to Subtractive Design"
 *   events={[
 *     { year: "1976", title: "Dieter Rams", description: "Ten principles" },
 *     { year: "2008", title: "DRY Principle", description: "Don't repeat yourself" },
 *     { year: "2024", title: "Subtractive Triad", description: "Unified framework" },
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
import { KineticText } from '../primitives/KineticText.js';
import { FadeIn } from '../primitives/FadeIn.js';
import { FilmGrain, Vignette } from '../primitives/FilmGrain.js';
import { colors, typography, animation, voxPresets, spacing } from '../styles/index.js';

interface TimelineEvent {
  /** Year or date label */
  year: string;
  
  /** Event title */
  title: string;
  
  /** Event description */
  description?: string;
  
  /** Optional icon */
  icon?: string;
}

interface TimelineSceneProps {
  /** Scene title */
  title: string;
  
  /** Timeline events */
  events: TimelineEvent[];
  
  /** Property theme */
  theme?: keyof typeof voxPresets;
  
  /** Timeline orientation */
  orientation?: 'horizontal' | 'vertical';
  
  /** Show texture effects */
  showEffects?: boolean;
}

export const TimelineScene: React.FC<TimelineSceneProps> = ({
  title,
  events,
  theme = 'dark',
  orientation = 'horizontal',
  showEffects = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const palette = voxPresets[theme];
  
  // Timing
  const titleStart = 5;
  const lineStart = 25;
  const eventDelay = 20;
  const eventsStart = lineStart + 15;
  
  // Line drawing progress
  const lineProgress = spring({
    fps,
    frame: frame - lineStart,
    config: {
      damping: 30,
      mass: 1,
      stiffness: 40,
    },
  });
  
  const isHorizontal = orientation === 'horizontal';
  
  const renderEvent = (event: TimelineEvent, index: number) => {
    const eventStart = eventsStart + (index * eventDelay);
    const localFrame = frame - eventStart;
    
    const progress = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 20,
        mass: 0.5,
        stiffness: 100,
      },
    });
    
    const opacity = Math.max(0, progress);
    const scale = interpolate(progress, [0, 1], [0.8, 1]);
    
    return (
      <div
        key={index}
        style={{
          display: 'flex',
          flexDirection: isHorizontal ? 'column' : 'row',
          alignItems: 'center',
          gap: spacing[3],
          opacity,
          transform: `scale(${scale})`,
          minWidth: isHorizontal ? 150 : undefined,
          textAlign: isHorizontal ? 'center' : 'left',
        }}
      >
        {/* Marker dot */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: palette.accent,
            border: `3px solid ${palette.background}`,
            boxShadow: `0 0 0 2px ${palette.accent}`,
            flexShrink: 0,
          }}
        />
        
        {/* Event content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[1],
          }}
        >
          {/* Year badge */}
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: palette.accent,
              backgroundColor: `${palette.accent}20`,
              padding: `${spacing[1]}px ${spacing[2]}px`,
              borderRadius: 4,
              alignSelf: isHorizontal ? 'center' : 'flex-start',
            }}
          >
            {event.year}
          </div>
          
          {/* Title */}
          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: palette.foreground,
            }}
          >
            {event.icon && <span style={{ marginRight: spacing[2] }}>{event.icon}</span>}
            {event.title}
          </div>
          
          {/* Description */}
          {event.description && (
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.fontSize.sm,
                color: palette.muted,
                maxWidth: 200,
              }}
            >
              {event.description}
            </div>
          )}
        </div>
      </div>
    );
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
      <div style={{ marginBottom: spacing[12] }}>
        <KineticText
          text={title}
          reveal="word-by-word"
          startFrame={titleStart}
          duration={15}
          style="headline"
          color={palette.foreground}
          align="center"
        />
      </div>
      
      {/* Timeline container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isHorizontal ? spacing[10] : spacing[8],
          padding: isHorizontal ? `${spacing[8]}px 0` : `0 ${spacing[8]}px`,
        }}
      >
        {/* Connecting line */}
        <div
          style={{
            position: 'absolute',
            [isHorizontal ? 'top' : 'left']: '50%',
            [isHorizontal ? 'left' : 'top']: 0,
            [isHorizontal ? 'width' : 'height']: `${lineProgress * 100}%`,
            [isHorizontal ? 'height' : 'width']: 2,
            backgroundColor: `${palette.accent}40`,
            transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)',
            zIndex: 0,
          }}
        />
        
        {/* Events */}
        {events.map(renderEvent)}
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
