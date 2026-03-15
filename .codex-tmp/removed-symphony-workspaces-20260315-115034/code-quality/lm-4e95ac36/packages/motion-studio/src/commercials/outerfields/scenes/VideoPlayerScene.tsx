/**
 * VideoPlayerScene - Hero scene with engagement heatmap
 * 
 * Enhanced with:
 * - Cinematic modal entrance with blur backdrop
 * - Glowing progress bar with pulse
 * - Dramatic heatmap reveal
 * - Animated tooltip with spring physics
 * - Video "playback" simulation
 * 
 * Duration: 8 seconds (240 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react';
import { EngagementHeatmap } from '../components/EngagementHeatmap';
import { StarfieldBackground } from '../components/StarfieldBackground';
import { SPEC } from '../spec';

export const VideoPlayerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, engagementHeatmap, fonts } = SPEC;
  const { videoPlayer } = scenes;
  
  // Modal entrance with spring
  const modalSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 1 },
  });
  
  const modalScale = interpolate(modalSpring, [0, 1], [0.9, 1]);
  const modalOpacity = interpolate(modalSpring, [0, 1], [0, 1]);
  const modalY = interpolate(modalSpring, [0, 1], [80, 0]);
  
  // Backdrop blur animation
  const backdropBlur = interpolate(modalSpring, [0, 1], [0, 20]);
  
  // Progress bar animation (simulates video playback)
  const progressPercent = interpolate(
    frame,
    [videoPlayer.progressStart, videoPlayer.progressStart + 180],
    [0, 78],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Progress bar glow pulse
  const progressPulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  
  // Tooltip entrance with spring
  const tooltipSpring = spring({
    frame: Math.max(0, frame - videoPlayer.tooltipAppear),
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.5 },
  });
  
  const tooltipScale = interpolate(tooltipSpring, [0, 1], [0.8, 1]);
  const tooltipOpacity = interpolate(tooltipSpring, [0, 1], [0, 1]);
  const tooltipY = interpolate(tooltipSpring, [0, 1], [10, 0]);
  
  // Peak position for tooltip
  const heatmapData: number[] = [...engagementHeatmap.data];
  const maxVal = Math.max(...heatmapData);
  const peakIndex = heatmapData.findIndex(v => v === maxVal);
  const peakPosition = (peakIndex / (heatmapData.length - 1)) * 100;
  
  // Scene transition
  const sceneFade = interpolate(
    frame,
    [0, 25],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Playhead position indicator
  const playheadX = progressPercent;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      {/* Subtle starfield background */}
      <StarfieldBackground
        fadeInStart={0}
        fadeInDuration={1}
        intensity={0.15}
        showGalaxy={false}
        showShootingStars={false}
        showNebula={true}
      />
      
      {/* Animated blur backdrop */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(0, 0, 0, ${0.7 + modalSpring * 0.2})`,
          backdropFilter: `blur(${backdropBlur}px)`,
          WebkitBackdropFilter: `blur(${backdropBlur}px)`,
          opacity: sceneFade,
        }}
      />
      
      {/* Video player modal */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
          opacity: sceneFade,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1280,
            backgroundColor: colors.spaceBlack,
            border: `1px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: 20,
            overflow: 'hidden',
            transform: `translateY(${modalY}px) scale(${modalScale})`,
            opacity: modalOpacity,
            boxShadow: `
              0 0 0 1px rgba(255, 255, 255, 0.05),
              0 25px 100px rgba(0, 0, 0, 0.8),
              0 0 60px rgba(124, 43, 238, 0.15)
            `,
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
            {/* Thumbnail with subtle animation */}
            <Img
              src={staticFile('thumbnails/crew-call/ep01.jpg')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.7,
                transform: `scale(${1 + frame * 0.0001})`, // Very slow zoom
              }}
            />
            
            {/* Simulated playback overlay (scanlines effect) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(0, 0, 0, 0.03) 2px,
                  rgba(0, 0, 0, 0.03) 4px
                )`,
                pointerEvents: 'none',
              }}
            />
            
            {/* Player controls overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '60px 28px 28px',
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.6) 60%, transparent)',
              }}
            >
              {/* Progress bar with engagement heatmap */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: 16,
                  height: 70,
                }}
              >
                {/* Engagement heatmap */}
                <EngagementHeatmap
                  buildStart={videoPlayer.heatmapBuildStart}
                  buildDuration={videoPlayer.heatmapBuildDuration}
                  width={1220}
                  height={60}
                  showParticles={true}
                  showPeakGlow={true}
                />
                
                {/* Progress fill (glowing line) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 0,
                    height: 4,
                    width: `${progressPercent}%`,
                    background: `linear-gradient(to right, ${colors.sun}, ${colors.sun})`,
                    borderRadius: 2,
                    boxShadow: `
                      0 0 ${10 * progressPulse}px ${colors.sun},
                      0 0 ${20 * progressPulse}px ${colors.sun}60
                    `,
                  }}
                />
                
                {/* Playhead indicator */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: `${playheadX}%`,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: colors.snow,
                    transform: 'translate(-50%, 50%)',
                    boxShadow: `0 0 10px ${colors.sun}`,
                    opacity: progressPercent > 0 ? 1 : 0,
                  }}
                />
                
                {/* "Most Replayed" tooltip */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 80,
                    left: `${peakPosition}%`,
                    transform: `translateX(-50%) translateY(${tooltipY}px) scale(${tooltipScale})`,
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    border: `1px solid rgba(124, 43, 238, 0.4)`,
                    borderRadius: 10,
                    padding: '10px 16px',
                    opacity: tooltipOpacity,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 43, 238, 0.2)',
                  }}
                >
                  {/* Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '8px solid rgba(0, 0, 0, 0.95)',
                    }}
                  />
                  
                    {/* Label with glow */}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b482ff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 3,
                        fontFamily: fonts.sansFallback,
                        textShadow: '0 0 10px rgba(124, 43, 238, 0.5)',
                      }}
                    >
                      Most Replayed
                    </div>
                    
                    {/* Value */}
                    <div
                      style={{
                        fontSize: 13,
                        color: colors.snow,
                        fontFamily: fonts.sansFallback,
                      }}
                    >
                      89% of viewers watched this
                    </div>
                </div>
              </div>
              
              {/* Control bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                {/* Play/Pause */}
                <div style={{ color: colors.snow, cursor: 'pointer' }}>
                  <Pause size={28} />
                </div>
                
                {/* Time display */}
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: colors.slate,
                    fontFamily: fonts.monoFallback,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.floor(progressPercent * 0.052)}:{String(Math.floor((progressPercent * 3.12) % 60)).padStart(2, '0')} / 4:05
                </div>
                
                {/* Volume */}
                <div style={{ color: colors.snow, opacity: 0.8 }}>
                  <Volume2 size={22} />
                </div>
                
                {/* Fullscreen */}
                <div style={{ color: colors.snow, opacity: 0.8 }}>
                  <Maximize2 size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default VideoPlayerScene;
