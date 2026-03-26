export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  maxLength,
  placeholder = '',
  description,
  helpText,
  errorMessage = '',
  autoComplete,
  showAsterisk = false,
  className = '',
  inputClassName = 'input w-input',
  style = {}
}) {
  const helpTextId = helpText ? `${id}-help` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const describedBy = [helpTextId, errorId].filter(Boolean).join(' ') || undefined;

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
      <input
        className={inputClassName}
        maxLength={maxLength}
        name={name}
        data-name={name}
        placeholder={placeholder}
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={errorMessage ? 'true' : undefined}
        aria-describedby={describedBy}
        aria-required={required ? 'true' : undefined}
      />
      {helpText && (
        <div id={helpTextId} className="cc-help-text">
          {helpText}
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
