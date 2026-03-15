/**
 * AnnotatedImage - Image with animated callouts
 * 
 * The Vox signature: images that explain themselves.
 * Lines draw, labels appear, highlights pulse.
 * 
 * @example
 * <AnnotatedImage
 *   src="/architecture-diagram.png"
 *   annotations={[
 *     { x: 0.3, y: 0.4, label: "DRY Layer", revealFrame: 45 }
 *   ]}
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from 'remotion';
import { colors, typography, animation, spacing } from '../styles';
import type { AnnotationConfig } from '../types';

interface AnnotatedImageProps {
  /** Image source URL */
  src: string;
  
  /** Alt text for accessibility */
  alt?: string;
  
  /** Annotations to display */
  annotations: AnnotationConfig[];
  
  /** Image dimensions */
  width?: number;
  height?: number;
  
  /** Annotation line color */
  lineColor?: string;
  
  /** Annotation label color */
  labelColor?: string;
  
  /** Annotation background color */
  labelBackgroundColor?: string;
  
  /** Whether to show pulse effect on points */
  showPulse?: boolean;
  
  /** Custom className */
  className?: string;
}

export const AnnotatedImage: React.FC<AnnotatedImageProps> = ({
  src,
  alt = '',
  annotations,
  width = 800,
  height = 600,
  lineColor = colors.neutral[0],
  labelColor = colors.neutral[950],
  labelBackgroundColor = colors.neutral[0],
  showPulse = true,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const renderAnnotation = (annotation: AnnotationConfig, index: number) => {
    const localFrame = frame - annotation.revealFrame;
    
    if (localFrame < 0) return null;
    
    // Animation progress
    const lineProgress = spring({
      fps,
      frame: localFrame,
      config: {
        damping: 20,
        mass: 0.5,
        stiffness: 100,
      },
    });
    
    const labelProgress = spring({
      fps,
      frame: localFrame - animation.frames.micro,
      config: {
        damping: 15,
        mass: 0.5,
        stiffness: 120,
      },
    });
    
    // Calculate positions
    const pointX = annotation.x * width;
    const pointY = annotation.y * height;
    
    // Determine label offset based on position
    const position = annotation.position || 'top';
    const lineLength = 60;
    const labelOffsets = {
      top: { x: 0, y: -lineLength },
      bottom: { x: 0, y: lineLength },
      left: { x: -lineLength, y: 0 },
      right: { x: lineLength, y: 0 },
    };
    
    const offset = labelOffsets[position];
    const labelX = pointX + offset.x;
    const labelY = pointY + offset.y;
    
    // Animated line endpoint
    const currentLineX = pointX + (offset.x * lineProgress);
    const currentLineY = pointY + (offset.y * lineProgress);
    
    // Pulse animation for point
    const pulseScale = showPulse
      ? 1 + 0.3 * Math.sin((frame - annotation.revealFrame) * 0.1)
      : 1;
    
    return (
      <g key={index}>
        {/* Connection line */}
        <line
          x1={pointX}
          y1={pointY}
          x2={currentLineX}
          y2={currentLineY}
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        
        {/* Point marker */}
        <circle
          cx={pointX}
          cy={pointY}
          r={6 * pulseScale}
          fill={lineColor}
          opacity={lineProgress}
        />
        
        {/* Outer pulse ring */}
        {showPulse && (
          <circle
            cx={pointX}
            cy={pointY}
            r={12 * pulseScale}
            fill="none"
            stroke={lineColor}
            strokeWidth={1}
            opacity={0.5 * lineProgress}
          />
        )}
        
        {/* Label background */}
        <rect
          x={labelX - 60}
          y={labelY - 14}
          width={120}
          height={28}
          rx={4}
          fill={labelBackgroundColor}
          opacity={Math.max(0, labelProgress)}
          transform={`scale(${interpolate(labelProgress, [0, 1], [0.8, 1])})`}
          style={{ transformOrigin: `${labelX}px ${labelY}px` }}
        />
        
        {/* Label text */}
        <text
          x={labelX}
          y={labelY + 5}
          textAnchor="middle"
          fill={labelColor}
          fontFamily={typography.fontFamily.sans}
          fontSize={typography.fontSize.sm}
          fontWeight={typography.fontWeight.semibold}
          opacity={Math.max(0, labelProgress)}
        >
          {annotation.label}
        </text>
      </g>
    );
  };
  
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
      }}
    >
      {/* Base image */}
      <Img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
      
      {/* Annotations overlay */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {annotations.map(renderAnnotation)}
      </svg>
    </div>
  );
};
