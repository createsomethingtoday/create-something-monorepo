/**
 * HeatmapScene - The engagement heatmap (HERO SCENE)
 * 
 * This is what makes Outerfields different. The heatmap builds,
 * showing "Most Replayed" moments. The tooltip appears at the peak.
 * 
 * Duration: 8 seconds (240 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Pause, Volume2, Maximize2, BarChart3 } from 'lucide-react';
import { EngagementHeatmap } from '../components/EngagementHeatmap';
import { SPEC } from '../spec';

export const HeatmapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, fonts, engagementHeatmap } = SPEC;
  const { heatmap } = scenes;
  
  // Progress continues from previous scene
  const progressPercent = interpolate(
    frame,
    [0, 200],
    [42, 78],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Heatmap reveal - subtle "unfold" from progress bar
  const heatmapReveal = spring({
    frame: Math.max(0, frame - heatmap.buildStart),
    fps,
    config: { damping: 25, stiffness: 60 },
  });
  
  const heatmapHeight = interpolate(heatmapReveal, [0, 1], [0, 55]);
  const heatmapOpacity = interpolate(heatmapReveal, [0, 1], [0, 1]);
  
  // Tooltip entrance
  const tooltipDelay = heatmap.tooltipAppear;
  const tooltipSpring = spring({
    frame: Math.max(0, frame - tooltipDelay),
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  
  const tooltipOpacity = interpolate(tooltipSpring, [0, 1], [0, 1]);
  const tooltipY = interpolate(tooltipSpring, [0, 1], [15, 0]);
  const tooltipScale = interpolate(tooltipSpring, [0, 1], [0.9, 1]);
  
  // Peak position
  const heatmapData: number[] = [...engagementHeatmap.data];
  const maxVal = Math.max(...heatmapData);
  const peakIndex = heatmapData.findIndex(v => v === maxVal);
  const peakPosition = (peakIndex / (heatmapData.length - 1)) * 100;
  
  // Playhead glow pulse
  const glowPulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  
  // Badge reveal
  const badgeSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgPure }}>
      {/* Dark backdrop */}
      <AbsoluteFill style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }} />
      
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
            
            {/* Analytics badge */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(124, 43, 238, 0.3)',
                opacity: badgeSpring,
                transform: `translateY(${interpolate(badgeSpring, [0, 1], [-10, 0])}px)`,
              }}
            >
              <BarChart3 size={16} color="#b482ff" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#b482ff',
                  fontFamily: fonts.sansFallback,
                }}
              >
                Engagement Analytics
              </span>
            </div>
            
            {/* Controls gradient - taller for heatmap */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '100px 28px 28px',
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.8) 40%, transparent 100%)',
              }}
            >
              {/* Heatmap container */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: 20,
                  height: 75,
                }}
              >
                {/* The engagement heatmap - THE HERO */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 15,
                    left: 0,
                    right: 0,
                    height: heatmapHeight,
                    opacity: heatmapOpacity,
                    overflow: 'visible',
                  }}
                >
                  <EngagementHeatmap
                    buildStart={heatmap.buildStart}
                    buildDuration={heatmap.buildDuration}
                    width={1044}
                    height={55}
                    showParticles={true}
                    showPeakGlow={true}
                  />
                </div>
                
                {/* Progress bar (below heatmap) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${progressPercent}%`,
                      backgroundColor: colors.sun,
                      borderRadius: 3,
                      boxShadow: `0 0 ${10 * glowPulse}px ${colors.sun}`,
                    }}
                  />
                  
                  {/* Playhead */}
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
                    }}
                  />
                </div>
                
                {/* "Most Replayed" tooltip */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 85,
                    left: `${peakPosition}%`,
                    transform: `translateX(-50%) translateY(${tooltipY}px) scale(${tooltipScale})`,
                    backgroundColor: 'rgba(15, 15, 15, 0.98)',
                    border: '1px solid rgba(124, 43, 238, 0.4)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    opacity: tooltipOpacity,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(124, 43, 238, 0.15)',
                    transformOrigin: 'bottom center',
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
                      borderLeft: '10px solid transparent',
                      borderRight: '10px solid transparent',
                      borderTop: '10px solid rgba(15, 15, 15, 0.98)',
                    }}
                  />
                  
                  {/* Purple dot indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#b482ff',
                        boxShadow: '0 0 8px rgba(124, 43, 238, 0.6)',
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b482ff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontFamily: fonts.sansFallback,
                      }}
                    >
                      Most Replayed
                    </div>
                  </div>
                  
                  <div
                    style={{
                      fontSize: 14,
                      color: colors.snow,
                      fontFamily: fonts.sansFallback,
                      opacity: 0.9,
                    }}
                  >
                    89% of viewers watched this
                  </div>
                </div>
              </div>
              
              {/* Control buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
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
                
                <div
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: colors.slate,
                    fontFamily: fonts.monoFallback,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.floor(progressPercent * 0.05)}:{String(Math.floor((progressPercent * 3.1) % 60)).padStart(2, '0')} / 4:05
                </div>
                
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

export default HeatmapScene;
