import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { TriangleAlert } from 'lucide-react';
import { withBasePath } from '../lib/runtimePaths';

const QuillEditor = dynamic(() => import('../components/QuillEditor'), { ssr: false });

export default function CompleteMarketplaceForm() {
  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const checkDarkMode = () => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeMediaQuery.matches);
    };

    // Initial check
    checkDarkMode();

    // Listen for changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);

    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      darkModeMediaQuery.addListener(handleChange);
    }

    return () => {
      if (darkModeMediaQuery.removeEventListener) {
        darkModeMediaQuery.removeEventListener('change', handleChange);
      } else {
        darkModeMediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  const [formData, setFormData] = useState({
    // App Info
    submissionType: '',
    appName: '',
    clientId: '',
    appCapabilities: '',
    appInstallUrl: '',
    appAvatarImage: null,
    appAvatarAltText: '',
    paymentType: [], // Changed to array to allow both Free and Paid
    visibility: '',

    // Creator Info
    creatorName: '',
    webflowAccountEmail: '',
    creatorEmail: '',

    // App Details
    appCategory: [],
    appPreviewDescription: '',
    appDetailDescription: '',
    appPromoVideoUrl: '',
    appScreenshots: [null, null, null, null, null],
    appScreenshotAltTexts: ['', '', '', '', ''],

    // Additional Fields
    featuresOverview: '',
    websiteUrl: '',
    additionalNotes: '',

    // App Access Credentials
    appAccessCredentials: '',
    credentialsConfirmed: false,
    marketplaceAgreement: false,

    // Support Info
    demoVideoUrl: '',
    privacyPolicyUrl: '',
    supportEmailUrl: '',
    termsConditionsUrl: '',

    // Acknowledgements
    agreementAccepted: false
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
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quillDescRef = useRef();
  const quillDetailRef = useRef();
  const avatarFileRef = useRef();
  const screenshotFileRefs = useRef([]);

  const appCategories = [
    'AI', 'Analytics', 'Asset Management', 'Automation', 'Compliance',
    'Content Management', 'Customer Support', 'Data Sync', 'Design',
    'Development and Coding', 'Ecommerce', 'Forms and Surveys', 'Icons',
    'Localization', 'Marketing', 'Scheduling', 'SEO', 'User Management', 'Utilities'
  ];

  // Handle form field changes
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors
    if (validationState.clientIdError && name === 'clientId') {
      setValidationState(prev => ({
        ...prev,
        clientIdError: ''
      }));
    }

    // Special handling for specific fields
    if (name === 'submissionType') {
      updateFieldRequirements(value);
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

    if (name === 'appPromoVideoUrl') {
      validateYouTubeUrl(value);
    }

    if (name === 'clientId') {
      setValidationState(prev => ({
        ...prev,
        clientIdVerified: false
      }));
    }
  };

  // Handle category selection (multi-select with max 2)
  const handleCategoryChange = (category) => {
    setFormData(prev => {
      const currentCategories = prev.appCategory;
      if (currentCategories.includes(category)) {
        return {
          ...prev,
          appCategory: currentCategories.filter(c => c !== category)
        };
      } else if (currentCategories.length < 2) {
        return {
          ...prev,
          appCategory: [...currentCategories, category]
        };
      }
      return prev; // Don't add if already at limit
    });
  };

  // Handle file uploads
  const handleFileUpload = (fieldName, file, index = null) => {
    if (fieldName === 'appScreenshots' && index !== null) {
      setFormData(prev => {
        const newScreenshots = [...prev.appScreenshots];
        newScreenshots[index] = file;
        return {
          ...prev,
          appScreenshots: newScreenshots
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  // Valid client IDs are 64-character hexadecimal strings (SHA-256 hashes)
  const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;

  // Client ID Verification
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

  // Update field requirements based on submission type
  const updateFieldRequirements = (submissionType) => {
    const requiredFields = new Set();

    if (submissionType === 'New') {
      // All required fields for new submissions
      requiredFields.add('appName');
      requiredFields.add('clientId');
      requiredFields.add('appAvatarImage');
      requiredFields.add('appAvatarAltText');
      requiredFields.add('paymentType');
      requiredFields.add('visibility');
      requiredFields.add('creatorName');
      requiredFields.add('webflowAccountEmail');
      requiredFields.add('creatorEmail');
      requiredFields.add('appCategory');
      requiredFields.add('appPreviewDescription');
      requiredFields.add('appDetailDescription');
      requiredFields.add('featuresOverview');
      requiredFields.add('websiteUrl');
      requiredFields.add('appAccessCredentials');
      requiredFields.add('demoVideoUrl');
      requiredFields.add('privacyPolicyUrl');
      requiredFields.add('supportEmailUrl');
      requiredFields.add('termsConditionsUrl');
      requiredFields.add('agreementAccepted');
    } else if (submissionType === 'Update') {
      // Only client ID required for updates
      requiredFields.add('clientId');
    }

    setValidationState(prev => ({
      ...prev,
      requiredFields
    }));
  };

  // Update App Install URL requirements
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

  // Handle exclusive checkbox behavior (for visibility)
  const handleExclusiveCheckbox = (groupName, value) => {
    const currentValue = formData[groupName];
    const newValue = currentValue === value ? '' : value;
    handleInputChange(groupName, newValue);
  };

  // Handle payment type checkboxes (allow multiple)
  const handlePaymentTypeChange = (value) => {
    const currentPaymentTypes = [...formData.paymentType];
    const index = currentPaymentTypes.indexOf(value);

    if (index > -1) {
      // Remove if already selected
      currentPaymentTypes.splice(index, 1);
    } else {
      // Add if not selected
      currentPaymentTypes.push(value);
    }

    handleInputChange('paymentType', currentPaymentTypes);
  };

  // Handle file upload button clicks
  const triggerFileUpload = (fileInputRef) => {
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle screenshot file upload clicks
  const triggerScreenshotUpload = (index) => {
    if (screenshotFileRefs.current[index]) {
      screenshotFileRefs.current[index].click();
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormStatus({ type: '', message: '' });
    setIsSubmitting(true);

    // Get Quill content
    const previewDescription = quillDescRef.current?.getEditor?.()?.root?.innerHTML || '';
    const detailDescription = quillDetailRef.current?.getEditor?.()?.root?.innerHTML || '';

    // Create FormData object to handle file uploads
    const formDataToSubmit = new FormData();

    // Add all text fields
    const finalFormData = {
      ...formData,
      appPreviewDescription: previewDescription,
      appDetailDescription: detailDescription
    };

    // Add all form fields to FormData
    Object.keys(finalFormData).forEach(key => {
      const value = finalFormData[key];
      if (Array.isArray(value)) {
        // Handle arrays (like categories, scopes)
        value.forEach(item => {
          formDataToSubmit.append(`${key}[]`, item);
        });
      } else if (value !== null && value !== undefined) {
        formDataToSubmit.append(key, value);
      }
    });

    // Add uploaded files
    if (avatarFileRef.current?.files?.[0]) {
      formDataToSubmit.append('avatar', avatarFileRef.current.files[0]);
    }

    // Add screenshot files and their alt texts
    const consolidatedAltTexts = [];
    screenshotFileRefs.current.forEach((ref, index) => {
      if (ref?.files?.[0]) {
        formDataToSubmit.append('screenshots', ref.files[0]);
        // Include alt text for this screenshot
        const altText = finalFormData.appScreenshotAltTexts[index] || '';
        formDataToSubmit.append(`screenshotAltText${index}`, altText);

        // Add to consolidated list if not empty
        if (altText) {
          consolidatedAltTexts.push(`${index + 1}. ${altText}`);
        }
      }
    });

    // Add consolidated screenshot alt texts as numbered list
    if (consolidatedAltTexts.length > 0) {
      formDataToSubmit.append('consolidatedScreenshotAltTexts', consolidatedAltTexts.join('\n'));
    }

    try {
      const response = await fetch(withBasePath('/api/submit-form'), {
        method: 'POST',
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        body: formDataToSubmit
      });

      const result = await response.json();

      if (response.ok) {
        setFormStatus({
          type: 'success',
          message: `Form submitted successfully! ${result.filesUploaded || 0} files uploaded.`
        });
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'FORM_SUBMITTED',
            data: finalFormData,
            filesUploaded: result.filesUploaded || 0
          }, '*');
        }
      } else {
        throw new Error(`Submission failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setFormStatus({
        type: 'error',
        message: `Submission failed: ${error.message}. Please try again.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldRequired = (fieldName) => {
    // For App Updates, only Client ID and Submission Type are required
    if (formData.submissionType === 'Update') {
      return ['clientId', 'submissionType'].includes(fieldName);
    }

    // For New Apps, use the validation state
    return validationState.requiredFields.has(fieldName);
  };

  // Initialize component and handle legacy Quill issues
  useEffect(() => {
    // Prevent legacy Quill initialization errors
    if (typeof window !== 'undefined') {
      // Remove any legacy Quill elements that might cause conflicts
      const legacyQuillArea = document.getElementById('quillArea');
      if (legacyQuillArea) {
        legacyQuillArea.remove();
      }

      // Override any legacy Quill initialization
      window.Quill = window.Quill || class {
        constructor() {
          console.log('Legacy Quill initialization prevented');
        }
      };
    }
  }, []);

  // CSS Inheritance from parent frame when embedded
  useEffect(() => {
    if (window.parent !== window) {
      try {
        // Try to access parent styles (will fail with CORS restrictions)
        const parentStyles = window.parent.document.querySelectorAll('style, link[rel="stylesheet"]');
        parentStyles.forEach(style => {
          if (style.tagName === 'STYLE') {
            const clonedStyle = style.cloneNode(true);
            document.head.appendChild(clonedStyle);
          } else if (style.tagName === 'LINK' && style.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = style.href;
            document.head.appendChild(link);
          }
        });

        // Also try to inherit CSS custom properties (CSS variables)
        const parentComputedStyle = window.parent.getComputedStyle(window.parent.document.documentElement);
        const iframe = window.frameElement;
        if (iframe) {
          const parentStyles = window.parent.getComputedStyle(iframe.parentElement);
          document.documentElement.style.fontFamily = parentStyles.fontFamily;
          document.documentElement.style.fontSize = parentStyles.fontSize;
          document.documentElement.style.color = parentStyles.color;
        }
      } catch (error) {
        // CORS restrictions prevent access to parent styles
        console.log('Cannot access parent styles due to CORS restrictions');

        // Fallback: Send message to parent asking for style information
        window.parent.postMessage({
          type: 'REQUEST_STYLES',
          source: 'webflow-form-app'
        }, '*');
      }
    }

    // Listen for style information from parent
    const handleMessage = (event) => {
      if (event.data.type === 'PARENT_STYLES') {
        const { styles } = event.data;
        console.log('Received styles from parent:', styles);

        // Apply styles to document root
        if (styles.fontFamily) {
          document.documentElement.style.setProperty('--inherited-font-family', styles.fontFamily);
          document.body.style.fontFamily = styles.fontFamily;
        }
        if (styles.fontSize) {
          document.documentElement.style.setProperty('--inherited-font-size', styles.fontSize);
          document.body.style.fontSize = styles.fontSize;
        }
        if (styles.color) {
          document.documentElement.style.setProperty('--inherited-color', styles.color);
          document.body.style.color = styles.color;
        }
        if (styles.backgroundColor) {
          document.documentElement.style.setProperty('--inherited-bg-color', styles.backgroundColor);
          document.body.style.backgroundColor = styles.backgroundColor;
        }
        if (styles.lineHeight) {
          document.documentElement.style.setProperty('--inherited-line-height', styles.lineHeight);
          document.body.style.lineHeight = styles.lineHeight;
        }

        // Apply CSS custom properties
        if (styles.cssVariables) {
          Object.entries(styles.cssVariables).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
          });
        }

        // Create a dynamic stylesheet with inherited styles
        const inheritedStyleSheet = document.createElement('style');
        inheritedStyleSheet.id = 'inherited-webflow-styles';
        inheritedStyleSheet.innerHTML = `
          :root {
            --webflow-font-family: ${styles.fontFamily || 'inherit'};
            --webflow-font-size: ${styles.fontSize || 'inherit'};
            --webflow-color: ${styles.color || 'inherit'};
            --webflow-bg-color: ${styles.backgroundColor || 'transparent'};
            --webflow-line-height: ${styles.lineHeight || 'inherit'};
          }

          body, .form-wrapper {
            font-family: var(--webflow-font-family) !important;
            font-size: var(--webflow-font-size) !important;
            color: var(--webflow-color) !important;
            line-height: var(--webflow-line-height) !important;
          }

          .input-label, .rich-text-component {
            font-family: var(--webflow-font-family) !important;
            color: var(--webflow-color) !important;
          }

          .input, .cc-select, .textarea {
            font-family: var(--webflow-font-family) !important;
            font-size: var(--webflow-font-size) !important;
          }
        `;

        // Remove existing inherited styles and add new ones
        const existing = document.getElementById('inherited-webflow-styles');
        if (existing) {
          existing.remove();
        }
        document.head.appendChild(inheritedStyleSheet);

        console.log('Applied inherited styles to iframe');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-resize iframe to fit content
  useEffect(() => {
    let lastSentHeight = 0;
    let isResizing = false;

    const sendHeight = () => {
      if (window.parent !== window && !isResizing) {
        const body = document.body;
        const html = document.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );

        // Only send if height has changed significantly (more than 10px)
        if (Math.abs(height - lastSentHeight) > 10) {
          isResizing = true;
          lastSentHeight = height;

          window.parent.postMessage({
            type: 'RESIZE_IFRAME',
            height: height,
            source: 'webflow-form-app'
          }, '*');

          // Reset the flag after a short delay
          setTimeout(() => {
            isResizing = false;
          }, 100);
        }
      }
    };

    // Send height on load and whenever it changes
    sendHeight();

    // Monitor for height changes with debouncing
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(sendHeight, 50);
    });

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    // Also send on form state changes with debouncing
    let mutationTimeout;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(sendHeight, 100);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Send height when content settles
    const timeouts = [500, 1000].map(delay =>
      setTimeout(sendHeight, delay)
    );

    return () => {
      resizeObserver.disconnect();
      observer.disconnect();
      timeouts.forEach(clearTimeout);
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
    };
  }, [formData]);

  // Handle query parameters for submission type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const submissionMode = urlParams.get('submissionType');

      if (submissionMode && submissionMode.toLowerCase() === 'update') {
        handleInputChange('submissionType', 'Update');
      }
    }
  }, []);

  return (
    <>
      {/* Dark mode styles */}
      <style jsx>{`
        .u-mb-0.w-form {
          color: var(--colors--text, var(--_color---neutral--black, #080808));
          background-color: var(--colors--background, var(--_color---neutral--white, #ffffff));
        }

        .u-mb-0.w-form.dark-mode {
          color: var(--_color---neutral--black, #ffffff);
          background-color: var(--_color---neutral--white, #080808);
        }

        .dark-mode .form {
          background-color: var(--_color---neutral--white, #080808);
          color: var(--_color---neutral--black, #ffffff);
        }

        .dark-mode .input,
        .dark-mode .w-input,
        .dark-mode .cc-select,
        .dark-mode .w-select,
        .dark-mode textarea {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717));
          color: var(--colors--text, var(--_color---neutral--black, #ffffff));
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a));
          border-radius: 4px;
        }

        .dark-mode .input:focus,
        .dark-mode .w-input:focus,
        .dark-mode .cc-select:focus,
        .dark-mode .w-select:focus,
        .dark-mode textarea:focus {
          border: 1px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline: 2px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline-offset: 2px;
          background-color: var(--_color---neutral--gray-900, #222);
        }

        .dark-mode .form-section {
          background-color: var(--_color---neutral--white, #080808);
        }

        .dark-mode .heading-component h2,
        .dark-mode .h5,
        .dark-mode h2,
        .dark-mode h3,
        .dark-mode h4,
        .dark-mode h5 {
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .input-label,
        .dark-mode label {
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .rich-text-component p,
        .dark-mode .rich-text-component.paragraph-sm p {
          color: var(--colors--text-secondary, var(--_color---neutral--gray-300, #ababab)) !important;
        }

        .dark-mode .checkbox-label {
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .w-checkbox-input {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717));
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a));
        }

        .dark-mode .w-checkbox-input--inputType-custom:checked {
          background-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          border-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
        }

        .dark-mode .warning-banner {
          background-color: color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 40%, transparent);
          color: color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black);
        }

        .dark-mode .file-upload-area {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717));
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a));
          color: var(--colors--text, var(--_color---neutral--black, #ffffff));
          border-radius: 4px;
        }

        .dark-mode .file-upload-area:hover {
          background-color: var(--_color---neutral--gray-900, #222);
        }

        .dark-mode .character-count {
          color: var(--colors--text-secondary, var(--_color---neutral--gray-300, #ababab)) !important;
        }

        .dark-mode .dyn-asterisk {
          color: var(--_color---secondary--red, #ee1d36) !important;
        }

        .dark-mode .form-input-notification {
          background-color: color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 14%, transparent);
          color: color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black) !important;
          border: 1px solid color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 30%, transparent);
        }

        .dark-mode .button,
        .dark-mode .w-button {
          background-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          color: var(--_color---neutral--black, #ffffff);
          border-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
        }

        .dark-mode .button:hover,
        .dark-mode .w-button:hover {
          background-color: var(--_color---primary--blue-600, #1058c7);
          border-color: var(--_color---primary--blue-600, #1058c7);
        }

        /* Quill Editor Dark Mode */
        .dark-mode .ql-container {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717)) !important;
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a)) !important;
        }

        .dark-mode .ql-editor {
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .ql-toolbar {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717)) !important;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a)) !important;
          border-bottom: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a)) !important;
        }

        .dark-mode .ql-stroke {
          stroke: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .ql-fill {
          fill: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .ql-picker-label {
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
        }

        .dark-mode .ql-picker-options {
          background-color: var(--colors--secondary-background, var(--_color---neutral--gray-100, #171717)) !important;
          color: var(--colors--text, var(--_color---neutral--black, #ffffff)) !important;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-600, #5a5a5a)) !important;
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
      `}</style>

      <div className={`u-mb-0 w-form ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
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

        {/* App Info Section */}
        <div className="form-section u-position-relative">
          <div className="heading-component">
            <h2 className="h5">App info</h2>
          </div>

          {/* Submission Type */}
          <div className="input-group">
            <label htmlFor="submissionType" className="input-label">
              Submission type
              <span className="dyn-asterisk">*</span>
            </label>
            <div className="rich-text-component paragraph-sm">
              <p>Indicate whether you are submitting a new app or an update to an existing submission.<br />
              <strong>Updates must contain an exact match of the previous submission's App Name or Client ID.</strong></p>
            </div>
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
              </div>
            )}
          </div>

          {/* App Name */}
          <div className="input-group">
            <label htmlFor="appName" className="input-label">
              App name
              {isFieldRequired('appName') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Character limit: 30 characters</p>
            </div>

            {formData.submissionType === 'Update' ? (
              // Disabled field for App Updates
              <input
                className="input w-input"
                type="text"
                value="Name updates must be requested via Support"
                disabled
                style={{
                  opacity: 0.6,
                  cursor: 'not-allowed',
                  backgroundColor: 'var(--colors--secondary-background, var(--_color---neutral--gray-100, #f0f0f0))',
                  color: 'var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a))'
                }}
              />
            ) : (
              // Editable field for New Apps
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
              <div className="cc-error_text">{validationState.clientIdError}</div>
            )}
            {validationState.clientIdSuccess && (
              <div className="cc-success-text">{validationState.clientIdSuccess}</div>
            )}
          </div>

          {/* App Capabilities */}
          <div className="input-group">
            <label htmlFor="appCapabilities" className="input-label">
              App capabilities
              {isFieldRequired('appCapabilities') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Select the option that best represents your app. <a href="#" target="_blank">Learn more</a></p>
            </div>
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
              <div className="rich-text-component">
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
                <div className="warning-text" style={{ marginTop: '0.5rem' }}>
                  <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>This looks like an OAuth callback URL. The Install URL should be your app's authorization page, not the redirect URI.</span>
                </div>
              )}
            </div>
          )}

          {/* App Avatar Image */}
          <div className="input-group">
            <label className="input-label">
              App avatar image
              {isFieldRequired('appAvatarImage') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p><strong>File Type(s):</strong> PNG<br />
              <strong>Dimensions:</strong> 900px by 900px, 1:1 aspect ratio<br />
              <strong>Title of file should be avatar alt text</strong><br />
              Accepted: Logomarks (pictoral marks); Not accepted: Logotypes (text)</p>
            </div>
            <div className="file-upload-wrapper">
              <input
                ref={avatarFileRef}
                type="file"
                accept=".png"
                onChange={(e) => handleFileUpload('appAvatarImage', e.target.files[0])}
                className="file-input"
              />
              <span className="file-upload-text">
                {formData.appAvatarImage ? formData.appAvatarImage.name : 'No file chosen'}
              </span>
              <button
                type="button"
                className="btn file-upload-btn"
                onClick={() => triggerFileUpload(avatarFileRef)}
              >
                Upload File
              </button>
            </div>
            <p className="file-help-text">Max file size 50kb.</p>
          </div>

          {/* App Avatar Alt Text */}
          <div className="input-group">
            <label htmlFor="appAvatarAltText" className="input-label">
              App avatar image alt text
              {isFieldRequired('appAvatarAltText') && <span className="dyn-asterisk">*</span>}
            </label>
            <input
              className="input w-input"
              name="appAvatarAltText"
              type="text"
              id="appAvatarAltText"
              required={isFieldRequired('appAvatarAltText')}
              value={formData.appAvatarAltText}
              onChange={(e) => handleInputChange('appAvatarAltText', e.target.value)}
            />
          </div>

          {/* Payment Type */}
          <div className="input-group">
            <label className="input-label">
              Payment type
              {isFieldRequired('paymentType') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Select payment types your app offers (can select both Free and Paid).</p>
            </div>
            <div className="checkbox-group">
              <div className="w-checkbox input-group cc-toggle">
                <input
                  type="checkbox"
                  checked={formData.paymentType.includes('Free')}
                  onChange={() => handlePaymentTypeChange('Free')}
                  className="w-checkbox-input w-checkbox-input--inputType-custom input-check"
                />
                <label className="checkbox-label">Free</label>
              </div>
              <div className="w-checkbox input-group cc-toggle">
                <input
                  type="checkbox"
                  checked={formData.paymentType.includes('Paid')}
                  onChange={() => handlePaymentTypeChange('Paid')}
                  className="w-checkbox-input w-checkbox-input--inputType-custom input-check"
                />
                <label className="checkbox-label">Paid</label>
              </div>
            </div>
          </div>

          {/* Marketplace Visibility */}
          <div className="input-group">
            <label className="input-label">
              Marketplace visibility
              {isFieldRequired('visibility') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Public listings are visible to everyone in the Marketplace, while Private listings are not displayed in the public Marketplace interface. However, users outside of your Workspace can still install private apps if they have the direct URL to the listing.</p>
              <p>Private apps undergo the same review process as public apps and must meet all guidelines to be approved. Apps that don't comply with all requirements may be rejected regardless of visibility status.</p>
            </div>
            <div className="checkbox-group">
              <div className="w-checkbox input-group cc-toggle">
                <input
                  type="checkbox"
                  checked={formData.visibility === 'Public'}
                  onChange={() => handleExclusiveCheckbox('visibility', 'Public')}
                  className="w-checkbox-input w-checkbox-input--inputType-custom input-check"
                />
                <label className="checkbox-label">Public</label>
              </div>
              <div className="w-checkbox input-group cc-toggle">
                <input
                  type="checkbox"
                  checked={formData.visibility === 'Private'}
                  onChange={() => handleExclusiveCheckbox('visibility', 'Private')}
                  className="w-checkbox-input w-checkbox-input--inputType-custom input-check"
                />
                <label className="checkbox-label">Private</label>
              </div>
            </div>
            <div className="rich-text-component">
              <p>Please select marketplace visibility (Public or Private).</p>
            </div>
          </div>
        </div>

        {/* Creator Info Section - Hidden for App Updates */}
        {formData.submissionType !== 'Update' && (
          <div className="form-section">
            <div className="heading-component">
              <h2 className="h5">Creator info</h2>
            </div>

          {/* Creator Name */}
          <div className="input-group">
            <label htmlFor="creatorName" className="input-label">
              Creator name
              {isFieldRequired('creatorName') && <span className="dyn-asterisk">*</span>}
            </label>
            <input
              className="input w-input"
              name="creatorName"
              type="text"
              id="creatorName"
              required={isFieldRequired('creatorName')}
              value={formData.creatorName}
              onChange={(e) => handleInputChange('creatorName', e.target.value)}
            />
          </div>

          {/* Webflow Account Email */}
          <div className="input-group">
            <label htmlFor="webflowAccountEmail" className="input-label">
              Webflow Account Email
              {isFieldRequired('webflowAccountEmail') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>The email you use to log in to Webflow</p>
            </div>
            <input
              className="input w-input"
              name="webflowAccountEmail"
              type="email"
              id="webflowAccountEmail"
              required={isFieldRequired('webflowAccountEmail')}
              value={formData.webflowAccountEmail}
              onChange={(e) => handleInputChange('webflowAccountEmail', e.target.value)}
            />
          </div>

          {/* Creator Email Address */}
          <div className="input-group">
            <label htmlFor="creatorEmail" className="input-label">
              Creator email address
              {isFieldRequired('creatorEmail') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Your preferred email to receive correspondence about your app submission</p>
            </div>
            <input
              className="input w-input"
              name="creatorEmail"
              type="email"
              id="creatorEmail"
              required={isFieldRequired('creatorEmail')}
              value={formData.creatorEmail}
              onChange={(e) => handleInputChange('creatorEmail', e.target.value)}
            />
          </div>
        </div>
        )}

        {/* App Details Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">App details</h2>
          </div>

          {/* App Category */}
          <div className="input-group">
            <label className="input-label">
              App category
              {isFieldRequired('appCategory') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Select up to 2 options that best describe your app<br />
              Use CMD+Click/CTRL+Click to select multiple</p>
            </div>
            <div className="category-grid">
              {appCategories.map((category) => (
                <label key={category} className="category-item">
                  <input
                    type="checkbox"
                    checked={formData.appCategory.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    disabled={!formData.appCategory.includes(category) && formData.appCategory.length >= 2}
                  />
                  <span className="category-name">{category}</span>
                </label>
              ))}
            </div>
            <p className="category-counter">{formData.appCategory.length} of 2 categories selected</p>
          </div>

          {/* App Preview Description */}
          <div className="input-group">
            <label className="input-label">
              App preview description (short)
              {isFieldRequired('appPreviewDescription') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Character limit: 100 characters</p>
            </div>
            <QuillEditor
              ref={quillDescRef}
              theme="snow"
              value={formData.appPreviewDescription}
              onChange={(content) => handleInputChange('appPreviewDescription', content)}
              style={{ minHeight: '100px' }}
              modules={{
                toolbar: [['bold', 'italic'], ['clean']]
              }}
            />
          </div>

          {/* App Detail Description */}
          <div className="input-group">
            <label className="input-label">
              App detail description
              {isFieldRequired('appDetailDescription') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Character limit: 10,000 characters<br />
              Markdown supported, but not links</p>
            </div>
            <QuillEditor
              ref={quillDetailRef}
              theme="snow"
              value={formData.appDetailDescription}
              onChange={(content) => handleInputChange('appDetailDescription', content)}
              style={{ minHeight: '200px' }}
            />
          </div>

          {/* App Promo Video URL */}
          <div className="input-group">
            <label htmlFor="appPromoVideoUrl" className="input-label">
              App promo video URL
            </label>
            <div className="rich-text-component">
              <p>Provide a 1-2 min. video for your app's listing page that highlighting features for prospective users. (optional)</p>
              <p>Accepted: Video should be hosted on Youtube</p>
            </div>
            <input
              className="input w-input"
              name="appPromoVideoUrl"
              type="url"
              id="appPromoVideoUrl"
              value={formData.appPromoVideoUrl}
              onChange={(e) => handleInputChange('appPromoVideoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=xyz"
            />
            {validationState.videoUrlError && (
              <div className="cc-error_text">{validationState.videoUrlError}</div>
            )}
            {validationState.videoUrlSuccess && (
              <div className="cc-success-text">{validationState.videoUrlSuccess}</div>
            )}
          </div>

          {/* App Screenshots */}
          <div className="input-group">
            <label className="input-label">
              App screenshots
              {isFieldRequired('appScreenshots') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Dimensions: 1280px by 846px<br />
              4 screenshots minimum<br />
              Accepted: Highlight the app features with clear visuals</p>
            </div>
            <div className="screenshots-grid">
              {formData.appScreenshots.map((screenshot, index) => (
                <div key={index}>
                  <div className="screenshot-upload">
                    <input
                      ref={(el) => (screenshotFileRefs.current[index] = el)}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('appScreenshots', e.target.files[0], index)}
                      className="file-input"
                    />
                    <span className="file-upload-text">
                      {screenshot ? screenshot.name : `No file chosen (Screenshot ${index + 1})`}
                    </span>
                    <button
                      type="button"
                      className="btn file-upload-btn"
                      onClick={() => triggerScreenshotUpload(index)}
                    >
                      Upload File
                    </button>
                  </div>

                  {/* Alt text input appears when file is uploaded */}
                  {screenshot && (
                    <div className="screenshot-alt-text" style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        className="input w-input"
                        placeholder={`Alt text for screenshot ${index + 1}`}
                        value={formData.appScreenshotAltTexts[index]}
                        onChange={(e) => {
                          const newAltTexts = [...formData.appScreenshotAltTexts];
                          newAltTexts[index] = e.target.value;
                          setFormData(prev => ({ ...prev, appScreenshotAltTexts: newAltTexts }));
                        }}
                        style={{
                          fontSize: '14px',
                          padding: '8px 12px'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Features Overview */}
          <div className="input-group">
            <label htmlFor="featuresOverview" className="input-label">
              Features overview
              {isFieldRequired('featuresOverview') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Bulleted list of up to five highlighted app features</p>
            </div>
            <textarea
              className="input textarea w-input"
              name="featuresOverview"
              id="featuresOverview"
              required={isFieldRequired('featuresOverview')}
              value={formData.featuresOverview}
              onChange={(e) => handleInputChange('featuresOverview', e.target.value)}
              rows="5"
            />
          </div>

          {/* Website URL */}
          <div className="input-group">
            <label htmlFor="websiteUrl" className="input-label">
              Website URL
              {isFieldRequired('websiteUrl') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Add the website URL where users can learn more about your app/company</p>
            </div>
            <input
              className="input w-input"
              name="websiteUrl"
              type="url"
              id="websiteUrl"
              required={isFieldRequired('websiteUrl')}
              value={formData.websiteUrl}
              onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
              placeholder="Example Text"
            />
          </div>

          {/* Additional Notes */}
          <div className="input-group">
            <label htmlFor="additionalNotes" className="input-label">
              Additional Notes
            </label>
            <div className="rich-text-component">
              <p>Add any other relevant information for reviewers. Note: App credentials should be provided in the dedicated App Credentials section above, not in this notes field.</p>
            </div>
            <textarea
              className="input textarea w-input"
              name="additionalNotes"
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              placeholder="Any additional context, special instructions, or information that would help reviewers understand your app (excluding credentials)..."
              rows="4"
            />
          </div>
        </div>

        {/* App Access Credentials Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">App Access Credentials</h2>
          </div>
          <div className="warning-banner">
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TriangleAlert size={18} style={{ flexShrink: 0 }} /> <strong>Critical for Review Process</strong></p>
            <p>App access credentials are required for our review team to test your app thoroughly. The account must have permanent access to the highest tier with all features unlocked.</p>
          </div>

          {/* App Access Credentials */}
          <div className="input-group">
            <label htmlFor="appAccessCredentials" className="input-label">
              App Access Credentials
              {isFieldRequired('appAccessCredentials') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Please provide login credentials for our review team, including username, email, password, and any additional details needed. When creating an account, please use marketplaceteam@webflow.com and share setup details in the Notes.</p>
              <p>If your app doesn't need credentials, enter "N/A"</p>
            </div>
            <textarea
              className="input textarea w-input"
              name="appAccessCredentials"
              id="appAccessCredentials"
              required={isFieldRequired('appAccessCredentials')}
              value={formData.appAccessCredentials}
              onChange={(e) => handleInputChange('appAccessCredentials', e.target.value)}
              rows="5"
              maxLength="2000"
            />
            <p
              className="character-count"
              style={{
                color: formData.appAccessCredentials.length > 1800
                  ? 'var(--_color---secondary--red, #ee1d36)'
                  : formData.appAccessCredentials.length > 1500
                  ? 'var(--_color---secondary--yellow, #ffae13)'
                  : 'var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a))'
              }}
            >
              Character count: {formData.appAccessCredentials.length}/2000
            </p>
          </div>

          {/* Credentials Confirmation */}
          <div className="input-group">
            <label className="checkbox-label w-checkbox">
              <input
                type="checkbox"
                checked={formData.credentialsConfirmed}
                onChange={(e) => handleInputChange('credentialsConfirmed', e.target.checked)}
                required={isFieldRequired('appAccessCredentials')}
              />
              <span className="w-checkbox-input"></span>
              I confirm that the provided information above is accurate (either valid credentials with highest tier access, or appropriate N/A designation if no credentials are needed) and will remain valid permanently for review and audit purposes.
            </label>
          </div>

          {/* Marketplace Agreement */}
          <div className="warning-banner">
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TriangleAlert size={18} style={{ flexShrink: 0 }} /> <strong>Marketplace Agreement</strong></p>
            <p>By providing these credentials, you agree that Webflow may access your app at any time for review, audit, and quality assurance purposes. Account access must remain active for the duration of your app's presence in the Webflow Marketplace.</p>
            <p>Failure to provide proper credentials or ensure access remains active will result in review delays and may lead to app delisting.</p>
          </div>

          <div className="input-group">
            <label className="checkbox-label w-checkbox">
              <input
                type="checkbox"
                checked={formData.marketplaceAgreement}
                onChange={(e) => handleInputChange('marketplaceAgreement', e.target.checked)}
                required={isFieldRequired('appAccessCredentials')}
              />
              <span className="w-checkbox-input"></span>
              I agree to the Marketplace Agreement terms above.
            </label>
          </div>
        </div>

        {/* Support Info Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">Support info</h2>
          </div>

          {/* Demo Video URL */}
          <div className="input-group">
            <label htmlFor="demoVideoUrl" className="input-label">
              Demo Video URL
              {isFieldRequired('demoVideoUrl') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Provide a walkthrough of App installation, setup, and usage for the review team</p>
            </div>
            <input
              className="input w-input"
              name="demoVideoUrl"
              type="url"
              id="demoVideoUrl"
              required={isFieldRequired('demoVideoUrl')}
              value={formData.demoVideoUrl}
              onChange={(e) => handleInputChange('demoVideoUrl', e.target.value)}
            />
          </div>

          {/* Privacy Policy URL */}
          <div className="input-group">
            <label htmlFor="privacyPolicyUrl" className="input-label">
              Privacy Policy URL
              {isFieldRequired('privacyPolicyUrl') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Add the website URL where users can access your Privacy Policy</p>
            </div>
            <input
              className="input w-input"
              name="privacyPolicyUrl"
              type="url"
              id="privacyPolicyUrl"
              required={isFieldRequired('privacyPolicyUrl')}
              value={formData.privacyPolicyUrl}
              onChange={(e) => handleInputChange('privacyPolicyUrl', e.target.value)}
            />
          </div>

          {/* Support Email/URL */}
          <div className="input-group">
            <label htmlFor="supportEmailUrl" className="input-label">
              Support Email/URL
              {isFieldRequired('supportEmailUrl') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Add an email or website URL where users can contact your customer support</p>
            </div>
            <input
              className="input w-input"
              name="supportEmailUrl"
              type="text"
              id="supportEmailUrl"
              required={isFieldRequired('supportEmailUrl')}
              value={formData.supportEmailUrl}
              onChange={(e) => handleInputChange('supportEmailUrl', e.target.value)}
            />
          </div>

          {/* Terms and Conditions URL */}
          <div className="input-group">
            <label htmlFor="termsConditionsUrl" className="input-label">
              Terms and Conditions URL
              {isFieldRequired('termsConditionsUrl') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component">
              <p>Add the website URL where users can access your Terms and Conditions</p>
            </div>
            <input
              className="input w-input"
              name="termsConditionsUrl"
              type="url"
              id="termsConditionsUrl"
              required={isFieldRequired('termsConditionsUrl')}
              value={formData.termsConditionsUrl}
              onChange={(e) => handleInputChange('termsConditionsUrl', e.target.value)}
            />
          </div>
        </div>

        {/* Acknowledgements Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">Acknowledgements</h2>
          </div>

          <div className="input-group">
            <label className="checkbox-label w-checkbox">
              <input
                type="checkbox"
                checked={formData.agreementAccepted}
                onChange={(e) => handleInputChange('agreementAccepted', e.target.checked)}
                required={isFieldRequired('agreementAccepted')}
              />
              <span className="w-checkbox-input"></span>
              By checking this box, you agree to Webflow's Privacy Policy, Terms of Service, and Developer Terms of Service.
              {isFieldRequired('agreementAccepted') && <span className="dyn-asterisk">*</span>}
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-section">
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
      </div>

      <style jsx>{`
        .form-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: var(--webflow-font-family, inherit);
          color: var(--webflow-color, inherit);
          line-height: var(--webflow-line-height, inherit);
        }

        .form-section {
          margin-bottom: var(--_layout---spacing--margin-xl, 2.5rem);
        }

        .input-group {
          margin-bottom: var(--_layout---grid--gap-md, 1.25rem);
        }

        .input-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--webflow-color, inherit);
          font-family: var(--webflow-font-family, inherit);
        }

        .dyn-asterisk {
          color: var(--_color---secondary--red, #ee1d36);
          margin-left: 4px;
        }

        .input, .cc-select, .textarea {
          width: 100%;
          padding: var(--_components---input--padding, 1rem);
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: var(--_components---input--border-radius, 0.25rem);
          font-size: 14px;
          font-family: inherit;
          background: var(--colors--background, var(--_color---neutral--white, #ffffff));
          color: var(--colors--text, var(--_color---neutral--black, #080808));
        }

        .textarea {
          resize: vertical;
          min-height: 60px;
        }

        .input:focus, .cc-select:focus, .textarea:focus {
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

        .warning-banner {
          background-color: color-mix(in srgb, var(--_color---secondary--red, #ee1d36) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--_color---secondary--red, #ee1d36) 35%, transparent);
          border-radius: var(--_components---input--border-radius, 0.25rem);
          padding: 16px;
          margin-bottom: 16px;
        }

        .warning-banner p {
          margin: 4px 0;
        }

        .checkbox-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          cursor: pointer;
          color: inherit;
          line-height: 1.4;
        }

        .w-checkbox-input {
          width: 16px;
          height: 16px;
          border: 2px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: 3px;
          margin-right: 8px;
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
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
        .cc-primary:focus-visible,
        .file-upload-btn:focus-visible {
          outline: 2px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline-offset: 2px;
        }

        .w-checkbox-input:focus-visible,
        input[type="checkbox"]:focus-visible {
          outline: 2px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline-offset: 2px;
        }

        .dark-mode .w-checkbox-input:focus-visible,
        .dark-mode input[type="checkbox"]:focus-visible {
          outline: 2px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5));
          outline-offset: 2px;
        }

        .rich-text-component {
          margin-bottom: 8px;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
          font-size: 13px;
        }

        .rich-text-component p {
          margin: 4px 0;
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

        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .category-item {
          display: flex;
          align-items: center;
          padding: 8px;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .category-item:hover {
          background-color: color-mix(in srgb, var(--colors--text, var(--_color---neutral--black, #080808)) 4%, transparent);
        }

        .category-item input[type="checkbox"] {
          margin-right: 8px;
        }

        .category-item input[type="checkbox"]:disabled {
          cursor: not-allowed;
        }

        .category-counter {
          font-size: 12px;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
          margin-top: 8px;
        }

        .file-upload-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .file-input {
          display: none;
        }

        .file-upload-text {
          flex: 1;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
          font-size: 14px;
        }

        .file-upload-btn {
          background-color: var(--colors--background, var(--_color---neutral--white, #ffffff));
          color: var(--colors--text, var(--_color---neutral--black, #080808));
          padding: 8px 16px;
          font-size: 12px;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          min-height: 44px;
        }

        .file-help-text {
          font-size: 12px;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
        }

        .screenshots-grid {
          display: grid;
          gap: 12px;
        }

        .screenshot-upload {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--colors--border, var(--_color---neutral--gray-400, #898989));
          border-radius: 6px;
        }

        .character-count {
          font-size: 12px;
          color: var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a));
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .input, .cc-select, .textarea {
            padding: 1rem;
          }

          .checkbox-label {
            min-height: 44px;
          }

          .file-upload-wrapper {
            flex-direction: column;
            align-items: stretch;
          }

          .file-upload-btn {
            width: 100%;
          }

          .cc-form-overlay {
            position: static;
            transform: none;
            margin-top: 0.5rem;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
