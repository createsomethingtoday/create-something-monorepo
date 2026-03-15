/**
 * ConnectionScene - Sources connecting animation
 * 
 * Same grid as SourcesScene, but with sources animating to connected state.
 * Status badges transition: gray → amber → green.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { SourceCard } from '../components';
import { SPEC } from '../spec';

export const ConnectionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sources, colors, scenes, scale } = SPEC;
  const { connectCascade, rapidCascade } = scenes.connection;
  
  // Determine connection status for each source
  const getSourceStatus = (index: number): 'disconnected' | 'connecting' | 'connected' => {
    let connectionStart: number;
    
    // First 4 sources connect slowly
    if (index < 4) {
      connectionStart = connectCascade.start + (index * connectCascade.stagger);
    } else {
      // Remaining sources connect rapidly
      connectionStart = rapidCascade.start + ((index - 4) * rapidCascade.stagger);
    }
    
    const connectionProgress = frame - connectionStart;
    
    if (connectionProgress < 0) return 'disconnected';
    if (connectionProgress < 20) return 'connecting';
    return 'connected';
  };
  
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
            gridTemplateColumns: `repeat(4, ${200 * scale}px)`,
            gridTemplateRows: `repeat(2, ${100 * scale}px)`,
            gap: 20 * scale,
          }}
        >
          {sources.map((source, index) => {
            const status = getSourceStatus(index);
            
            // Subtle pulse when connected
            const pulsePhase = (frame + index * 10) / 30;
            const pulse = status === 'connected' 
              ? 1 + Math.sin(pulsePhase) * 0.02 
              : 1;
            
            return (
              <div
                key={source.id}
                style={{
                  transform: `scale(${pulse})`,
                  transition: 'transform 0.1s',
                }}
              >
                <SourceCard
                  name={source.name}
                  type={source.type}
                  icon={source.icon as any}
                  status={status}
                  embodiment={1} // Fully styled from previous scene
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ConnectionScene;
