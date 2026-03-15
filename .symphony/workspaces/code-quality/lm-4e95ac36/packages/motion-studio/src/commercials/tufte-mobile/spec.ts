/**
 * Tufte Mobile Specification
 * 
 * Demonstrates how wireframe intent survives responsive transformation
 * through Edward Tufte's data visualization principles.
 * 
 * Story: Wireframe → Desktop Embodiment → Mobile Constraint → Tufte Transform → Mobile Success
 * 
 * Style: Nicely Said — clarity over cleverness, specificity over generality
 */

export const TUFTE_MOBILE_SPEC = {
  // Video configuration
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 1350, // ~45 seconds
  
  // Product information
  product: {
    name: 'Tufte for Mobile',
    tagline: 'The form changed. The meaning didn\'t.',
    url: 'createsomething.io/papers/tufte-mobile-optimization',
  },
  
  // Canon-compliant color tokens
  colors: {
    // Backgrounds
    bgBase: '#000000',
    bgElevated: 'rgba(255, 255, 255, 0.03)',
    bgSurface: 'rgba(255, 255, 255, 0.05)',
    bgSubtle: 'rgba(255, 255, 255, 0.02)',
    
    // Foreground
    fgPrimary: '#ffffff',
    fgSecondary: 'rgba(255, 255, 255, 0.7)',
    fgMuted: 'rgba(255, 255, 255, 0.5)',
    fgTertiary: 'rgba(255, 255, 255, 0.3)',
    
    // Borders
    borderDefault: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    borderEmphasis: 'rgba(255, 255, 255, 0.2)',
    
    // Semantic
    success: '#44aa44',
    successMuted: 'rgba(68, 170, 68, 0.2)',
    warning: '#f59e0b',
    error: '#cc4444',
    
    // Wireframe
    wireframe: 'rgba(255, 255, 255, 0.15)',
    wireframeBorder: 'rgba(255, 255, 255, 0.08)',
    
    // Annotation
    annotation: 'rgba(255, 255, 255, 0.6)',
    annotationBg: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Typography
  fonts: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  
  // Dashboard card data
  cards: [
    {
      id: 'revenue',
      title: 'Revenue',
      value: '$47.2K',
      rawValue: 47200,
      trend: [32, 35, 38, 41, 39, 44, 47.2], // thousands
      change: 12.3,
      changeDirection: 'up' as const,
    },
    {
      id: 'sessions',
      title: 'Sessions',
      value: '8,421',
      rawValue: 8421,
      trend: [6200, 6800, 7100, 7400, 7900, 8100, 8421],
      change: 8.7,
      changeDirection: 'up' as const,
    },
    {
      id: 'uptime',
      title: 'Uptime',
      value: '99.2%',
      rawValue: 99.2,
      trend: [98.9, 99.1, 98.8, 99.4, 99.0, 99.3, 99.2],
      change: 0.1,
      changeDirection: 'up' as const,
    },
  ],
  
  // Phone frame dimensions (iPhone 14 Pro proportions)
  phone: {
    width: 375,
    height: 812,
    borderRadius: 47,
    notchWidth: 126,
    notchHeight: 34,
    scale: 0.6, // Scale for composition
  },
  
  // Scene timing (in frames at 30fps)
  scenes: {
    // Scene 1: Wireframe Introduction (0-6s)
    wireframeIntro: {
      start: 0,
      duration: 180,
      phases: {
        silenceIn: { start: 0, duration: 60 },
        cardsReveal: { start: 60, duration: 90, stagger: 20 },
        hold: { start: 150, duration: 30 },
      },
    },
    
    // Scene 2: Desktop Embodiment (6-15s)
    desktopEmbodiment: {
      start: 180,
      duration: 270,
      phases: {
        embodimentStart: { start: 0, duration: 120 },
        valuesCountUp: { start: 60, duration: 90 },
        sparklinesReveal: { start: 90, duration: 60 },
        hold: { start: 210, duration: 60 },
      },
    },
    
    // Scene 3: The Constraint (15-21s)
    constraint: {
      start: 450,
      duration: 180,
      phases: {
        phoneAppear: { start: 0, duration: 45 },
        cardsSquish: { start: 30, duration: 60 },
        problemReveal: { start: 90, duration: 60 },
        hold: { start: 150, duration: 30 },
      },
    },
    
    // Scene 4: Tufte Transformation (21-33s)
    tufteTransform: {
      start: 630,
      duration: 360,
      phases: {
        dataInkRatio: { start: 0, duration: 72 },      // Borders/shadows fade
        sparklines: { start: 72, duration: 72 },       // Charts compress
        directLabeling: { start: 144, duration: 72 },  // Labels move inline
        informationDensity: { start: 216, duration: 72 }, // Cards stack
        smallMultiples: { start: 288, duration: 72 },  // Consistent rhythm
      },
    },
    
    // Scene 5: Mobile Embodiment (33-39s)
    mobileEmbodiment: {
      start: 990,
      duration: 180,
      phases: {
        reveal: { start: 0, duration: 60 },
        scanAnimation: { start: 60, duration: 60 },
        hold: { start: 120, duration: 60 },
      },
    },
    
    // Scene 6: Close (39-45s)
    close: {
      start: 1170,
      duration: 180,
      phases: {
        splitView: { start: 0, duration: 60 },
        logoReveal: { start: 60, duration: 45 },
        taglineReveal: { start: 90, duration: 45 },
        silenceOut: { start: 135, duration: 45 },
      },
    },
  },
  
  // Tufte principles with annotations
  tuftePrinciples: [
    {
      id: 'data-ink-ratio',
      name: 'Data-ink ratio',
      description: 'Remove all non-data ink',
      frame: 630,
    },
    {
      id: 'sparklines',
      name: 'Sparklines',
      description: 'Word-sized graphics',
      frame: 702,
    },
    {
      id: 'direct-labeling',
      name: 'Direct labeling',
      description: 'Label data directly',
      frame: 774,
    },
    {
      id: 'information-density',
      name: 'Information density',
      description: 'Maximize data per pixel',
      frame: 846,
    },
    {
      id: 'small-multiples',
      name: 'Small multiples',
      description: 'Consistent, comparable units',
      frame: 918,
    },
  ],
  
  // Vox treatment settings
  voxTreatment: {
    posterizeFrameRate: 12,    // Cutting on twos
    grainIntensity: 0.06,
    vignetteIntensity: 0.25,
    chromaticAberration: 0.8,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    springConfig: {
      damping: 20,
      stiffness: 80,
      mass: 1,
    },
    embodimentDuration: 120,
    staggerDelay: 20,
  },
} as const;

export type TufteMobileSpec = typeof TUFTE_MOBILE_SPEC;
export type CardData = typeof TUFTE_MOBILE_SPEC.cards[number];
export type TuftePrinciple = typeof TUFTE_MOBILE_SPEC.tuftePrinciples[number];

export default TUFTE_MOBILE_SPEC;
