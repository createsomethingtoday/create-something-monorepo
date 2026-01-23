/**
 * Outerfields Commercial Specification
 * 
 * 30-second "show don't tell" commercial for Outerfields PCN platform.
 * Clean, focused, story-driven - like Ground commercial.
 * 
 * Story: Cards → Player → Heatmap (hero) → Stats → Logo
 */

// Import fonts to ensure they're loaded
import { fonts } from './fonts';

export const SPEC = {
  // Typography (Outerfields brand)
  fonts,
  
  // Video configuration
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 900, // 30 seconds
  
  // Product information
  product: {
    name: 'OUTERFIELDS',
    tagline: null, // No text - show don't tell
    url: 'outerfields.com',
  },
  
  // Outerfields brand palette
  colors: {
    spaceBlack: '#1E1E1E',
    bgPure: '#0a0a0a', // Darker for video player
    sun: '#F45126',
    sunHover: '#e04520',
    lavender: '#DABFFF',
    sand: '#D6D1B1',
    snow: '#FFFFFF',
    slate: '#6B717E',
    engagementPurple: 'rgba(124, 43, 238, 0.8)',
    engagementPurpleLight: 'rgba(124, 43, 238, 0.4)',
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    bgElevated: '#252525',
    bgSurface: 'rgba(255, 255, 255, 0.05)',
    borderDefault: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Scene timing (in frames at 30fps)
  // Focused story: Cards → Player → Heatmap → Stats → Logo
  scenes: {
    // Scene 1: Content cards appear
    cards: {
      start: 0,
      duration: 240, // 8 seconds
      cardCascadeStart: 30, // Start after 1s
      cardCascadeStagger: 6, // 6 frames between cards
      highlightCard: 180, // Highlight a card at 6s
    },
    
    // Scene 2: Video player opens
    player: {
      start: 240,
      duration: 240, // 8 seconds
      modalAppear: 0,
      progressStart: 60, // Progress starts at 2s into scene
    },
    
    // Scene 3: Engagement heatmap builds (HERO SCENE)
    heatmap: {
      start: 480,
      duration: 240, // 8 seconds
      buildStart: 30, // Start building at 1s into scene
      buildDuration: 120, // 4s to build
      tooltipAppear: 180, // Tooltip at 6s into scene
    },
    
    // Scene 4: Stats glimpse
    stats: {
      start: 720,
      duration: 120, // 4 seconds
      countStart: 15,
      countDuration: 60,
    },
    
    // Scene 5: Logo close
    logo: {
      start: 840,
      duration: 60, // 2 seconds
      revealStart: 15,
      revealDuration: 30,
    },
  },
  
  // Video card configuration
  videoCards: {
    aspectRatio: 4 / 3,
    width: 280,
    borderRadius: 12,
    thumbnails: [
      'crew-call/ep01.jpg',
      'crew-call/ep02.jpg', 
      'crew-call/ep03.jpg',
      'kodiak/ep01.jpg',
      'kodiak/ep02.jpg',
      'reconnecting/ep01.jpg',
      'lincoln/ep01.jpg',
      'lincoln/ep02.jpg',
    ],
  },
  
  // Engagement heatmap configuration
  engagementHeatmap: {
    // Sample data - peaks represent "Most Replayed" moments
    data: [
      0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65,
      0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 0.95, 0.9, 0.85,
      0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35,
      0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.75, 0.7, 0.65,
    ],
    peakIndex: 16, // Index of highest engagement
    gradientColors: {
      start: 'rgba(124, 43, 238, 0)',
      mid: 'rgba(124, 43, 238, 0.4)',
      end: 'rgba(124, 43, 238, 0.8)',
    },
  },
  
  // Vox treatment - subtle, clean
  voxTreatment: {
    posterizeFrameRate: 30, // Smooth - we want clean UI
    grainIntensity: 0.015, // Very subtle
    vignetteIntensity: 0.1,
    chromaticAberration: 0.2,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    ease: {
      standard: [0.4, 0.0, 0.2, 1] as const,
      smooth: [0.0, 0.0, 0.2, 1] as const,
    },
    microDuration: 6,
    standardDuration: 9,
    complexDuration: 15,
  },
} as const;

export type OuterfieldsSpec = typeof SPEC;

export default SPEC;
