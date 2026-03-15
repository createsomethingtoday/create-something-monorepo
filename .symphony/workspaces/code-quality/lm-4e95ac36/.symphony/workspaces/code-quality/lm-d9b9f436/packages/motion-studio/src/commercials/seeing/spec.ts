/**
 * Seeing Commercial Specification
 * 
 * Timing, scene configuration, and constants for the Seeing commercial.
 * Product: learn.createsomething.space/seeing
 */

export const SPEC = {
  // Video configuration
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 900, // 30 seconds
  
  // Product information
  product: {
    name: 'Seeing',
    url: 'learn.createsomething.space/seeing',
    tagline: 'Learn to See',
    price: 'Free',
    features: [
      'Philosophy lessons',
      'Triad commands (/dry, /rams, /heidegger)',
      'Self-assessed reflections',
      'Progress tracking',
      '1,000 free requests/day',
    ],
  },
  
  // Installation commands
  commands: [
    'npm install -g @google/gemini-cli',
    'gemini extensions install @createsomething/seeing',
    '/lesson what-is-creation',
  ],
  
  // The Subtractive Triad
  triad: [
    {
      command: '/dry',
      question: 'Have I built this before?',
      action: 'UNIFY',
    },
    {
      command: '/rams',
      question: 'Does this earn its existence?',
      action: 'REMOVE',
    },
    {
      command: '/heidegger',
      question: 'Does this serve the whole?',
      action: 'RECONNECT',
    },
  ],
  
  // Scene timing (in frames at 30fps)
  scenes: {
    coldOpen: {
      start: 0,
      duration: 120, // 4s
      content: {
        line1: 'Same logic in three places.',
        line2: "Now they're different.",
      },
    },
    triad: {
      start: 120,
      duration: 300, // 10s
      questionHold: 60, // 2s per question
      transitionDuration: 15,
    },
    demonstration: {
      start: 420,
      duration: 180, // 6s
      // Text for progressive erasure
      fullText: 'We help businesses identify operational inefficiencies and implement AI-powered automation solutions that streamline workflows and remove what obscures.',
      keepWords: ['We', 'remove', 'what', 'obscures'],
      finalText: 'We remove what obscures.',
    },
    cta: {
      start: 600,
      duration: 180, // 6s
      commandStagger: 25,
    },
    close: {
      start: 780,
      duration: 120, // 4s
      url: 'learn.createsomething.space/seeing',
      tagline: 'Start free. Graduate when ready.',
      logo: 'CREATE SOMETHING .learn',
    },
  },
  
  // Vox treatment settings
  voxTreatment: {
    posterizeFrameRate: 12, // Cutting on twos
    grainIntensity: 0.06,
    vignetteIntensity: 0.25,
    chromaticAberration: 0.8,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    entranceDuration: 15,
    exitDuration: 12,
    holdDuration: 60,
    defaultEntrance: 'slide-left' as const,
    defaultExit: 'push-up' as const,
  },
} as const;

export type SeeingSpec = typeof SPEC;

export default SPEC;
