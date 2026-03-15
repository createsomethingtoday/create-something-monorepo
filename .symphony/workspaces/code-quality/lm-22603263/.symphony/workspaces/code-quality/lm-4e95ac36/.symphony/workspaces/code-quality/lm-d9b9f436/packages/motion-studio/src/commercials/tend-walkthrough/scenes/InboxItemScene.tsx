/**
 * InboxItemScene - Isolated InboxItem component walkthrough
 * 
 * Shows inbox items with focus states and keyboard interaction demo.
 * Demonstrates human attention allocation through priority scores.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { InboxItem } from '../../tend/components/InboxItem';
import { KeyboardHint } from '../../tend/components/KeyboardHint';

export const InboxItemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, inboxItems } = WALKTHROUGH_SPEC;
  const { phases } = scenes.inboxItem;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Panel reveal
  const revealSpring = spring({
    frame: frame - phases.wireframeReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const panelOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  const panelScale = interpolate(revealSpring, [0, 1], [0.9, 1]);
  
  // Embodiment progress
  const embodimentProgress = interpolate(
    frame,
    [phases.embodiment.start, phases.embodiment.start + phases.embodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Focus demo - which item is focused
  const focusProgress = interpolate(
    frame,
    [phases.focusDemo.start, phases.focusDemo.start + phases.focusDemo.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Keyboard demo timing
  const keyboardFrame = frame - phases.keyboardDemo.start;
  const keyAPressed = keyboardFrame >= 0 && keyboardFrame < 60;
  const keyDPressed = keyboardFrame >= 60 && keyboardFrame < 120;
  const keySPressed = keyboardFrame >= 120 && keyboardFrame < 180;
  
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
        gap: 60,
        opacity: sceneOpacity,
      }}
    >
      {/* Inbox items panel - scaled 2x for 4K visibility */}
      <div
        style={{
          transform: `scale(${panelScale * 2})`, // 2x scale for 4K
          opacity: panelOpacity,
          width: 800,
          padding: 32,
          borderRadius: 16,
          background: colors.bgSurface,
          border: `1px solid ${colors.borderDefault}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'hidden',
        }}
      >
        {inboxItems.map((item, i) => (
          <InboxItem
            key={item.id}
            title={item.title}
            sourceType={item.sourceType}
            score={item.score}
            timeAgo={item.timeAgo}
            status="inbox"
            isFocused={focusProgress > 0 && i === 0}
            embodiment={embodimentProgress}
          />
        ))}
      </div>
      
      {/* Keyboard hints - scaled 2x for 4K */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          opacity: interpolate(
            frame,
            [phases.keyboardDemo.start - 30, phases.keyboardDemo.start],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          ),
          transform: 'scale(2)', // 2x scale for 4K visibility
        }}
      >
        <KeyboardHint
          keyLabel="A"
          action="approve"
          isPressed={keyAPressed}
          pressProgress={keyAPressed ? interpolate(keyboardFrame % 60, [0, 30, 60], [0, 1, 0]) : 0}
          color="success"
        />
        <KeyboardHint
          keyLabel="D"
          action="dismiss"
          isPressed={keyDPressed}
          pressProgress={keyDPressed ? interpolate((keyboardFrame - 60) % 60, [0, 30, 60], [0, 1, 0]) : 0}
          color="default"
        />
        <KeyboardHint
          keyLabel="S"
          action="snooze"
          isPressed={keySPressed}
          pressProgress={keySPressed ? interpolate((keyboardFrame - 120) % 60, [0, 30, 60], [0, 1, 0]) : 0}
          color="warning"
        />
      </div>
    </div>
  );
};

export default InboxItemScene;
