/**
 * SourcesScene - Grid of data sources with wireframe → styled transition
 * 
 * Shows 8 source cards in a 2x4 grid.
 * Cards cascade from wireframe to styled state.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { SourceCard } from '../components';
import { SPEC } from '../spec';

export const SourcesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sources, colors, scenes } = SPEC;
  const { wireframeIn, embodimentCascade } = scenes.sources;
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      
      {/* Sources grid */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 200px)',
            gridTemplateRows: 'repeat(2, 100px)',
            gap: 20,
          }}
        >
          {sources.map((source, index) => {
            const row = Math.floor(index / 4);
            const col = index % 4;
            const entranceDelay = wireframeIn.start + (row * 12) + (col * 6);
            
            // Entrance spring
            const entranceProgress = spring({
              frame: Math.max(0, frame - entranceDelay),
              fps,
              config: { damping: 18, stiffness: 80, mass: 1 },
            });
            
            const translateY = interpolate(entranceProgress, [0, 1], [40, 0]);
            const opacity = interpolate(entranceProgress, [0, 1], [0, 1]);
            
            // Embodiment (wireframe → styled)
            const embodimentStart = embodimentCascade.start + (index * embodimentCascade.stagger);
            const embodiment = interpolate(
              frame,
              [embodimentStart, embodimentStart + 45],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            return (
              <div
                key={source.id}
                style={{
                  transform: `translateY(${translateY}px)`,
                  opacity,
                }}
              >
                <SourceCard
                  name={source.name}
                  type={source.type}
                  icon={source.icon as any}
                  status="disconnected"
                  embodiment={embodiment}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default SourcesScene;
