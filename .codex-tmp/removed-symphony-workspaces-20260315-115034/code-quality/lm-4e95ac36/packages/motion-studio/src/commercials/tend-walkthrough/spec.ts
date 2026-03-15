/**
 * TEND Walkthrough Specification
 * 
 * Component-by-component walkthrough of the TEND interface.
 * Meditative pacing with ElevenLabs voiceover.
 * Tone.js ambient soundscape.
 * 
 * Philosophy: Hermeneutic circle — understanding parts requires
 * understanding the whole; understanding the whole emerges from parts.
 */

import { Clipboard, Phone, Shield, FileText, Star, DollarSign, Users, Image } from 'lucide-react';

export const WALKTHROUGH_SPEC = {
  // Video configuration - 4K to match component's 2x scale
  fps: 30,
  width: 3840,
  height: 2160,
  durationInFrames: 4350, // ~2:25 at 30fps (matches voiceover ~2:17 + padding)
  
  // Product information (reused from tend)
  product: {
    name: 'TEND',
    tagline: 'Tend to what matters.',
    url: 'createsomething.agency/tend',
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
    warningMuted: 'rgba(245, 158, 11, 0.2)',
    error: '#cc4444',
    
    // Wireframe
    wireframe: 'rgba(255, 255, 255, 0.15)',
    wireframeBorder: 'rgba(255, 255, 255, 0.08)',
    
    // Highlight (for component isolation)
    highlight: 'rgba(255, 255, 255, 0.02)',
    highlightBorder: 'rgba(255, 255, 255, 0.15)',
  },
  
  // Typography
  fonts: {
    sans: 'Stack Sans Notch, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  
  // Sample data (reused from tend spec)
  sources: [
    { id: 'open-dental', name: 'Open Dental', type: 'pms', icon: 'Clipboard' },
    { id: 'weave', name: 'Weave', type: 'phone', icon: 'Phone' },
    { id: 'zuub', name: 'Zuub', type: 'insurance', icon: 'Shield' },
    { id: 'dentalxchange', name: 'DentalXChange', type: 'claims', icon: 'FileText' },
    { id: 'google', name: 'Google Business', type: 'reviews', icon: 'Star' },
    { id: 'quickbooks', name: 'QuickBooks', type: 'accounting', icon: 'DollarSign' },
    { id: 'nexhealth', name: 'NexHealth', type: 'comms', icon: 'Users' },
    { id: 'imaging', name: 'Imaging', type: 'imaging', icon: 'Image' },
  ],
  
  activities: [
    { text: 'Verified insurance for Johnson, M.', type: 'automation' },
    { text: 'Sent confirmation reminder', type: 'automation' },
    { text: 'Processed incoming call', type: 'automation' },
    { text: 'Synced records from PMS', type: 'automation' },
    { text: 'Agent drafted response', type: 'agent' },
  ],
  
  inboxItems: [
    { id: '1', title: 'D6010 implant — verify Delta Dental', sourceType: 'insurance', score: 92, timeAgo: '2m' },
    { id: '2', title: 'New patient call — convert to appointment', sourceType: 'phone', score: 87, timeAgo: '5m' },
    { id: '3', title: '2-star review — draft response', sourceType: 'reviews', score: 85, timeAgo: '12m' },
  ],
  
  metrics: [
    { label: 'Automations handled', value: 89, color: 'success' },
    { label: 'Items for you', value: 12, color: 'default' },
    { label: 'On time today', value: 94, suffix: '%', color: 'success' },
  ],
  
  // Scene timing (in frames at 30fps) - synced to Whisper timestamps from new voiceover
  // Voiceover is ~137s (4110 frames), video is ~145s (4350 frames)
  scenes: {
    // Scene 1: Introduction (0-12s voiceover)
    intro: {
      start: 0,
      duration: 359, // Until "This is a source card" at 11.96s
      phases: {
        silenceIn: { start: 0, duration: 30 },
        textAppear: { start: 30, duration: 60 },
        voiceover: { start: 0, duration: 359 },
        hold: { start: 300, duration: 59 },
      },
    },
    
    // Scene 2: SourceCard (11.96s - 38s voiceover)
    sourceCard: {
      start: 359,
      duration: 781, // 11.96s to 38s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        wireframeReveal: { start: 15, duration: 45 },
        voiceover: { start: 0, duration: 781 },
        embodiment: { start: 60, duration: 60 }, // After "where data comes from"
        statusChange: { start: 480, duration: 60 }, // At "gray badge means disconnected" (28s)
        hold: { start: 720, duration: 61 },
      },
    },
    
    // Scene 3: ActivityFeedItem (38s - 56.56s voiceover)
    activityFeedItem: {
      start: 1140,
      duration: 557, // 38s to 56.56s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        wireframeReveal: { start: 15, duration: 45 },
        voiceover: { start: 0, duration: 557 },
        itemsCascade: { start: 60, stagger: 30 },
        embodiment: { start: 120, duration: 60 },
        hold: { start: 500, duration: 57 },
      },
    },
    
    // Scene 4: InboxItem (56.56s - 86.04s voiceover)
    inboxItem: {
      start: 1697,
      duration: 884, // 56.56s to 86.04s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        wireframeReveal: { start: 15, duration: 45 },
        voiceover: { start: 0, duration: 884 },
        embodiment: { start: 60, duration: 60 },
        focusDemo: { start: 186, duration: 119 }, // At "score...on the right" (62.72s)
        keyboardDemo: { start: 490, duration: 200 }, // "Keyboard shortcuts" (72.88s)
        hold: { start: 820, duration: 64 },
      },
    },
    
    // Scene 5: MetricCard (86.04s - 100.88s voiceover)
    metricCard: {
      start: 2581,
      duration: 445, // 86.04s to 100.88s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        wireframeReveal: { start: 15, duration: 45 },
        voiceover: { start: 0, duration: 445 },
        embodiment: { start: 60, duration: 60 },
        countUp: { start: 66, duration: 120 }, // At "89 automations" (88.36s)
        hold: { start: 400, duration: 45 },
      },
    },
    
    // Scene 6: KeyboardHint (100.88s - 114.36s voiceover)
    keyboardHint: {
      start: 3026,
      duration: 405, // 100.88s to 114.36s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        reveal: { start: 15, duration: 45 },
        voiceover: { start: 0, duration: 405 },
        keyPressDemo: { start: 121, duration: 120 }, // "ADS approve dismiss snooze" (104.92s)
        hold: { start: 360, duration: 45 },
      },
    },
    
    // Scene 7: Assembly (114.36s - 135.36s voiceover)
    assembly: {
      start: 3431,
      duration: 630, // 114.36s to 135.36s
      phases: {
        silenceIn: { start: 0, duration: 15 },
        voiceover: { start: 0, duration: 630 },
        sourcesConnect: { start: 65, duration: 30 }, // "Sources connect" (116.52s)
        activityFlows: { start: 103, duration: 30 }, // "Activity flows" (117.8s)
        inboxFills: { start: 133, duration: 45 }, // "Inbox fills" (118.8s)
        metricsReveal: { start: 215, duration: 30 }, // "Metrics show" (121.52s)
        unifiedHold: { start: 540, duration: 90 },
      },
    },
    
    // Scene 8: Close (135.36s - end)
    close: {
      start: 4061,
      duration: 289, // Until 4350 total
      phases: {
        silenceIn: { start: 0, duration: 15 },
        logoReveal: { start: 15, duration: 45 },
        taglineReveal: { start: 30, duration: 60 }, // "Tend to what matters" (136.36s)
        silenceOut: { start: 90, duration: 199 }, // Hold and fade
      },
    },
  },
  
  // Vox treatment settings (subtle for walkthrough)
  voxTreatment: {
    posterizeFrameRate: 24, // Higher than commercial for smoother
    grainIntensity: 0.02, // Subtle
    vignetteIntensity: 0.15,
    chromaticAberration: 0.3,
    backgroundTint: '#050505',
  },
  
  // Animation settings
  animation: {
    springConfig: {
      damping: 20,
      stiffness: 80,
      mass: 1,
    },
    embodimentDuration: 60, // Synced to voiceover pacing
    cascadeStagger: 30,
    componentScale: 1.0, // 4K matches component's internal 2x scale
  },
  
  // Voiceover settings (ElevenLabs)
  voiceover: {
    voice: 'pNInz6obpgDQGcFmaJgB', // Adam - calm, direct
    model: 'eleven_monolingual_v1',
    stability: 0.6, // Higher for calm, consistent delivery
    similarity_boost: 0.75,
  },
  
  // Sound design settings (Tone.js)
  soundDesign: {
    ambient: {
      enabled: true,
      volume: 0.03,
      frequencies: [130.81, 196.00, 261.63], // C3, G3, C4 - gentle C major
    },
    transitions: {
      volume: 0.08,
      attack: 0.5,
      release: 2.0,
    },
    embodiment: {
      volume: 0.1,
      type: 'shimmer',
    },
    wireframe: {
      volume: 0.05,
      type: 'soft-click',
    },
    keyPress: {
      volume: 0.06,
      type: 'soft-tick',
    },
  },
} as const;

export type WalkthroughSpec = typeof WALKTHROUGH_SPEC;
export default WALKTHROUGH_SPEC;
