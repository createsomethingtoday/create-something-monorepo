import React, { CSSProperties, useId } from 'react';
import { tokens } from '../../styles/tokens';

export interface FieldProps {
  /** Field label */
  label?: string;
  /** Helper note below field */
  note?: string;
  /** Error message */
  error?: string;
  /** Input type */
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'number';
  /** Placeholder text */
  placeholder?: string;
  /** Render as textarea */
  textarea?: boolean;
  /** Required field */
  required?: boolean;
  /** Field name (for form submission) - aliased as fieldName in Webflow */
  name?: string;
  /** Alias for name (used by Webflow to avoid reserved word) */
  fieldName?: string;
  /** Field value */
  value?: string;
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Additional class name */
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  note,
  error,
  type = 'text',
  placeholder,
  textarea = false,
  required = false,
  name,
  fieldName,
  value,
  onChange,
  className = '',
}) => {
  // Support both 'name' and 'fieldName' (Webflow uses fieldName to avoid reserved word)
  const htmlName = name || fieldName;
  const id = useId();
  const noteId = note ? `${id}-note` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [noteId, errorId].filter(Boolean).join(' ') || undefined;

  const containerStyles: CSSProperties = {
    width: '100%',
  };

  const labelStyles: CSSProperties = {
    display: 'block',
    marginBottom: '14px',
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    color: tokens.colors.gray[100],
  };

  const baseInputStyles: CSSProperties = {
    width: '100%',
    padding: '16px',
    backgroundColor: tokens.colors.white[50],
    border: `1px solid ${error ? tokens.colors.error : tokens.colors.gray[75]}`,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.normal,
    color: tokens.colors.gray[500],
    outline: 'none',
    transition: `border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  const inputStyles: CSSProperties = {
    ...baseInputStyles,
    height: '52px',
    borderRadius: 0, // Maverick X: no border radius
    paddingLeft: '16px',
    paddingRight: '16px',
  };

  const textareaStyles: CSSProperties = {
    ...baseInputStyles,
    height: '238px',
    borderRadius: 0, // Maverick X: no border radius
    resize: 'none',
  };

  const noteStyles: CSSProperties = {
    marginTop: '8px',
    fontSize: tokens.typography.fontSize.caption,
    color: tokens.colors.gray[200],
  };

  const errorStyles: CSSProperties = {
    marginTop: '8px',
    fontSize: tokens.typography.fontSize.caption,
    color: tokens.colors.error,
  };

  // Focus styles via CSS
  const focusCSS = `
    .mavx-field-input:focus {
      border-color: ${tokens.colors.gray[200]};
    }
    .mavx-field-input::placeholder {
      color: ${tokens.colors.gray[75]};
    }
  `;

  return (
    <div className={`mavx-field ${className}`} style={containerStyles}>
      <style>{focusCSS}</style>

      {label && (
        <label htmlFor={id} style={labelStyles}>
          {label}
          {required && <span style={{ color: tokens.colors.error }}> *</span>}
        </label>
      )}

      {textarea ? (
        <textarea
          id={id}
          name={htmlName}
          className="mavx-field-input"
          style={textareaStyles}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={required}
        />
      ) : (
        <input
          id={id}
          name={htmlName}
          type={type}
          className="mavx-field-input"
          style={inputStyles}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-required={required}
        />
      )}

      {note && !error && (
        <div id={noteId} style={noteStyles}>
          {note}
        </div>
      )}

      {error && (
        <div id={errorId} style={errorStyles} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default Field;
