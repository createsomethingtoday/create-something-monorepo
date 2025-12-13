/**
 * Maverick X Webflow Components
 *
 * A library of React components for Webflow, adapted from the Maverick X design system.
 */

// Tokens
export * from './styles/tokens';

// Core Components
export { Button } from './components/core/Button';
export type { ButtonProps } from './components/core/Button';

// Card Components
export { GlassCard } from './components/cards/GlassCard';
export type { GlassCardProps, GlassVariant } from './components/cards/GlassCard';

export { IconCard } from './components/cards/IconCard';
export type { IconCardProps, IconCardVariant } from './components/cards/IconCard';

// Form Components
export { Field } from './components/forms/Field';
export type { FieldProps } from './components/forms/Field';

export { Select } from './components/forms/Select';
export type { SelectProps, SelectItem } from './components/forms/Select';

// Data Components
export { StatsDisplay } from './components/data/StatsDisplay';
export type { StatsDisplayProps, StatItem, StatsVariant } from './components/data/StatsDisplay';

// Section Components
export { HeroSection } from './components/sections/HeroSection';
export type { HeroSectionProps } from './components/sections/HeroSection';

export { KineticHero } from './components/sections/KineticHero';
export type { KineticHeroProps } from './components/sections/KineticHero';

export { ProductShowcase } from './components/sections/ProductShowcase';
export type { ProductShowcaseProps, ProductItem } from './components/sections/ProductShowcase';

export { Solutions } from './components/sections/Solutions';
export type { SolutionsProps, SolutionTab } from './components/sections/Solutions';

export { ProcessSteps } from './components/sections/ProcessSteps';
export type { ProcessStepsProps, ProcessStep } from './components/sections/ProcessSteps';

export { IconCardGrid } from './components/sections/IconCardGrid';
export type { IconCardGridProps, IconCardGridItem } from './components/sections/IconCardGrid';

// Layout Components
export { Header } from './components/layout/Header';
export type { HeaderProps, NavItem } from './components/layout/Header';

export { Footer } from './components/layout/Footer';
export type { FooterProps, FooterColumn, SocialLink } from './components/layout/Footer';
