import React, { CSSProperties } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export interface ProductItem {
  name: string;
  tagline: string;
  description?: string;
  url: string;
  videoSrc?: string;
  imageSrc?: string;
}

export interface ProductShowcaseProps {
  /** Products data (JSON string for Webflow) */
  products?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

/**
 * Default products for demo
 */
const defaultProducts: ProductItem[] = [
  {
    name: 'LithX',
    tagline: 'Mining Solutions',
    description: 'Advanced lithium extraction technology for sustainable mining operations.',
    url: '#',
    videoSrc: '',
  },
  {
    name: 'PetroX',
    tagline: 'Oil & Gas Technology',
    description: 'Innovative produced water treatment for the energy sector.',
    url: '#',
    videoSrc: '',
  },
  {
    name: 'DME',
    tagline: 'Water Treatment',
    description: 'Direct metal extraction for industrial and municipal applications.',
    url: '#',
    videoSrc: '',
  },
];

const ProductCard: React.FC<{
  product: ProductItem;
  variant: BrandVariant;
  index: number;
}> = ({ product, variant, index }) => {
  const brand = getBrandColors(variant);

  const cardStyles: CSSProperties = {
    position: 'relative',
    display: 'flex',
    minHeight: '800px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
  };

  const mediaStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: `transform ${tokens.animation.duration.complex} ${tokens.animation.easing.standard}`,
  };

  const fallbackStyles: CSSProperties = {
    ...mediaStyles,
    background: `linear-gradient(135deg, ${tokens.colors.gray[400]} 0%, ${tokens.colors.gray[500]} 100%)`,
  };

  const overlayStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)',
    transition: `opacity ${tokens.animation.duration.complex} ${tokens.animation.easing.standard}`,
  };

  const contentStyles: CSSProperties = {
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    height: '100%',
    width: '100%',
    padding: tokens.spacing.lg,
  };

  const nameStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.fgPrimary,
    marginBottom: tokens.spacing.sm,
  };

  const taglineStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: tokens.spacing.md,
    opacity: 0,
    transition: `opacity ${tokens.animation.duration.complex} ${tokens.animation.easing.standard}`,
  };

  const descriptionStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: tokens.typography.lineHeight.relaxed,
    opacity: 0,
    transition: `opacity ${tokens.animation.duration.complex} ${tokens.animation.easing.standard}`,
  };

  // Hover styles
  const hoverCSS = `
    .mavx-product-card:hover .mavx-product-media {
      transform: scale(1.05);
    }
    .mavx-product-card:hover .mavx-product-overlay {
      opacity: 0.85;
    }
    .mavx-product-card:hover .mavx-product-tagline,
    .mavx-product-card:hover .mavx-product-description {
      opacity: 1;
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-product-card {
        min-height: 500px !important;
      }
    }
    @media (max-width: ${tokens.breakpoints.md}) {
      .mavx-product-card {
        min-height: 400px !important;
      }
    }
  `;

  return (
    <a href={product.url} className="mavx-product-card" style={cardStyles}>
      <style>{hoverCSS}</style>

      {/* Background */}
      {product.videoSrc ? (
        <video
          className="mavx-product-media"
          style={mediaStyles}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={product.videoSrc} type="video/mp4" />
        </video>
      ) : product.imageSrc ? (
        <img
          className="mavx-product-media"
          src={product.imageSrc}
          alt={product.name}
          style={mediaStyles}
        />
      ) : (
        <div className="mavx-product-media" style={fallbackStyles} />
      )}

      {/* Overlay */}
      <div className="mavx-product-overlay" style={overlayStyles} />

      {/* Content */}
      <div style={contentStyles}>
        <h3 style={nameStyles}>{product.name}</h3>
        <p className="mavx-product-tagline" style={taglineStyles}>
          {product.tagline}
        </p>
        {product.description && (
          <p className="mavx-product-description" style={descriptionStyles}>
            {product.description}
          </p>
        )}
      </div>
    </a>
  );
};

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  products: productsJson,
  variant = 'default',
  className = '',
}) => {
  // Parse products from JSON
  let parsedProducts: ProductItem[] = defaultProducts;

  if (productsJson) {
    try {
      parsedProducts = JSON.parse(productsJson);
    } catch {
      // Keep defaults on parse error
    }
  }

  const containerStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${parsedProducts.length}, 1fr)`,
    backgroundColor: tokens.colors.bgPure,
  };

  // Responsive CSS
  const responsiveCSS = `
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-product-showcase {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <section className={`mavx-product-showcase ${className}`} style={containerStyles}>
      <style>{responsiveCSS}</style>
      {parsedProducts.map((product, index) => (
        <ProductCard
          key={product.name}
          product={product}
          variant={variant}
          index={index}
        />
      ))}
    </section>
  );
};

export default ProductShowcase;
