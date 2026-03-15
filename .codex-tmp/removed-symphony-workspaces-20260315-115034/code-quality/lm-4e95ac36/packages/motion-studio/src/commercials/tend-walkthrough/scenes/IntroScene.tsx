/**
 * IntroScene - Opening scene showing the whole system as wireframe
 * 
 * Philosophy: The hermeneutic circle begins here.
 * We show the whole before understanding the parts.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation } = WALKTHROUGH_SPEC;
  const { phases } = scenes.intro;
  
  // Overall scene opacity (fade in after silence)
  const sceneOpacity = interpolate(
    frame,
    [phases.silenceIn.duration - 30, phases.silenceIn.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // System wireframe appearance
  const systemSpring = spring({
    frame: frame - phases.textAppear.start,
    fps,
    config: animation.springConfig,
  });
  
  const systemScale = interpolate(systemSpring, [0, 1], [0.95, 1]);
  const systemOpacity = interpolate(systemSpring, [0, 1], [0, 1]);
  
  // Slow breathing animation for wireframes
  const breathe = Math.sin(frame * 0.02) * 0.02 + 1;
  
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
        opacity: sceneOpacity,
      }}
    >
      {/* System overview wireframe - scaled 2x for 4K visibility */}
      <div
        style={{
          transform: `scale(${systemScale * breathe * 2})`, // 2x scale for 4K
          opacity: systemOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
        }}
      >
        {/* Header wireframe */}
        <div
          style={{
            width: 600,
            height: 60,
            borderRadius: 12,
            background: colors.wireframe,
            border: `1px solid ${colors.wireframeBorder}`,
          }}
        />
        
        {/* Main content area - representing the dashboard */}
        <div
          style={{
            display: 'flex',
            gap: 32,
          }}
        >
          {/* Left panel - sources */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={`left-${i}`}
                style={{
                  width: 180,
                  height: 80,
                  borderRadius: 12,
                  background: colors.wireframe,
                  border: `1px solid ${colors.wireframeBorder}`,
                  opacity: 0.6 + (i * 0.1),
                }}
              />
            ))}
          </div>
          
          {/* Center panel - inbox */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div
                key={`center-${i}`}
                style={{
                  width: 400,
                  height: 48,
                  borderRadius: 8,
                  background: colors.wireframe,
                  border: `1px solid ${colors.wireframeBorder}`,
                  opacity: 0.5 + (i * 0.1),
                }}
              />
            ))}
          </div>
          
          {/* Right panel - activity */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={`right-${i}`}
                style={{
                  width: 200,
                  height: 24,
                  borderRadius: 4,
                  background: colors.wireframe,
                  border: `1px solid ${colors.wireframeBorder}`,
                  opacity: 0.4 + (i * 0.1),
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Footer - metrics */}
        <div
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={`footer-${i}`}
              style={{
                width: 160,
                height: 100,
                borderRadius: 16,
                background: colors.wireframe,
                border: `1px solid ${colors.wireframeBorder}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntroScene;
