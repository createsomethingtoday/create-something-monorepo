/**
 * TendSoundCues - Sound design for the TEND commercial
 * 
 * Maps animation events to subtle UI sounds.
 * Philosophy: Sounds should be felt, not heard. They add tactility
 * without drawing attention away from the visual narrative.
 * 
 * Sound Categories:
 * - Embodiment: wireframe → styled transitions (shimmer, pop)
 * - Connection: status changes (tick, success)
 * - Navigation: keyboard interactions (click)
 * - Actions: approve/dismiss/snooze (success/dismiss/warning tones)
 * - Transitions: scene changes (whoosh)
 */
import React from 'react';
import { SoundCues, createCascade, createRapidFire, type SoundCue } from '../../shared/audio/SoundCues';
import { SPEC } from '../spec';

/**
 * Generate all sound cues for the TEND commercial
 */
function generateTendSoundCues(): SoundCue[] {
  const cues: SoundCue[] = [];
  const { scenes, sources, activities, inboxItems } = SPEC;
  
  // ============================================
  // SCENE 1: SOURCES (0-360)
  // ============================================
  
  // Card entrance cascade - soft thuds as cards appear
  const cardEntranceFrames = sources.map((_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    return scenes.sources.wireframeIn.start + (row * 12) + (col * 6);
  });
  
  cardEntranceFrames.forEach((frame, i) => {
    cues.push({
      frame,
      sound: 'thud-soft',
      volume: 0.12,
      label: `source-entrance-${i}`,
    });
  });
  
  // Embodiment cascade - shimmer as each card gains styling
  const embodimentCues = createCascade({
    sound: 'pop-soft',
    startFrame: scenes.sources.embodimentCascade.start,
    count: sources.length,
    stagger: scenes.sources.embodimentCascade.stagger,
    volume: 0.15,
    label: 'embodiment',
  });
  cues.push(...embodimentCues);
  
  // ============================================
  // SCENE 2: CONNECTION (360-630)
  // ============================================
  
  // Slow connection cascade (first 4 sources)
  for (let i = 0; i < 4; i++) {
    const connectFrame = scenes.connection.start + scenes.connection.connectCascade.start + 
      (i * scenes.connection.connectCascade.stagger);
    
    // Connecting tick (gray → amber) - subtle
    cues.push({
      frame: connectFrame,
      sound: 'tick-soft',
      volume: 0.1,
      label: `connect-start-${i}`,
    });
    
    // Connected success (amber → green) - gentle
    cues.push({
      frame: connectFrame + 20,
      sound: 'success-soft',
      volume: 0.12,
      label: `connect-complete-${i}`,
    });
  }
  
  // Rapid connection cascade (last 4 sources)
  for (let i = 0; i < 4; i++) {
    const connectFrame = scenes.connection.start + scenes.connection.rapidCascade.start + 
      (i * scenes.connection.rapidCascade.stagger);
    
    cues.push({
      frame: connectFrame,
      sound: 'tick-soft',
      volume: 0.12,
      label: `rapid-connect-${i}`,
    });
  }
  
  // Final connection resolve
  cues.push({
    frame: scenes.connection.start + scenes.connection.rapidCascade.start + 
      (4 * scenes.connection.rapidCascade.stagger) + 10,
    sound: 'shimmer',
    volume: 0.15,
    label: 'all-connected',
  });
  
  // ============================================
  // SCENE 3: ACTIVITY FEED (630-990)
  // ============================================
  
  // Feed panel slide in
  cues.push({
    frame: scenes.activity.start + scenes.activity.feedSlideIn.start,
    sound: 'whoosh-soft',
    volume: 0.18,
    label: 'feed-slide-in',
  });
  
  // Activity items appearing
  const activityCues = createCascade({
    sound: 'tick-soft',
    startFrame: scenes.activity.start + scenes.activity.itemCascade.start,
    count: Math.min(8, activities.length),
    stagger: scenes.activity.itemCascade.stagger,
    volume: 0.08,
    label: 'activity-item',
  });
  cues.push(...activityCues);
  
  // Counter incrementing - rapid micro-ticks
  const counterCues = createRapidFire({
    sound: 'micro-tick',
    startFrame: scenes.activity.start + scenes.activity.counterReveal.start,
    endFrame: scenes.activity.start + scenes.activity.counterReveal.start + 
      scenes.activity.counterReveal.duration,
    interval: 4, // Every ~4 frames = ~8ms at 30fps
    volume: 0.05,
  });
  cues.push(...counterCues);
  
  // ============================================
  // SCENE 4: TRIAGE (990-1440)
  // ============================================
  
  // Table embodiment
  cues.push({
    frame: scenes.triage.start + scenes.triage.tableEmbodiment.start,
    sound: 'shimmer',
    volume: 0.12,
    label: 'table-embody',
  });
  
  // Row embodiment cascade
  inboxItems.forEach((_, i) => {
    cues.push({
      frame: scenes.triage.start + scenes.triage.tableEmbodiment.start + (i * 10),
      sound: 'pop-soft',
      volume: 0.1,
      label: `row-embody-${i}`,
    });
  });
  
  // Focus ring appearance - subtle
  cues.push({
    frame: scenes.triage.start + scenes.triage.focusFirst.start,
    sound: 'tick-soft',
    volume: 0.12,
    label: 'focus-first',
  });
  
  // Keyboard sequence - using softer, smoother sounds
  scenes.triage.keySequence.forEach((keyEvent) => {
    const absoluteFrame = scenes.triage.start + keyEvent.frame;
    
    // Soft tick for key press (smoother than mechanical click)
    cues.push({
      frame: absoluteFrame,
      sound: 'tick-soft',
      volume: 0.15,
      label: `key-${keyEvent.key}`,
    });
    
    // Action-specific sounds (slightly delayed)
    if (keyEvent.action === 'approve') {
      cues.push({
        frame: absoluteFrame + 3,
        sound: 'success-soft',
        volume: 0.2,
        label: 'action-approve',
      });
    } else if (keyEvent.action === 'dismiss') {
      cues.push({
        frame: absoluteFrame + 3,
        sound: 'pop-soft',
        volume: 0.12,
        label: 'action-dismiss',
      });
    } else if (keyEvent.action === 'snooze') {
      cues.push({
        frame: absoluteFrame + 3,
        sound: 'shimmer',
        volume: 0.15,
        label: 'action-snooze',
      });
    }
  });
  
  // Empty state reveal
  cues.push({
    frame: scenes.triage.start + scenes.triage.emptyState.start,
    sound: 'resolve',
    volume: 0.18,
    label: 'empty-state',
  });
  
  // ============================================
  // SCENE 5: METRICS (1440-1620)
  // ============================================
  
  // Wireframe entrance
  cues.push({
    frame: scenes.metrics.start + scenes.metrics.wireframeIn.start,
    sound: 'thud-soft',
    volume: 0.1,
    label: 'metrics-wireframe',
  });
  
  // Card embodiment cascade - soft pops
  const metricsCues = createCascade({
    sound: 'pop-soft',
    startFrame: scenes.metrics.start + scenes.metrics.embodimentCascade.start,
    count: 3,
    stagger: scenes.metrics.embodimentCascade.stagger,
    volume: 0.12,
    label: 'metric-card',
  });
  cues.push(...metricsCues);
  
  // Counter animations - rapid ticks
  const metricsCounterCues = createRapidFire({
    sound: 'micro-tick',
    startFrame: scenes.metrics.start + scenes.metrics.countUp.start,
    endFrame: scenes.metrics.start + scenes.metrics.countUp.start + 
      scenes.metrics.countUp.duration,
    interval: 3,
    volume: 0.06,
  });
  cues.push(...metricsCounterCues);
  
  // ============================================
  // SCENE 6: CLOSE (1620-1800)
  // ============================================
  
  // Logo embodiment - gentle pop
  cues.push({
    frame: scenes.close.start + scenes.close.logoEmbodiment.start,
    sound: 'pop-soft',
    volume: 0.18,
    label: 'logo-embody',
  });
  
  // Tagline reveal
  cues.push({
    frame: scenes.close.start + scenes.close.taglineEmbodiment.start,
    sound: 'shimmer',
    volume: 0.12,
    label: 'tagline-reveal',
  });
  
  // URL fade in - minimal
  cues.push({
    frame: scenes.close.start + scenes.close.urlReveal.start,
    sound: 'tick-soft',
    volume: 0.08,
    label: 'url-reveal',
  });
  
  return cues;
}

// Pre-generate cues
const TEND_CUES = generateTendSoundCues();

interface TendSoundCuesProps {
  /** Master volume (0-1), defaults to 1 */
  masterVolume?: number;
  /** Enable/disable all sounds */
  enabled?: boolean;
}

/**
 * Sound design component for the TEND commercial
 * 
 * @example
 * // In TendCommercial.tsx:
 * <TendSoundCues masterVolume={0.8} />
 */
export const TendSoundCues: React.FC<TendSoundCuesProps> = ({
  masterVolume = 1,
  enabled = true,
}) => {
  return (
    <SoundCues
      cues={TEND_CUES}
      masterVolume={masterVolume}
      enabled={enabled}
    />
  );
};

// Export cues for inspection/debugging
export { TEND_CUES };

export default TendSoundCues;
