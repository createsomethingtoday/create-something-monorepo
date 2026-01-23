/**
 * ComparisonScene - Agent runs comparison, gets evidence
 * 
 * Shows the solution: Ground requires computation before synthesis.
 * The agent runs `ground compare` and gets actual similarity data.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Terminal } from '../components';
import { SPEC } from '../spec';

export const ComparisonScene: React.FC = () => {
  const { terminal, scenes } = SPEC;
  
  const lines = [
    { 
      text: terminal.comparison.command, 
      type: 'command' as const,
      delay: scenes.comparison.typingDelay,
    },
    ...terminal.comparison.output.map(text => ({
      text,
      type: text.startsWith('✓') ? 'success' as const : 
            text.includes('Similarity:') ? 'output' as const :
            text.includes('nodes') ? 'dim' as const :
            text === '' ? 'output' as const :
            'dim' as const,
      delay: text === '' ? 6 : scenes.comparison.outputStagger,
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
        outputStagger={scenes.comparison.outputStagger}
        showTrailingPrompt={false}
      />
    </AbsoluteFill>
  );
};

export default ComparisonScene;
