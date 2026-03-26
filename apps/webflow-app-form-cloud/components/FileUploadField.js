export default function FileUploadField({
  id,
  name,
  label,
  accept = '.bmp, .dng, .eps, .gif, .jpg, .jpeg, .png, .ps, .raw, .svg, .tga, .tif, .tiff',
  description,
  uploadedFile,
  onFileUpload,
  onFileRemove,
  fileInputRef,
  required = false,
  errorMessage = '',
  showAsterisk = false,
  className = ''
}) {
  const errorId = errorMessage ? `${id}-error` : undefined;
  const handleButtonKeyDown = (event, callback) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  return (
    <div className={`input-group ${className}`}>
      <label htmlFor={id} className="input-label">
        {label} {showAsterisk && <span className="dyn-asterisk" style={{ display: 'none' }}>*</span>}
        <br />
      </label>
      {description && (
        <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
          <div className="rich-text w-richtext">
            <p><span dangerouslySetInnerHTML={{ __html: description }} /></p>
          </div>
        </div>
      )}
      <div className="form-file_upload w-file-upload">
        <div className="u-w-100 w-file-upload-default" style={{ display: uploadedFile ? 'none' : 'block' }}>
          <input
            className="w-file-upload-input"
            accept={accept}
            name={name}
            data-name={name}
            aria-hidden="true"
            type="file"
            id={id}
            tabIndex="-1"
            ref={fileInputRef}
            onChange={(e) => onFileUpload(e.target.files[0])}
            style={{ height: '69.2031px', width: '1px' }}
            aria-required={required ? 'true' : undefined}
            aria-invalid={errorMessage ? 'true' : undefined}
            aria-describedby={errorId}
          />
          <label
            htmlFor={id}
            role="button"
            tabIndex="0"
            className="form-file_upload-button w-file-upload-label"
            onKeyDown={(event) => handleButtonKeyDown(event, () => fileInputRef?.current?.click())}
          >
            <div className="w-inline-block">Upload File</div>
          </label>
        </div>
        <div tabIndex="-1" className="w-file-upload-success" style={{ display: uploadedFile ? 'block' : 'none' }}>
          <div className="w-file-upload-file">
            <div className="w-file-upload-file-name">
              {uploadedFile?.name || 'fileuploaded.jpg'}
            </div>
            <div
              aria-label="Remove file"
              role="button"
              tabIndex="0"
              className="w-file-remove-link"
              onClick={onFileRemove}
              onKeyDown={(event) => handleButtonKeyDown(event, onFileRemove)}
            >
              <div className="w-icon-file-upload-remove" aria-hidden="true"></div>
            </div>
          </div>
        </div>
        <div tabIndex="-1" className="form-error u-w-100 w-file-upload-error w-hidden">
          <div className="w-file-upload-error-msg" data-w-size-error="Upload failed. Max size for files is 10 MB." data-w-type-error="Upload failed. Invalid file type." data-w-generic-error="Upload failed. Something went wrong. Please retry.">
            Upload failed. Max size for files is 10 MB.
          </div>
        </div>
      </div>
      {errorMessage && (
        <div id={errorId} className="validation-error-message cc-error_text" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
