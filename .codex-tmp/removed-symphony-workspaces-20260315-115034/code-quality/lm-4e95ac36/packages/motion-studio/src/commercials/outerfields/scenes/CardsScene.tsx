/**
 * CardsScene - Your content library
 * 
 * Clean, focused: Video cards cascade in on a dark background.
 * One card highlights to transition to the next scene.
 * 
 * Duration: 8 seconds (240 frames)
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { Play } from 'lucide-react';
import { SPEC } from '../spec';

export const CardsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes, colors, videoCards, fonts } = SPEC;
  const { cards } = scenes;
  
  const thumbnails = videoCards.thumbnails;
  const cardWidth = 280;
  const cardHeight = cardWidth * (1 / videoCards.aspectRatio);
  const cardGap = 20;
  
  // Which card to highlight (transitions to player)
  const highlightIndex = 2;
  const isHighlighting = frame >= cards.highlightCard;
  
  // Card component
  const VideoCard: React.FC<{
    thumbnail: string;
    index: number;
    isHighlighted: boolean;
  }> = ({ thumbnail, index, isHighlighted }) => {
    // Stagger entrance - cards come in from bottom with spring
    const row = Math.floor(index / 4);
    const col = index % 4;
    const delay = cards.cardCascadeStart + (row * 12) + (col * 4);
    
    const cardSpring = spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 18, stiffness: 80, mass: 1 },
    });
    
    const translateY = interpolate(cardSpring, [0, 1], [80, 0]);
    const opacity = interpolate(cardSpring, [0, 1], [0, 1]);
    const scale = interpolate(cardSpring, [0, 1], [0.9, 1]);
    
    // Highlight animation
    const highlightProgress = isHighlighted
      ? spring({
          frame: Math.max(0, frame - cards.highlightCard),
          fps,
          config: { damping: 12, stiffness: 100 },
        })
      : 0;
    
    const highlightScale = 1 + highlightProgress * 0.1;
    const borderGlow = highlightProgress;
    
    // Dim other cards when one is highlighted
    const dimAmount = isHighlighting && !isHighlighted 
      ? interpolate(
          frame,
          [cards.highlightCard, cards.highlightCard + 20],
          [1, 0.3],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      : 1;
    
    return (
      <div
        style={{
          width: cardWidth,
          opacity: opacity * dimAmount,
          transform: `translateY(${translateY}px) scale(${scale * highlightScale})`,
          transition: isHighlighting ? 'none' : undefined,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: cardHeight,
            backgroundColor: colors.bgElevated,
            borderRadius: videoCards.borderRadius,
            overflow: 'hidden',
            border: `1px solid rgba(255, 255, 255, ${0.08 + borderGlow * 0.15})`,
            boxShadow: isHighlighted 
              ? `0 0 40px rgba(244, 81, 38, ${borderGlow * 0.4}), 0 20px 60px rgba(0, 0, 0, 0.5)`
              : '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Img
            src={staticFile(`thumbnails/${thumbnail}`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
            }}
          />
          
          {/* Play button overlay (shows on highlighted card) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(0, 0, 0, ${highlightProgress * 0.5})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: highlightProgress,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: colors.snow,
                transform: `scale(${0.8 + highlightProgress * 0.2})`,
              }}
            >
              <Play size={26} fill={colors.snow} style={{ marginLeft: 4 }} />
            </div>
          </div>
        </div>
        
        {/* Video title placeholder */}
        <div
          style={{
            marginTop: 12,
            height: 6,
            width: '70%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            opacity: opacity * dimAmount,
          }}
        />
      </div>
    );
  };
  
  return (
    <AbsoluteFill style={{ backgroundColor: colors.spaceBlack }}>
      {/* Grid of cards */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${cardWidth}px)`,
          gap: cardGap,
        }}
      >
        {thumbnails.map((thumbnail, index) => (
          <VideoCard
            key={thumbnail}
            thumbnail={thumbnail}
            index={index}
            isHighlighted={index === highlightIndex && isHighlighting}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default CardsScene;
