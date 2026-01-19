/**
 * AudioSync - Component for syncing visuals to audio markers
 * 
 * Reads timing markers from markers.json and provides frame-accurate
 * event triggers for visual components.
 * 
 * @example
 * <AudioSync
 *   markers={markers}
 *   onMarker={(marker) => console.log('Reached:', marker.label)}
 * >
 *   <YourVisualComponent />
 * </AudioSync>
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';

export interface TimingMarker {
  label: string;
  frame: number;
  timestamp: number; // in seconds
}

interface AudioSyncContextValue {
  /** Current marker (or null if between markers) */
  currentMarker: TimingMarker | null;
  
  /** Next upcoming marker */
  nextMarker: TimingMarker | null;
  
  /** Progress to next marker (0-1) */
  progressToNext: number;
  
  /** All markers */
  markers: TimingMarker[];
  
  /** Check if a specific marker has been reached */
  hasReached: (label: string) => boolean;
  
  /** Get frame for a marker label */
  getFrame: (label: string) => number | undefined;
}

const AudioSyncContext = createContext<AudioSyncContextValue | null>(null);

interface AudioSyncProps {
  children: React.ReactNode;
  
  /** Timing markers from markers.json */
  markers: TimingMarker[];
  
  /** Audio file path (optional, relative to public folder) */
  audioSrc?: string;
  
  /** Audio volume (0-1) */
  volume?: number;
  
  /** Callback when a marker is reached */
  onMarker?: (marker: TimingMarker) => void;
}

export const AudioSync: React.FC<AudioSyncProps> = ({
  children,
  markers,
  audioSrc,
  volume = 1,
  onMarker,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Sort markers by frame
  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => a.frame - b.frame),
    [markers]
  );
  
  // Find current and next markers
  const { currentMarker, nextMarker, progressToNext } = useMemo(() => {
    let current: TimingMarker | null = null;
    let next: TimingMarker | null = null;
    
    for (let i = 0; i < sortedMarkers.length; i++) {
      if (sortedMarkers[i].frame <= frame) {
        current = sortedMarkers[i];
        next = sortedMarkers[i + 1] || null;
      } else {
        if (!current) {
          next = sortedMarkers[i];
        }
        break;
      }
    }
    
    // Calculate progress to next marker
    let progress = 0;
    if (current && next) {
      const span = next.frame - current.frame;
      if (span > 0) {
        progress = (frame - current.frame) / span;
      }
    }
    
    return { currentMarker: current, nextMarker: next, progressToNext: progress };
  }, [frame, sortedMarkers]);
  
  // Helper functions
  const hasReached = (label: string): boolean => {
    const marker = sortedMarkers.find(m => m.label === label);
    return marker ? frame >= marker.frame : false;
  };
  
  const getFrame = (label: string): number | undefined => {
    return sortedMarkers.find(m => m.label === label)?.frame;
  };
  
  const contextValue: AudioSyncContextValue = {
    currentMarker,
    nextMarker,
    progressToNext,
    markers: sortedMarkers,
    hasReached,
    getFrame,
  };
  
  return (
    <AudioSyncContext.Provider value={contextValue}>
      {audioSrc && (
        <Audio
          src={staticFile(audioSrc)}
          volume={volume}
        />
      )}
      {children}
    </AudioSyncContext.Provider>
  );
};

/**
 * Hook to access AudioSync context
 */
export function useAudioSync(): AudioSyncContextValue {
  const context = useContext(AudioSyncContext);
  if (!context) {
    throw new Error('useAudioSync must be used within an AudioSync provider');
  }
  return context;
}

/**
 * Hook to check if a marker has been reached
 */
export function useMarkerReached(label: string): boolean {
  const { hasReached } = useAudioSync();
  return hasReached(label);
}

/**
 * Hook to get progress between two markers
 */
export function useMarkerProgress(startLabel: string, endLabel: string): number {
  const frame = useCurrentFrame();
  const { getFrame } = useAudioSync();
  
  const startFrame = getFrame(startLabel);
  const endFrame = getFrame(endLabel);
  
  if (startFrame === undefined || endFrame === undefined) {
    return 0;
  }
  
  if (frame < startFrame) return 0;
  if (frame >= endFrame) return 1;
  
  return (frame - startFrame) / (endFrame - startFrame);
}

export default AudioSync;
