/**
 * ActivityScene - Real-time activity feed populating
 * 
 * Shows activity feed sliding in with items appearing one by one.
 * Each item transitions from wireframe to styled.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { ActivityFeedItem } from '../components';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

export const ActivityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { activities, colors, scenes } = SPEC;
  const { feedSlideIn, itemCascade, counterReveal } = scenes.activity;
  
  // Feed panel slide in
  const slideProgress = spring({
    frame: Math.max(0, frame - feedSlideIn.start),
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  const panelTranslateX = interpolate(slideProgress, [0, 1], [100, 0]);
  const panelOpacity = interpolate(slideProgress, [0, 1], [0, 1]);
  
  // Counter animation
  const counterProgress = interpolate(
    frame,
    [counterReveal.start, counterReveal.start + counterReveal.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const counterValue = Math.round(89 * (1 - Math.pow(1 - counterProgress, 3)));
  
  // Generate time ago values
  const getTimeAgo = (index: number): string => {
    const times = ['0m', '0m', '1m', '1m', '2m', '3m', '4m', '5m', '7m', '10m'];
    return times[index] || `${index}m`;
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      
      {/* Activity feed panel - centered */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translateX(${panelTranslateX}%)`,
            opacity: panelOpacity,
            width: 520,
            maxHeight: '80vh',
            padding: 28,
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: colors.success,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 13,
                fontWeight: 500,
                color: colors.fgSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Activity
            </span>
          </div>
          
          {/* Counter */}
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 13,
              color: colors.success,
              opacity: counterProgress,
            }}
          >
            {counterValue} today
          </span>
        </div>
        
        {/* Activity items */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.slice(0, 8).map((activity, index) => {
            const itemStart = itemCascade.start + (index * itemCascade.stagger);
            const itemEmbodiment = interpolate(
              frame,
              [itemStart, itemStart + 30],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            // Only show items that have started
            if (frame < itemStart - 10) return null;
            
            const itemOpacity = interpolate(
              frame,
              [itemStart - 10, itemStart],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            return (
              <div key={index} style={{ opacity: itemOpacity }}>
                <ActivityFeedItem
                  text={activity.text}
                  timeAgo={getTimeAgo(index)}
                  type={activity.type as 'automation' | 'agent'}
                  embodiment={itemEmbodiment}
                />
              </div>
            );
          })}
        </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ActivityScene;
