/**
 * InboxItem - TEND inbox row with wireframe → styled transition
 * 
 * Shows a prioritized item from the inbox.
 * Transitions from gray placeholder row to full styled row.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { Clipboard, Phone, Shield, FileText, Star, Check, X, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

const sourceIcons: Record<string, LucideIcon> = {
  pms: Clipboard,
  phone: Phone,
  insurance: Shield,
  claims: FileText,
  reviews: Star,
};

interface InboxItemProps {
  title: string;
  sourceType: string;
  score: number;
  timeAgo: string;
  status: 'inbox' | 'approved' | 'dismissed' | 'snoozed';
  isFocused: boolean;
  embodiment: number;
  exitProgress?: number; // 0-1 for exit animation
}

export const InboxItem: React.FC<InboxItemProps> = ({
  title,
  sourceType,
  score,
  timeAgo,
  status,
  isFocused,
  embodiment,
  exitProgress = 0,
}) => {
  const { colors } = SPEC;
  const IconComponent = sourceIcons[sourceType] || FileText;
  
  // Embodiment interpolations
  const contentOpacity = interpolate(embodiment, [0.2, 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const wireframeOpacity = interpolate(embodiment, [0, 0.4], [1, 0], { extrapolateRight: 'clamp' });
  
  // Exit animation
  const translateX = interpolate(exitProgress, [0, 1], [0, 100]);
  const opacity = interpolate(exitProgress, [0, 0.8, 1], [1, 1, 0]);
  
  // Score color
  const getScoreColor = () => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.fgMuted;
  };
  
  // Exit glow color
  const getExitGlow = () => {
    if (exitProgress > 0) {
      if (status === 'approved') return `0 0 20px ${colors.successMuted}`;
      if (status === 'dismissed') return 'none';
      if (status === 'snoozed') return `0 0 20px ${colors.warningMuted}`;
    }
    return 'none';
  };
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        borderRadius: 8,
        background: isFocused ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        border: isFocused ? `2px solid ${colors.fgPrimary}` : '2px solid transparent',
        transform: `translateX(${translateX}%)`,
        opacity,
        boxShadow: getExitGlow(),
        transition: 'border 0.1s, background 0.1s',
      }}
    >
      {/* Wireframe placeholders */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flex: 1,
          opacity: wireframeOpacity,
          position: 'absolute',
          left: 16,
          right: 16,
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 4, background: colors.wireframe }} />
        <div style={{ flex: 1, height: 14, borderRadius: 4, background: colors.wireframe }} />
        <div style={{ width: 40, height: 14, borderRadius: 4, background: colors.wireframe }} />
        <div style={{ width: 24, height: 24, borderRadius: 12, background: colors.wireframe }} />
      </div>
      
      {/* Styled content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flex: 1,
          opacity: contentOpacity,
        }}
      >
        {/* Source icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent size={14} color={colors.fgMuted} />
        </div>
        
        {/* Title */}
        <span
          style={{
            flex: 1,
            fontFamily: fontFamily.sans,
            fontSize: 14,
            color: colors.fgPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        
        {/* Time */}
        <span
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            color: colors.fgMuted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeAgo}
        </span>
        
        {/* Score */}
        <div
          style={{
            minWidth: 32,
            height: 24,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily.mono,
            fontSize: 12,
            fontWeight: 600,
            color: getScoreColor(),
          }}
        >
          {score}
        </div>
        
        {/* Action buttons (visible on focus) */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            opacity: isFocused ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        >
          <ActionButton icon={Check} color={colors.success} />
          <ActionButton icon={X} color={colors.fgMuted} />
          <ActionButton icon={Clock} color={colors.warning} />
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  icon: LucideIcon;
  color: string;
}> = ({ icon: Icon, color }) => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: 6,
      background: 'rgba(255, 255, 255, 0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Icon size={14} color={color} />
  </div>
);

export default InboxItem;
