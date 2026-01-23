/**
 * ActivityFeedItem - TEND activity log entry with wireframe → styled transition
 * 
 * Shows a single automation or agent activity.
 * Transitions from gray line to full styled text.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

interface ActivityFeedItemProps {
  text: string;
  timeAgo: string;
  type: 'automation' | 'agent' | 'human';
  embodiment: number;
}

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  text,
  timeAgo,
  type,
  embodiment,
}) => {
  const { colors } = SPEC;
  
  // Interpolations
  const textOpacity = interpolate(embodiment, [0.3, 1], [0, 1], { extrapolateRight: 'clamp' });
  const wireframeOpacity = interpolate(embodiment, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  
  // Random width for wireframe (seeded by text length)
  const wireframeWidth = 30 + (text.length % 50);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 0',
        position: 'relative',
      }}
    >
      {/* Wireframe placeholder */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          opacity: wireframeOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 24,
            height: 10,
            borderRadius: 3,
            background: colors.wireframe,
          }}
        />
        <div
          style={{
            width: `${wireframeWidth}%`,
            height: 10,
            borderRadius: 3,
            background: colors.wireframe,
          }}
        />
      </div>
      
      {/* Styled content */}
      <span
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 12,
          color: colors.fgMuted,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 24,
          opacity: textOpacity,
        }}
      >
        {timeAgo}
      </span>
      
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: 13,
          color: type === 'agent' ? colors.fgSecondary : colors.fgMuted,
          opacity: textOpacity,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default ActivityFeedItem;
