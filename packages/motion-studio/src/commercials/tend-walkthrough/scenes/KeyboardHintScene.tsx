/**
 * KeyboardHintScene - Isolated KeyboardHint component walkthrough
 * 
 * Shows keyboard hints demonstrating tactile efficiency.
 * The interface teaches itself through these cues.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { KeyboardHint } from '../../tend/components/KeyboardHint';

export const KeyboardHintScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation } = WALKTHROUGH_SPEC;
  const { phases } = scenes.keyboardHint;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Keys reveal
  const revealSpring = spring({
    frame: frame - phases.reveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const keysOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  const keysScale = interpolate(revealSpring, [0, 1], [0.9, 1]);
  
  // Key press demo - cycle through each key
  const keyPressFrame = frame - phases.keyPressDemo.start;
  const keyPressCycle = Math.floor(keyPressFrame / 40) % 3;
  
  const getKeyPressProgress = (keyIndex: number) => {
    if (keyPressFrame < 0) return 0;
    if (keyPressCycle !== keyIndex) return 0;
    const cycleFrame = keyPressFrame % 40;
    return interpolate(cycleFrame, [0, 15, 40], [0, 1, 0]);
  };
  
  const keys = [
    { label: 'A', action: 'Approve', color: 'success' as const },
    { label: 'D', action: 'Dismiss', color: 'default' as const },
    { label: 'S', action: 'Snooze', color: 'warning' as const },
  ];
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: sceneOpacity,
      }}
    >
      {/* Keyboard hints row - scaled 2.5x for 4K visibility */}
      <div
        style={{
          display: 'flex',
          gap: 64,
          transform: `scale(${keysScale * 2.5})`, // 2.5x scale for 4K
          opacity: keysOpacity,
        }}
      >
        {keys.map((key, i) => {
          // Stagger entrance
          const staggerSpring = spring({
            frame: frame - phases.reveal.start - (i * 10),
            fps,
            config: animation.springConfig,
          });
          
          const staggerOpacity = interpolate(staggerSpring, [0, 1], [0, 1]);
          const staggerY = interpolate(staggerSpring, [0, 1], [20, 0]);
          
          return (
            <div
              key={key.label}
              style={{
                opacity: staggerOpacity,
                transform: `translateY(${staggerY}px)`,
              }}
            >
              <KeyboardHint
                keyLabel={key.label}
                action={key.action}
                isPressed={keyPressCycle === i && keyPressFrame >= 0}
                pressProgress={getKeyPressProgress(i)}
                color={key.color}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyboardHintScene;
