/**
 * Ground Commercial Specification
 * 
 * 60-second commercial showing the real Ground CLI experience.
 * Product: github.com/createsomethingtoday/ground
 * 
 * Real scenario: hashString function duplicated between analytics.ts and +server.ts
 * This actually happened in this codebase while building with agents.
 */

export const SPEC = {
  // Video configuration
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 1800, // 60 seconds
  
  // Product information
  product: {
    name: 'Ground',
    tagline: 'No claim without evidence.',
    url: 'github.com/createsomethingtoday/ground',
    npmPackage: '@createsomething/ground-mcp',
    philosophy: 'Computation before synthesis.',
  },
  
  // Terminal content - real CLI experience from this codebase
  terminal: {
    // Scene 1: Find duplicates across the monorepo
    findDuplicates: {
      command: 'ground find duplicate-functions ./packages --min-lines 5',
      output: [
        '',
        'Finding duplicate functions in ./packages',
        '  Threshold: 80%',
        '  Min function lines: 5',
        '',
        'Checking 200 files...',
        '',
        'Found 3 duplicate functions:',
        '',
        '1. Function \'hashString\' (100% similar)',
        '   src/lib/utils/analytics.ts',
        '   src/routes/api/analytics/track/+server.ts',
        '',
      ],
    },
    
    // Scene 2: Try to claim without evidence
    failedClaim: {
      command: 'ground claim duplicate analytics.ts track/+server.ts "same hash"',
      output: [
        '',
        '✗ Claim blocked',
        '',
        '  You need to compare these files first:',
        '  ground compare analytics.ts track/+server.ts',
        '',
      ],
    },
    
    // Scene 3: Compare the files
    comparison: {
      command: 'ground compare src/lib/utils/analytics.ts src/routes/api/analytics/track/+server.ts',
      output: [
        '',
        'Comparing analytics.ts ↔ +server.ts',
        '',
        '  Parsing AST...',
        '    analytics.ts: 1,247 nodes',
        '    +server.ts: 891 nodes',
        '',
        '  Computing similarity...',
        '',
        '  Similarity: 33.1%',
        '  Structure:  50.8%',
        '',
        '✓ Comparison stored.',
        '',
      ],
    },
    
    // Scene 4: Now claim succeeds
    successfulClaim: {
      command: 'ground claim duplicate analytics.ts +server.ts "hashString copied"',
      output: [
        '',
        '✓ Claim recorded',
        '',
        '  Type: duplicate',
        '  Reason: hashString copied',
        '',
      ],
    },
    
    // Scene 5: Installation
    install: {
      command: 'npm install -g @createsomething/ground-mcp',
    },
  },
  
  // Scene timing (in frames at 30fps)
  // Pure terminal flow - let the viewer experience the parsing
  scenes: {
    // Failed claim with error message
    failedClaim: {
      start: 0,
      duration: 270, // 9s - typing + error display + breathe
      typingDelay: 45, // Let terminal settle
      typingSpeed: 1.8, // chars per frame (deliberate pace)
    },
    
    // Run comparison command - the heart of the experience
    comparison: {
      start: 270,
      duration: 270, // 9s - feel the codebase being parsed
      typingDelay: 30,
      outputStagger: 18, // Slower reveals, let each line land
    },
    
    // Successful claim
    success: {
      start: 540,
      duration: 180, // 6s
      typingDelay: 30,
    },
    
    // CTA: npm install
    cta: {
      start: 720,
      duration: 120, // 4s
    },
    
    // Close: Logo, URL
    close: {
      start: 840,
      duration: 60, // 2s - brief, confident
      tagline: 'No hallucination. Just evidence.',
      logo: 'GROUND',
    },
  },
  
  // Terminal styling - matches WezTerm config
  // Pure black, pure white, muted functional accents
  terminalStyle: {
    backgroundColor: '#000000',
    borderColor: '#000000',
    textColor: '#ffffff',
    promptColor: '#666666', // Muted prompt, not distracting
    errorColor: '#cc4444', // Muted red
    successColor: '#44aa44', // Muted green
    dimColor: '#666666', // Comments/secondary
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '1.5rem',
    lineHeight: 1.5,
    padding: '26px', // Golden ratio
    borderRadius: '0px', // No decoration
  },
  
  // Vox treatment settings (slightly different from Seeing - more "dev tool" feel)
  voxTreatment: {
    posterizeFrameRate: 15, // Slightly smoother for terminal readability
    grainIntensity: 0.04, // Less grain for text clarity
    vignetteIntensity: 0.2,
    chromaticAberration: 0.5,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    terminalEntrance: 20,
    cursorBlink: 15, // frames per blink cycle
    typingCursorWidth: 2,
    lineRevealDuration: 12,
    holdDuration: 60,
  },
  
  // Audio markers (frames) - for syncing with recorded voiceover
  audioMarkers: {
    vo1_95Similar: 60,
    vo2_withoutComparing: 150,
    vo3_simpleRule: 240,
    vo4_cantClaim: 300,
    vo5_compareFirst: 510,
    vo6_noHallucination: 600,
  },
} as const;

export type GroundSpec = typeof SPEC;

export default SPEC;
