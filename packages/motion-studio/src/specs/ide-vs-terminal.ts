/**
 * IDE vs Terminal Animation Spec
 * 
 * Demonstrates the transition from chrome-heavy IDE to minimal terminal.
 * Each element dissolves one by one until only the blank canvas remains.
 * 
 * Phases:
 * 1. IDE (0-20%): Full VS Code interface visible
 * 2. DISSOLVING (20-60%): Elements fade away sequentially
 * 3. TERMINAL (60-100%): Pure black terminal with cursor
 */

import type { AnimationSpec } from './types';

export const ideVsTerminalSpec: AnimationSpec = {
  id: 'ide-vs-terminal',
  name: 'IDE vs Terminal',
  description: 'From chrome to canvas. Watch the interface dissolve.',
  
  duration: 5000, // 5 seconds
  fps: 30,
  
  canvas: {
    width: 800,
    height: 450,
    background: '#000000',
  },
  
  phases: [
    {
      id: 'ide',
      label: 'IDE — Chrome everywhere',
      start: 0,
      end: 0.2,
    },
    {
      id: 'dissolving',
      label: 'DISSOLVING — Removing what obscures',
      start: 0.2,
      end: 0.6,
    },
    {
      id: 'terminal',
      label: 'TERMINAL — Only the canvas remains',
      start: 0.6,
      end: 1,
    },
  ],
  
  elements: [
    // IDE Window container
    {
      id: 'ide-window',
      type: 'custom',
      component: 'IDEWindow',
      position: { x: 'center', y: 'center', anchor: 'center' },
      props: {
        // Timing for each element's dissolution (progress values)
        dissolveTimings: {
          sidebar: { start: 0.1, end: 0.25 },
          explorer: { start: 0.15, end: 0.3 },
          tabs: { start: 0.2, end: 0.35 },
          statusBar: { start: 0.25, end: 0.4 },
          lineNumbers: { start: 0.3, end: 0.45 },
          minimap: { start: 0.35, end: 0.5 },
          editorBg: { start: 0.4, end: 0.6 },
        },
        // File tree content
        files: ['src', '  components', '    App.tsx', '    index.ts', '  styles'],
        // Code content
        code: `import React from 'react';

const App = () => {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
};`,
        // Tabs
        tabs: [
          { name: 'App.tsx', active: true },
          { name: 'index.ts', active: false },
        ],
      },
      keyframes: [],
    },
    
    // Terminal overlay (fades in)
    {
      id: 'terminal-overlay',
      type: 'custom',
      component: 'TerminalOverlay',
      position: { x: 'center', y: 'center', anchor: 'center' },
      props: {
        showCursor: true,
        cursorBlinkStart: 0.7, // Start blinking at 70% progress
      },
      keyframes: [
        { at: 0, opacity: 0 },
        { at: 0.5, opacity: 0 },
        { at: 0.65, opacity: 1 },
      ],
    },
  ],
  
  reveal: {
    text: 'The blank canvas.',
    style: 'fade',
    startPhase: 0.8,
  },
};

export default ideVsTerminalSpec;
