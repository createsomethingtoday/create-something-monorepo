import React, { CSSProperties, useState } from 'react';
import { tokens, BrandVariant, getBrandColors } from '../../styles/tokens';

export interface ProcessStep {
  id: string;
  number: number;
  title: string;
  description: string;
  imageSrc?: string;
}

export interface ProcessStepsProps {
  /** Section heading */
  heading?: string;
  /** Steps data (JSON string for Webflow) */
  steps?: string;
  /** Brand color variant */
  variant?: BrandVariant;
  /** Additional class name */
  className?: string;
}

/**
 * Default steps for demo
 */
const defaultSteps: ProcessStep[] = [
  {
    id: 'step1',
    number: 1,
    title: 'Assessment',
    description: 'We analyze your current operations and identify optimization opportunities.',
  },
  {
    id: 'step2',
    number: 2,
    title: 'Design',
    description: 'Custom solution architecture tailored to your specific requirements.',
  },
  {
    id: 'step3',
    number: 3,
    title: 'Implementation',
    description: 'Seamless deployment with minimal disruption to existing operations.',
  },
  {
    id: 'step4',
    number: 4,
    title: 'Optimization',
    description: 'Continuous monitoring and improvement for maximum efficiency.',
  },
];

export const ProcessSteps: React.FC<ProcessStepsProps> = ({
  heading = 'How It Works',
  steps: stepsJson,
  variant = 'default',
  className = '',
}) => {
  const brand = getBrandColors(variant);

  // Parse steps from JSON
  let parsedSteps: ProcessStep[] = defaultSteps;
  if (stepsJson) {
    try {
      parsedSteps = JSON.parse(stepsJson);
    } catch {
      // Keep defaults
    }
  }

  const [activeStep, setActiveStep] = useState(0);
  const currentStep = parsedSteps[activeStep];

  const sectionStyles: CSSProperties = {
    backgroundColor: tokens.colors.bgPure,
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
    color: tokens.colors.fgPrimary,
    marginBottom: tokens.spacing.xl,
    textAlign: 'center',
  };

  const contentGridStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacing.xl,
    alignItems: 'center',
  };

  const stepsNavStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const getStepButtonStyles = (isActive: boolean, index: number): CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    backgroundColor: isActive ? tokens.colors.bgSurface : 'transparent',
    border: 'none',
    borderRadius: 0, // Maverick X: no border radius
    cursor: 'pointer',
    textAlign: 'left',
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
    opacity: isActive ? 1 : 0.6,
  });

  const stepNumberStyles = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: isActive ? brand.primary : tokens.colors.bgSubtle,
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.bold,
    color: isActive ? tokens.colors.fgPrimary : tokens.colors.fgTertiary,
    flexShrink: 0,
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  });

  const stepContentStyles: CSSProperties = {
    flex: 1,
  };

  const stepTitleStyles = (isActive: boolean): CSSProperties => ({
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.medium,
    color: isActive ? tokens.colors.fgPrimary : tokens.colors.fgSecondary,
    marginBottom: '4px',
  });

  const stepDescStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    color: tokens.colors.fgTertiary,
    lineHeight: tokens.typography.lineHeight.relaxed,
  };

  const visualAreaStyles: CSSProperties = {
    aspectRatio: '4/3',
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: 0, // Maverick X: no border radius
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const imageStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const placeholderStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.xl,
    textAlign: 'center',
  };

  const bigNumberStyles: CSSProperties = {
    fontFamily: tokens.typography.fontFamily.tight,
    fontSize: '6rem',
    fontWeight: tokens.typography.fontWeight.bold,
    color: brand.primary,
    lineHeight: 1,
    opacity: 0.3,
  };

  // Dots navigation
  const dotsContainerStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xl,
  };

  const getDotStyles = (isActive: boolean): CSSProperties => ({
    width: isActive ? '32px' : '12px',
    height: '12px',
    borderRadius: tokens.radii.full,
    backgroundColor: isActive ? brand.primary : tokens.colors.bgSubtle,
    border: 'none',
    cursor: 'pointer',
    transition: `all ${tokens.animation.duration.standard} ${tokens.animation.easing.standard}`,
  });

  // Responsive
  const responsiveCSS = `
    .mavx-process-step:hover {
      opacity: 1 !important;
      background-color: ${tokens.colors.bgSubtle};
    }
    .mavx-process-dot:hover {
      background-color: ${brand.light};
    }
    @media (max-width: ${tokens.breakpoints.lg}) {
      .mavx-process-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  return (
    <section className={`mavx-process-steps ${className}`} style={sectionStyles}>
      <style>{responsiveCSS}</style>
      <div style={containerStyles}>
        <h2 style={headingStyles}>{heading}</h2>

        <div className="mavx-process-grid" style={contentGridStyles}>
          {/* Steps Navigation */}
          <div style={stepsNavStyles}>
            {parsedSteps.map((step, index) => (
              <button
                key={step.id}
                className="mavx-process-step"
                style={getStepButtonStyles(activeStep === index, index)}
                onClick={() => setActiveStep(index)}
              >
                <span style={stepNumberStyles(activeStep === index)}>{step.number}</span>
                <div style={stepContentStyles}>
                  <div style={stepTitleStyles(activeStep === index)}>{step.title}</div>
                  <div style={stepDescStyles}>{step.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Visual Area */}
          <div style={visualAreaStyles}>
            {currentStep?.imageSrc ? (
              <img src={currentStep.imageSrc} alt={currentStep.title} style={imageStyles} />
            ) : (
              <div style={placeholderStyles}>
                <div style={bigNumberStyles}>{currentStep?.number}</div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontFamily.tight,
                    fontSize: tokens.typography.fontSize.h3,
                    color: tokens.colors.fgSecondary,
                  }}
                >
                  {currentStep?.title}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dots Navigation */}
        <div style={dotsContainerStyles}>
          {parsedSteps.map((_, index) => (
            <button
              key={index}
              className="mavx-process-dot"
              style={getDotStyles(activeStep === index)}
              onClick={() => setActiveStep(index)}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSteps;
