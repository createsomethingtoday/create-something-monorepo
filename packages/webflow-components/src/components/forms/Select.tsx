import React, { CSSProperties, useId, useState } from 'react';
import { tokens } from '../../styles/tokens';

export interface SelectItem {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Select options (comma-separated string for Webflow) */
  items?: string;
  /** Currently selected value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Required field */
  required?: boolean;
  /** Field name */
  name?: string;
  /** Alias for name (used by Webflow to avoid reserved word) */
  fieldName?: string;
  /** Additional class name */
  className?: string;
}

const ChevronIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Select an option',
  items = '',
  value,
  onChange,
  required = false,
  name,
  fieldName,
  className = '',
}) => {
  const id = useId();
  const [internalValue, setInternalValue] = useState(value || '');
  // Support both 'name' and 'fieldName' (Webflow uses fieldName to avoid reserved word)
  const htmlName = name || fieldName;

  // Parse items from comma-separated string
  const parsedItems: SelectItem[] = items
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ value: item, label: item }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

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

  const selectWrapperStyles: CSSProperties = {
    position: 'relative',
  };

  const selectStyles: CSSProperties = {
    width: '100%',
    height: '52px',
    padding: '0 40px 0 16px',
    backgroundColor: tokens.colors.white[50],
    border: `1px solid ${tokens.colors.gray[75]}`,
    borderRadius: 0, // Maverick X: no border radius
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.fontSize.bodySm,
    fontWeight: tokens.typography.fontWeight.normal,
    color: internalValue ? tokens.colors.gray[500] : tokens.colors.gray[75],
    appearance: 'none',
    outline: 'none',
    cursor: 'pointer',
    transition: `border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard}`,
  };

  const chevronStyles: CSSProperties = {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  };

  // Focus styles
  const focusCSS = `
    .mavx-select:focus {
      border-color: ${tokens.colors.gray[200]};
    }
  `;

  return (
    <div className={`mavx-select-container ${className}`} style={containerStyles}>
      <style>{focusCSS}</style>

      {label && (
        <label htmlFor={id} style={labelStyles}>
          {label}
          {required && <span style={{ color: tokens.colors.error }}> *</span>}
        </label>
      )}

      <div style={selectWrapperStyles}>
        <select
          id={id}
          name={htmlName}
          className="mavx-select"
          style={selectStyles}
          value={internalValue}
          onChange={handleChange}
          required={required}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {parsedItems.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <span style={chevronStyles}>
          <ChevronIcon color={tokens.colors.gray[200]} />
        </span>
      </div>
    </div>
  );
};

export default Select;
