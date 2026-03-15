/**
 * ActivityFeedItemScene - Isolated ActivityFeedItem component walkthrough
 * 
 * Shows activity feed items cascading in, demonstrating
 * how automation visibility works.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { ActivityFeedItem } from '../../tend/components/ActivityFeedItem';

export const ActivityFeedItemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, activities } = WALKTHROUGH_SPEC;
  const { phases } = scenes.activityFeedItem;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Panel reveal spring
  const revealSpring = spring({
    frame: frame - phases.wireframeReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const panelScale = interpolate(revealSpring, [0, 1], [0.9, 1]);
  const panelOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  
  // Time labels for display
  const timeLabels = ['1m', '2m', '3m', '5m', '8m'];
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: sceneOpacity,
      }}
    >
      {/* Activity feed panel - scaled 2x for 4K visibility */}
      <div
        style={{
          transform: `scale(${panelScale * 2})`, // 2x scale for 4K
          opacity: panelOpacity,
          width: 600,
          padding: 32,
          borderRadius: 16,
          background: colors.bgSurface,
          border: `1px solid ${colors.borderDefault}`,
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            fontFamily: 'Stack Sans Notch, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: colors.fgSecondary,
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Activity
        </div>
        
        {/* Activity items */}
        {activities.slice(0, 5).map((activity, i) => {
          // Calculate item appearance based on cascade
          const itemFrame = frame - phases.itemsCascade.start - (i * phases.itemsCascade.stagger);
          
          const itemSpring = spring({
            frame: itemFrame,
            fps,
            config: animation.springConfig,
          });
          
          const itemOpacity = interpolate(itemSpring, [0, 1], [0, 1]);
          const itemTranslateY = interpolate(itemSpring, [0, 1], [20, 0]);
          
          // Embodiment progress for this item
          const itemEmbodimentStart = phases.embodiment.start + (i * 15);
          const embodimentProgress = interpolate(
            frame,
            [itemEmbodimentStart, itemEmbodimentStart + phases.embodiment.duration],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div
              key={i}
              style={{
                opacity: itemOpacity,
                transform: `translateY(${itemTranslateY}px)`,
              }}
            >
              <ActivityFeedItem
                text={activity.text}
                timeAgo={timeLabels[i]}
                type={activity.type}
                embodiment={embodimentProgress}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeedItemScene;
