/**
 * SourceCard - TEND source card with wireframe → styled transition
 * 
 * Shows a connected data source (Open Dental, Weave, etc.)
 * Transitions from gray placeholder to full Canon-styled card.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { Clipboard, Phone, Shield, FileText, Star, DollarSign, Users, Image, Check } from 'lucide-react';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

const iconMap = {
  Clipboard,
  Phone,
  Shield,
  FileText,
  Star,
  DollarSign,
  Users,
  Image,
};

interface SourceCardProps {
  name: string;
  type: string;
  icon: keyof typeof iconMap;
  status: 'disconnected' | 'connecting' | 'connected';
  embodiment: number; // 0 = wireframe, 1 = styled
}

export const SourceCard: React.FC<SourceCardProps> = ({
  name,
  type,
  icon,
  status,
  embodiment,
}) => {
  const { colors } = SPEC;
  const IconComponent = iconMap[icon];
  
  // Interpolate values based on embodiment
  const iconOpacity = interpolate(embodiment, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const textOpacity = interpolate(embodiment, [0.3, 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const bgAlpha = interpolate(embodiment, [0, 1], [0.02, 0.05]);
  const borderAlpha = interpolate(embodiment, [0, 1], [0.05, 0.1]);
  
  // Wireframe placeholder visibility (inverse of embodiment)
  const wireframeOpacity = interpolate(embodiment, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  
  // Status badge color
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return colors.success;
      case 'connecting': return colors.warning;
      default: return colors.fgTertiary;
    }
  };
  
  const getStatusBgColor = () => {
    switch (status) {
      case 'connected': return colors.successMuted;
      case 'connecting': return colors.warningMuted;
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  };
  
  return (
    <div
      style={{
        width: 200,
        height: 100,
        borderRadius: 12,
        border: `1px solid rgba(255, 255, 255, ${borderAlpha})`,
        background: `rgba(255, 255, 255, ${bgAlpha})`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wireframe placeholders */}
      <div style={{ opacity: wireframeOpacity, position: 'absolute', inset: 16 }}>
        {/* Icon placeholder */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: colors.wireframe,
            marginBottom: 12,
          }}
        />
        {/* Name placeholder */}
        <div
          style={{
            width: '70%',
            height: 12,
            borderRadius: 4,
            background: colors.wireframe,
            marginBottom: 8,
          }}
        />
        {/* Status placeholder */}
        <div
          style={{
            width: 50,
            height: 18,
            borderRadius: 9,
            background: colors.wireframe,
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />
      </div>
      
      {/* Styled content */}
      <div style={{ opacity: iconOpacity }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent size={18} color={colors.fgSecondary} />
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 14,
            fontWeight: 500,
            color: colors.fgPrimary,
            opacity: textOpacity,
          }}
        >
          {name}
        </span>
        
        {/* Status badge - fixed width to prevent shift */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
            height: 24,
            padding: '4px',
            borderRadius: 12,
            background: getStatusBgColor(),
            opacity: textOpacity,
          }}
        >
          {status === 'connected' ? (
            <Check size={14} color={getStatusColor()} strokeWidth={2.5} />
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: getStatusColor(),
                letterSpacing: '0.02em',
              }}
            >
              {status === 'connecting' ? '...' : '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceCard;
