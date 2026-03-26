import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { TriangleAlert } from 'lucide-react';
import { withBasePath } from '../lib/runtimePaths';

const QuillEditor = dynamic(() => import('../components/QuillEditor'), { ssr: false });

export default function EnhancedMarketplaceForm() {
  const [formData, setFormData] = useState({
    submissionType: '',
    appName: '',
    clientId: '',
    longDescription: '',
    appCapabilities: '',
    appInstallUrl: '',
    promoVideoUrl: '',
    paymentType: '',
    visibility: '',
    // File upload fields
    avatarImage: null,
    screenshots: {},
    altTexts: {}
  });

  const [validationState, setValidationState] = useState({
    clientIdVerified: false,
    clientIdError: '',
    clientIdSuccess: '',
    videoUrlError: '',
    videoUrlSuccess: '',
    uploadErrors: {},
    requiredFields: new Set()
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });

  const quillRef = useRef();

  // Valid client IDs are 64-character hexadecimal strings (SHA-256 hashes)
  const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;

  // Client ID Verification (matching original logic)
  const verifyClientId = async () => {
    const { clientId, submissionType } = formData;

    if (!clientId) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Please enter a valid Client ID to verify.',
        clientIdSuccess: '',
        clientIdVerified: false
      }));
      return;
    }

    // Validate format before API call
    if (!CLIENT_ID_PATTERN.test(clientId)) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Invalid format. Client ID must be a 64-character hexadecimal string.',
        clientIdSuccess: '',
        clientIdVerified: false
      }));
      return;
    }

    if (!submissionType) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Please select a submission type before verifying.',
        clientIdSuccess: '',
        clientIdVerified: false
      }));
      return;
    }

    try {
      const response = await fetch(withBasePath('/api/verify-client-id'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, submissionType })
      });

      const data = await response.json();

      // Handle different scenarios based on clientIdExists and submission type
      if (data.clientIdExists && submissionType === 'Update') {
        setValidationState(prev => ({
          ...prev,
          clientIdSuccess: 'Client ID successfully verified',
          clientIdError: '',
          clientIdVerified: true
        }));
      } else if (!data.clientIdExists && submissionType === 'Update') {
        setValidationState(prev => ({
          ...prev,
          clientIdError: 'Client ID unverified. Please double-check input or submit as a new app.',
          clientIdSuccess: '',
          clientIdVerified: false
        }));
      } else if (data.clientIdExists && submissionType === 'New') {
        setValidationState(prev => ({
          ...prev,
          clientIdError: 'Client ID taken. Please submit an update.',
          clientIdSuccess: '',
          clientIdVerified: false
        }));
      } else if (!data.clientIdExists && submissionType === 'New') {
        setValidationState(prev => ({
          ...prev,
          clientIdSuccess: 'Client ID verified to be available.',
          clientIdError: '',
          clientIdVerified: true
        }));
      }
    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'An error occurred. Please try again.',
        clientIdSuccess: '',
        clientIdVerified: false
      }));
    }
  };

  // YouTube URL Validation
  const validateYouTubeUrl = (url) => {
    if (!url) {
      setValidationState(prev => ({
        ...prev,
        videoUrlError: '',
        videoUrlSuccess: ''
      }));
      return true;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w\-_]{11}(&\S*)?$/;

    if (youtubeRegex.test(url)) {
      setValidationState(prev => ({
        ...prev,
        videoUrlSuccess: 'Valid YouTube URL',
        videoUrlError: ''
      }));
      return true;
    } else {
      setValidationState(prev => ({
        ...prev,
        videoUrlError: 'Please enter a valid YouTube URL',
        videoUrlSuccess: ''
      }));
      return false;
    }
  };

  // File Upload Validation
  const validateFileUpload = (file, uploadType) => {
    const UPLOAD_CONFIGS = {
      'avatarImage': {
        maxSize: 50 * 1024, // 50KB
        width: 900,
        height: 900,
        types: ['image/jpeg', 'image/png', 'image/webp']
      },
      'screenshot': {
        maxSize: 10 * 1024 * 1024, // 10MB
        width: 1920,
        height: 1080,
        types: ['image/jpeg', 'image/png', 'image/webp']
      }
    };

    const config = UPLOAD_CONFIGS[uploadType];
    if (!config) return { valid: false, error: 'Unknown upload type' };

    // File size validation
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${config.maxSize / 1024}KB`
      };
    }

    // File type validation
    if (!config.types.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please use JPEG, PNG, or WebP.'
      };
    }

    return { valid: true };
  };

  // Handle form field changes
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors when user starts typing
    if (validationState.clientIdError && name === 'clientId') {
      setValidationState(prev => ({
        ...prev,
        clientIdError: ''
      }));
    }

    // Special handling for specific fields
    if (name === 'submissionType') {
      updateFieldRequirements(value);
      // Clear client ID verification when submission type changes
      setValidationState(prev => ({
        ...prev,
        clientIdVerified: false,
        clientIdError: '',
        clientIdSuccess: ''
      }));
    }

    if (name === 'appCapabilities') {
      updateAppInstallUrlRequirements(value);
      // Clear Install URL when switching to Designer Extension (not needed for that app type)
      if (value === 'Designer Extension') {
        setFormData(prev => ({
          ...prev,
          appInstallUrl: ''
        }));
      }
    }

    if (name === 'promoVideoUrl') {
      validateYouTubeUrl(value);
    }

    if (name === 'clientId') {
      // Clear verification when client ID changes
      setValidationState(prev => ({
        ...prev,
        clientIdVerified: false
      }));
    }
  };

  // Update field requirements based on submission type
  const updateFieldRequirements = (submissionType) => {
    const requiredFields = new Set();

    if (submissionType === 'New') {
      // For new submissions, most fields are required
      requiredFields.add('appName');
      requiredFields.add('clientId');
      requiredFields.add('longDescription');
      requiredFields.add('paymentType');
      requiredFields.add('visibility');
    } else if (submissionType === 'Update') {
      // For updates, only client ID is required
      requiredFields.add('clientId');
    }

    setValidationState(prev => ({
      ...prev,
      requiredFields
    }));
  };

  // Update App Install URL requirements based on capabilities
  const updateAppInstallUrlRequirements = (capabilities) => {
    const isRequired = capabilities === 'Data Client v2' || capabilities === 'Hybrid';

    if (isRequired) {
      setValidationState(prev => ({
        ...prev,
        requiredFields: new Set([...prev.requiredFields, 'appInstallUrl'])
      }));
    } else {
      setValidationState(prev => ({
        ...prev,
        requiredFields: new Set([...prev.requiredFields].filter(field => field !== 'appInstallUrl'))
      }));
    }
  };

  // Handle Client ID focus out
  const handleClientIdFocusOut = () => {
    if (!validationState.clientIdVerified && formData.clientId) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Client ID has not yet been verified or has been changed. Please verify it.',
        clientIdSuccess: ''
      }));
    }
  };

  // Handle exclusive checkbox behavior (radio button simulation)
  const handleExclusiveCheckbox = (groupName, value) => {
    const currentValue = formData[groupName];
    const newValue = currentValue === value ? '' : value;
    handleInputChange(groupName, newValue);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate click');
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ type: '', message: '' });

    // Validate required fields
    const errors = {};
    validationState.requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = 'This field is required';
      }
    });

    // Validate client ID verification for forms that require it
    if (formData.clientId && !validationState.clientIdVerified) {
      errors.clientId = 'Client ID must be verified';
    }

    if (Object.keys(errors).length > 0) {
      setFormStatus({
        type: 'error',
        message: 'Please fill in all required fields and verify your Client ID.'
      });
      setIsSubmitting(false);
      return;
    }

    // Get Quill content
    const quillContent = quillRef.current?.getEditor().root.innerHTML;
    const finalFormData = {
      ...formData,
      longDescription: quillContent
    };

    try {
      const response = await fetch(withBasePath('/api/submit-form'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData)
      });

      if (response.ok) {
        setFormStatus({ type: 'success', message: 'Form submitted successfully!' });

        // Send message to parent frame if embedded
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'FORM_SUBMITTED',
            data: finalFormData
          }, '*');
        }
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus({ type: 'error', message: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldRequired = (fieldName) => {
    return validationState.requiredFields.has(fieldName);
  };

  return (
    <div className="form-wrapper">
      <form onSubmit={handleSubmit} className="form">
        {formStatus.message && (
          <div
            className={`form-status form-status-${formStatus.type}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {formStatus.message}
          </div>
        )}
        <div className="form-section u-position-relative">
          {/* App Info Section */}
          <div className="heading-component">
            <h2 className="h5">App info</h2>
          </div>

          {/* Submission Type */}
          <div className="input-group">
            <label htmlFor="submissionType" className="input-label">
              Submission type
              <span className="dyn-asterisk">*</span>
            </label>
            <select
              id="submissionType"
              name="submissionType"
              required
              className="input cc-select w-select"
              value={formData.submissionType}
              onChange={(e) => handleInputChange('submissionType', e.target.value)}
            >
              <option value="">Select one...</option>
              <option value="New">New App</option>
              <option value="Update">App Update</option>
            </select>

            {formData.submissionType === 'Update' && (
              <div className="form-input-notification">
                For App Updates, please note that only the Client ID is required.
                All other fields are optional. When updating, we recommend filling in
                only the fields you wish to modify, leaving the rest unchanged.
              </div>
            )}
          </div>

          {/* App Name */}
          <div className="input-group">
            <label htmlFor="appName" className="input-label">
              App name
              {isFieldRequired('appName') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component paragraph-sm">
              <p>Character limit: 30 characters</p>
            </div>
            <input
              className="input w-input"
              maxLength="30"
              name="appName"
              type="text"
              id="appName"
              required={isFieldRequired('appName')}
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
            />

            {formData.submissionType === 'Update' && (
              <div className="form-input-notification" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>The App Name field is locked for existing apps. If you need to update your
                app's name, please submit a request through our Support team.</span>
              </div>
            )}
          </div>

          {/* Client ID */}
          <div className="input-group">
            <label htmlFor="clientId" className="input-label">
              App client ID
              <span className="dyn-asterisk">*</span>
            </label>
            <div className="u-position-relative">
              <input
                className="input w-input"
                maxLength="256"
                name="clientId"
                type="text"
                id="clientId"
                required
                value={formData.clientId}
                onChange={(e) => handleInputChange('clientId', e.target.value)}
                onBlur={handleClientIdFocusOut}
              />
              <button
                type="button"
                className="btn cc-form-overlay w-button"
                onClick={verifyClientId}
              >
                Verify Client ID
              </button>
            </div>
            {validationState.clientIdError && (
              <div className="cc-error_text">
                {validationState.clientIdError}
              </div>
            )}
            {validationState.clientIdSuccess && (
              <div className="cc-success-text">
                {validationState.clientIdSuccess}
              </div>
            )}
          </div>

          {/* App Capabilities */}
          <div className="input-group">
            <label htmlFor="appCapabilities" className="input-label">
              App capabilities
              {isFieldRequired('appCapabilities') && <span className="dyn-asterisk">*</span>}
            </label>
            <select
              id="appCapabilities"
              name="appCapabilities"
              className="input cc-select w-select"
              value={formData.appCapabilities}
              onChange={(e) => handleInputChange('appCapabilities', e.target.value)}
              required={isFieldRequired('appCapabilities')}
            >
              <option value="">Select one...</option>
              <option value="Designer Extension">Designer Extension</option>
              <option value="Data Client v2">Data Client v2</option>
              <option value="Hybrid">Hybrid (Both)</option>
            </select>
          </div>

          {/* App Install URL - Only shown for Data Client v2 and Hybrid apps */}
          {(formData.appCapabilities === 'Data Client v2' || formData.appCapabilities === 'Hybrid') && (
            <div className="input-group">
              <label htmlFor="appInstallUrl" className="input-label">
                App install URL
                <span className="dyn-asterisk">*</span>
              </label>
              <div className="rich-text-component paragraph-sm">
                <p>The URL where users begin installing your app. This is your app's authorization page that initiates the OAuth flow—<strong>NOT</strong> your OAuth callback/redirect URI. <a href="https://developers.webflow.com/apps/docs/marketplace/submitting-your-app#installation-configuration" target="_blank" rel="noopener noreferrer">Learn more</a></p>
              </div>
              <input
                className="input w-input"
                maxLength="500"
                name="appInstallUrl"
                type="url"
                id="appInstallUrl"
                placeholder="https://yourapp.com/auth/webflow"
                value={formData.appInstallUrl}
                onChange={(e) => handleInputChange('appInstallUrl', e.target.value)}
                required
              />
              <div className="cc-help-text">
                Installation URL scopes must match your app configuration exactly.
              </div>
              {formData.appInstallUrl && /\/(callback|redirect|oauth\/callback)/i.test(formData.appInstallUrl) && (
                <div className="warning-text">
                  <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>This looks like an OAuth callback URL. The Install URL should be your app's authorization page, not the redirect URI.</span>
                </div>
              )}
            </div>
          )}

          {/* Promo Video URL with YouTube validation */}
          <div className="input-group">
            <label htmlFor="promoVideoUrl" className="input-label">
              Promo Video URL (Optional)
            </label>
            <div className="rich-text-component paragraph-sm">
              <p>Please provide a YouTube URL for your app's promotional video.</p>
            </div>
            <input
              className="input w-input"
              name="promoVideoUrl"
              type="url"
              id="promoVideoUrl"
              value={formData.promoVideoUrl}
              onChange={(e) => handleInputChange('promoVideoUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            {validationState.videoUrlError && (
              <div className="cc-error_text">
                {validationState.videoUrlError}
              </div>
            )}
            {validationState.videoUrlSuccess && (
              <div className="cc-success-text">
                {validationState.videoUrlSuccess}
              </div>
            )}
          </div>

          {/* Long Description with Quill Editor */}
          <div className="input-group">
            <label htmlFor="longDescription" className="input-label">
              Long description
              {isFieldRequired('longDescription') && <span className="dyn-asterisk">*</span>}
            </label>
            <QuillEditor
              ref={quillRef}
              theme="snow"
              value={formData.longDescription}
              onChange={(content) => handleInputChange('longDescription', content)}
              style={{ minHeight: '200px' }}
            />
          </div>

          {/* Payment Type - Exclusive Checkboxes */}
          <div className="input-group">
            <label className="input-label">
              Payment type
              {isFieldRequired('paymentType') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="checkbox-group">
              <label className="checkbox-label w-checkbox">
                <input
                  type="checkbox"
                  checked={formData.paymentType === 'Free'}
                  onChange={() => handleExclusiveCheckbox('paymentType', 'Free')}
                />
                <span className="w-checkbox-input"></span>
                Free
              </label>
              <label className="checkbox-label w-checkbox">
                <input
                  type="checkbox"
                  checked={formData.paymentType === 'Paid'}
                  onChange={() => handleExclusiveCheckbox('paymentType', 'Paid')}
                />
                <span className="w-checkbox-input"></span>
                Paid
              </label>
            </div>
          </div>

          {/* Marketplace Visibility */}
          <div className="input-group">
            <label className="input-label">
              Marketplace visibility
              {isFieldRequired('visibility') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="checkbox-group">
              <label className="checkbox-label w-checkbox">
                <input
                  type="checkbox"
                  checked={formData.visibility === 'Public'}
                  onChange={() => handleExclusiveCheckbox('visibility', 'Public')}
                />
                <span className="w-checkbox-input"></span>
                Public
              </label>
              <label className="checkbox-label w-checkbox">
                <input
                  type="checkbox"
                  checked={formData.visibility === 'Private'}
                  onChange={() => handleExclusiveCheckbox('visibility', 'Private')}
                />
                <span className="w-checkbox-input"></span>
                Private
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="input-group">
            <button
              type="submit"
              className="btn cc-primary w-button"
              disabled={isSubmitting || (formData.clientId && !validationState.clientIdVerified)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </form>

      <style jsx>{`
        .form-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: inherit;
        }

        .form-status {
          padding: 0.875rem 1rem;
          border-radius: var(--_components---input--border-radius, 0.25rem);
          margin-bottom: 1rem;
          font-size: 0.875rem;
          border: 1px solid transparent;
        }

        .form-status-success {
          color: var(--_color---secondary--green, #00d722);
          background-color: color-mix(in srgb, var(--_color---secondary--green, #00d722) 12%, transparent);
          border-color: color-mix(in srgb, var(--_color---secondary--green, #00d722) 30%, transparent);
        }

        .form-status-error {
          color: var(--_color---secondary--red, #ee1d36);
          background-color: color-mix(in srgb, var(--_color---secondary--red, #ee1d36) 12%, transparent);
          border-color: color-mix(in srgb, var(--_color---secondary--red, #ee1d36) 30%, transparent);
        }

        .input-group {
          margin-bottom: 24px;
        }

        .input-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: inherit;
        }

        .dyn-asterisk {
          color: var(--_color---secondary--red, #ee1d36);
          margin-left: 4px;
        }

        .input, .cc-select {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: var(--_components---input--border-radius, 0.25rem);
          font-size: 14px;
          font-family: inherit;
          background: var(--colors--background, var(--_color---neutral--white, #ffffff));
          color: var(--colors--text, var(--_color---neutral--black, #080808));
        }

        .input:focus, .cc-select:focus {
          outline: none;
          border-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--colors--primary-accent, #146ef5) 20%, transparent);
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-family: inherit;
        }

        .cc-primary {
          background-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          color: white;
        }

        .cc-primary:hover:not(:disabled) {
          background-color: var(--_color---primary--blue-600, #1058c7);
        }

        .cc-primary:disabled {
          background-color: color-mix(in srgb, var(--colors--primary-accent, #146ef5) 45%, var(--_color---neutral--gray-400, #898989));
          cursor: not-allowed;
        }

        .cc-form-overlay {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background-color: var(--colors--background, var(--_color---neutral--white, #ffffff));
          color: var(--colors--text, var(--_color---neutral--black, #080808));
          padding: 8px 12px;
          font-size: 12px;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
        }

        .u-position-relative {
          position: relative;
        }

        .cc-error_text {
          color: var(--_color---secondary--red, #ee1d36);
          font-size: 12px;
          margin-top: 4px;
        }

        .cc-success-text {
          color: var(--_color---secondary--green, #00d722);
          font-size: 12px;
          margin-top: 4px;
        }

        .form-input-notification {
          background-color: color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 40%, transparent);
          border-radius: var(--_components---input--border-radius, 0.25rem);
          padding: 12px;
          margin-top: 8px;
          font-size: 13px;
        }

        .checkbox-group {
          display: flex;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          color: inherit;
        }

        .w-checkbox-input {
          width: 16px;
          height: 16px;
          border: 2px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: 3px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .checkbox-label input[type="checkbox"]:checked + .w-checkbox-input {
          background-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          border-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
        }

        .checkbox-label input[type="checkbox"]:checked + .w-checkbox-input::after {
          content: '✓';
          color: white;
          font-size: 12px;
        }

        .checkbox-label input[type="checkbox"] {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .checkbox-label:focus-within .w-checkbox-input,
        .cc-form-overlay:focus-visible,
        .cc-primary:focus-visible {
          outline: 2px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline-offset: 2px;
        }

        .rich-text-component {
          margin-bottom: 8px;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
          font-size: 13px;
        }

        .h5 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: inherit;
        }

        .heading-component {
          margin-bottom: 2rem;
        }

        .form-section {
          position: relative;
        }

        @media (max-width: 768px) {
          .input, .cc-select {
            padding: 1rem;
          }

          .checkbox-label,
          .cc-form-overlay,
          .cc-primary {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
