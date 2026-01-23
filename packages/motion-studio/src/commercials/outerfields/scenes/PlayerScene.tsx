/**
 * PlayerScene - Video player opens
 * 
 * Clean video player modal. Progress bar animates.
 * Sets up for the heatmap reveal in the next scene.
 * 
 * Duration: 8 seconds (240 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Pause, Volume2, Maximize2 } from 'lucide-react';
import { SPEC } from '../spec';

export const PlayerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts } = SPEC;
  const { player } = scenes;
  
  // Modal entrance with spring
  const modalSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });
  
  const modalScale = interpolate(modalSpring, [0, 1], [0.92, 1]);
  const modalOpacity = interpolate(modalSpring, [0, 1], [0, 1]);
  const modalY = interpolate(modalSpring, [0, 1], [30, 0]);
  
  // Backdrop fade
  const backdropOpacity = interpolate(
    frame,
    [0, 20],
    [0, 0.95],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Progress animation - starts slowly, feels like video playing
  const progressPercent = interpolate(
    frame,
    [player.progressStart, player.progressStart + 180],
    [0, 42],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Playhead glow pulse
  const glowPulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPure }}>
      {/* Dark backdrop */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        }}
      />
      
      {/* Video player modal */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1100,
            backgroundColor: colors.spaceBlack,
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            borderRadius: 12,
            overflow: 'hidden',
            transform: `translateY(${modalY}px) scale(${modalScale})`,
            opacity: modalOpacity,
            boxShadow: '0 25px 100px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Video area */}
          <div
            style={{
              position: 'relative',
              aspectRatio: '16 / 9',
              backgroundColor: '#0a0a0a',
            }}
          >
            {/* Thumbnail */}
            <Img
              src={staticFile('thumbnails/crew-call/ep03.jpg')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            
            {/* Controls gradient */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '80px 28px 28px',
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%)',
              }}
            >
              {/* Progress bar container */}
              <div
                style={{
                  position: 'relative',
                  height: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 3,
                  marginBottom: 20,
                  cursor: 'pointer',
                }}
              >
                {/* Progress fill */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${progressPercent}%`,
                    backgroundColor: colors.sun,
                    borderRadius: 3,
                    boxShadow: `0 0 ${8 * glowPulse}px ${colors.sun}`,
                  }}
                />
                
                {/* Playhead dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${progressPercent}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 14,
                    height: 14,
                    backgroundColor: colors.sun,
                    borderRadius: '50%',
                    boxShadow: `0 0 12px ${colors.sun}`,
                    opacity: modalOpacity,
                  }}
                />
              </div>
              
              {/* Control buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                {/* Pause button */}
                <div 
                  style={{ 
                    color: colors.snow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Pause size={20} />
                </div>
                
                {/* Time display */}
                <div
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: colors.slate,
                    fontFamily: fonts.monoFallback,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.floor(progressPercent * 0.1)}:{String(Math.floor((progressPercent * 6) % 60)).padStart(2, '0')} / 4:05
                </div>
                
                {/* Right controls */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ color: colors.snow, opacity: 0.6 }}>
                    <Volume2 size={22} />
                  </div>
                  <div style={{ color: colors.snow, opacity: 0.6 }}>
                    <Maximize2 size={22} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default PlayerScene;
