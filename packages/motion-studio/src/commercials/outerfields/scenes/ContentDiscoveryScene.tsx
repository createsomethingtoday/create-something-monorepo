/**
 * ContentDiscoveryScene - Netflix-style content browsing
 * 
 * Enhanced with:
 * - Smooth eased scrolling with momentum
 * - Cards cascade from different directions
 * - 3D perspective depth
 * - Multiple rows with parallax
 * - Category label animations
 * 
 * Duration: 7 seconds (210 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { VideoCard } from '../components/VideoCard';
import { StarfieldBackground } from '../components/StarfieldBackground';
import { SPEC } from '../spec';

export const ContentDiscoveryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, videoCards, animation } = SPEC;
  const { contentDiscovery } = scenes;
  
  const thumbnails = videoCards.thumbnails;
  const cardWidth = 260;
  const cardGap = 24;
  
  // Smooth eased scrolling with spring physics
  const scrollSpring = spring({
    frame: Math.max(0, frame - contentDiscovery.scrollStart),
    fps,
    config: { damping: 50, stiffness: 20, mass: 1.5 },
  });
  
  const totalCardsWidth = thumbnails.length * (cardWidth + cardGap);
  const viewportWidth = 1920;
  const scrollDistance = totalCardsWidth - viewportWidth + 300;
  const scrollX = scrollSpring * scrollDistance * 0.7;
  
  // Scene entrance fade
  const sceneFade = interpolate(
    frame,
    [0, 25],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Category label animation
  const labelProgress = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  
  const labelWidth = interpolate(labelProgress, [0, 1], [0, 180]);
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);
  
  // Determine hover card (middle visible card)
  const hoverCardIndex = frame >= contentDiscovery.hoverEffectStart ? 3 : -1;
  
  // Row 2 parallax (moves slower)
  const row2Scroll = scrollX * 0.4;
  
  // Entrance directions for visual variety
  const getEntranceDirection = (index: number): 'up' | 'down' | 'left' | 'right' => {
    const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'up', 'down'];
    return directions[index % 4];
  };
  
  // Tilt amounts for 3D depth
  const getTiltAmount = (index: number): number => {
    const tilts = [3, -2, 4, -3, 2, -4, 3, -2];
    return tilts[index % 8];
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack, overflow: 'hidden' }}>
      {/* Subtle starfield in background */}
      <StarfieldBackground
        fadeInStart={0}
        fadeInDuration={1}
        intensity={0.2}
        showGalaxy={false}
        showShootingStars={false}
        showNebula={true}
      />
      
      <AbsoluteFill style={{ opacity: sceneFade }}>
        {/* Category label with animated underline */}
        <div
          style={{
            position: 'absolute',
            top: 160,
            left: 80,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            opacity: labelOpacity,
          }}
        >
          {/* Animated orange bar */}
          <div
            style={{
              height: 4,
              width: labelWidth,
              backgroundColor: colors.sun,
              borderRadius: 2,
              boxShadow: `0 0 20px ${colors.sun}60`,
            }}
          />
        </div>
        
        {/* Main horizontal scrolling row */}
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: 80,
            transform: `translateY(-50%) translateX(-${scrollX}px)`,
            display: 'flex',
            gap: cardGap,
            alignItems: 'center',
            perspective: 2000,
            perspectiveOrigin: '30% 50%',
          }}
        >
          {thumbnails.map((thumbnail, index) => (
            <VideoCard
              key={thumbnail}
              thumbnail={thumbnail}
              width={cardWidth}
              appearFrame={contentDiscovery.cardCascadeStart}
              entranceDelay={index * contentDiscovery.cardCascadeStagger}
              entranceDirection={getEntranceDirection(index)}
              showHover={hoverCardIndex === index}
              hoverFrame={contentDiscovery.hoverEffectStart}
              tiltAmount={getTiltAmount(index)}
            />
          ))}
        </div>
        
        {/* Second row (parallax, smaller, adds depth) */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 60,
            transform: `translateX(${row2Scroll}px)`,
            display: 'flex',
            gap: cardGap * 0.8,
            alignItems: 'center',
            opacity: 0.5,
            perspective: 1500,
          }}
        >
          {thumbnails.slice(0, 5).reverse().map((thumbnail, index) => (
            <VideoCard
              key={`row2-${thumbnail}`}
              thumbnail={thumbnail}
              width={cardWidth * 0.7}
              appearFrame={contentDiscovery.cardCascadeStart + 40}
              entranceDelay={index * contentDiscovery.cardCascadeStagger * 1.2}
              entranceDirection="up"
              showHover={false}
              tiltAmount={-getTiltAmount(index)}
            />
          ))}
        </div>
        
        {/* Floating accent cards (very subtle, add atmosphere) */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 200,
            opacity: 0.25,
            transform: `translateX(${scrollX * 0.2}px) rotate(-5deg)`,
          }}
        >
          <VideoCard
            thumbnail={thumbnails[2]}
            width={cardWidth * 0.5}
            appearFrame={contentDiscovery.cardCascadeStart + 60}
            entranceDelay={0}
            entranceDirection="right"
            showHover={false}
          />
        </div>
        
        {/* Gradient overlays for edge fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(to right, 
              ${colors.spaceBlack} 0%, 
              transparent 10%, 
              transparent 85%, 
              ${colors.spaceBlack} 100%
            )`,
          }}
        />
        
        {/* Top and bottom gradients */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '15%',
            background: `linear-gradient(to bottom, ${colors.spaceBlack}, transparent)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10%',
            background: `linear-gradient(to top, ${colors.spaceBlack}, transparent)`,
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ContentDiscoveryScene;
