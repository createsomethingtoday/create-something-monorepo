import React, { CSSProperties } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';
import { IconCard, IconCardProps } from '../cards/IconCard';

export interface IconCardGridItem {
  title: string;
  description?: string;
  icon?: 'circle' | 'square' | 'triangle' | 'hexagon';
  imageUrl?: string;
  href?: string;
}

export interface IconCardGridProps {
  /** Section heading */
  heading?: string;
  /** Cards data (JSON string for Webflow) */
  cards?: string;
  /** Number of columns (accepts string for Webflow Variant prop) */
  columns?: 2 | 3 | 4 | '2' | '3' | '4';
  /** Card style variant */
  cardVariant?: 'default' | 'minimal' | 'detailed';
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

/**
 * Default cards for demo
 */
const defaultCards: IconCardGridItem[] = [
  { title: 'High Efficiency', description: '99% metal recovery rate', icon: 'circle' },
  { title: 'Sustainable', description: 'Zero waste process', icon: 'hexagon' },
  { title: 'Scalable', description: 'From pilot to industrial scale', icon: 'square' },
  { title: 'Cost Effective', description: 'Reduce operational costs', icon: 'triangle' },
];

export const IconCardGrid: React.FC<IconCardGridProps> = ({
  heading,
  cards: cardsJson,
  columns: columnsInput = 3,
  cardVariant = 'default',
  variant = 'default',
  className = '',
}) => {
  // Parse columns (Webflow Variant returns string)
  const columns = typeof columnsInput === 'string' ? parseInt(columnsInput, 10) : columnsInput;
  // Parse cards from JSON
  let parsedCards: IconCardGridItem[] = defaultCards;
  if (cardsJson) {
    try {
      parsedCards = JSON.parse(cardsJson);
    } catch {
      // Keep defaults
    }
  }

  const sectionStyles: CSSProperties = {
    backgroundColor: cardVariant === 'minimal' ? tokens.colors.bgPure : tokens.colors.white[75],
    padding: `${tokens.spacing['2xl']} ${tokens.spacing.lg}`,
  };

  const containerStyles: CSSProperties = {
    maxWidth: '1280px',
    margin: '0 auto',
  };

  const headingStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h1,
    fontWeight: tokens.typography.fontWeight.medium,
    color: cardVariant === 'minimal' ? tokens.colors.fgPrimary : tokens.colors.gray[500],
    marginBottom: tokens.spacing.xl,
    textAlign: 'center',
  };

  const gridStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: tokens.spacing.lg,
  };

  // Responsive CSS
  const responsiveCSS = `
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-icon-card-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.md}) {
      .mavx-icon-card-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <section className={`mavx-icon-card-grid-section ${className}`} style={sectionStyles}>
      <style>{responsiveCSS}</style>
      <div style={containerStyles}>
        {heading && <h2 style={headingStyles}>{heading}</h2>}

        <div className="mavx-icon-card-grid" style={gridStyles}>
          {parsedCards.map((card, index) => (
            <IconCard
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon || 'circle'}
              imageUrl={card.imageUrl}
              href={card.href}
              variant={variant}
              cardVariant={cardVariant}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default IconCardGrid;
