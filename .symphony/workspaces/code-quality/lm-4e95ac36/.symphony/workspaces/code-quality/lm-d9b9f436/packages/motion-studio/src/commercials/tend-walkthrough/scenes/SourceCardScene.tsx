/**
 * SourceCardScene - Isolated SourceCard component walkthrough
 * 
 * Shows the SourceCard in isolation, scaled up for visibility.
 * Demonstrates wireframe → styled transition and status changes.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { SourceCard } from '../../tend/components/SourceCard';

export const SourceCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, sources } = WALKTHROUGH_SPEC;
  const { phases } = scenes.sourceCard;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Wireframe reveal spring
  const revealSpring = spring({
    frame: frame - phases.wireframeReveal.start,
    fps,
    config: animation.springConfig,
  });
  
  const cardScale = interpolate(revealSpring, [0, 1], [0.8, animation.componentScale]);
  const cardOpacity = interpolate(revealSpring, [0, 1], [0, 1]);
  
  // Embodiment progress (wireframe → styled)
  const embodimentProgress = interpolate(
    frame,
    [phases.embodiment.start, phases.embodiment.start + phases.embodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Status change (disconnected → connected)
  const statusProgress = interpolate(
    frame,
    [phases.statusChange.start, phases.statusChange.start + phases.statusChange.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const getStatus = (): 'disconnected' | 'connecting' | 'connected' => {
    if (statusProgress < 0.3) return 'disconnected';
    if (statusProgress < 0.7) return 'connecting';
    return 'connected';
  };
  
  // Use first source as example
  const exampleSource = sources[0];
  
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
      {/* Scaled up SourceCard - fills 4K frame */}
      <div
        style={{
          transform: `scale(${cardScale * 2.5})`, // 2.5x for 4K visibility
          opacity: cardOpacity,
        }}
      >
        <SourceCard
          name={exampleSource.name}
          type={exampleSource.type}
          icon={exampleSource.icon as any}
          status={getStatus()}
          embodiment={embodimentProgress}
        />
      </div>
    </div>
  );
};

export default SourceCardScene;
