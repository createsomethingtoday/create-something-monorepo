/**
 * TEND Commercial Specification
 * 
 * 60-second commercial showing TEND dashboard UI.
 * Visual storytelling through wireframe → styled transitions.
 * No voiceover - the unconcealment IS the narrative.
 * 
 * Product: createsomething.agency/tend
 * Tagline: "Tend to what matters."
 */

import { Clipboard, Phone, Shield, FileText, Star, DollarSign, Users, Image } from 'lucide-react';

export const SPEC = {
  // Video configuration
  fps: 30,
  width: 3840,
  height: 2160,
  durationInFrames: 1800, // 60 seconds
  
  // Scale factor for 4K (2x from 1080p base)
  // Multiply all pixel values by this
  scale: 2,
  
  // Product information
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
  },
  
  // Typography - import from shared fonts
  // Note: Actual font loading happens in src/fonts.ts
  // These are fallbacks; components should import from ../../../fonts
  fonts: {
    sans: 'Stack Sans Notch, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  
  // Sources data
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
  
  // Activity feed data
  activities: [
    { text: 'Verified insurance for Johnson, M.', type: 'automation' },
    { text: 'Sent confirmation reminder', type: 'automation' },
    { text: 'Processed incoming call', type: 'automation' },
    { text: 'Synced records from PMS', type: 'automation' },
    { text: 'Agent drafted response', type: 'agent' },
    { text: 'Recall text delivered', type: 'automation' },
    { text: 'Eligibility check passed', type: 'automation' },
    { text: 'Voicemail transcribed', type: 'automation' },
    { text: 'Agent completed task', type: 'agent' },
    { text: 'Appointment confirmed', type: 'automation' },
  ],
  
  // Inbox items data
  inboxItems: [
    { id: '1', title: 'D6010 implant — verify Delta Dental', sourceType: 'insurance', score: 92, timeAgo: '2m' },
    { id: '2', title: 'New patient call — convert to appointment', sourceType: 'phone', score: 87, timeAgo: '5m' },
    { id: '3', title: '2-star review — draft response', sourceType: 'reviews', score: 85, timeAgo: '12m' },
    { id: '4', title: 'Mrs. Chen — 6mo recall overdue', sourceType: 'pms', score: 78, timeAgo: '1h' },
    { id: '5', title: 'Claim denied — ERA received', sourceType: 'claims', score: 72, timeAgo: '2h' },
  ],
  
  // Metrics data
  metrics: [
    { label: 'Automations handled', value: 89, color: 'success' },
    { label: 'Items for you', value: 12, color: 'default' },
    { label: 'On time today', value: 94, suffix: '%', color: 'success' },
  ],
  
  // Scene timing (in frames at 30fps)
  scenes: {
    // Scene 1: Sources grid with wireframe → styled
    sources: {
      start: 0,
      duration: 360, // 12s
      wireframeIn: { start: 0, duration: 60 },
      embodimentCascade: { start: 60, stagger: 15 },
      hold: { start: 270, duration: 90 },
    },
    
    // Scene 2: Connection animation
    connection: {
      start: 360,
      duration: 270, // 9s
      connectCascade: { start: 0, stagger: 45 },
      rapidCascade: { start: 135, stagger: 6 },
      holdConnected: { start: 200, duration: 70 },
    },
    
    // Scene 3: Activity feed
    activity: {
      start: 630,
      duration: 360, // 12s
      feedSlideIn: { start: 0, duration: 45 },
      itemCascade: { start: 45, stagger: 25 },
      counterReveal: { start: 300, duration: 60 },
    },
    
    // Scene 4: Inbox triage
    triage: {
      start: 990,
      duration: 450, // 15s
      tableEmbodiment: { start: 0, duration: 120 },
      focusFirst: { start: 120, duration: 30 },
      keySequence: [
        // Action all 5 items to clear inbox
        { key: 'a', frame: 150, action: 'approve' },  // Item 0: approve
        { key: 'a', frame: 180, action: 'approve' },  // Item 1: approve
        { key: 'a', frame: 210, action: 'approve' },  // Item 2: approve
        { key: 'd', frame: 250, action: 'dismiss' },  // Item 3: dismiss
        { key: 's', frame: 290, action: 'snooze' },   // Item 4: snooze
      ],
      emptyState: { start: 340, duration: 110 },
    },
    
    // Scene 5: Metrics reveal
    metrics: {
      start: 1440,
      duration: 180, // 6s
      wireframeIn: { start: 0, duration: 30 },
      embodimentCascade: { start: 30, stagger: 15 },
      countUp: { start: 60, duration: 90 },
      hold: { start: 150, duration: 30 },
    },
    
    // Scene 6: Close
    close: {
      start: 1620,
      duration: 180, // 6s
      wireframeIn: { start: 0, duration: 30 },
      logoEmbodiment: { start: 30, duration: 45 },
      taglineEmbodiment: { start: 75, duration: 45 },
      urlReveal: { start: 140, duration: 20 },
    },
  },
  
  // Vox treatment settings
  voxTreatment: {
    posterizeFrameRate: 15,
    grainIntensity: 0.04,
    vignetteIntensity: 0.2,
    chromaticAberration: 0.5,
    backgroundTint: '#0a0a0a',
  },
  
  // Animation settings
  animation: {
    springConfig: {
      damping: 18,
      stiffness: 90,
      mass: 1,
    },
    embodimentDuration: 45, // frames for wireframe → styled
    cascadeStagger: 15, // frames between items in cascade
  },
} as const;

export type TendSpec = typeof SPEC;
export default SPEC;
