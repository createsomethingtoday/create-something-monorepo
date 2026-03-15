/**
 * FailedClaimScene - Agent tries to claim without evidence
 * 
 * Shows the core problem: an agent confidently asserting "95% similar"
 * without ever comparing the files. Ground blocks this hallucination.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Terminal } from '../components';
import { SPEC } from '../spec';

export const FailedClaimScene: React.FC = () => {
  const { terminal, scenes } = SPEC;
  
  const lines = [
    { 
      text: terminal.failedClaim.command, 
      type: 'command' as const,
      delay: scenes.failedClaim.typingDelay,
    },
    ...terminal.failedClaim.output.map(text => ({
      text,
      type: text.startsWith('✗') ? 'error' as const : 
            text.includes('ground compare') ? 'dim' as const : 
            'output' as const,
      delay: text === '' ? 0 : 10,
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
        typingSpeed={scenes.failedClaim.typingSpeed}
        outputStagger={12}
        showTrailingPrompt={false}
      />
    </AbsoluteFill>
  );
};

export default FailedClaimScene;
