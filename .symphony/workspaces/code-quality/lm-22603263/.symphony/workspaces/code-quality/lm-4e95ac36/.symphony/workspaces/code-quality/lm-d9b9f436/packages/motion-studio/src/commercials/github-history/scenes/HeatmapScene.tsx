/**
 * HeatmapScene - Main contribution visualization
 * 
 * Animated GitHub contribution heatmap with progressive reveal.
 * Left-to-right wave mimics time progression.
 * Highlights busiest day with glow effect.
 */
import React from 'react';
import { useCurrentFrame, AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { ContributionHeatmap } from '../components';
import type { ContributionWeek, RepositoryContribution } from '../spec';
import { colors, typography } from '../../../styles';
import { SPEC } from '../spec';

interface HeatmapSceneProps {
  weeks: ContributionWeek[];
  totalContributions: number;
  username: string;
  busiestDay?: { date: string; contributionCount: number };
  topRepos?: RepositoryContribution[];
}

interface MonthSummary {
  key: string;
  label: string;
  total: number;
}

interface CadenceTrend {
  months: MonthSummary[];
  recentMonths: MonthSummary[];
  priorMonths: MonthSummary[];
  recentTotal: number;
  priorTotal: number;
  deltaPct: number;
  narrative: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

function sumContributions(months: MonthSummary[]): number {
  return months.reduce((sum, month) => sum + month.total, 0);
}

function formatWindow(months: MonthSummary[]): string {
  if (months.length === 0) return '';
  if (months.length === 1) return months[0].label;
  return `${months[0].label}-${months[months.length - 1].label}`;
}

function analyzeCadence(weeks: ContributionWeek[]): CadenceTrend | null {
  const allDays = weeks.flatMap((week) => week.contributionDays);
  if (allDays.length === 0) {
    return null;
  }

  const byMonth = new Map<string, { year: number; month: number; total: number }>();
  for (const day of allDays) {
    const [yearStr, monthStr] = day.date.split('-');
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    if (!year || !month) continue;

    const key = `${year}-${String(month).padStart(2, '0')}`;
    const existing = byMonth.get(key);
    if (existing) {
      existing.total += day.contributionCount;
    } else {
      byMonth.set(key, { year, month, total: day.contributionCount });
    }
  }

  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: monthLabel(value.year, value.month),
      total: value.total,
    }));

  if (months.length < 4) {
    return null;
  }

  // First and last months are often partial ranges; exclude for fair comparison.
  const comparableMonths = months.length > 4 ? months.slice(1, -1) : months;
  if (comparableMonths.length < 4) {
    return null;
  }

  const windowSize = 2;
  const recentMonths = comparableMonths.slice(-windowSize);
  const priorMonths = comparableMonths.slice(-windowSize * 2, -windowSize);
  const recentTotal = sumContributions(recentMonths);
  const priorTotal = sumContributions(priorMonths);
  const deltaPct = priorTotal > 0 ? ((recentTotal - priorTotal) / priorTotal) * 100 : 0;

  let narrative = 'Cadence steady across recent months.';
  if (deltaPct <= -35) {
    narrative = 'Fewer commits recently: likely strategy/design phase.';
  } else if (deltaPct <= -15) {
    narrative = 'Moderate slowdown: planning load likely increased.';
  } else if (deltaPct >= 20) {
    narrative = 'Commit velocity increased in recent months.';
  }

  return {
    months: comparableMonths.slice(-6),
    recentMonths,
    priorMonths,
    recentTotal,
    priorTotal,
    deltaPct,
    narrative,
  };
}

export const HeatmapScene: React.FC<HeatmapSceneProps> = ({
  weeks,
  totalContributions,
  username,
  busiestDay,
  topRepos = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { heatmap: heatmapScene } = SPEC.scenes;
  const cadenceTrend = React.useMemo(() => analyzeCadence(weeks), [weeks]);
  
  // Container entrance
  const containerProgress = spring({
    frame,
    fps,
    config: {
      damping: 30,
      stiffness: 100,
      mass: 1,
    },
  });
  
  // Top repos animation (appears early-mid)
  const reposStartFrame = heatmapScene.duration * 0.35;
  const reposProgress = spring({
    frame: frame - reposStartFrame,
    fps,
    config: {
      damping: 25,
      stiffness: 120,
      mass: 0.7,
    },
  });
  
  // Counter animation (appears mid-way through)
  const counterStartFrame = heatmapScene.duration * 0.6;
  const counterProgress = spring({
    frame: frame - counterStartFrame,
    fps,
    config: {
      damping: 25,
      stiffness: 150,
      mass: 0.6,
    },
  });
  
  // Animated contribution count
  const countProgress = interpolate(
    frame - counterStartFrame,
    [0, 60],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const easedCount = 1 - Math.pow(1 - countProgress, 3);
  const displayCount = Math.floor(totalContributions * easedCount);

  // Context panel appears after heatmap has established itself.
  const trendStartFrame = heatmapScene.duration * 0.45;
  const trendProgress = clamp01(
    spring({
      frame: frame - trendStartFrame,
      fps,
      config: {
        damping: 22,
        stiffness: 120,
        mass: 0.8,
      },
    })
  );
  
  // Exit animation - smoother scale-down fade
  const exitStart = heatmapScene.duration - 35;
  const exitProgress = interpolate(
    frame,
    [exitStart, heatmapScene.duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Ease out for smoother exit
  const easedExit = exitProgress * exitProgress * (3 - 2 * exitProgress);
  const trendOpacity =
    trendProgress *
    interpolate(easedExit, [0, 0.55], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const trendMonthMax = cadenceTrend ? Math.max(...cadenceTrend.months.map((month) => month.total), 1) : 1;
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        opacity: interpolate(easedExit, [0, 1], [1, 0]),
        transform: `scale(${interpolate(easedExit, [0, 1], [1, 0.95])})`,
      }}
    >
      {/* Heatmap container */}
      <div
        style={{
          transform: `scale(${interpolate(containerProgress, [0, 1], [0.9, 1])})`,
          opacity: containerProgress,
        }}
      >
        <ContributionHeatmap
          weeks={weeks}
          startFrame={15}
          animationDuration={heatmapScene.duration * 0.7}
          staggerDirection="left-right"
          busiestDay={busiestDay}
        />
      </div>
      
      {/* Top repositories - appears before counter */}
      {topRepos.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            transform: `translateX(${interpolate(Math.max(0, reposProgress), [0, 1], [40, 0])}px)`,
            opacity: Math.max(0, reposProgress) * interpolate(easedExit, [0, 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.75rem',
              color: colors.neutral[600],
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Top Repositories
          </div>
          {topRepos.slice(0, 3).map((repo, index) => (
            <div
              key={repo.repository.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transform: `translateX(${interpolate(
                  spring({ frame: frame - reposStartFrame - index * 6, fps, config: { damping: 20, stiffness: 150, mass: 0.5 } }),
                  [0, 1],
                  [20, 0]
                )}px)`,
                opacity: Math.max(0, spring({ frame: frame - reposStartFrame - index * 6, fps, config: { damping: 20, stiffness: 150, mass: 0.5 } })),
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: '0.875rem',
                  color: colors.neutral[400],
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {repo.repository.name}
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: '0.875rem',
                  fontWeight: typography.fontWeight.medium,
                  color: colors.neutral[0],
                }}
              >
                {repo.contributions.totalCount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Explanatory momentum panel */}
      {cadenceTrend && (
        <div
          style={{
            position: 'absolute',
            top: 88,
            left: 100,
            width: 340,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            transform: `translateX(${interpolate(trendProgress, [0, 1], [-30, 0])}px)`,
            opacity: trendOpacity,
          }}
        >
          <div
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.75rem',
              color: colors.neutral[600],
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            Momentum Context
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              rowGap: 4,
              columnGap: 12,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.8rem',
                color: colors.neutral[500],
                letterSpacing: typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}
            >
              Last 2 full months ({formatWindow(cadenceTrend.recentMonths)})
            </span>
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: '0.95rem',
                color: colors.neutral[0],
                fontWeight: typography.fontWeight.medium,
              }}
            >
              {cadenceTrend.recentTotal.toLocaleString()}
            </span>

            <span
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.8rem',
                color: colors.neutral[500],
                letterSpacing: typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}
            >
              Prior 2 months ({formatWindow(cadenceTrend.priorMonths)})
            </span>
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: '0.95rem',
                color: colors.neutral[300],
                fontWeight: typography.fontWeight.medium,
              }}
            >
              {cadenceTrend.priorTotal.toLocaleString()}
            </span>

            <span
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: '0.8rem',
                color: colors.neutral[500],
                letterSpacing: typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}
            >
              Change
            </span>
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: '1rem',
                color: cadenceTrend.deltaPct < 0 ? colors.neutral[200] : colors.neutral[0],
                fontWeight: typography.fontWeight.bold,
              }}
            >
              {cadenceTrend.deltaPct > 0 ? '+' : ''}
              {cadenceTrend.deltaPct.toFixed(1)}%
            </span>
          </div>

          <div
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: '0.9rem',
              color: colors.neutral[300],
              letterSpacing: typography.letterSpacing.normal,
              lineHeight: 1.4,
            }}
          >
            {cadenceTrend.narrative}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: 4,
            }}
          >
            {cadenceTrend.months.map((month) => {
              return (
                <div
                  key={month.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: '0.75rem',
                      color: colors.neutral[500],
                    }}
                  >
                    {month.label}
                  </span>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: colors.neutral[800],
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(month.total / trendMonthMax) * 100}%`,
                        height: '100%',
                        backgroundColor: colors.neutral[300],
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: '0.8rem',
                      color: colors.neutral[200],
                      fontWeight: typography.fontWeight.medium,
                      minWidth: 38,
                      textAlign: 'right',
                    }}
                  >
                    {month.total.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Contribution counter - appears after heatmap builds */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${interpolate(Math.max(0, counterProgress), [0, 1], [30, 0])}px)`,
          opacity: Math.max(0, counterProgress),
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: '4rem',
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral[0],
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          {displayCount.toLocaleString()}
        </div>
        <div
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: '1rem',
            fontWeight: typography.fontWeight.normal,
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          CONTRIBUTIONS
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default HeatmapScene;
