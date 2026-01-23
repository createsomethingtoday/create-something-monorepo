/**
 * VideoCard - Cinematic Netflix-style poster card
 * 
 * Enhanced with:
 * - 3D perspective tilt on hover
 * - Smooth spring entrance with stagger
 * - Reflection/shine effect
 * - Glassmorphism play indicator with glow
 * - Thumbnail loading shimmer
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Play } from 'lucide-react';
import { SPEC } from '../spec';

interface VideoCardProps {
  thumbnail: string;
  width?: number;
  appearFrame?: number;
  showHover?: boolean;
  hoverFrame?: number;
  entranceDelay?: number;
  entranceDirection?: 'up' | 'down' | 'left' | 'right';
  tiltAmount?: number;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  thumbnail,
  width = 280,
  appearFrame = 0,
  showHover = false,
  hoverFrame = 0,
  entranceDelay = 0,
  entranceDirection = 'up',
  tiltAmount = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, videoCards } = SPEC;
  
  const height = width * (1 / videoCards.aspectRatio);
  const adjustedFrame = frame - appearFrame - entranceDelay;
  
  // Spring entrance with custom config for organic feel
  const entranceProgress = spring({
    frame: Math.max(0, adjustedFrame),
    fps,
    config: {
      damping: 14,
      stiffness: 80,
      mass: 1,
    },
  });
  
  // Direction-based entrance offset
  const directionOffsets = {
    up: { x: 0, y: 60 },
    down: { x: 0, y: -60 },
    left: { x: 60, y: 0 },
    right: { x: -60, y: 0 },
  };
  const offset = directionOffsets[entranceDirection];
  
  const translateX = interpolate(entranceProgress, [0, 1], [offset.x, 0]);
  const translateY = interpolate(entranceProgress, [0, 1], [offset.y, 0]);
  const opacity = interpolate(entranceProgress, [0, 0.3, 1], [0, 0.5, 1]);
  const entranceScale = interpolate(entranceProgress, [0, 1], [0.85, 1]);
  const entranceRotate = interpolate(entranceProgress, [0, 1], [tiltAmount * 0.5, 0]);
  
  // Hover state with spring
  const hoverProgress = showHover
    ? spring({
        frame: Math.max(0, frame - hoverFrame),
        fps,
        config: { damping: 15, stiffness: 150 },
      })
    : 0;
  
  const hoverScale = interpolate(hoverProgress, [0, 1], [1, 1.08]);
  const hoverElevation = interpolate(hoverProgress, [0, 1], [0, 20]);
  const overlayOpacity = interpolate(hoverProgress, [0, 1], [0, 1]);
  const playScale = interpolate(hoverProgress, [0, 1], [0.6, 1]);
  const playOpacity = interpolate(hoverProgress, [0, 1], [0, 1]);
  
  // 3D tilt effect on hover
  const tiltX = interpolate(hoverProgress, [0, 1], [0, -5]);
  const tiltY = interpolate(hoverProgress, [0, 1], [0, 3]);
  
  // Shine effect sweep
  const shineProgress = showHover
    ? interpolate(frame, [hoverFrame, hoverFrame + 30], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  
  // Don't render before appear frame
  if (frame < appearFrame + entranceDelay - 5) {
    return null;
  }
  
  return (
    <div
      style={{
        width,
        perspective: 1000,
        perspectiveOrigin: 'center center',
      }}
    >
      <div
        style={{
          opacity,
          transform: `
            translate(${translateX}px, ${translateY}px) 
            scale(${entranceScale * hoverScale})
            rotateX(${tiltX}deg) 
            rotateY(${tiltY + entranceRotate}deg)
          `,
          transformStyle: 'preserve-3d',
          transition: 'none',
        }}
      >
        {/* Card shadow */}
        <div
          style={{
            position: 'absolute',
            inset: 10,
            bottom: -10 - hoverElevation,
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: videoCards.borderRadius + 4,
            filter: `blur(${15 + hoverElevation}px)`,
            transform: `translateY(${10 + hoverElevation}px) scale(0.95)`,
            opacity: 0.6 + hoverProgress * 0.3,
          }}
        />
        
        {/* Poster container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height,
            backgroundColor: colors.bgElevated,
            borderRadius: videoCards.borderRadius,
            overflow: 'hidden',
            border: `1px solid rgba(255, 255, 255, ${0.1 + hoverProgress * 0.1})`,
          }}
        >
          {/* Thumbnail image */}
          <Img
            src={staticFile(`thumbnails/${thumbnail}`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Shine sweep effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(
                105deg,
                transparent ${shineProgress * 100 - 30}%,
                rgba(255, 255, 255, 0.15) ${shineProgress * 100}%,
                transparent ${shineProgress * 100 + 30}%
              )`,
              pointerEvents: 'none',
            }}
          />
          
          {/* Hover overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(
                to top,
                rgba(0, 0, 0, 0.8) 0%,
                rgba(0, 0, 0, 0.4) 40%,
                rgba(0, 0, 0, 0.2) 100%
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: overlayOpacity,
            }}
          >
            {/* Play indicator with glow */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(circle at 30% 30%, 
                  rgba(255, 255, 255, 0.25), 
                  ${colors.glass}
                )`,
                border: `1.5px solid rgba(255, 255, 255, 0.4)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: colors.snow,
                transform: `scale(${playScale})`,
                opacity: playOpacity,
                boxShadow: `0 0 30px rgba(255, 255, 255, 0.2)`,
              }}
            >
              <Play 
                size={24} 
                fill={colors.snow}
                style={{ marginLeft: 3 }}
              />
            </div>
          </div>
          
          {/* Top reflection */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '30%',
              background: `linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.08),
                transparent
              )`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
