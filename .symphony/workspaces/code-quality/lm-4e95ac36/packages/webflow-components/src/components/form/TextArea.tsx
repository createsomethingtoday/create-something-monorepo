import React, { CSSProperties, useId } from 'react';
import { tokens } from '../../styles/tokens';
import { TextFieldSize } from './TextField';

export interface TextAreaProps {
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  fieldName?: string;
  id?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  size?: TextFieldSize;
  value?: string;
  className?: string;
}

const sizeStyles: Record<TextFieldSize, { minHeight: string; padding: string; fontSize: string; labelSize: string }> = {
  sm: {
    minHeight: '96px',
    padding: '0.75rem 1rem',
    fontSize: tokens.typography.fontSize.bodySm,
    labelSize: tokens.typography.fontSize.caption,
  },
  md: {
    minHeight: '128px',
    padding: '0.875rem 1rem',
    fontSize: tokens.typography.fontSize.body,
    labelSize: tokens.typography.fontSize.bodySm,
  },
  lg: {
    minHeight: '160px',
    padding: '1rem 1.25rem',
    fontSize: tokens.typography.fontSize.bodyLg,
    labelSize: tokens.typography.fontSize.body,
  },
};

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  placeholder,
  description,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  name,
  fieldName,
  id,
  minLength,
  maxLength,
  rows = 5,
  size = 'md',
  value,
  className = '',
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined;
  const htmlName = name || fieldName;
  const fieldSize = sizeStyles[size];

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    width: '100%',
  };

  const labelStyles: CSSProperties = {
    color: tokens.colors.fgSecondary,
    fontSize: fieldSize.labelSize,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const inputStyles: CSSProperties = {
    width: '100%',
    minHeight: fieldSize.minHeight,
    padding: fieldSize.padding,
    borderRadius: tokens.radii.md,
    border: `1px solid ${error ? tokens.colors.error : tokens.colors.borderDefault}`,
    background: disabled || readOnly ? tokens.colors.bgSubtle : tokens.colors.bgSurface,
    color: tokens.colors.fgPrimary,
    fontSize: fieldSize.fontSize,
    fontFamily: tokens.typography.fontFamily.sans,
    lineHeight: tokens.typography.lineHeight.relaxed,
    transition: `border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}, box-shadow ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
    outline: 'none',
    opacity: disabled ? 0.5 : 1,
    resize: 'vertical',
  };

  const helperStyles: CSSProperties = {
    margin: 0,
    color: error ? tokens.colors.error : tokens.colors.fgMuted,
    fontSize: tokens.typography.fontSize.caption,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const fieldCss = `
    .canon-textarea-input::placeholder {
      color: ${tokens.colors.fgMuted};
    }
    .canon-textarea-input:hover:not(:disabled):not(:read-only):not(:focus) {
      border-color: ${tokens.colors.borderEmphasis};
    }
    .canon-textarea-input:focus {
      border-color: ${error ? tokens.colors.error : tokens.colors.borderEmphasis};
      box-shadow: 0 0 0 3px ${error ? tokens.colors.errorMuted : tokens.colors.focus};
    }
  `;

  return (
    <div className={className} style={containerStyles}>
      <style>{fieldCss}</style>

      {label ? (
        <label htmlFor={fieldId} style={labelStyles}>
          {label}
          {required ? <span style={{ color: tokens.colors.error }}> *</span> : null}
        </label>
      ) : null}

      <textarea
        id={fieldId}
        name={htmlName}
        className="canon-textarea-input"
        style={inputStyles}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        minLength={minLength}
        maxLength={maxLength}
        rows={rows}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
      />

      {error ? (
        <p id={errorId} role="alert" style={helperStyles}>
          {error}
        </p>
      ) : description ? (
        <p id={descriptionId} style={helperStyles}>
          {description}
        </p>
      ) : null}
    </div>
  );
};

export default TextArea;
