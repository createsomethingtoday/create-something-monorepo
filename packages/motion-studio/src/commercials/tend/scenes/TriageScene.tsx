/**
 * TriageScene - Inbox triage with keyboard interactions
 * 
 * Shows inbox table with items being actioned via keyboard shortcuts.
 * Items exit with appropriate animations when approved/dismissed/snoozed.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { InboxItem, KeyboardHint } from '../components';
import { SPEC } from '../spec';
import { fontFamily } from '../../../fonts';

interface ItemState {
  id: string;
  title: string;
  sourceType: string;
  score: number;
  timeAgo: string;
  status: 'inbox' | 'approved' | 'dismissed' | 'snoozed';
  exitFrame: number | null;
}

export const TriageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { inboxItems, colors, scenes } = SPEC;
  const { tableEmbodiment, focusFirst, keySequence } = scenes.triage;
  
  // Table embodiment
  const tableEmbodimentProgress = interpolate(
    frame,
    [tableEmbodiment.start, tableEmbodiment.start + tableEmbodiment.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Initialize item states
  const itemStates: ItemState[] = inboxItems.map((item) => ({
    ...item,
    status: 'inbox' as const,
    exitFrame: null,
  }));
  
  // Process key sequence to determine item states
  // Each action targets the next unactioned item in sequence
  let actionCount = 0;
  for (const keyEvent of keySequence) {
    if (frame >= keyEvent.frame) {
      const targetIndex = actionCount;
      if (targetIndex < itemStates.length) {
        if (keyEvent.action === 'approve') {
          itemStates[targetIndex].status = 'approved';
          itemStates[targetIndex].exitFrame = keyEvent.frame;
        } else if (keyEvent.action === 'dismiss') {
          itemStates[targetIndex].status = 'dismissed';
          itemStates[targetIndex].exitFrame = keyEvent.frame;
        } else if (keyEvent.action === 'snooze') {
          itemStates[targetIndex].status = 'snoozed';
          itemStates[targetIndex].exitFrame = keyEvent.frame;
        }
        actionCount++;
      }
    }
  }
  
  // Focus is always on the first remaining inbox item
  const focusedIndex = itemStates.findIndex(item => item.status === 'inbox');
  
  // Get active key press
  const getActiveKey = (): { key: string; color: 'default' | 'success' | 'warning'; progress: number } | null => {
    for (const keyEvent of keySequence) {
      const pressStart = keyEvent.frame;
      const pressEnd = keyEvent.frame + 30;
      
      if (frame >= pressStart && frame <= pressEnd) {
        const progress = (frame - pressStart) / 30;
        const color = keyEvent.action === 'approve' ? 'success' 
          : keyEvent.action === 'snooze' ? 'warning' 
          : 'default';
        return { key: keyEvent.key, color, progress };
      }
    }
    return null;
  };
  
  const activeKey = getActiveKey();
  
  // Filter out exited items and calculate remaining
  const visibleItems = itemStates.filter(item => {
    if (item.exitFrame === null) return true;
    const exitProgress = (frame - item.exitFrame) / 20;
    return exitProgress < 1;
  });
  
  // Empty state - show when all items have exited
  const allItemsActioned = itemStates.every(item => item.exitFrame !== null);
  const allItemsExited = itemStates.every(item => {
    if (item.exitFrame === null) return false;
    return (frame - item.exitFrame) >= 20;
  });
  const showEmptyState = allItemsExited || (allItemsActioned && frame >= scenes.triage.emptyState.start);
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgBase }}>
      
      {/* Main content area */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        {/* Table header */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            marginBottom: 16,
            opacity: tableEmbodimentProgress,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 14,
              fontWeight: 500,
              color: colors.fgMuted,
              padding: '0 16px',
            }}
          >
            Priority items ({itemStates.filter(i => i.status === 'inbox').length})
          </div>
        </div>
        
        {/* Items list */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {!showEmptyState && itemStates.map((item, index) => {
            // Calculate exit progress
            let exitProgress = 0;
            if (item.exitFrame !== null) {
              exitProgress = interpolate(
                frame,
                [item.exitFrame, item.exitFrame + 20],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
            }
            
            // Skip fully exited items
            if (exitProgress >= 1) return null;
            
            // Item is focused if it's the first remaining inbox item
            const isFocused = index === focusedIndex && frame >= focusFirst.start && exitProgress === 0;
            
            // Row embodiment with stagger
            const rowEmbodiment = interpolate(
              frame,
              [tableEmbodiment.start + index * 10, tableEmbodiment.start + index * 10 + 60],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            return (
              <InboxItem
                key={item.id}
                title={item.title}
                sourceType={item.sourceType}
                score={item.score}
                timeAgo={item.timeAgo}
                status={item.status}
                isFocused={isFocused}
                embodiment={rowEmbodiment}
                exitProgress={exitProgress}
              />
            );
          })}
          
          {/* Empty state */}
          {showEmptyState && (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                opacity: interpolate(
                  frame,
                  [scenes.triage.emptyState.start, scenes.triage.emptyState.start + 30],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                ),
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 18,
                  color: colors.fgMuted,
                  marginBottom: 8,
                }}
              >
                Nothing urgent.
              </div>
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 14,
                  color: colors.fgTertiary,
                }}
              >
                Automations handled the rest.
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
      
      {/* Keyboard hints overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 80,
          display: 'flex',
          gap: 24,
          opacity: tableEmbodimentProgress,
        }}
      >
        <KeyboardHint
          keyLabel="j"
          action="next"
          isPressed={activeKey?.key === 'j'}
          pressProgress={activeKey?.key === 'j' ? activeKey.progress : 0}
        />
        <KeyboardHint
          keyLabel="a"
          action="done"
          isPressed={activeKey?.key === 'a'}
          pressProgress={activeKey?.key === 'a' ? activeKey.progress : 0}
          color="success"
        />
        <KeyboardHint
          keyLabel="d"
          action="skip"
          isPressed={activeKey?.key === 'd'}
          pressProgress={activeKey?.key === 'd' ? activeKey.progress : 0}
        />
        <KeyboardHint
          keyLabel="s"
          action="later"
          isPressed={activeKey?.key === 's'}
          pressProgress={activeKey?.key === 's' ? activeKey.progress : 0}
          color="warning"
        />
      </div>
    </AbsoluteFill>
  );
};

export default TriageScene;
