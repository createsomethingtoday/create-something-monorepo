import React, { CSSProperties, useId } from 'react';
import { tokens } from '../../styles/tokens';

export type TextFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'tel'
  | 'url'
  | 'search'
  | 'number';

export type TextFieldSize = 'sm' | 'md' | 'lg';

export interface TextFieldProps {
  label?: string;
  type?: TextFieldType;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  fieldName?: string;
  id?: string;
  autoComplete?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  size?: TextFieldSize;
  value?: string;
  className?: string;
}

const sizeStyles: Record<TextFieldSize, { minHeight: string; padding: string; fontSize: string; labelSize: string }> = {
  sm: {
    minHeight: '36px',
    padding: '0.5rem 1rem',
    fontSize: tokens.typography.fontSize.bodySm,
    labelSize: tokens.typography.fontSize.caption,
  },
  md: {
    minHeight: '44px',
    padding: '0.75rem 1rem',
    fontSize: tokens.typography.fontSize.body,
    labelSize: tokens.typography.fontSize.bodySm,
  },
  lg: {
    minHeight: '52px',
    padding: '1rem 1.25rem',
    fontSize: tokens.typography.fontSize.bodyLg,
    labelSize: tokens.typography.fontSize.body,
  },
};

export const TextField: React.FC<TextFieldProps> = ({
  label,
  type = 'text',
  placeholder,
  description,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  name,
  fieldName,
  id,
  autoComplete,
  pattern,
  minLength,
  maxLength,
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
    transition: `border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}, box-shadow ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
    outline: 'none',
    opacity: disabled ? 0.5 : 1,
  };

  const helperStyles: CSSProperties = {
    margin: 0,
    color: error ? tokens.colors.error : tokens.colors.fgMuted,
    fontSize: tokens.typography.fontSize.caption,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const fieldCss = `
    .canon-textfield-input::placeholder {
      color: ${tokens.colors.fgMuted};
    }
    .canon-textfield-input:hover:not(:disabled):not(:read-only):not(:focus) {
      border-color: ${tokens.colors.borderEmphasis};
    }
    .canon-textfield-input:focus {
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

      <input
        id={fieldId}
        name={htmlName}
        type={type}
        className="canon-textfield-input"
        style={inputStyles}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={autoComplete}
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
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

export default TextField;
