export default function TextAreaField({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  maxLength,
  placeholder = '',
  description,
  helpText,
  errorMessage = '',
  showAsterisk = false,
  showCharacterCount = false,
  className = '',
  textAreaClassName = 'input cc-text-area w-input',
  style = {}
}) {
  const helpTextId = helpText ? `${id}-help` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const characterCountId = showCharacterCount && maxLength ? `${id}-count` : undefined;
  const describedBy = [helpTextId, characterCountId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`input-group ${className}`} style={style}>
      <label htmlFor={id} className="input-label">
        {label}
        {showAsterisk && <span className="dyn-asterisk">*</span>}
        <br />
      </label>
      {description && (
        <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
          <div className="rich-text w-richtext">
            <p><span dangerouslySetInnerHTML={{ __html: description }} /></p>
          </div>
        </div>
      )}
      <textarea
        id={id}
        name={name}
        maxLength={maxLength}
        data-name={name}
        placeholder={placeholder}
        required={required}
        className={textAreaClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errorMessage ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required ? 'true' : undefined}
      />
      {helpText && (
        <div id={helpTextId} className="cc-help-text">
          {helpText}
        </div>
      )}
      {showCharacterCount && maxLength && (
        <div
          id={characterCountId}
          className="cc-character-count"
          aria-live="polite"
          aria-atomic="true"
        >
          {value.length}/{maxLength} characters
        </div>
      )}
      {errorMessage && (
        <div id={errorId} className="validation-error-message cc-error_text" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
