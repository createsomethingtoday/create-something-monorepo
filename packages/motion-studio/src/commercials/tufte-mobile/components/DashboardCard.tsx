/**
 * DashboardCard - Card with wireframe → styled → mobile transitions
 * 
 * Three interpolatable states:
 * 1. Wireframe (embodiment=0): Gray placeholder boxes
 * 2. Desktop styled (embodiment=1, viewport='desktop'): Full decoration
 * 3. Mobile Tufte (embodiment=1, viewport='mobile', tufteLevel=1): Data-forward
 */
import React from 'react';
import { interpolate } from 'remotion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TUFTE_MOBILE_SPEC, type CardData } from '../spec';

interface DashboardCardProps {
  card: CardData;
  embodiment: number;         // 0 = wireframe, 1 = styled
  viewport: 'desktop' | 'mobile';
  tufteLevel: number;         // 0 = decorated, 1 = tufte-optimized
  valueProgress?: number;     // 0-1 for count-up animation
  scale?: number;
}

/**
 * Mini Sparkline Component
 */
const Sparkline: React.FC<{
  data: readonly number[];
  width: number;
  height: number;
  color: string;
  opacity: number;
}> = ({ data, width, height, color, opacity }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} style={{ opacity }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DashboardCard: React.FC<DashboardCardProps> = ({
  card,
  embodiment,
  viewport,
  tufteLevel,
  valueProgress = 1,
  scale = 1,
}) => {
  const { colors, fonts } = TUFTE_MOBILE_SPEC;
  
  // Base dimensions
  const isDesktop = viewport === 'desktop';
  const isTufte = tufteLevel > 0.5;
  
  // Card dimensions based on viewport and tufte level
  const cardWidth = isDesktop ? 280 : (isTufte ? 320 : 280);
  const cardHeight = isDesktop ? 160 : (isTufte ? 72 : 160);
  const padding = isDesktop ? 20 : (isTufte ? 16 : 20);
  
  // Interpolate wireframe vs styled
  const wireframeOpacity = interpolate(embodiment, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  const styledOpacity = interpolate(embodiment, [0.3, 0.8], [0, 1], { extrapolateRight: 'clamp' });
  
  // Interpolate desktop vs tufte mobile
  const decorationOpacity = interpolate(tufteLevel, [0, 0.5], [1, 0], { extrapolateRight: 'clamp' });
  const tufteOpacity = interpolate(tufteLevel, [0.5, 1], [0, 1], { extrapolateLeft: 'clamp' });
  
  // Calculate displayed value with count-up
  const displayValue = valueProgress < 1 
    ? formatValue(card.rawValue * valueProgress, card.id)
    : card.value;
  
  // Background and border based on decoration level
  const bgAlpha = interpolate(embodiment, [0, 1], [0.02, 0.05]);
  const borderAlpha = interpolate(tufteLevel, [0, 1], [0.1, 0.03]);
  const shadowOpacity = interpolate(tufteLevel, [0, 0.5], [0.15, 0], { extrapolateRight: 'clamp' });
  
  return (
    <div
      style={{
        width: cardWidth * scale,
        height: cardHeight * scale,
        borderRadius: (isTufte ? 8 : 12) * scale,
        border: `${scale}px solid rgba(255, 255, 255, ${borderAlpha})`,
        background: `rgba(255, 255, 255, ${bgAlpha})`,
        boxShadow: `0 ${4 * scale}px ${16 * scale}px rgba(0, 0, 0, ${shadowOpacity})`,
        padding: padding * scale,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Wireframe Layer */}
      <div 
        style={{ 
          opacity: wireframeOpacity, 
          position: 'absolute', 
          inset: padding * scale,
          display: 'flex',
          flexDirection: isDesktop || !isTufte ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isTufte && !isDesktop ? 'center' : 'flex-start',
        }}
      >
        {/* Value placeholder */}
        <div
          style={{
            width: (isDesktop ? 120 : (isTufte ? 80 : 120)) * scale,
            height: (isDesktop ? 36 : (isTufte ? 28 : 36)) * scale,
            borderRadius: 4 * scale,
            background: colors.wireframe,
          }}
        />
        
        {/* Label placeholder */}
        <div
          style={{
            width: (isDesktop ? 60 : (isTufte ? 60 : 60)) * scale,
            height: 12 * scale,
            borderRadius: 4 * scale,
            background: colors.wireframe,
            marginTop: isTufte && !isDesktop ? 0 : 8 * scale,
          }}
        />
        
        {/* Sparkline placeholder */}
        <div
          style={{
            width: (isDesktop ? 200 : (isTufte ? 48 : 200)) * scale,
            height: (isDesktop ? 40 : (isTufte ? 16 : 40)) * scale,
            borderRadius: 4 * scale,
            background: colors.wireframe,
            marginTop: isTufte && !isDesktop ? 0 : 'auto',
            position: isTufte && !isDesktop ? 'static' : 'absolute',
            bottom: isTufte && !isDesktop ? undefined : padding * scale,
            right: isTufte && !isDesktop ? undefined : padding * scale,
          }}
        />
        
        {/* Change badge placeholder */}
        <div
          style={{
            width: 50 * scale,
            height: 20 * scale,
            borderRadius: 10 * scale,
            background: colors.wireframe,
            position: 'absolute',
            top: padding * scale,
            right: padding * scale,
          }}
        />
      </div>
      
      {/* Styled Layer - Desktop */}
      {isDesktop && (
        <div 
          style={{ 
            opacity: styledOpacity * (1 - tufteOpacity),
            position: 'absolute',
            inset: padding * scale,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 32 * scale,
                  fontWeight: 600,
                  color: colors.fgPrimary,
                  lineHeight: 1.1,
                }}
              >
                {displayValue}
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13 * scale,
                  fontWeight: 500,
                  color: colors.fgMuted,
                  marginTop: 4 * scale,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {card.title}
              </div>
            </div>
            
            {/* Change badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4 * scale,
                padding: `${4 * scale}px ${8 * scale}px`,
                borderRadius: 12 * scale,
                background: card.changeDirection === 'up' ? colors.successMuted : 'rgba(204, 68, 68, 0.2)',
                opacity: decorationOpacity,
              }}
            >
              {card.changeDirection === 'up' ? (
                <TrendingUp size={12 * scale} color={colors.success} />
              ) : (
                <TrendingDown size={12 * scale} color={colors.error} />
              )}
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11 * scale,
                  fontWeight: 600,
                  color: card.changeDirection === 'up' ? colors.success : colors.error,
                }}
              >
                {card.change > 0 ? '+' : ''}{card.change}%
              </span>
            </div>
          </div>
          
          {/* Sparkline */}
          <div style={{ marginTop: 'auto' }}>
            <Sparkline
              data={card.trend}
              width={200 * scale}
              height={40 * scale}
              color={colors.fgSecondary}
              opacity={styledOpacity}
            />
          </div>
        </div>
      )}
      
      {/* Styled Layer - Mobile Tufte */}
      {(!isDesktop || tufteLevel > 0) && (
        <div 
          style={{ 
            opacity: styledOpacity * tufteOpacity,
            position: 'absolute',
            inset: padding * scale,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Value + Label inline */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 * scale }}>
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 24 * scale,
                fontWeight: 600,
                color: colors.fgPrimary,
              }}
            >
              {displayValue}
            </span>
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 12 * scale,
                fontWeight: 500,
                color: colors.fgMuted,
              }}
            >
              {card.title}
            </span>
          </div>
          
          {/* Right: Sparkline + Change inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 * scale }}>
            <Sparkline
              data={card.trend}
              width={48 * scale}
              height={16 * scale}
              color={colors.fgSecondary}
              opacity={1}
            />
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 11 * scale,
                fontWeight: 500,
                color: card.changeDirection === 'up' ? colors.success : colors.error,
              }}
            >
              {card.change > 0 ? '+' : ''}{card.change}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

function formatValue(value: number, cardId: string): string {
  if (cardId === 'revenue') {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  if (cardId === 'sessions') {
    return Math.round(value).toLocaleString();
  }
  if (cardId === 'uptime') {
    return `${value.toFixed(1)}%`;
  }
  return value.toString();
}

export default DashboardCard;
