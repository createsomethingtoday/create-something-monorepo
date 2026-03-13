/**
 * CTAScene - Installation command
 * 
 * Same terminal style. Consistent.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Terminal } from '../components';
import { SPEC } from '../spec';

export const CTAScene: React.FC = () => {
  const { terminal } = SPEC;
  
  const lines = [
    { 
      text: terminal.install.command, 
      type: 'command' as const,
      delay: 15,
    },
  ];
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SPEC.voxTreatment.backgroundTint,
      }}
    >
      <Terminal
        lines={lines}
        startFrame={0}
        typeCommands={true}
        typingSpeed={1.5}
        showTrailingPrompt={false}
      />
    </AbsoluteFill>
  );
};

export default CTAScene;
