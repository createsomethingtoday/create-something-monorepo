/**
 * SuccessScene - Claim now succeeds with evidence
 * 
 * The payoff: after comparing, the claim is grounded in evidence.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Terminal } from '../components';
import { SPEC } from '../spec';

export const SuccessScene: React.FC = () => {
  const { terminal, scenes } = SPEC;
  
  const lines = [
    { 
      text: terminal.successfulClaim.command, 
      type: 'command' as const,
      delay: scenes.success.typingDelay,
    },
    ...terminal.successfulClaim.output.map(text => ({
      text,
      type: text.startsWith('✓') ? 'success' as const : 
            text === '' ? 'output' as const :
            'dim' as const,
      delay: text === '' ? 6 : 15,
    })),
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
        typingSpeed={1.8}
        outputStagger={15}
        showTrailingPrompt={false}
      />
    </AbsoluteFill>
  );
};

export default SuccessScene;
