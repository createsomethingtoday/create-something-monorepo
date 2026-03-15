/**
 * AssemblyScene - Components combining into a whole
 * 
 * The hermeneutic circle completes: parts serve the whole,
 * and understanding emerges from their relationship.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { WALKTHROUGH_SPEC } from '../spec';
import { SourceCard } from '../../tend/components/SourceCard';
import { ActivityFeedItem } from '../../tend/components/ActivityFeedItem';
import { InboxItem } from '../../tend/components/InboxItem';
import { MetricCard } from '../../tend/components/MetricCard';

export const AssemblyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, scenes, animation, sources, activities, inboxItems, metrics } = WALKTHROUGH_SPEC;
  const { phases } = scenes.assembly;
  
  // Scene fade in
  const sceneOpacity = interpolate(
    frame,
    [0, phases.silenceIn.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Sources connect phase
  const sourcesProgress = interpolate(
    frame,
    [phases.sourcesConnect.start, phases.sourcesConnect.start + phases.sourcesConnect.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Activity flows phase
  const activityProgress = interpolate(
    frame,
    [phases.activityFlows.start, phases.activityFlows.start + phases.activityFlows.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Inbox fills phase
  const inboxProgress = interpolate(
    frame,
    [phases.inboxFills.start, phases.inboxFills.start + phases.inboxFills.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Metrics reveal phase
  const metricsProgress = interpolate(
    frame,
    [phases.metricsReveal.start, phases.metricsReveal.start + phases.metricsReveal.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Time labels for activity
  const timeLabels = ['1m', '2m', '3m'];
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.bgBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: sceneOpacity,
        padding: 120,
      }}
    >
      {/* Full dashboard layout - scaled 1.5x for 4K visibility */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          alignItems: 'flex-start',
          transform: 'scale(1.5)', // 1.5x scale for 4K
        }}
      >
        {/* Left: Sources */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            opacity: sourcesProgress,
            transform: `translateX(${interpolate(sourcesProgress, [0, 1], [-30, 0])}px)`,
          }}
        >
          {sources.slice(0, 4).map((source, i) => {
            const connectionDelay = i * 0.2;
            const isConnected = sourcesProgress > connectionDelay + 0.3;
            
            return (
              <div key={source.id} style={{ transform: 'scale(0.7)' }}>
                <SourceCard
                  name={source.name}
                  type={source.type}
                  icon={source.icon as any}
                  status={isConnected ? 'connected' : 'disconnected'}
                  embodiment={Math.min(1, sourcesProgress * 2)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Center: Activity + Inbox */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            flex: 1,
            maxWidth: 500,
          }}
        >
          {/* Activity feed */}
          <div
            style={{
              opacity: activityProgress,
              transform: `translateY(${interpolate(activityProgress, [0, 1], [-20, 0])}px)`,
              padding: 16,
              borderRadius: 12,
              background: colors.bgSurface,
              border: `1px solid ${colors.borderDefault}`,
            }}
          >
            <div
              style={{
                fontFamily: 'Stack Sans Notch, system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: colors.fgMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Activity
            </div>
            {activities.slice(0, 3).map((activity, i) => (
              <div key={i} style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                <ActivityFeedItem
                  text={activity.text}
                  timeAgo={timeLabels[i]}
                  type={activity.type}
                  embodiment={Math.min(1, activityProgress * 1.5)}
                />
              </div>
            ))}
          </div>
          
          {/* Inbox */}
          <div
            style={{
              opacity: inboxProgress,
              transform: `translateY(${interpolate(inboxProgress, [0, 1], [-20, 0])}px)`,
              padding: 12,
              borderRadius: 12,
              background: colors.bgSurface,
              border: `1px solid ${colors.borderDefault}`,
            }}
          >
            <div
              style={{
                fontFamily: 'Stack Sans Notch, system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: colors.fgMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Inbox
            </div>
            {inboxItems.slice(0, 2).map((item, i) => (
              <div key={item.id} style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                <InboxItem
                  title={item.title}
                  sourceType={item.sourceType}
                  score={item.score}
                  timeAgo={item.timeAgo}
                  status="inbox"
                  isFocused={i === 0 && inboxProgress > 0.7}
                  embodiment={Math.min(1, inboxProgress * 1.5)}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: Metrics */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            opacity: metricsProgress,
            transform: `translateX(${interpolate(metricsProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          {metrics.map((metric, i) => (
            <div key={metric.label} style={{ transform: 'scale(0.65)' }}>
              <MetricCard
                label={metric.label}
                value={metric.value}
                suffix={'suffix' in metric ? (metric as { suffix: string }).suffix : undefined}
                color={metric.color as 'success' | 'default'}
                embodiment={Math.min(1, metricsProgress * 1.5)}
                countProgress={Math.max(0, (metricsProgress - 0.3) / 0.7)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssemblyScene;
