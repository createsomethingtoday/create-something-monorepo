export default function CheckboxGroup({
  id,
  label,
  options,
  selectedValues,
  onChange,
  showAsterisk = false,
  description,
  errorMessage,
  className = ''
}) {
  const groupId = id || `checkbox-group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const descriptionId = description ? `${groupId}-description` : undefined;
  const errorId = errorMessage ? `${groupId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const handleCheckboxChange = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <fieldset className={`input-group ${className} cc-checkbox-fieldset`}>
      <legend className="input-label">
        {label}
        {showAsterisk && <span className="dyn-asterisk">*</span>}
      </legend>
      {description && (
        <div
          id={descriptionId}
          data-wf--rich-text--alignment="left-align"
          className="rich-text-component paragraph-sm"
        >
          <div className="rich-text w-richtext">
            <p><span dangerouslySetInnerHTML={{ __html: description }} /></p>
          </div>
        </div>
      )}
      <div className="row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {options.map(option => (
          <div key={option.value} className="col col-shrink">
            <label
              className="w-checkbox input-group cc-toggle"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0' }}
            >
              <input
                id={`Checkbox-${option.value}`}
                type="checkbox"
                name={groupId}
                checked={selectedValues.includes(option.value)}
                onChange={() => handleCheckboxChange(option.value)}
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: '0', flexShrink: '0' }}
                aria-invalid={errorMessage ? 'true' : undefined}
                aria-describedby={describedBy}
              />
              <span className="input-label cc-toggle w-form-label" style={{ marginBottom: '0' }}>
                {option.label}
              </span>
            </label>
          </div>
        ))}
      </div>
      {errorMessage && (
        <div
          id={errorId}
          className="validation-error-message"
          style={{
            color: 'rgb(231, 76, 60)',
            fontSize: '14px',
            marginTop: '8px',
            display: 'block'
          }}
        >
          {errorMessage}
        </div>
      )}
    </fieldset>
  );
}
