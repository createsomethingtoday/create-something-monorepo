/**
 * ContributionHeatmap - Animated GitHub contribution visualization
 * 
 * Renders a GitHub-style contribution heatmap with Vox animation.
 * Cells appear progressively based on the animation timeline.
 * Highlights the busiest day with a glow effect.
 */
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { SPEC } from '../spec';
import type { ContributionWeek } from '../spec';
import { colors, typography } from '../../../styles';

interface ContributionHeatmapProps {
  weeks: ContributionWeek[];
  startFrame?: number;
  animationDuration?: number;
  staggerDirection?: 'left-right' | 'top-bottom' | 'diagonal' | 'random';
  busiestDay?: { date: string; contributionCount: number };
}

/**
 * Get monochrome intensity level for contribution count
 */
function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Calculate stagger delay for cell animation
 */
function getStaggerDelay(
  weekIndex: number,
  dayIndex: number,
  totalWeeks: number,
  direction: string,
  seed?: number
): number {
  switch (direction) {
    case 'left-right':
      // Pure left-to-right wave (time progression)
      return weekIndex + dayIndex * 0.5;
    case 'top-bottom':
      return dayIndex * totalWeeks + weekIndex;
    case 'diagonal':
      // Diagonal wave from top-left to bottom-right
      return weekIndex + dayIndex * 2;
    case 'random':
      // Pseudo-random based on position
      return ((weekIndex * 7 + dayIndex) * 9301 + (seed || 49297)) % 100;
    default:
      return weekIndex + dayIndex;
  }
}

/**
 * Individual cell component with animation
 */
const HeatmapCell: React.FC<{
  count: number;
  date: string;
  weekIndex: number;
  dayIndex: number;
  totalWeeks: number;
  frame: number;
  startFrame: number;
  animationDuration: number;
  staggerDirection: string;
  fps: number;
  isBusiestDay: boolean;
}> = ({
  count,
  date,
  weekIndex,
  dayIndex,
  totalWeeks,
  frame,
  startFrame,
  animationDuration,
  staggerDirection,
  fps,
  isBusiestDay,
}) => {
  const { cellSize, cellGap, cellRadius, levels, busiestDayGlow } = SPEC.heatmap;
  
  const level = getIntensityLevel(count);
  const color = levels[level];
  
  // Calculate when this cell should appear
  const staggerDelay = getStaggerDelay(weekIndex, dayIndex, totalWeeks, staggerDirection);
  const maxDelay = staggerDirection === 'left-right' 
    ? totalWeeks + 7 * 0.5
    : staggerDirection === 'diagonal' 
    ? totalWeeks + 7 * 2 
    : staggerDirection === 'random' ? 100 : totalWeeks * 7;
  
  // Normalize delay to fit within animation duration
  const normalizedDelay = (staggerDelay / maxDelay) * (animationDuration * 0.8);
  const cellStartFrame = startFrame + normalizedDelay;
  
  // Spring animation for entrance
  const scaleProgress = spring({
    frame: frame - cellStartFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    },
  });
  
  // Clamp scale between 0 and 1
  const scale = Math.max(0, Math.min(1, scaleProgress));
  
  // Opacity animation
  const opacity = interpolate(
    frame - cellStartFrame,
    [0, 8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Busiest day pulse animation
  const pulsePhase = (frame % 60) / 60;
  const pulseScale = isBusiestDay && opacity > 0.5
    ? 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.08
    : 1;
  
  // Position calculation
  const x = weekIndex * (cellSize + cellGap);
  const y = dayIndex * (cellSize + cellGap);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: cellSize,
        height: cellSize,
        backgroundColor: color,
        borderRadius: cellRadius,
        transform: `scale(${scale * pulseScale})`,
        opacity,
        transformOrigin: 'center',
        boxShadow: isBusiestDay && opacity > 0.5 ? busiestDayGlow : 'none',
        zIndex: isBusiestDay ? 10 : 1,
      }}
      title={`${date}: ${count} contributions`}
    />
  );
};

/**
 * Month labels component
 */
const MonthLabels: React.FC<{
  weeks: ContributionWeek[];
  cellSize: number;
  cellGap: number;
}> = ({ weeks, cellSize, cellGap }) => {
  const months: { name: string; startWeek: number }[] = [];
  let currentMonth = '';
  
  weeks.forEach((week, weekIndex) => {
    if (week.contributionDays.length > 0) {
      const date = new Date(week.contributionDays[0].date);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthName !== currentMonth) {
        months.push({ name: monthName, startWeek: weekIndex });
        currentMonth = monthName;
      }
    }
  });
  
  return (
    <div style={{ position: 'relative', height: 24, marginBottom: 8 }}>
      {months.map(({ name, startWeek }, index) => (
        <span
          key={index}
          style={{
            position: 'absolute',
            left: startWeek * (cellSize + cellGap),
            fontFamily: typography.fontFamily.mono,
            fontSize: '12px',
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
          }}
        >
          {name}
        </span>
      ))}
    </div>
  );
};

/**
 * Day of week labels component
 */
const DayLabels: React.FC<{
  cellSize: number;
  cellGap: number;
}> = ({ cellSize, cellGap }) => {
  const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginRight: 8,
      }}
    >
      {days.map((day, index) => (
        <div
          key={index}
          style={{
            height: cellSize + cellGap,
            display: 'flex',
            alignItems: 'center',
            fontFamily: typography.fontFamily.mono,
            fontSize: '10px',
            color: colors.neutral[500],
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          {day}
        </div>
      ))}
    </div>
  );
};

/**
 * Main heatmap component
 */
export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  weeks,
  startFrame = 0,
  animationDuration = 300,
  staggerDirection = 'left-right',
  busiestDay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { cellSize, cellGap } = SPEC.heatmap;
  
  // Calculate grid dimensions
  const gridWidth = weeks.length * (cellSize + cellGap);
  const gridHeight = 7 * (cellSize + cellGap);
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Month labels */}
      <div style={{ display: 'flex', marginLeft: 32 }}>
        <div style={{ width: gridWidth }}>
          <MonthLabels weeks={weeks} cellSize={cellSize} cellGap={cellGap} />
        </div>
      </div>
      
      {/* Grid with day labels */}
      <div style={{ display: 'flex' }}>
        {/* Day of week labels */}
        <DayLabels cellSize={cellSize} cellGap={cellGap} />
        
        {/* Heatmap grid */}
        <div
          style={{
            position: 'relative',
            width: gridWidth,
            height: gridHeight,
          }}
        >
          {weeks.map((week, weekIndex) =>
            week.contributionDays.map((day, dayIndex) => (
              <HeatmapCell
                key={`${weekIndex}-${dayIndex}`}
                count={day.contributionCount}
                date={day.date}
                weekIndex={weekIndex}
                dayIndex={dayIndex}
                totalWeeks={weeks.length}
                frame={frame}
                startFrame={startFrame}
                animationDuration={animationDuration}
                staggerDirection={staggerDirection}
                fps={fps}
                isBusiestDay={busiestDay?.date === day.date}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContributionHeatmap;
