import React, { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';
import { Box, Stack, Text } from '../primitives';

export type CardVariant = 'standard' | 'elevated' | 'outlined' | 'glass';
export type CardRadius = 'sm' | 'md' | 'lg' | 'xl';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  variant?: CardVariant;
  radius?: CardRadius;
  padding?: CardPadding;
  hover?: boolean;
  href?: string;
  title?: string;
  body?: string;
  className?: string;
  children?: ReactNode;
}

const paddingMap: Record<CardPadding, string> = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
};

const radiusMap: Record<CardRadius, string> = {
  sm: tokens.radii.sm,
  md: tokens.radii.md,
  lg: tokens.radii.lg,
  xl: tokens.radii.xl,
};

function getVariantStyles(variant: CardVariant): CSSProperties {
  switch (variant) {
    case 'elevated':
      return {
        background: tokens.colors.bgSurface,
        border: `1px solid ${tokens.colors.borderDefault}`,
        boxShadow: tokens.shadows.xl,
      };
    case 'outlined':
      return {
        background: 'transparent',
        border: `2px solid ${tokens.colors.borderEmphasis}`,
      };
    case 'glass':
      return {
        background: tokens.colors.overlay,
        border: `1px solid ${tokens.colors.borderEmphasis}`,
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      };
    case 'standard':
    default:
      return {
        background: tokens.colors.bgSurface,
        border: `1px solid ${tokens.colors.borderDefault}`,
      };
  }
}

export const Card: React.FC<CardProps> = ({
  variant = 'standard',
  radius = 'lg',
  padding = 'lg',
  hover = false,
  href,
  title,
  body,
  className = '',
  children,
}) => {
  const baseStyles: CSSProperties = {
    display: 'block',
    color: tokens.colors.fgPrimary,
    textDecoration: 'none',
    borderRadius: radiusMap[radius],
    padding: paddingMap[padding],
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
    ...getVariantStyles(variant),
  };

  const interactiveStyles = hover
    ? `
      .canon-card-hover:hover {
        transform: scale(1.01);
        border-color: ${tokens.colors.borderEmphasis};
        box-shadow: ${tokens.shadows.lg};
      }
      .canon-card-hover:active {
        transform: scale(0.995);
      }
      .canon-card-hover:focus-visible {
        outline: 2px solid ${tokens.colors.focus};
        outline-offset: 2px;
      }
    `
    : `
      .canon-card-static:focus-visible {
        outline: 2px solid ${tokens.colors.focus};
        outline-offset: 2px;
      }
    `;

  const cardClassName = `${hover ? 'canon-card-hover' : 'canon-card-static'} ${className}`.trim();

  const content = children ?? (
    <Stack gap="sm">
      {title ? (
        <Text as="h3" size="h4" weight="bold" style={{ lineHeight: tokens.typography.lineHeight.tight }}>
          {title}
        </Text>
      ) : null}
      {body ? (
        <Text as="p" tone="secondary" size="body">
          {body}
        </Text>
      ) : null}
    </Stack>
  );

  const cardChildren = (
    <>
      <style>{interactiveStyles}</style>
      {content}
    </>
  );

  if (href) {
    return (
      <Box as="a" className={cardClassName} style={baseStyles}>
        {cardChildren}
      </Box>
    );
  }

  return (
    <Box as="div" className={cardClassName} style={baseStyles}>
      {cardChildren}
    </Box>
  );
};

export default Card;
