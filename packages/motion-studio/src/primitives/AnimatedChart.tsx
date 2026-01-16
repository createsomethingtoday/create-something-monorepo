/**
 * AnimatedChart - Data visualization with monochrome animation
 * 
 * Charts that build incrementally, supporting the narration.
 * "Every data point earns its moment on screen."
 * 
 * MONOCHROME - Uses grayscale shades for visual hierarchy
 * 
 * @example
 * <AnimatedChart
 *   type="bar"
 *   data={adoptionData}
 *   buildStyle="bar-by-bar"
 *   startFrame={30}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, typography, animation, spacing } from '../styles';
import type { ChartBuildStyle } from '../types';

interface DataPoint {
  label: string;
  value: number;
}

interface AnimatedChartProps {
  /** Chart type */
  type: 'bar' | 'horizontal-bar' | 'pie' | 'line';
  
  /** Data to visualize */
  data: DataPoint[];
  
  /** How the chart builds */
  buildStyle?: ChartBuildStyle;
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Duration per data point in frames */
  durationPerItem?: number;
  
  /** Chart dimensions */
  width?: number;
  height?: number;
  
  /** Show labels */
  showLabels?: boolean;
  
  /** Show values */
  showValues?: boolean;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Title */
  title?: string;
  
  /** Custom className */
  className?: string;
}

// Monochrome: Single consistent shade - let HEIGHT convey value
const BAR_COLOR = colors.neutral[0]; // Pure white on dark backgrounds

// Pie charts need different shades to distinguish segments
const getPieShade = (index: number): string => {
  const shades = [
    colors.neutral[0],    // White
    colors.neutral[300],  // Light gray
    colors.neutral[500],  // Medium gray
    colors.neutral[200],  // Near white
    colors.neutral[400],  // Mid gray
  ];
  return shades[index % shades.length];
};

export const AnimatedChart: React.FC<AnimatedChartProps> = ({
  type,
  data,
  buildStyle = 'bar-by-bar',
  startFrame = 0,
  durationPerItem = animation.frames.standard,
  width = 800,
  height = 400,
  showLabels = true,
  showValues = true,
  backgroundColor = 'transparent',
  title,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const maxValue = Math.max(...data.map(d => d.value));
  const padding = spacing[8];
  const chartHeight = height - (title ? 60 : 0) - (showLabels ? 40 : 0);
  const chartWidth = width - padding * 2;
  
  const renderBarChart = () => {
    const barWidth = (chartWidth / data.length) * 0.7;
    const gap = (chartWidth / data.length) * 0.3;
    
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: chartHeight, padding }}>
        {data.map((item, index) => {
          const itemStartFrame = buildStyle === 'all-at-once' 
            ? startFrame 
            : startFrame + (index * durationPerItem);
          
          const localFrame = frame - itemStartFrame;
          
          // Spring animation for bar growth
          const progress = spring({
            fps,
            frame: localFrame,
            config: {
              damping: 20,
              mass: 0.8,
              stiffness: 80,
            },
          });
          
          const barHeight = interpolate(
            progress,
            [0, 1],
            [0, (item.value / maxValue) * chartHeight],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          const opacity = interpolate(
            localFrame,
            [0, animation.frames.micro],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: barWidth,
              }}
            >
              {showValues && (
                <span
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: typography.fontSize.sm,
                    color: colors.neutral[400],
                    marginBottom: spacing[2],
                    opacity,
                  }}
                >
                  {Math.round(item.value * progress)}
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  height: Math.max(0, barHeight),
                  backgroundColor: BAR_COLOR,
                  borderRadius: '4px 4px 0 0',
                  opacity: Math.max(0, opacity),
                }}
              />
              {showLabels && (
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.fontSize.xs,
                    color: colors.neutral[300],
                    marginTop: spacing[2],
                    textAlign: 'center',
                    opacity,
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderHorizontalBarChart = () => {
    const barHeight = Math.min(40, (chartHeight / data.length) * 0.7);
    const gap = Math.min(12, (chartHeight / data.length) * 0.3);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap, padding }}>
        {data.map((item, index) => {
          const itemStartFrame = buildStyle === 'all-at-once'
            ? startFrame
            : startFrame + (index * durationPerItem);
          
          const localFrame = frame - itemStartFrame;
          
          const progress = spring({
            fps,
            frame: localFrame,
            config: {
              damping: 20,
              mass: 0.8,
              stiffness: 80,
            },
          });
          
          const barWidth = interpolate(
            progress,
            [0, 1],
            [0, (item.value / maxValue) * chartWidth * 0.7],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          const opacity = interpolate(
            localFrame,
            [0, animation.frames.micro],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
              }}
            >
              {showLabels && (
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.fontSize.sm,
                    color: colors.neutral[300],
                    width: chartWidth * 0.25,
                    textAlign: 'right',
                    opacity,
                  }}
                >
                  {item.label}
                </span>
              )}
              <div
                style={{
                  height: barHeight,
                  width: Math.max(0, barWidth),
                  backgroundColor: BAR_COLOR,
                  borderRadius: '0 4px 4px 0',
                  opacity: Math.max(0, opacity),
                }}
              />
              {showValues && (
                <span
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: typography.fontSize.sm,
                    color: colors.neutral[400],
                    opacity,
                  }}
                >
                  {Math.round(item.value * progress)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  const renderPieChart = () => {
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    let currentAngle = -90; // Start from top
    
    return (
      <svg width={chartWidth} height={chartHeight} style={{ padding }}>
        {data.map((item, index) => {
          const itemStartFrame = buildStyle === 'all-at-once'
            ? startFrame
            : startFrame + (index * durationPerItem);
          
          const localFrame = frame - itemStartFrame;
          
          const progress = spring({
            fps,
            frame: localFrame,
            config: {
              damping: 25,
              mass: 1,
              stiffness: 60,
            },
          });
          
          const percentage = item.value / total;
          const angle = percentage * 360 * Math.max(0, progress);
          
          const startAngle = currentAngle;
          const endAngle = startAngle + angle;
          
          currentAngle += percentage * 360;
          
          // Calculate arc path
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          
          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          const pathD = angle > 0
            ? `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
            : '';
          
          const opacity = interpolate(
            localFrame,
            [0, animation.frames.micro],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <path
              key={index}
              d={pathD}
              fill={getPieShade(index)}
              opacity={Math.max(0, opacity)}
              stroke={backgroundColor === 'transparent' ? colors.neutral[950] : backgroundColor}
              strokeWidth={2}
            />
          );
        })}
      </svg>
    );
  };
  
  return (
    <div
      className={className}
      style={{
        width,
        height,
        backgroundColor,
        borderRadius: spacing[2],
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.neutral[50],
            textAlign: 'center',
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          {title}
        </div>
      )}
      {type === 'bar' && renderBarChart()}
      {type === 'horizontal-bar' && renderHorizontalBarChart()}
      {type === 'pie' && renderPieChart()}
    </div>
  );
};
