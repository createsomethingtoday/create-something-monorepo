/**
 * LayeredReveal - Parallax multi-layer composition
 * 
 * The documentary style: layers of content with depth.
 * Ken Burns meets data visualization.
 * 
 * @example
 * <LayeredReveal
 *   layers={[
 *     { content: <Background />, depth: 0.2 },
 *     { content: <Subject />, depth: 0.5 },
 *     { content: <Foreground />, depth: 1.0 },
 *   ]}
 *   direction="zoom-out"
 * />
 */
import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { colors, animation } from '../styles';
import type { ParallaxLayer } from '../types';

interface LayeredRevealProps {
  /** Layers to compose (back to front) */
  layers: ParallaxLayer[];
  
  /** Animation direction */
  direction?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
  
  /** Frame when animation starts */
  startFrame?: number;
  
  /** Animation duration in frames */
  duration?: number;
  
  /** Container dimensions */
  width?: number;
  height?: number;
  
  /** Amount of parallax movement (pixels) */
  parallaxAmount?: number;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Custom className */
  className?: string;
}

export const LayeredReveal: React.FC<LayeredRevealProps> = ({
  layers,
  direction = 'zoom-out',
  startFrame = 0,
  duration = animation.frames.complex * 4,
  width = 1920,
  height = 1080,
  parallaxAmount = 50,
  backgroundColor = colors.neutral[950],
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const localFrame = frame - startFrame;
  
  // Overall progress
  const progress = interpolate(
    localFrame,
    [0, duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Calculate transforms based on direction
  const getLayerTransform = (layer: ParallaxLayer) => {
    const { depth, offset = { x: 0, y: 0 } } = layer;
    const movement = parallaxAmount * depth * progress;
    
    let translateX = offset.x;
    let translateY = offset.y;
    let scale = 1;
    
    switch (direction) {
      case 'zoom-in':
        scale = interpolate(progress, [0, 1], [1, 1 + 0.2 * depth]);
        break;
      case 'zoom-out':
        scale = interpolate(progress, [0, 1], [1 + 0.2 * depth, 1]);
        break;
      case 'pan-left':
        translateX += movement;
        break;
      case 'pan-right':
        translateX -= movement;
        break;
      case 'pan-up':
        translateY += movement;
        break;
      case 'pan-down':
        translateY -= movement;
        break;
    }
    
    return `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };
  
  // Opacity fade-in for each layer
  const getLayerOpacity = (index: number) => {
    const staggerDelay = (index * animation.frames.micro) / duration;
    const layerProgress = interpolate(
      progress,
      [staggerDelay, staggerDelay + 0.3],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    return layerProgress;
  };
  
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor,
        overflow: 'hidden',
      }}
    >
      {layers.map((layer, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: getLayerTransform(layer),
            opacity: getLayerOpacity(index),
            zIndex: layer.zIndex ?? index,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {typeof layer.content === 'string' ? (
            <img
              src={layer.content}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            layer.content
          )}
        </div>
      ))}
    </div>
  );
};
