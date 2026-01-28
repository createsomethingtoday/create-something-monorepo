/**
 * CloseScene - Split view desktop/mobile, logo, tagline
 * 
 * "The form changed. The meaning didn't."
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { DashboardCard } from '../components/DashboardCard';
import { PhoneFrame } from '../components/PhoneFrame';
import { TUFTE_MOBILE_SPEC } from '../spec';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, cards, scenes, phone, product, fonts } = TUFTE_MOBILE_SPEC;
  const { phases } = scenes.close;
  
  // Split view animation
  const splitSpring = spring({
    frame: frame - phases.splitView.start,
    fps,
    config: { damping: 25, stiffness: 60, mass: 1 },
  });
  
  const splitOpacity = interpolate(splitSpring, [0, 1], [0, 1]);
  const desktopX = interpolate(splitSpring, [0, 1], [-100, 0]);
  const mobileX = interpolate(splitSpring, [0, 1], [100, 0]);
  
  // Logo reveal
  const logoSpring = spring({
    frame: frame - phases.logoReveal.start,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoY = interpolate(logoSpring, [0, 1], [20, 0]);
  
  // Tagline reveal
  const taglineSpring = spring({
    frame: frame - phases.taglineReveal.start,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);
  
  // Fade out
  const fadeOut = interpolate(
    frame,
    [phases.silenceOut.start, phases.silenceOut.start + phases.silenceOut.duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        opacity: fadeOut,
      }}
    >
      {/* Split comparison */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 80,
          opacity: splitOpacity,
        }}
      >
        {/* Desktop side */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            transform: `translateX(${desktopX}px)`,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              color: colors.fgMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Desktop
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            {cards.slice(0, 2).map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                embodiment={1}
                viewport="desktop"
                tufteLevel={0}
                scale={0.7}
              />
            ))}
          </div>
        </div>
        
        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 200,
            background: colors.borderDefault,
          }}
        />
        
        {/* Mobile side */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            transform: `translateX(${mobileX}px)`,
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              color: colors.fgMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Mobile
          </span>
          <PhoneFrame scale={0.5}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
              {cards.map((card) => (
                <DashboardCard
                  key={card.id}
                  card={card}
                  embodiment={1}
                  viewport="mobile"
                  tufteLevel={1}
                  scale={phone.scale * 0.5}
                />
              ))}
            </div>
          </PhoneFrame>
        </div>
      </div>
      
      {/* Logo and tagline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          transform: `translateY(${logoY}px)`,
          opacity: logoOpacity,
        }}
      >
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 28,
            fontWeight: 700,
            color: colors.fgPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          {product.name}
        </span>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            color: colors.fgMuted,
            opacity: taglineOpacity,
          }}
        >
          {product.tagline}
        </span>
      </div>
    </div>
  );
};

export default CloseScene;
